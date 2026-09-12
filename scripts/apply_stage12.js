import fs from 'fs';
const FILE = 'assets/index-Os1X4Z7e.js';
let code = fs.readFileSync(FILE, 'utf8');

const target = `]
            })
                // Settlement Modal
      showSettlement && c.jsx("div"`;
const replacement = `]
            }),
                // Settlement Modal
      showSettlement && c.jsx("div"`;

code = code.replace(target, replacement);

fs.writeFileSync(FILE, code, 'utf8');
console.log("Stage 12 (Comma fix) applied!");
