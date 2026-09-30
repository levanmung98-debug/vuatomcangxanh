const fs = require("fs");
const path = require("path");

const bundlePath = path.join(__dirname, "../assets/index-v7.js");
let bundle = fs.readFileSync(bundlePath, "utf8");

// =========================================================================
// 1. UPGRADE Xm_SaleDetailScreen:
//    - Add Zalo Share in header
//    - Add interactive batch clicking to see weighing codes & stats
//    - Add dynamic 5x5 weights table with batch tabs & page grid
// =========================================================================

const oldSaleDetailStart = "const Xm_SaleDetailScreen = ({ setRoute, sale: initialSale, onBack }) => {";
const nextSectionMarker = "const BmMainApp=";

const pStart = bundle.indexOf(oldSaleDetailStart);
const pEnd = bundle.indexOf(nextSectionMarker, pStart);

console.log("pStart:", pStart, "pEnd:", pEnd);

if (pStart === -1 || pEnd === -1) {
  console.error("Could not find Xm_SaleDetailScreen boundaries!");
  process.exit(1);
}

const newSaleDetailComponent = `const Xm_SaleDetailScreen = ({ setRoute, sale: initialSale, onBack }) => {
  const [sale, setSale] = w.useState(initialSale);
  const [showSettlement, setShowSettlement] = w.useState(false);
  const [settleData, setSettleData] = w.useState({ tare: 0, saleMoney: 0, commission: 0 });
  const [showPayDebtModal, setShowPayDebtModal] = w.useState(false);
  const [selectedBatchIdx, setSelectedBatchIdx] = w.useState(0);

  if (!sale) {
    return c.jsxs("div", {
      className: "p-6 text-center space-y-3",
      children: [
        c.jsx("p", { children: "Không tìm thấy thông tin phiếu xuất bán." }),
        c.jsx("button", {
          onClick: () => onBack ? onBack() : setRoute(re.SALES),
          className: "px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold",
          children: "Quay lại"
        })
      ]
    });
  }

  const grp = SALE_GROUPS[sale.targetGroup] || SALE_GROUPS.FACTORY;
  const d = new Date(sale.date);
  const timeStr = d.toLocaleDateString("vi-VN") + " " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const _e = ($) => Number($ || 0).toLocaleString("vi-VN");
  const fmtKg = (n) => {
    if (!n || n <= 0) return "0";
    const r = Math.round(n * 100) / 100;
    return Number.isInteger(r) ? String(r) : String(r);
  };

  const getWeightsGridForBatch = (bt, fallback) => {
    if (bt && Array.isArray(bt.weights) && bt.weights.length > 0) {
      if (Array.isArray(bt.weights[0]) && Array.isArray(bt.weights[0][0])) {
        return bt.weights;
      }
      if (Array.isArray(bt.weights[0])) {
        return [bt.weights];
      }
    }
    if (Array.isArray(fallback) && fallback.length > 0) {
      return fallback;
    }
    return [];
  };

  const getWeightsListFromGrid = (grid) => {
    const list = [];
    if (Array.isArray(grid)) {
      grid.forEach(page => {
        if (Array.isArray(page)) {
          page.forEach(row => {
            if (Array.isArray(row)) {
              row.forEach(val => {
                const n = Number(val);
                if (n > 0) list.push(n);
              });
            }
          });
        }
      });
    }
    return list;
  };

  const getWeightsListForBatch = (bt, fallback) => {
    if (bt && Array.isArray(bt.weights) && bt.weights.length > 0) {
      if (typeof bt.weights[0] === "number") {
        return bt.weights.filter(n => n > 0);
      }
      return getWeightsListFromGrid(getWeightsGridForBatch(bt, fallback));
    }
    return getWeightsListFromGrid(getWeightsGridForBatch(bt, fallback));
  };

  const ensure5x5Grid = (weightsList, existingGrid) => {
    if (existingGrid && existingGrid.length > 0 && Array.isArray(existingGrid[0])) {
      return existingGrid;
    }
    if (!weightsList || weightsList.length === 0) return [];
    const pages = [];
    for (let i = 0; i < weightsList.length; i += 25) {
      const pageSlice = weightsList.slice(i, i + 25);
      const page5x5 = [];
      for (let r = 0; r < 5; r++) {
        const row = [];
        for (let c = 0; c < 5; c++) {
          const idx = r * 5 + c;
          row.push(idx < pageSlice.length ? pageSlice[idx] : 0);
        }
        page5x5.push(row);
      }
      pages.push(page5x5);
    }
    return pages.length > 0 ? pages : [Array(5).fill(0).map(() => Array(5).fill(0))];
  };

  const openDirections = () => {
    let url = "";
    if (sale.buyerLatitude && sale.buyerLongitude) {
      url = "https://www.google.com/maps/dir/?api=1&destination=" + sale.buyerLatitude + "," + sale.buyerLongitude;
    } else if (sale.buyerAddress) {
      url = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(sale.buyerAddress);
    } else {
      url = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(sale.buyerName);
    }
    window.open(url, "_blank");
  };

  const handleShareZalo = () => {
    if (!sale) return;
    let msg = "🦐 [PHIẾU XUẤT BÁN TÔM CÀNG XANH]\\n";
    msg += "Mã phiếu: " + (sale.code || "") + "\\n";
    msg += "Khách hàng: " + (sale.buyerName || "Khách mua") + "\\n";
    if (sale.buyerPhone) msg += "Điện thoại: " + sale.buyerPhone + "\\n";
    if (sale.buyerAddress) msg += "Địa chỉ: " + sale.buyerAddress + "\\n";
    if (sale.buyerRepresentative) msg += "Người đại diện: " + sale.buyerRepresentative + "\\n";
    if (sale.vehiclePlate) msg += "Biển số xe: " + sale.vehiclePlate + (sale.driverName ? (" (" + sale.driverName + ")") : "") + "\\n";
    msg += "Thời gian: " + timeStr + "\\n";
    msg += "--------------------------------\\n";
    if (sale.batches && sale.batches.length > 0) {
      sale.batches.forEach((b, idx) => {
        msg += (idx + 1) + ". " + b.typeName + ": " + fmtKg(b.net) + " kg x " + _e(b.unitPrice) + "đ/kg = " + _e(b.money) + "đ\\n";
      });
    } else {
      msg += "Loại tôm: " + sale.riceType + "\\n";
      msg += "Khối lượng: " + fmtKg(sale.totalNet) + " kg x " + _e(sale.unitPrice) + "đ/kg\\n";
    }
    msg += "--------------------------------\\n";
    msg += "Tổng số lượng: " + (sale.totalBales || 0) + " giỏ/sọt\\n";
    msg += "Quy cách: KHÔNG TRỪ BÌ (100% Cân = Tính tiền)\\n";
    msg += "TỔNG KHỐI LƯỢNG THỰC: " + fmtKg(sale.totalNet) + " kg\\n";
    msg += "TỔNG THÀNH TIỀN: " + _e(sale.totalMoney) + " VNĐ\\n";
    if (typeof numberToWordsVN_v3 === "function") {
      msg += "(Bằng chữ: " + numberToWordsVN_v3(sale.totalMoney) + ")\\n";
    }
    msg += "Trạng thái: " + (sale.status === "PENDING_SETTLEMENT" ? "Chờ quyết toán chợ" : (sale.isPaidFull ? "Đã thu đủ 100%" : ("Ghi nợ: " + _e(sale.remainingDebt) + " đ"))) + "\\n";
    try {
      navigator.clipboard.writeText(msg);
      alert("Đã sao chép nội dung phiếu xuất bán! Đang mở Zalo...");
      window.open("https://zalo.me", "_blank");
    } catch(e) {
      alert("Nội dung phiếu xuất bán:\\n\\n" + msg);
    }
  };

  const batchesList = (sale.batches && sale.batches.length > 0) ? sale.batches : [{
    typeName: sale.riceType || "Tôm càng sen",
    unitPrice: sale.unitPrice || 0,
    net: sale.totalNet || sale.totalGross || 0,
    gross: sale.totalGross || sale.totalNet || 0,
    bales: sale.totalBales || 0,
    money: sale.totalMoney || 0,
    weights: sale.weights || []
  }];

  const activeBatch = batchesList[selectedBatchIdx] || batchesList[0] || null;
  const activeWeightsList = activeBatch ? getWeightsListForBatch(activeBatch, selectedBatchIdx === 0 ? sale.weights : []) : (Array.isArray(sale.weights) ? getWeightsListFromGrid(sale.weights) : []);
  const rawGrid = activeBatch ? getWeightsGridForBatch(activeBatch, selectedBatchIdx === 0 ? sale.weights : []) : (Array.isArray(sale.weights) ? sale.weights : []);
  const displayGrid = rawGrid && rawGrid.length > 0 ? rawGrid : ensure5x5Grid(activeWeightsList, null);

  return c.jsxs("div", {
    className: "flex flex-col h-screen bg-gray-50 dark:bg-[#121212] overflow-hidden text-gray-900 dark:text-gray-100",
    children: [
      c.jsxs("header", {
        className: "bg-[#1e4ea1] text-white p-4 flex items-center justify-between shadow-lg sticky top-0 z-30 shrink-0",
        children: [
          c.jsxs("div", {
            className: "flex items-center gap-3",
            children: [
              c.jsx("button", {
                onClick: () => onBack ? onBack() : setRoute(re.SALES),
                className: "p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-90 cursor-pointer",
                children: c.jsx(On, { size: 20 })
              }),
              c.jsxs("div", {
                children: [
                  c.jsxs("h2", {
                    className: "text-lg font-black uppercase italic tracking-tight",
                    children: ["Phiếu Bán: ", sale.code]
                  }),
                  c.jsx("span", {
                    className: "text-[10px] font-bold opacity-80 block",
                    children: timeStr
                  })
                ]
              })
            ]
          }),
          c.jsxs("div", {
            className: "flex items-center gap-2",
            children: [
              c.jsxs("button", {
                type: "button",
                onClick: handleShareZalo,
                className: "px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase inline-flex items-center gap-1 shadow-md cursor-pointer active:scale-95 transition-all",
                children: ["Zalo"]
              }),
              c.jsxs("button", {
                onClick: () => window.print(),
                className: "px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer",
                children: [c.jsx("span", { children: "🖨️" }), "In Phiếu"]
              })
            ]
          })
        ]
      }),
      c.jsx("div", {
        className: "flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl mx-auto w-full pb-24",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm space-y-4",
          children: [
            // Header badge & buyer info
            c.jsxs("div", {
              className: "border-b border-gray-100 dark:border-gray-800 pb-4 space-y-2",
              children: [
                c.jsxs("div", {
                  className: "flex items-center justify-between",
                  children: [
                    c.jsxs("span", {
                      className: "px-3 py-1 rounded-xl text-xs font-black uppercase " + grp.badgeBg,
                      children: [grp.icon, " ", grp.label]
                    }),
                    c.jsx("span", {
                      className: "text-xs font-mono font-bold text-gray-500",
                      children: sale.code
                    })
                  ]
                }),
                c.jsx("h3", {
                  className: "text-xl font-black text-gray-900 dark:text-white",
                  children: sale.buyerName
                }),
                sale.buyerRepresentative && c.jsxs("div", {
                  className: "text-xs text-gray-600 dark:text-gray-400 font-bold",
                  children: ["👤 Người đại diện: ", c.jsx("b", { className: "text-gray-900 dark:text-white", children: sale.buyerRepresentative })]
                }),
                sale.buyerPhone && c.jsxs("div", {
                  className: "text-xs text-gray-600 dark:text-gray-400",
                  children: ["📞 SĐT: ", c.jsx("a", { href: "tel:" + sale.buyerPhone, className: "font-mono font-black text-blue-600 hover:underline", children: sale.buyerPhone })]
                }),
                sale.buyerAddress && c.jsxs("div", {
                  className: "text-xs text-gray-600 dark:text-gray-400 flex items-start justify-between gap-2 pt-1",
                  children: [
                    c.jsxs("span", { children: ["📍 Địa chỉ: ", sale.buyerAddress] }),
                    c.jsxs("button", {
                      type: "button",
                      onClick: openDirections,
                      className: "text-[11px] text-blue-600 dark:text-blue-400 font-black hover:underline shrink-0 inline-flex items-center gap-1 cursor-pointer",
                      children: [c.jsx("span", { children: "🗺️" }), "Chỉ đường Maps"]
                    })
                  ]
                }),
                sale.targetGroup === "MARKET" && sale.vehiclePlate && c.jsxs("div", {
                  className: "mt-2 p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900 text-xs space-y-0.5",
                  children: [
                    c.jsx("span", { className: "font-black text-amber-900 dark:text-amber-300 block text-[11px] uppercase", children: "🚛 Thông tin chuyến xe đi giao chợ:" }),
                    c.jsxs("div", {
                      className: "flex flex-wrap gap-x-3 text-gray-700 dark:text-gray-300",
                      children: [
                        c.jsxs("span", { children: ["Biển số: ", c.jsx("b", { className: "font-mono text-gray-900 dark:text-white", children: sale.vehiclePlate })] }),
                        sale.driverPhone && c.jsxs("span", { children: ["Tài xế: ", c.jsx("b", { children: sale.driverName || "Tài xế chợ" }), " (", c.jsx("span", { className: "font-mono", children: sale.driverPhone }), ")"] }),
                        sale.marketDeliveryTime && c.jsxs("span", { children: ["⏰ ", sale.marketDeliveryTime] })
                      ]
                    })
                  ]
                })
              ]
            }),

            // Interactive batches list
            c.jsxs("div", {
              className: "space-y-3",
              children: [
                c.jsxs("div", {
                  className: "flex justify-between items-center",
                  children: [
                    c.jsx("span", { className: "font-black uppercase text-xs text-gray-700 dark:text-gray-300", children: "Chi tiết các mẻ tôm xuất bán:" }),
                    c.jsx("span", { className: "text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800", children: "👉 Bấm mẻ để xem mã cân" })
                  ]
                }),
                c.jsx("div", {
                  className: "space-y-2",
                  children: batchesList.map((b, bIdx) => {
                    const isSelected = selectedBatchIdx === bIdx;
                    const btWeights = getWeightsListForBatch(b, bIdx === 0 ? sale.weights : []);
                    return c.jsxs("div", {
                      key: bIdx,
                      onClick: () => setSelectedBatchIdx(bIdx),
                      className: \`p-3 rounded-2xl cursor-pointer transition-all border \${
                        isSelected
                          ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 dark:border-blue-600 shadow-sm"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-blue-300"
                      }\`,
                      children: [
                        c.jsxs("div", {
                          className: "flex justify-between items-center",
                          children: [
                            c.jsxs("div", {
                              className: "space-y-0.5",
                              children: [
                                c.jsxs("div", {
                                  className: "flex items-center gap-2",
                                  children: [
                                    c.jsxs("span", { className: \`font-black text-sm \${isSelected ? "text-blue-900 dark:text-blue-200" : "text-gray-900 dark:text-white"}\`, children: [\`\${bIdx + 1}. \`, b.typeName] }),
                                    isSelected && c.jsx("span", { className: "text-[9px] font-black text-blue-700 dark:text-blue-300 bg-blue-200/80 dark:bg-blue-900/60 px-2 py-0.5 rounded-full", children: "✓ Đang xem" })
                                  ]
                                }),
                                c.jsxs("span", { className: "text-[11px] text-gray-500", children: [fmtKg(b.net), " kg x ", _e(b.unitPrice), " đ/kg"] })
                              ]
                            }),
                            c.jsxs("span", { className: "font-black font-mono text-base text-blue-600 dark:text-blue-400", children: [_e(b.money), " đ"] })
                          ]
                        }),
                        // Expanded details when selected
                        isSelected && c.jsxs("div", {
                          className: "mt-3 pt-3 border-t border-blue-200 dark:border-blue-800 space-y-2.5 animate-in fade-in duration-200",
                          children: [
                            c.jsxs("div", {
                              className: "grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]",
                              children: [
                                c.jsxs("div", {
                                  className: "bg-white dark:bg-gray-900 p-2 rounded-xl border border-blue-100 dark:border-blue-900",
                                  children: [
                                    c.jsx("span", { className: "text-gray-400 block text-[9px] uppercase font-bold", children: "Số sọt/giỏ" }),
                                    c.jsxs("span", { className: "font-black text-gray-800 dark:text-gray-100 text-xs", children: [btWeights.length || b.bales || 0, " giỏ"] })
                                  ]
                                }),
                                c.jsxs("div", {
                                  className: "bg-white dark:bg-gray-900 p-2 rounded-xl border border-blue-100 dark:border-blue-900",
                                  children: [
                                    c.jsx("span", { className: "text-gray-400 block text-[9px] uppercase font-bold", children: "Khối lượng" }),
                                    c.jsxs("span", { className: "font-black text-blue-700 dark:text-blue-300 text-xs", children: [fmtKg(b.net), " kg"] })
                                  ]
                                }),
                                c.jsxs("div", {
                                  className: "bg-white dark:bg-gray-900 p-2 rounded-xl border border-blue-100 dark:border-blue-900",
                                  children: [
                                    c.jsx("span", { className: "text-gray-400 block text-[9px] uppercase font-bold", children: "Đơn giá xuất" }),
                                    c.jsxs("span", { className: "font-black text-gray-800 dark:text-gray-100 text-xs", children: [_e(b.unitPrice), " đ"] })
                                  ]
                                }),
                                c.jsxs("div", {
                                  className: "bg-white dark:bg-gray-900 p-2 rounded-xl border border-blue-100 dark:border-blue-900",
                                  children: [
                                    c.jsx("span", { className: "text-gray-400 block text-[9px] uppercase font-bold", children: "Thành tiền mẻ" }),
                                    c.jsxs("span", { className: "font-black text-red-600 dark:text-red-400 text-xs font-mono", children: [_e(b.money), " đ"] })
                                  ]
                                })
                              ]
                            }),
                            c.jsxs("div", {
                              className: "bg-white dark:bg-gray-900 rounded-xl p-3 border border-blue-200 dark:border-blue-800 space-y-1.5",
                              children: [
                                c.jsxs("div", {
                                  className: "flex justify-between items-center text-[11px] font-bold text-gray-700 dark:text-gray-300",
                                  children: [
                                    c.jsxs("span", {
                                      className: "flex items-center gap-1",
                                      children: [
                                        c.jsx("span", { children: "⚖️" }),
                                        \`Danh sách \${btWeights.length} mã cân của: \`,
                                        c.jsx("strong", { className: "text-blue-700 dark:text-blue-400", children: b.typeName })
                                      ]
                                    }),
                                    btWeights.length > 0 && c.jsxs("span", {
                                      className: "text-[10px] text-gray-400 font-normal",
                                      children: [\`TB: \${(btWeights.reduce((a, x) => a + x, 0) / btWeights.length).toFixed(1)} kg/giỏ\`]
                                    })
                                  ]
                                }),
                                btWeights.length > 0 ? c.jsx("div", {
                                  className: "flex flex-wrap gap-1.5 pt-1 max-h-48 overflow-y-auto",
                                  children: btWeights.map((val, wIdx) => c.jsxs("span", {
                                    key: wIdx,
                                    className: "px-2 py-1 bg-blue-100/70 dark:bg-blue-900/40 text-blue-900 dark:text-blue-200 rounded-lg text-xs font-mono font-bold flex items-center gap-1 border border-blue-200 dark:border-blue-800",
                                    children: [
                                      c.jsxs("span", { className: "text-[9px] text-gray-500 dark:text-gray-400 font-sans", children: [\`#\${wIdx + 1}:\`] }),
                                      \`\${Number(val).toFixed(1)} kg\`
                                    ]
                                  }))
                                }) : c.jsx("p", {
                                  className: "text-xs text-gray-400 italic py-1",
                                  children: "Chưa có mã cân chi tiết cho mẻ này."
                                })
                              ]
                            })
                          ]
                        })
                      ]
                    });
                  })
                }),
                c.jsxs("div", {
                  className: "p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl space-y-1 font-mono text-xs",
                  children: [
                    c.jsxs("div", { className: "flex justify-between text-gray-600 dark:text-gray-400", children: [c.jsx("span", { children: "Số lượng giỏ / sọt:" }), c.jsxs("b", { children: [sale.totalBales, " giỏ"] })] }),
                    c.jsxs("div", { className: "flex justify-between text-gray-600 dark:text-gray-400", children: [c.jsx("span", { children: "Quy cách:" }), c.jsx("b", { className: "text-emerald-600", children: "KHÔNG TRỪ BÌ (100%)" })] }),
                    c.jsxs("div", { className: "flex justify-between text-sm font-bold text-blue-700 dark:text-blue-300", children: [c.jsx("span", { children: "Tổng khối lượng thực:" }), c.jsxs("b", { children: [fmtKg(sale.totalNet), " kg"] })] })
                  ]
                })
              ]
            }),

            // Total money & Payment status
            c.jsxs("div", {
              className: "p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl space-y-2 border border-gray-200 dark:border-gray-700",
              children: [
                c.jsxs("div", {
                  className: "flex justify-between items-center text-base font-black",
                  children: [
                    c.jsx("span", { children: "TỔNG THÀNH TIỀN:" }),
                    c.jsxs("span", { className: "font-mono text-xl text-emerald-600 dark:text-emerald-400", children: [_e(sale.totalMoney), " đ"] })
                  ]
                }),
                typeof numberToWordsVN_v3 === "function" && c.jsxs("div", {
                  className: "text-[11px] text-gray-500 italic",
                  children: [c.jsx("span", { className: "font-bold text-yellow-600 dark:text-yellow-400", children: "Bằng chữ: " }), numberToWordsVN_v3(sale.totalMoney)]
                }),
                c.jsxs("div", {
                  className: "flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700 text-xs",
                  children: [
                    c.jsx("span", { className: "font-bold text-gray-600 dark:text-gray-400", children: "Trạng thái thanh toán:" }),
                    c.jsx("span", {
                      className: "px-2.5 py-1 rounded-lg text-xs font-black uppercase " +
                        (sale.isPaidFull ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300" : "bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300"),
                      children: sale.status === "PENDING_SETTLEMENT" ? "⏳ CHỜ QUYẾT TOÁN" : (sale.isPaidFull ? "✓ Đã thu đủ 100%" : ("Nợ lại: " + _e(sale.remainingDebt) + " đ"))
                    })
                  ]
                }),
                sale.status === "PENDING_SETTLEMENT" && c.jsx("button", {
                  onClick: () => setShowSettlement(true),
                  className: "w-full py-3 mt-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-sm uppercase italic active:scale-95 transition-all shadow-md cursor-pointer",
                  children: "📝 Quyết Toán Phiếu Chợ"
                })
              ]
            }),

            // Dynamic 5x5 Weights Table for Active Batch
            c.jsxs("div", {
              className: "bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm space-y-4",
              children: [
                c.jsxs("div", {
                  className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b dark:border-gray-800 pb-3",
                  children: [
                    c.jsxs("div", {
                      children: [
                        c.jsx("h3", {
                          className: "text-xs font-black uppercase text-gray-700 dark:text-gray-300",
                          children: "Bảng Chi Tiết Trọng Lượng Các Mã Cân (5x5)"
                        }),
                        activeBatch && c.jsxs("p", {
                          className: "text-[11px] text-blue-600 dark:text-blue-400 font-bold mt-0.5",
                          children: ["Đang hiển thị: ", activeBatch.typeName, \` (\${activeWeightsList.length} mã cân / \${activeBatch.bales || activeWeightsList.length || 0} giỏ)\`]
                        })
                      ]
                    }),
                    // Quick tabs for switching batches
                    batchesList.length > 1 && c.jsx("div", {
                      className: "flex flex-wrap gap-1.5",
                      children: batchesList.map((b, i) => c.jsxs("button", {
                        key: i,
                        type: "button",
                        onClick: () => setSelectedBatchIdx(i),
                        className: \`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer \${
                          selectedBatchIdx === i
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }\`,
                        children: [\`\${i + 1}. \`, b.typeName]
                      }))
                    })
                  ]
                }),

                displayGrid.length > 0 ? c.jsx("div", {
                  className: "space-y-4",
                  children: displayGrid.map((pageGrid, pIdx) => {
                    if (!Array.isArray(pageGrid)) return null;
                    return c.jsxs("div", {
                      key: pIdx,
                      className: "border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden text-center",
                      children: [
                        c.jsxs("div", {
                          className: "bg-blue-700 text-white font-black text-xs py-1.5 uppercase flex justify-between px-4 items-center",
                          children: [
                            c.jsxs("span", { children: [\`Trang cân số \${pIdx + 1}\`] }),
                            activeBatch && c.jsx("span", { className: "text-[10px] font-normal text-blue-100", children: activeBatch.typeName })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "grid grid-cols-5 bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-600 dark:text-gray-300 py-1 border-b dark:border-gray-700",
                          children: [
                            c.jsx("div", { children: "C1" }),
                            c.jsx("div", { children: "C2" }),
                            c.jsx("div", { children: "C3" }),
                            c.jsx("div", { children: "C4" }),
                            c.jsx("div", { children: "C5" })
                          ]
                        }),
                        pageGrid.map((row, rIdx) => c.jsx("div", {
                          key: rIdx,
                          className: "grid grid-cols-5 border-b border-gray-100 dark:border-gray-800 text-xs font-bold divide-x divide-gray-100 dark:divide-gray-800",
                          children: row.map((val, cIdx) => c.jsx("div", {
                            key: cIdx,
                            className: \`py-2 \${val > 0 ? "bg-blue-50/50 dark:bg-blue-950/20 font-black text-blue-900 dark:text-blue-300" : "bg-white dark:bg-gray-900 text-gray-400"}\`,
                            children: val > 0 ? Number(val).toFixed(1) : "-"
                          }))
                        }))
                      ]
                    });
                  })
                }) : c.jsx("div", {
                  className: "py-6 text-center text-gray-400 text-xs italic",
                  children: "Chưa có bảng mã cân chi tiết cho mẻ này."
                })
              ]
            })
          ]
        })
      }),

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
                    c.jsx("label", { className: "text-xs font-bold text-gray-500 mb-1 block uppercase", children: "Tiền chợ thu được thực tế (VNĐ)" }),
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
                    c.jsx("label", { className: "text-xs font-bold text-gray-500 mb-1 block uppercase", children: "Hoa hồng / Phí vựa (VNĐ)" }),
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
    ]
  });
};
`;

