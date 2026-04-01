import fs from 'fs';
import path from 'path';
import { parseCronExpression, computeNextCronRun } from './cron.js';

const DEFAULT_CRON_JITTER_CONFIG = {
  minMs: 0,
  maxMs: 0,
  recurringMaxAgeMs: 0
};

function getCronFilePath(dir) {
  if (dir) {
    return path.join(dir, '.claude', 'scheduled_tasks.json');
  }
  return path.join(process.cwd(), '.claude', 'scheduled_tasks.json');
}

function hasCronTasksSync(dir) {
  const filePath = getCronFilePath(dir);
  try {
    const stats = fs.statSync(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

async function readCronTasks(dir) {
  const filePath = getCronFilePath(dir);
  try {
    const data = await fs.promises.readFile(filePath, 'utf8');
    const tasks = JSON.parse(data);
    return Array.isArray(tasks) ? tasks : [];
  } catch {
    return [];
  }
}

async function writeCronTasks(tasks, dir) {
  const filePath = getCronFilePath(dir);
  const dirPath = path.dirname(filePath);
  
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
    await fs.promises.writeFile(filePath, JSON.stringify(tasks, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing cron tasks:', error);
    return false;
  }
}

async function addCronTask(task, dir) {
  const tasks = await readCronTasks(dir);
  tasks.push(task);
  return writeCronTasks(tasks, dir);
}

async function removeCronTasks(ids, dir) {
  const tasks = await readCronTasks(dir);
  const filteredTasks = tasks.filter(task => !ids.includes(task.id));
  return writeCronTasks(filteredTasks, dir);
}

async function markCronTasksFired(ids, now, dir) {
  const tasks = await readCronTasks(dir);
  const updatedTasks = tasks.map(task => {
    if (ids.includes(task.id)) {
      return { ...task, lastFiredAt: now };
    }
    return task;
  });
  return writeCronTasks(updatedTasks, dir);
}

function findMissedTasks(tasks, now) {
  return tasks.filter(task => {
    if (task.recurring) return false;
    const nextRun = new Date(task.createdAt);
    nextRun.setMinutes(nextRun.getMinutes() + 1); // 至少等待1分钟
    return nextRun < now;
  });
}

function jitteredNextCronRunMs(cron, from, taskId, jitterConfig) {
  // parseCronExpression 和 computeNextCronRun 已经在文件顶部导入
  const fields = parseCronExpression(cron);
  if (!fields) return Infinity;
  
  const next = computeNextCronRun(fields, new Date(from));
  if (!next) return Infinity;
  
  const jitterMs = Math.floor(
    Math.random() * (jitterConfig.maxMs - jitterConfig.minMs + 1) + jitterConfig.minMs
  );
  
  return next.getTime() + jitterMs;
}

function oneShotJitteredNextCronRunMs(cron, from, taskId, jitterConfig) {
  return jitteredNextCronRunMs(cron, from, taskId, jitterConfig);
}

export {
  DEFAULT_CRON_JITTER_CONFIG,
  getCronFilePath,
  hasCronTasksSync,
  readCronTasks,
  writeCronTasks,
  addCronTask,
  removeCronTasks,
  markCronTasksFired,
  findMissedTasks,
  jitteredNextCronRunMs,
  oneShotJitteredNextCronRunMs
};
