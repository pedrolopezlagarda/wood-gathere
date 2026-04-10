
import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

let p = 0;
let effectStartLine = 327;

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (!line) continue;
    
    // Remove comments
    line = line.split('//')[0];
    
    for (const char of line) {
        if (char === '(') p++;
        if (char === ')') {
            p--;
            if (i > effectStartLine && p === 0 && i < 2333) {
                console.log(`useEffect parenthesis closed prematurely at line ${i + 1}`);
                console.log(`Line content: ${lines[i]}`);
                process.exit(0);
            }
        }
    }
}
console.log("Not closed prematurely after filtering comments.");
