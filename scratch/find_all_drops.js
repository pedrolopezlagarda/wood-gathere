
import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

let p = 0;
let effectStartLine = 327;

for (let i = 0; i < lines.length; i++) {
    let line = lines[i].split('//')[0];
    for (const char of line) {
        if (char === '(') p++;
        if (char === ')') {
            p--;
            if (i >= effectStartLine && p === 0 && i < 2333) {
                console.log(`Paren count dropped to 0 at line ${i + 1}`);
                console.log(`Line content: ${lines[i]}`);
                // Don't exit, find the FIRST one after effectStartLine
            }
        }
    }
}
