import fs from 'fs';
const FILE = 'assets/index-Os1X4Z7e.js';
let code = fs.readFileSync(FILE, 'utf8');

const target = `if (Array.isArray(parsed) && parsed.length > 0) return parsed;`;
const replacement = `if (Array.isArray(parsed)) return parsed;`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync(FILE, code, 'utf8');
    console.log("Bug fixed!");
} else {
    console.log("Target not found");
}