bundle = bundle.slice(0, pStart) + newSaleDetailComponent + bundle.slice(pEnd);
console.log("Xm_SaleDetailScreen replaced successfully!");

// =========================================================================
// 2. UPGRADE Xm_SalesScreen:
//    - Add prominent "Bắt đầu cân xuất bán" CTA button at bottom of parameters
//    - Add filter pills (All, Xí nghiệp, Bán lẻ, Chợ) in History modal
// =========================================================================

// Let's inspect showHistoryModal replacement
const oldHistModalStart = 'showHistoryModal && c.jsx("div", {        className: "fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm",';
const pHistModal = bundle.indexOf(oldHistModalStart);

if (pHistModal !== -1) {
  // Let's find end of showHistoryModal
  const oldHistModalEnd = 'children: "Chi Tiết"                      }),                      c.jsx("button", {                        onClick: () => {                          if (confirm("Bạn có chắc chắn muốn xóa phiếu xuất bán này?")) {                            me.deleteSale(sale.id);                            refreshData();                          }                        },                        className: "p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg",                        children: c.jsx(xm, { size: 16 })                      })                    ]                  })                ]              }, sale.id))            })          ]        })      }),';
  const pHistEnd = bundle.indexOf(oldHistModalEnd, pHistModal);
  
  if (pHistEnd !== -1) {
    const fullOldHist = bundle.slice(pHistModal, pHistEnd + oldHistModalEnd.length);
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
      }),`;

    bundle = bundle.replace(fullOldHist, newHistModal);
    console.log("showHistoryModal replaced with filter tabs and summary statistics!");
  } else {
    console.log("pHistEnd not found");
  }
} else {
  console.log("oldHistModalStart not found");
}

// Write to assets/index-v7.js
fs.writeFileSync(bundlePath, bundle, "utf8");

// Synchronize to public/assets/index-v7.js
const publicBundlePath = path.join(__dirname, "../public/assets/index-v7.js");
fs.writeFileSync(publicBundlePath, bundle, "utf8");

// Also synchronize to index-Os1X4Z7e.js in both locations
fs.writeFileSync(path.join(__dirname, "../assets/index-Os1X4Z7e.js"), bundle, "utf8");
fs.writeFileSync(path.join(__dirname, "../public/assets/index-Os1X4Z7e.js"), bundle, "utf8");

console.log("All files updated successfully!");
