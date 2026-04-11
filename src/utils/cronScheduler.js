import { DEFAULT_CRON_JITTER_CONFIG, readCronTasks, removeCronTasks, markCronTasksFired, findMissedTasks, jitteredNextCronRunMs, oneShotJitteredNextCronRunMs, hasCronTasksSync, getCronFilePath } from './cronTasks.js';
import { createLogger } from './logger.js';
import { executeCommand } from '../commands/index.js';
import { cronToHuman } from './cron.js';

const CHECK_INTERVAL_MS = 1000;

// 创建日志记录器
const logger = createLogger('cron');

function isRecurringTaskAged(t, nowMs, maxAgeMs) {
  if (maxAgeMs === 0) return false;
  return Boolean(t.recurring && !t.permanent && nowMs - t.createdAt >= maxAgeMs);
}

function createCronScheduler(options) {
  const { onFire, isLoading, assistantMode = false, onFireTask, onMissed, dir } = options;
  
  let tasks = [];
  const nextFireAt = new Map();
  const missedAsked = new Set();
  const inFlight = new Set();
  
  let checkTimer = null;
  let stopped = false;
  
  async function load(initial) {
    const next = await readCronTasks(dir);
    if (stopped) return;
    tasks = next;
    
    if (!initial) return;
    
    const now = Date.now();
    const missed = findMissedTasks(next, now).filter(t => !t.recurring && !missedAsked.has(t.id));
    if (missed.length > 0) {
      for (const t of missed) {
        missedAsked.add(t.id);
        nextFireAt.set(t.id, Infinity);
      }
      
      if (onMissed) {
        onMissed(missed);
      } else {
        onFire(buildMissedTaskNotification(missed));
      }
      
      await removeCronTasks(missed.map(t => t.id), dir).catch(e => {
        logger.error(`Failed to remove missed tasks: ${e.message}`, e);
      });
    }
  }
  
  async function check() {
      if (isLoading && isLoading() && !assistantMode) return;
      // 每次检查前重新加载任务，确保新增的任务能被及时发现
      await load(false);
      const now = Date.now();
      const seen = new Set();
      const firedFileRecurring = [];
      const jitterCfg = DEFAULT_CRON_JITTER_CONFIG;
      
      async function process(t) {
        seen.add(t.id);
        if (inFlight.has(t.id)) return;
        
        let next = nextFireAt.get(t.id);
        if (next === undefined) {
          next = t.recurring
            ? (jitteredNextCronRunMs(t.cron, t.lastFiredAt ?? t.createdAt, t.id, jitterCfg) ?? Infinity)
            : (oneShotJitteredNextCronRunMs(t.cron, t.createdAt, t.id, jitterCfg) ?? Infinity);
          nextFireAt.set(t.id, next);
          logger.debug(`Scheduled task ${t.id} for ${next === Infinity ? 'never' : new Date(next).toISOString()}`);
        }
        
        if (now < next) return;
        
        logger.info(`Firing task ${t.id}${t.recurring ? ' (recurring)' : ''}`);
        
        if (onFireTask) {
          onFireTask(t);
        } else {
          // 检查是否是命令
            if (t.prompt.startsWith('/')) {
              // 解析命令
              const command = t.prompt.slice(1);
              logger.debug(`Executing command: ${command}`);
              try {
                const result = await executeCommand(command);
                if (result) {
                  logger.info(`Command executed: ${t.prompt}`);
                  logger.debug(`Command result: ${result}`);
                }
              } catch (error) {
                logger.error(`Error executing command: ${error.message}`, error);
              }
            } else {
              onFire(t.prompt);
            }
        }
        
        const aged = isRecurringTaskAged(t, now, jitterCfg.recurringMaxAgeMs);
        
        if (aged) {
          const ageHours = Math.floor((now - t.createdAt) / 1000 / 60 / 60);
          logger.info(`Recurring task ${t.id} aged out (${ageHours}h since creation), deleting after final fire`);
        }
        
        if (t.recurring && !aged) {
          const newNext = jitteredNextCronRunMs(t.cron, now, t.id, jitterCfg) ?? Infinity;
          nextFireAt.set(t.id, newNext);
          firedFileRecurring.push(t.id);
        } else {
          inFlight.add(t.id);
          removeCronTasks([t.id], dir)
            .catch(e => {
              logger.error(`Failed to remove task ${t.id}: ${e.message}`, e);
            })
            .finally(() => inFlight.delete(t.id));
          nextFireAt.delete(t.id);
        }
      }
      
      // 执行所有任务
      for (const t of tasks) {
        await process(t);
      }
      
      if (firedFileRecurring.length > 0) {
        for (const id of firedFileRecurring) inFlight.add(id);
        markCronTasksFired(firedFileRecurring, now, dir)
          .catch(e => {
            logger.error(`Failed to persist lastFiredAt: ${e.message}`, e);
          })
          .finally(() => {
            for (const id of firedFileRecurring) inFlight.delete(id);
          });
      }
      
      if (seen.size === 0) {
        nextFireAt.clear();
        return;
      }
      
      for (const id of nextFireAt.keys()) {
        if (!seen.has(id)) nextFireAt.delete(id);
      }
    }
  
  async function enable() {
    if (stopped) return;
    logger.info('Enabling scheduler');
    await load(true);
    logger.debug(`Starting check interval: ${CHECK_INTERVAL_MS}ms`);
    checkTimer = setInterval(check, CHECK_INTERVAL_MS);
    checkTimer.unref?.();
    logger.info('Scheduler enabled');
  }
  
  return {
    start() {
      stopped = false;
      logger.info(`Scheduler start() — hasTasks=${hasCronTasksSync(dir)}`);
      enable();
    },
    stop() {
      stopped = true;
      if (checkTimer) {
        clearInterval(checkTimer);
        checkTimer = null;
      }
    },
    getNextFireTime() {
      let min = Infinity;
      for (const t of nextFireAt.values()) {
        if (t < min) min = t;
      }
      return min === Infinity ? null : min;
    }
  };
}

function buildMissedTaskNotification(missed) {
  const plural = missed.length > 1;
  const header = 
    `The following one-shot scheduled task${plural ? 's were' : ' was'} missed while the CLI was not running. ` +
    `${plural ? 'They have' : 'It has'} already been removed from .claude/scheduled_tasks.json.`;
  

  const blocks = missed.map(t => {
    const meta = `[${cronToHuman(t.cron)}, created ${new Date(t.createdAt).toLocaleString()}]`;
    const longestRun = (t.prompt.match(/`+/g) || []).reduce((max, run) => Math.max(max, run.length), 0);
    const fence = '`'.repeat(Math.max(3, longestRun + 1));
    return `${meta}\n${fence}\n${t.prompt}\n${fence}`;
  });
  
  return `${header}\n\n${blocks.join('\n\n')}`;
}

export {
  createCronScheduler,
  buildMissedTaskNotification
};
