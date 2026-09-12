import fs from 'fs';

const FILE = 'assets/index-Os1X4Z7e.js';
let code = fs.readFileSync(FILE, 'utf8');

// Inject updateSale
const meAddSaleStr = `me.addSale = function(sale) {`;
const meUpdateSaleStr = `me.updateSale = function(id, updates) {
  const list = me.getSales();
  const index = list.findIndex(s => s.id === id);
  if (index !== -1) {
    list[index] = { ...list[index], ...updates };
    me.saveSales(list);
    return list[index];
  }
  return null;
};
`;
if (!code.includes("me.updateSale")) {
    code = code.replace(meAddSaleStr, meUpdateSaleStr + meAddSaleStr);
}

fs.writeFileSync(FILE, code, 'utf8');
console.log("Stage 7a (updateSale) applied!");
