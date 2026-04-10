
import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

let openParens = 0;

for (let i = 0; i < 2334; i++) {
    const line = lines[i];
    if (!line) continue;
    
    for (const char of line) {
        if (char === '(') openParens++;
        if (char === ')') openParens--;
    }
    if (openParens < 0) {
        console.log(`Paren imbalance at line ${i + 1}: current count = ${openParens}`);
        console.log(`Line content: ${line}`);
        process.exit(1);
    }
}
