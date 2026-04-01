const exitCommand = {
  name: 'exit',
  description: 'Exit the program',
  source: 'builtin',
  handler: (args) => {
    process.exit(0);
  }
};

export default exitCommand;
