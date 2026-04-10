
import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

let openParens = 0;

for (let i = 0; i < 2334; i++) {
    const line = lines[i];
    if (!line) continue;
    
    let prev = openParens;
    for (const char of line) {
        if (char === '(') openParens++;
        if (char === ')') openParens--;
    }
    
    if (i >= 325 && openParens === 0 && prev === 1) {
        console.log(`Paren count dropped to 0 at line ${i + 1}`);
        console.log(`Line content: ${line}`);
    }
}
