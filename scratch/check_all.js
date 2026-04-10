
import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

let p = 0; // parens ()
let b = 0; // braces {}
let k = 0; // brackets []

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    
    for (const char of line) {
        if (char === '(') p++;
        if (char === ')') p--;
        if (char === '{') b++;
        if (char === '}') b--;
        if (char === '[') k++;
        if (char === ']') k--;
        
        if (p < 0 || b < 0 || k < 0) {
            console.log(`Imbalance on line ${i + 1}: p=${p}, b=${b}, k=${k}`);
            console.log(`Char: ${char}`);
            console.log(`Line Content: ${line}`);
            process.exit(1);
        }
    }
}
console.log("All balanced up to end of file.");
