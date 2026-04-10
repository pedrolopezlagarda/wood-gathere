
import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

const stack = [];
for (let i = 0; i < lines.length; i++) {
    let line = lines[i].split('//')[0];
    for (let char of line) {
        if (char === '{') {
            stack.push({ line: i + 1, content: lines[i].trim() });
        }
        if (char === '}') {
            if (stack.length === 0) {
                console.log(`Extra } at line ${i + 1}`);
            } else {
                stack.pop();
            }
        }
    }
}

if (stack.length > 0) {
    console.log("Unclosed blocks:");
    stack.forEach(s => console.log(`Line ${s.line}: ${s.content}`));
}
