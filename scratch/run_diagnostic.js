const fs = require('fs');
const path = require('path');

// Mock next/server
const processCwd = process.cwd();
console.log('Current working directory:', processCwd);

// Let's load the functions by reading the code and evaluating it or rewriting a test in commonjs
const csvDir = path.join(processCwd, 'data', 'csv');
console.log('CSV Directory:', csvDir);
console.log('Files in CSV Directory:', fs.existsSync(csvDir) ? fs.readdirSync(csvDir) : 'Directory not found');

// Load libraries manually using require
try {
  const { parseNomeados, parseMatricula, parseTutores } = require('./app/lib/csvParser.js');
  console.log('Loaded csvParser successfully!');
} catch (e) {
  console.error('Error loading csvParser:', e.message, e.stack);
}
