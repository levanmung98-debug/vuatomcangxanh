const fs = require("fs");
const path = require("path");

const bundlePath = path.join(__dirname, "../assets/index-v7.js");
let bundle = fs.readFileSync(bundlePath, "utf8");

const target = 'children:"Danh sách ao tôm"})]})]})]}),';

const balanceBlock = 'children:"Danh sách ao tôm"})]})]})]}),\n' +
  '      // BẢNG CÂN ĐỐI THU MUA & XUẤT TÔM\n' +
  '      c.jsxs("div", {\n' +
  '        className: "bg-white dark:bg-gray-900 rounded-[35px] p-5 border border-gray-200 dark:border-gray-800 shadow-lg space-y-4 mt-2",\n' +
  '        children: [\n' +
  '          c.jsxs("div", {\n' +
  '            className: "flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3",\n' +
  '            children: [\n' +
  '              c.jsxs("div", {\n' +
  '                className: "flex items-center gap-2",\n' +
  '                children: [\n' +
  '                  c.jsx("span", { className: "text-xl", children: "📊" }),\n' +
  '                  c.jsxs("div", {\n' +
  '                    children: [\n' +
  '                      c.jsx("h3", { className: "text-base font-black uppercase italic tracking-tight text-gray-900 dark:text-white", children: "Cân Đối Thu Mua & Xuất Tôm" }),\n' +
  '                      c.jsxs("p", { className: "text-[10px] font-bold text-gray-500", children: ["Ngày: ", dashDate, " • ", activeBuySessions.length, " phiếu mua • ", activeCompletedSales.length, " đơn bán"] })\n' +
  '                    ]\n' +
  '                  })\n' +
  '                ]\n' +
  '              }),\n' +
  '              c.jsxs("button", {\n' +
  '                type: "button",\n' +
  '                onClick: () => S(re.FINANCE),\n' +
  '                className: "px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-tight flex items-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer",\n' +
  '                children: [\n' +
  '                  c.jsx("span", { children: "💰" }),\n' +
  '                  "Tài Chính"\n' +
  '                ]\n' +
  '              })\n' +
  '            ]\n' +
  '          }),\n' +
  '          // 4 Grid Columns: Mua Vào | Đã Bán | Đang Xuất Bán | Hao Hụt\n' +
  '          c.jsxs("div", {\n' +
  '            className: "grid grid-cols-2 sm:grid-cols-4 gap-2.5",\n' +
  '            children: [\n' +
  '              // Col 1: Mua Vào\n' +
  '              c.jsxs("div", {\n' +
  '                className: "bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-1",\n' +
  '                children: [\n' +
  '                  c.jsxs("div", {\n' +
  '                    className: "flex items-center justify-between",\n' +
  '                    children: [\n' +
  '                      c.jsx("span", { className: "text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300", children: "📥 Mua Vào" }),\n' +
  '                      c.jsx("span", { className: "text-xs", children: "⚖️" })\n' +
  '                    ]\n' +
  '                  }),\n' +
  '                  c.jsxs("div", { className: "font-mono font-black text-lg text-emerald-900 dark:text-emerald-100 leading-none", children: [_fmtKg(totalBuyKg), " ", c.jsx("span", { className: "text-xs font-sans", children: "kg" })] }),\n' +
  '                  c.jsxs("div", { className: "text-[11px] font-bold text-emerald-700 dark:text-emerald-400 font-mono truncate", children: [_fmt(totalBuyMoney), " đ"] })\n' +
  '                ]\n' +
  '              }),\n' +
  '              // Col 2: Đã Bán Hoàn Tất\n' +
  '              c.jsxs("div", {\n' +
  '                className: "bg-blue-50 dark:bg-blue-950/40 p-3 rounded-2xl border border-blue-200 dark:border-blue-800 space-y-1",\n' +
  '                children: [\n' +
  '                  c.jsxs("div", {\n' +
  '                    className: "flex items-center justify-between",\n' +
  '                    children: [\n' +
  '                      c.jsx("span", { className: "text-[10px] font-black uppercase text-blue-800 dark:text-blue-300", children: "📤 Bán Ra (Xong)" }),\n' +
  '                      c.jsx("span", { className: "text-xs", children: "💵" })\n' +
  '                    ]\n' +
  '                  }),\n' +
  '                  c.jsxs("div", { className: "font-mono font-black text-lg text-blue-900 dark:text-blue-100 leading-none", children: [_fmtKg(totalSoldKg), " ", c.jsx("span", { className: "text-xs font-sans", children: "kg" })] }),\n' +
  '                  c.jsxs("div", { className: "text-[11px] font-bold text-blue-700 dark:text-blue-400 font-mono truncate", children: [_fmt(totalSoldMoney), " đ"] })\n' +
  '                ]\n' +
  '              }),\n' +
  '              // Col 3: Đang Bán / Chờ Kết Quả\n' +
  '              c.jsxs("div", {\n' +
  '                className: "bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-1",\n' +
  '                children: [\n' +
  '                  c.jsxs("div", {\n' +
  '                    className: "flex items-center justify-between",\n' +
  '                    children: [\n' +
  '                      c.jsx("span", { className: "text-[10px] font-black uppercase text-amber-800 dark:text-amber-300", children: "⏳ Đang Bán" }),\n' +
  '                      c.jsx("span", { className: "text-xs", children: "🚛" })\n' +
  '                    ]\n' +
  '                  }),\n' +
  '                  c.jsxs("div", { className: "font-mono font-black text-lg text-amber-900 dark:text-amber-100 leading-none", children: [totalSellingPhi, " ", c.jsx("span", { className: "text-xs font-sans", children: "phi chợ" })] }),\n' +
  '                  c.jsxs("div", { className: "text-[11px] font-bold text-amber-700 dark:text-amber-400 truncate", children: [awaitingFactoryCount, " đơn cty chờ kq"] })\n' +
  '                ]\n' +
  '              }),\n' +
  '              // Col 4: Hao Hụt & Chênh Lệch\n' +
  '              c.jsxs("div", {\n' +
  '                className: "bg-purple-50 dark:bg-purple-950/40 p-3 rounded-2xl border border-purple-200 dark:border-purple-800 space-y-1",\n' +
  '                children: [\n' +
  '                  c.jsxs("div", {\n' +
  '                    className: "flex items-center justify-between",\n' +
  '                    children: [\n' +
  '                      c.jsx("span", { className: "text-[10px] font-black uppercase text-purple-800 dark:text-purple-300", children: "📉 Hao Hụt" }),\n' +
  '                      c.jsx("span", { className: "text-xs", children: "🦐" })\n' +
  '                    ]\n' +
  '                  }),\n' +
  '                  c.jsxs("div", { className: "font-mono font-black text-lg text-purple-900 dark:text-purple-100 leading-none", children: [diffKg > 0 ? "-" + _fmtKg(diffKg) : _fmtKg(diffKg), " ", c.jsx("span", { className: "text-xs font-sans", children: "kg" })] }),\n' +
  '                  c.jsxs("div", {\n' +
  '                    className: "text-[11px] font-bold " + (lossRate > 5 ? "text-red-600 dark:text-red-400" : "text-purple-700 dark:text-purple-400") + " font-mono",\n' +
  '                    children: [lossRate > 0 ? ("Hao " + lossRate.toFixed(1) + "%") : "Cân đối"]\n' +
  '                  })\n' +
  '                ]\n' +
  '              })\n' +
  '            ]\n' +
  '          }),\n' +
  '          // Shortcut CTA to Finance tab\n' +
  '          c.jsxs("div", {\n' +
  '            onClick: () => S(re.FINANCE),\n' +
  '            className: "p-3 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-950/40 dark:to-purple-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between cursor-pointer hover:border-indigo-400 transition-all",\n' +
  '            children: [\n' +
  '              c.jsxs("div", {\n' +
  '                className: "flex items-center gap-2.5",\n' +
  '                children: [\n' +
  '                  c.jsx("div", { className: "w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm", children: "💰" }),\n' +
  '                  c.jsxs("div", {\n' +
  '                    children: [\n' +
  '                      c.jsx("span", { className: "text-xs font-black uppercase text-indigo-950 dark:text-indigo-200 block", children: "Quyết Toán Tài Chính & Chia Lời Lỗ Hùn Vốn" }),\n' +
  '                      c.jsx("span", { className: "text-[10px] text-gray-500 dark:text-gray-400 font-bold", children: "Góp vốn • Hạch toán chi phí • Chia lãi theo tỷ lệ %" })\n' +
  '                    ]\n' +
  '                  })\n' +
  '                ]\n' +
  '              }),\n' +
  '              c.jsx("span", { className: "text-indigo-600 dark:text-indigo-400 text-sm font-black", children: "➔" })\n' +
  '            ]\n' +
  '          })\n' +
  '        ]\n' +
  '      }),';

if (bundle.includes(target)) {
  bundle = bundle.replace(target, balanceBlock);
  fs.writeFileSync(bundlePath, bundle, "utf8");
  console.log("Successfully placed balance block at the bottom of Dashboard Kd!");
} else {
  console.error("Target string not found in bundle!");
}
