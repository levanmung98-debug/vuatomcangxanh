import fs from 'fs';

const FILE = 'assets/index-Os1X4Z7e.js';
let code = fs.readFileSync(FILE, 'utf8');

console.log("Original file size:", code.length);

// 1. Replace all occurrences of old logo with new logo
const oldLogo = 'https://iili.io/nd5686N.png';
const newLogo = 'https://iili.io/nue4riJ.png';

const logoMatches = (code.match(new RegExp(oldLogo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
console.log(`Found ${logoMatches} occurrences of old logo`);

code = code.split(oldLogo).join(newLogo);

// 2. Fix the menu cannot swipe up / scroll issue
// Target the exact aside block in the Tm component
const targetAside = `c.jsxs("aside",{className:\`fixed top-0 left-0 h-full w-80 bg-white dark:bg-gray-900 z-50 transform transition-transform duration-300 shadow-2xl \${U?"translate-x-0":"-translate-x-full"}\`,children:[c.jsxs("div",{className:"bg-[#2e7d32] dark:bg-[#1b4d1e] p-8 text-white relative"`;

const replacementAside = `c.jsxs("aside",{className:\`fixed top-0 left-0 h-full max-h-[100dvh] w-80 max-w-[85vw] bg-white dark:bg-gray-900 z-50 transform transition-transform duration-300 shadow-2xl overflow-y-auto overscroll-contain touch-pan-y flex flex-col\`,children:[c.jsxs("div",{className:"bg-[#2e7d32] dark:bg-[#1b4d1e] p-6 text-white relative shrink-0"`;

if (code.includes(targetAside)) {
  code = code.replace(targetAside, replacementAside);
  console.log("Updated aside container to be scrollable with touch-pan-y and flex-col!");
} else {
  console.error("ERROR: Target aside not found!");
  process.exit(1);
}

// Also ensure the nav has proper padding at the bottom (pb-24) so the last items are easily reachable and swipable
const targetNav = `c.jsxs("nav",{className:"p-4 space-y-2 mt-2",children:[_.map`;
const replacementNav = `c.jsxs("nav",{className:"p-4 space-y-2 mt-2 flex-1 pb-24 touch-pan-y",children:[_.map`;

if (code.includes(targetNav)) {
  code = code.replace(targetNav, replacementNav);
  console.log("Updated nav container with touch-pan-y, flex-1, and pb-24!");
} else {
  console.error("ERROR: Target nav not found!");
  process.exit(1);
}

fs.writeFileSync(FILE, code, 'utf8');
console.log("Successfully updated assets/index-Os1X4Z7e.js! New size:", code.length);
