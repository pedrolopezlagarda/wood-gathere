
import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

let p = 0;
let b = 0;
for (let i = 0; i < lines.length; i++) {
    let line = lines[i].split('//')[0];
    for (const char of line) {
        if (char === '(') p++;
        if (char === ')') p--;
        if (char === '{') b++;
        if (char === '}') b--;
    }
    if (i >= 2320 && i <= 2334) {
        console.log(`Line ${i+1}: b=${b} p=${p} content=${lines[i]}`);
    }
}
