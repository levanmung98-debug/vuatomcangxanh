const fs = require("fs");
const path = require("path");

const bundlePath = path.join(__dirname, "../assets/index-v7.js");
let bundle = fs.readFileSync(bundlePath, "utf8");

const p2 = bundle.indexOf("showHistoryModal && c.jsx");
const pEnd = bundle.indexOf("const Xm_SaleDetailScreen");

if (p2 === -1 || pEnd === -1) {
  console.error("p2 or pEnd not found!");
  process.exit(1);
}

const modalEndIdx = pEnd - 19; // right before \n    ]\n  });\n};\n\n\n

const newHistModal = `showHistoryModal && c.jsx("div", {
        className: "fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[35px] p-6 shadow-2xl space-y-4 border border-gray-200 dark:border-gray-800 max-h-[90vh] flex flex-col",
          children: [
            c.jsxs("div", {
              className: "flex justify-between items-center border-b pb-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("h3", {
                      className: "text-xl font-black uppercase italic tracking-tight text-gray-900 dark:text-white",
                      children: "Lịch Sử Xuất Bán Tôm"
                    }),
                    c.jsxs("p", {
                      className: "text-xs text-gray-500 font-bold",
                      children: ["Tổng số: ", salesList.length, " phiếu xuất bán"]
                    })
                  ]
                }),
                c.jsx("button", {
                  onClick: () => setShowHistoryModal(false),
                  className: "p-2 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer",
                  children: c.jsx(_a, { size: 20 })
                })
              ]
            }),
            // Quick Filter Tabs & Summary
            c.jsxs("div", {
              className: "flex flex-wrap items-center justify-between gap-2 bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-2xl border border-gray-100 dark:border-gray-800 text-xs",
              children: [
                c.jsxs("div", {
                  className: "flex gap-1.5 flex-wrap",
                  children: [
                    c.jsx("button", {
                      type: "button",
                      onClick: () => setBuyerSearch(""),
                      className: \`px-3 py-1 rounded-xl font-bold cursor-pointer transition-all \${!buyerSearch ? "bg-blue-600 text-white shadow-xs" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"}\`,
                      children: "Tất cả"
                    }),
                    c.jsx("button", {
                      type: "button",
                      onClick: () => setBuyerSearch("FACTORY"),
                      className: \`px-3 py-1 rounded-xl font-bold cursor-pointer transition-all \${buyerSearch === "FACTORY" ? "bg-blue-600 text-white shadow-xs" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"}\`,
                      children: "🏢 Xí Nghiệp"
                    }),
                    c.jsx("button", {
                      type: "button",
                      onClick: () => setBuyerSearch("RETAIL"),
                      className: \`px-3 py-1 rounded-xl font-bold cursor-pointer transition-all \${buyerSearch === "RETAIL" ? "bg-blue-600 text-white shadow-xs" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"}\`,
                      children: "🛒 Bán Lẻ"
                    }),
                    c.jsx("button", {
                      type: "button",
                      onClick: () => setBuyerSearch("MARKET"),
                      className: \`px-3 py-1 rounded-xl font-bold cursor-pointer transition-all \${buyerSearch === "MARKET" ? "bg-blue-600 text-white shadow-xs" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"}\`,
                      children: "🏪 Chợ"
                    })
                  ]
                }),
                c.jsxs("div", {
                  className: "text-[11px] font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2",
                  children: [
                    c.jsxs("span", { children: ["Tổng kg: ", c.jsx("strong", { className: "text-blue-600 dark:text-blue-400", children: fmtKg(salesList.reduce((acc, s) => acc + (s.totalNet || s.totalGross || 0), 0)) })] }),
                    c.jsxs("span", { children: ["Tổng tiền: ", c.jsx("strong", { className: "text-red-600 dark:text-red-400", children: _e(salesList.reduce((acc, s) => acc + (s.totalMoney || 0), 0)) + " đ" })] })
                  ]
                })
              ]
            }),
            // Sales tickets list
            c.jsx("div", {
              className: "overflow-y-auto flex-1 space-y-3 pr-1",
              children: (() => {
                const filteredSales = salesList.filter(s => {
                  if (buyerSearch === "FACTORY" || buyerSearch === "RETAIL" || buyerSearch === "MARKET") {
                    return (s.targetGroup || "FACTORY") === buyerSearch;
                  }
                  if (buyerSearch) {
                    const q = buyerSearch.toLowerCase();
                    return (s.buyerName || "").toLowerCase().includes(q) || (s.code || "").toLowerCase().includes(q);
                  }
                  return true;
                });

                if (filteredSales.length === 0) {
                  return c.jsx("p", {
                    className: "text-center text-gray-400 py-12 italic font-bold",
                    children: "Chưa có phiếu xuất bán nào phù hợp."
                  });
                }

                return filteredSales.map(sale => c.jsxs("div", {
                  key: sale.id,
                  className: "p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
                  children: [
                    c.jsxs("div", {
                      className: "space-y-1 flex-1",
                      children: [
                        c.jsxs("div", {
                          className: "flex items-center gap-2",
                          children: [
                            c.jsx("span", { className: "font-mono font-bold text-xs text-blue-600 dark:text-blue-400", children: sale.code }),
                            c.jsx("span", {
                              className: "text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200",
                              children: sale.targetGroup === "FACTORY" ? "🏢 Xí Nghiệp" : (sale.targetGroup === "MARKET" ? "🏪 Chợ" : "🛒 Bán Lẻ")
                            }),
                            c.jsx("span", {
                              className: \`text-[10px] font-bold px-2 py-0.5 rounded-full \${sale.isPaidFull ? "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"}\`,
                              children: sale.isPaidFull ? "Đã thanh toán" : "Ghi nợ"
                            })
                          ]
                        }),
                        c.jsx("h4", { className: "font-black text-base text-gray-900 dark:text-white uppercase", children: sale.buyerName }),
                        c.jsxs("div", {
                          className: "text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-3",
                          children: [
                            c.jsxs("span", { children: ["📅 ", new Date(sale.date).toLocaleDateString("vi-VN")] }),
                            c.jsxs("span", { className: "font-bold text-gray-700 dark:text-gray-300", children: ["⚖️ ", fmtKg(sale.totalNet || sale.totalGross), " kg"] }),
                            c.jsxs("span", { className: "font-black text-red-600 dark:text-red-400", children: ["💰 ", _e(sale.totalMoney), " đ"] })
                          ]
                        })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "flex items-center gap-2 w-full sm:w-auto justify-end",
                      children: [
                        c.jsx("button", {
                          onClick: () => {
                            setShowHistoryModal(false);
                            if (onViewDetail) onViewDetail(sale);
                          },
                          className: "px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase cursor-pointer active:scale-95 transition-all",
                          children: "Chi Tiết"
                        }),
                        c.jsx("button", {
                          onClick: () => {
                            if (confirm("Bạn có chắc chắn muốn xóa phiếu xuất bán này?")) {
                              me.deleteSale(sale.id);
                              refreshData();
                            }
                          },
                          className: "p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer active:scale-95 transition-all",
                          children: c.jsx(xm, { size: 16 })
                        })
                      ]
                    })
                  ]
                }, sale.id));
              })()
            })
          ]
        })
      })`;

bundle = bundle.slice(0, p2) + newHistModal + bundle.slice(modalEndIdx);

// Write to assets/index-v7.js
fs.writeFileSync(bundlePath, bundle, "utf8");

// Synchronize to public/assets/index-v7.js
const publicBundlePath = path.join(__dirname, "../public/assets/index-v7.js");
fs.writeFileSync(publicBundlePath, bundle, "utf8");

// Also synchronize to index-Os1X4Z7e.js in both locations
fs.writeFileSync(path.join(__dirname, "../assets/index-Os1X4Z7e.js"), bundle, "utf8");
fs.writeFileSync(path.join(__dirname, "../public/assets/index-Os1X4Z7e.js"), bundle, "utf8");

console.log("Successfully replaced showHistoryModal with filter tabs and summary statistics!");
