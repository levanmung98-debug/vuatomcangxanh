import fs from 'fs';

const FILE = 'assets/index-Os1X4Z7e.js';
let code = fs.readFileSync(FILE, 'utf8');

// 1. First, inside Xm_SaleDetailScreen, locate the "Trạng thái thanh toán" section and add the Quyết toán UI.
const paymentStatusTarget = `children: sale.isPaidFull ? "✓ Đã thu đủ 100%" : ("Nợ lại: " + _e(sale.remainingDebt) + " đ")
                    })
                  ]
                })`;

const paymentStatusReplacement = `children: sale.status === "PENDING_SETTLEMENT" ? "⏳ CHỜ QUYẾT TOÁN" : (sale.isPaidFull ? "✓ Đã thu đủ 100%" : ("Nợ lại: " + _e(sale.remainingDebt) + " đ"))
                    })
                  ]
                }),
                sale.status === "PENDING_SETTLEMENT" && c.jsx("button", {
                  onClick: () => setShowSettlement(true),
                  className: "w-full py-3 mt-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-sm uppercase italic active:scale-95 transition-all shadow-md",
                  children: "📝 Quyết Toán Phiếu Chợ"
                })
                `;

let start = code.indexOf("const Xm_SaleDetailScreen =");
let end = code.indexOf("const Xm_ContractModal =", start);
let compCode = code.slice(start, end);

compCode = compCode.replace(paymentStatusTarget, paymentStatusReplacement);

// 2. Add the Settlement Modal at the end of the return statement
const returnEndTarget = `]
        })
      })
    ]
  });
};`;

const settlementModalUI = `
      // Settlement Modal
      showSettlement && c.jsx("div", {
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200",
          children: [
            c.jsx("h3", {
              className: "font-black text-lg mb-4 text-gray-900 dark:text-white uppercase tracking-tight",
              children: "Quyết Toán Chợ"
            }),
            c.jsxs("div", {
              className: "space-y-4 mb-6",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-xs font-bold text-gray-500 mb-1 block uppercase", children: "Tổng trừ bì / Hao hụt (kg)" }),
                    c.jsx("input", {
                      type: "number", step: "any",
                      value: settleData.tare || "",
                      onChange: e => setSettleData({ ...settleData, tare: Number(e.target.value) || 0 }),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-lg outline-none focus:border-blue-500"
                    })
                  ]
                }),
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-xs font-bold text-gray-500 mb-1 block uppercase", children: "Tiền bán được (VNĐ)" }),
                    c.jsx("input", {
                      type: "number",
                      value: settleData.saleMoney || "",
                      onChange: e => setSettleData({ ...settleData, saleMoney: Number(e.target.value) || 0 }),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-lg outline-none focus:border-blue-500"
                    })
                  ]
                }),
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-xs font-bold text-gray-500 mb-1 block uppercase", children: "Trừ hoa hồng vựa (VNĐ)" }),
                    c.jsx("input", {
                      type: "number",
                      value: settleData.commission || "",
                      onChange: e => setSettleData({ ...settleData, commission: Number(e.target.value) || 0 }),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-lg outline-none focus:border-blue-500"
                    })
                  ]
                })
              ]
            }),
            c.jsxs("div", {
              className: "flex gap-3 justify-end",
              children: [
                c.jsx("button", {
                  onClick: () => setShowSettlement(false),
                  className: "px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold rounded-xl",
                  children: "Hủy"
                }),
                c.jsx("button", {
                  onClick: () => {
                    const finalNet = sale.totalGross - (settleData.tare || 0);
                    const finalMoney = (settleData.saleMoney || 0) - (settleData.commission || 0);
                    const updates = {
                      totalTare: settleData.tare || 0,
                      totalNet: finalNet,
                      marketSaleMoney: settleData.saleMoney || 0,
                      marketCommission: settleData.commission || 0,
                      totalMoney: finalMoney,
                      status: "SETTLED",
                      isPaidFull: true,
                      remainingDebt: 0,
                      paidAmount: finalMoney
                    };
                    const saved = me.updateSale(sale.id, updates);
                    if (saved) {
                      setSale(saved);
                      setShowSettlement(false);
                      // Force refresh the list when back
                    }
                  },
                  className: "px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl shadow-lg",
                  children: "Lưu Quyết Toán"
                })
              ]
            })
          ]
        })
      })
` + returnEndTarget;

compCode = compCode.replace(returnEndTarget, settlementModalUI);

code = code.slice(0, start) + compCode + code.slice(end);

fs.writeFileSync(FILE, code, 'utf8');
console.log("Stage 8 (Quyết toán UI) applied!");
