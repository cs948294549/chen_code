import { addCronTask } from '../../../utils/cronTasks.js';
import { parseCronExpression, cronToHuman } from '../../../utils/cron.js';

function generateId() {
  return `cron_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createCronTaskCommand() {
  return {
    name: 'cron:create',
    description: 'Create a scheduled task',
    handler: async (args, context) => {
      if (args.length < 6) {
        return 'Usage: /cron:create <cron_expression> <prompt> - Create a scheduled task';
      }
      
      // 提取 cron 表达式（前5个参数）
      const cronExpression = args.slice(0, 5).join(' ');
      // 提取提示（剩下的参数）
      const prompt = args.slice(5).join(' ');
      
      // Validate cron expression
      const parsed = parseCronExpression(cronExpression);
      if (!parsed) {
        return 'Invalid cron expression. Please use the format: minute hour day-of-month month day-of-week';
      }
      
      const task = {
        id: generateId(),
        cron: cronExpression,
        prompt: prompt,
        createdAt: Date.now(),
        recurring: true,
        permanent: false
      };
      
      const success = await addCronTask(task);
      if (success) {
        return `Created scheduled task: ${task.id}\nCron: ${cronExpression} (${cronToHuman(cronExpression)})\nPrompt: ${prompt}\nCreated: ${new Date().toLocaleString()}\nType: Recurring`;
      } else {
        return 'Failed to create scheduled task';
      }
    }
  };
}

export default createCronTaskCommand();
