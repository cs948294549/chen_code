// Test script to verify tool registration
import { getTools } from './src/services/tools.js';

console.log('Testing tool registration...');
const tools = getTools();
console.log(`Number of tools: ${tools.length}`);
console.log('Tools:', tools.map(t => ({ name: t.name, description: t.description })));
