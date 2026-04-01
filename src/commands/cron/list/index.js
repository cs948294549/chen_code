import { readCronTasks } from '../../../utils/cronTasks.js';
import { cronToHuman } from '../../../utils/cron.js';

function listCronTasksCommand() {
  return {
    name: 'cron:list',
    description: 'List all scheduled tasks',
    handler: async (args, context) => {
      const tasks = await readCronTasks();
      
      if (tasks.length === 0) {
        return 'No scheduled tasks found';
      }
      
      let result = 'Scheduled Tasks:\n';
      tasks.forEach((task, index) => {
        result += `\n${index + 1}. ID: ${task.id}\n`;
        result += `   Cron: ${task.cron} (${cronToHuman(task.cron)})\n`;
        result += `   Prompt: ${task.prompt}\n`;
        result += `   Created: ${new Date(task.createdAt).toLocaleString()}\n`;
        result += `   Type: ${task.recurring ? 'Recurring' : 'One-time'}\n`;
        if (task.lastFiredAt) {
          result += `   Last Fired: ${new Date(task.lastFiredAt).toLocaleString()}\n`;
        }
      });
      
      return result;
    }
  };
}

export default listCronTasksCommand();
