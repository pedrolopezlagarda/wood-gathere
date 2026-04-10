
import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf8');
let p = 0;
let inString = false;
let stringChar = '';
let inComment = false;
let inBlockComment = false;

for (let i = 0; i < content.length; i++) {
    let c = content[i];
    let next = content[i+1];
    
    if (inComment) {
        if (c === '\n') inComment = false;
        continue;
    }
    if (inBlockComment) {
        if (c === '*' && next === '/') {
            inBlockComment = false;
            i++;
        }
        continue;
    }
    if (inString) {
        if (c === stringChar && content[i-1] !== '\\') inString = false;
        continue;
    }
    
    if (c === '/' && next === '/') { inComment = true; i++; continue; }
    if (c === '/' && next === '*') { inBlockComment = true; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { inString = true; stringChar = c; continue; }
    
    if (c === '(') p++;
    if (c === ')') {
        p--;
        if (p < 0) {
            console.log(`Extra ) found at i=${i}`);
            let start = Math.max(0, i - 100);
            let end = Math.min(content.length, i + 100);
            console.log(`Context: ${content.substring(start, end)}`);
            process.exit(0);
        }
    }
}
console.log(`Final p=${p}`);
