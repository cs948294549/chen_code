#!/usr/bin/env node

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Claudecode CLI Client');
console.log('Type exit to quit');

function ask() {
  rl.question('> ', function(answer) {
    if (answer === 'exit') {
      console.log('Goodbye');
      rl.close();
      return;
    }
    console.log('You entered: ' + answer);
    ask();
  });
}

ask();