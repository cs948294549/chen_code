import { removeCronTasks } from '../../../utils/cronTasks.js';

function deleteCronTaskCommand() {
  return {
    name: 'cron:delete',
    description: 'Delete a scheduled task',
    handler: async (args, context) => {
      if (args.length < 1) {
        return 'Usage: /cron:delete <task_id> - Delete a scheduled task';
      }
      
      const taskId = args[0];
      
      const success = await removeCronTasks([taskId]);
      if (success) {
        return `Deleted scheduled task: ${taskId}`;
      } else {
        return 'Failed to delete scheduled task';
      }
    }
  };
}

export default deleteCronTaskCommand();
