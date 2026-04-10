
import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

let openBraces = 0;
let openParens = 0;

for (let i = 0; i < 2334; i++) {
    const line = lines[i];
    if (!line) continue;
    
    for (const char of line) {
        if (char === '{') openBraces++;
        if (char === '}') openBraces--;
        if (char === '(') openParens++;
        if (char === ')') openParens--;
    }
}

console.log(`At line 2334: openBraces=${openBraces}, openParens=${openParens}`);
