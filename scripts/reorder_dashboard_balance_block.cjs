const fs = require("fs");
const path = require("path");

const bundlePath = path.join(__dirname, "../assets/index-v7.js");
let bundle = fs.readFileSync(bundlePath, "utf8");

// 1. Find the current BẢNG CÂN ĐỐI THU MUA & XUẤT TÔM block in Kd
const startMarker = '// BẢNG CÂN ĐỐI THU MUA & XUẤT TÔM';
const endMarker = 'c.jsx("span", { className: "text-indigo-600 dark:text-indigo-400 text-sm font-black", children: "➔" })\n            ]\n          })\n        ]\n      }),';

const pStart = bundle.indexOf(startMarker);
const pEnd = bundle.indexOf(endMarker, pStart);

if (pStart === -1 || pEnd === -1) {
  console.error("Could not locate balance block:", { pStart, pEnd });
  process.exit(1);
}

const balanceBlockWithComma = bundle.slice(pStart, pEnd + endMarker.length);
console.log("Found balance block length:", balanceBlockWithComma.length);

// Remove balanceBlock from its current location (right below the top blue card)
// Check what came right before it
const beforeMarker = 'c.jsx(Sm,{size:140,className:"absolute -right-8 -bottom-8 opacity-10"})]}),\n      ';
const afterMarker = '\n      // BẢNG CÂN ĐỐI THU MUA & XUẤT TÔM';

bundle = bundle.replace(beforeMarker + balanceBlockWithComma, 'c.jsx(Sm,{size:140,className:"absolute -right-8 -bottom-8 opacity-10"})]}),');
console.log("Removed balance block from top of Kd!");

// 2. Now find where the grid buttons end in Kd so we can place it below them (at the bottom of the dashboard scroll view)
// In Kd:
// c.jsxs("button",{onClick:()=>S(re.FARMERS),...children:[...children:"Danh sách ao tôm"})]})]})
const farmersBtnEnd = 'children:"Danh sách ao tôm"})]})]})';
const pFarmers = bundle.indexOf(farmersBtnEnd);
if (pFarmers === -1) {
  console.error("Could not find farmersBtnEnd in bundle!");
  process.exit(1);
}

// Insert the balance block right after the grid of action buttons!
const targetInsert = farmersBtnEnd + ',';
const replacement = farmersBtnEnd + ',\n      ' + balanceBlockWithComma;

bundle = bundle.replace(targetInsert, replacement);
console.log("Inserted balance block at the bottom of Kd dashboard!");

fs.writeFileSync(bundlePath, bundle, "utf8");
console.log("reorder_dashboard_balance_block.cjs completed successfully!");
