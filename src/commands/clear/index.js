const clearCommand = {
  name: 'clear',
  description: 'Clear the terminal',
  source: 'builtin',
  handler: (args) => {
    console.clear();
    return 'Terminal cleared';
  }
};

module.exports = clearCommand;
