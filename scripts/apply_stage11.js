import fs from 'fs';
const FILE = 'assets/index-Os1X4Z7e.js';
let code = fs.readFileSync(FILE, 'utf8');

// There might be multiple matches. Let's fix it surgically
const target = `const newSale = {
      id: saleId,
      status: targetGroup === "MARKET" ? "PENDING_SETTLEMENT" : "PAID",
      code: codePrefix + "-" + saleId.slice(-6),`;

// Re-write to make sure we only replace inside handleConfirmSaveSession of Xm_SalesScreen
let start = code.indexOf("const handleConfirmSaveSession = () => {");
let end = code.indexOf("me.addSale(newSale);", start);
let block = code.slice(start, end);

block = block.replace("isPaidFull: Q,", 'isPaidFull: targetGroup === "MARKET" ? false : Q,');
code = code.slice(0, start) + block + code.slice(end);

fs.writeFileSync(FILE, code, 'utf8');
console.log("Stage 11 applied!");
