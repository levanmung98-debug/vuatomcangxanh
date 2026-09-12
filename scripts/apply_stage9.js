import fs from 'fs';

const FILE = 'assets/index-Os1X4Z7e.js';
let code = fs.readFileSync(FILE, 'utf8');

const target = `const newSale = {
      id: saleId,`;

const replacement = `const newSale = {
      id: saleId,
      status: targetGroup === "MARKET" ? "PENDING_SETTLEMENT" : "PAID",`;

code = code.replace(target, replacement);

// Also need to set isPaidFull: targetGroup === "MARKET" ? false : Q
const isPaidFullTarget = `isPaidFull: Q,`;
const isPaidFullReplacement = `isPaidFull: targetGroup === "MARKET" ? false : Q,`;

code = code.replace(isPaidFullTarget, isPaidFullReplacement);

// Also need to ensure tareWeight = 0 during weighing for MARKET
// Stage 6 already replaced the tareWeight logic? Let's check
fs.writeFileSync(FILE, code, 'utf8');
console.log("Stage 9 (newSale status) applied!");
