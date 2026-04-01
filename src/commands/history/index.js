import { getHistory } from '../../history.js';

const historyCommand = {
  name: 'history',
  description: 'Show command history',
  source: 'builtin',
  handler: (args) => {
    const history = getHistory();
    if (history.length === 0) {
      return 'No history available';
    }
    let historyText = 'History:\n';
    history.forEach((item, index) => {
      historyText += `${index + 1}. ${item}\n`;
    });
    return historyText;
  }
};

export default historyCommand;
