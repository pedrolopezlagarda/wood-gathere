
import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

const checkpoints = [500, 1000, 1500, 2000, 2500, 3000, 3397];
let b = 0;
for (let i = 0; i < lines.length; i++) {
    let line = lines[i].split('//')[0];
    for (const char of line) {
        if (char === '{') b++;
        if (char === '}') b--;
    }
    if (checkpoints.includes(i + 1)) {
        console.log(`Line ${i + 1}: b=${b}`);
    }
}
