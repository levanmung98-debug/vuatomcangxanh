const fs = require("fs");
const path = require("path");

const bundlePath = path.join(__dirname, "../assets/index-v7.js");
let bundle = fs.readFileSync(bundlePath, "utf8");

// 1. Add state and helpers to Dm
const dmStartStr = "const Dm = ({ setRoute: S, sessionId: b, role: p }) => {";
const p1 = bundle.indexOf(dmStartStr);
const p2 = bundle.indexOf("const handlePrint = () =>", p1);

if (p1 !== -1 && p2 !== -1) {
  const replacementTop = `const Dm = ({ setRoute: S, sessionId: b, role: p }) => {
  const O = w.useMemo(() => {
    try {
      const list = me.getSessions();
      return (list || []).find(U => U.id === b) || null;
    } catch(e) {
      return null;
    }
  }, [b]);
  const [selectedBatchIdx, setSelectedBatchIdx] = w.useState(0);

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

  `;

  bundle = bundle.slice(0, p1) + replacementTop + bundle.slice(p2);
  console.log("1. Successfully injected helpers and selectedBatchIdx state into Dm");
} else {
  console.error("1. Error finding Dm header boundaries", p1, p2);
}

// 2. Replace batches and weights rendering
const titleMarker = "Chi Tiết Các Mẻ Cân Theo Loại Tôm";
const pTitle = bundle.indexOf(titleMarker);
if (pTitle === -1) {
  console.error("2. Error finding titleMarker");
} else {
  const startIdx = bundle.lastIndexOf("O.batches && O.batches.length > 0 && c.jsxs", pTitle);
  const endIdx = bundle.indexOf("const TOM_KEYS =", startIdx);

  console.log("startIdx:", startIdx, "endIdx:", endIdx);

  const newBatchesAndWeightsJSX = `// Multi-batches breakdown if present
          O.batches && O.batches.length > 0 && c.jsxs("div", {
            className: "bg-white dark:bg-gray-900 rounded-[28px] p-5 shadow-sm border border-gray-100 dark:border-gray-800 space-y-3",
            children: [
              c.jsxs("div", {
                className: "flex justify-between items-center",
                children: [
                  c.jsx("h3", { className: "text-xs font-black uppercase text-gray-700 dark:text-gray-300", children: "Chi Tiết Các Mẻ Cân Theo Loại Tôm" }),
                  c.jsx("span", { className: "text-[10px] text-green-700 dark:text-green-400 font-bold bg-green-50 dark:bg-green-950/60 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800", children: "👉 Bấm loại tôm để xem mã cân" })
                ]
              }),
              c.jsx("div", {
                className: "space-y-2.5",
                children: O.batches.map((bt, idx) => {
                  const isSelected = selectedBatchIdx === idx;
                  const btWeightsList = getWeightsListForBatch(bt, idx === 0 ? O.weights : []);
                  return c.jsxs("div", {
                    key: idx,
                    onClick: () => setSelectedBatchIdx(idx),
                    className: \`p-3.5 rounded-2xl cursor-pointer transition-all border \${
                      isSelected
                        ? "bg-green-50/80 dark:bg-green-950/40 border-green-500 dark:border-green-600 shadow-sm"
                        : "bg-white dark:bg-gray-900/80 border-gray-100 dark:border-gray-800 hover:border-green-300 dark:hover:border-green-800 hover:bg-gray-50/80"
                    }\`,
                    children: [
                      // Header row of this batch
                      c.jsxs("div", {
                        className: "flex justify-between items-center text-xs",
                        children: [
                          c.jsxs("div", {
                            className: "flex items-center gap-2 flex-wrap",
                            children: [
                              c.jsxs("span", {
                                className: \`font-black text-sm \${isSelected ? "text-green-900 dark:text-green-200" : "text-gray-800 dark:text-gray-100"}\`,
                                children: [\`\${idx + 1}. \`, bt.typeName || "Tôm"]
                              }),
                              c.jsxs("span", {
                                className: "text-[11px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-lg",
                                children: [\`(\${bt.bales || btWeightsList.length || 0} rổ/két)\`]
                              }),
                              isSelected && c.jsx("span", {
                                className: "text-[10px] font-black text-green-700 dark:text-green-300 bg-green-200/80 dark:bg-green-900/60 px-2 py-0.5 rounded-full flex items-center gap-0.5",
                                children: "✓ Đang xem mã cân"
                              })
                            ]
                          }),
                          c.jsxs("div", {
                            className: "text-right",
                            children: [
                              c.jsxs("span", {
                                className: "font-black text-green-700 dark:text-green-400 text-sm",
                                children: [Number(bt.net || 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 }), " kg"]
                              }),
                              c.jsxs("span", {
                                className: "text-gray-400 ml-2 font-mono text-xs",
                                children: [\`x \${(bt.unitPrice || 0).toLocaleString()}đ\`]
                              })
                            ]
                          })
                        ]
                      }),

                      // If selected: Expand full details of this shrimp batch
                      isSelected && c.jsxs("div", {
                        className: "mt-3 pt-3 border-t border-green-200 dark:border-green-800/60 space-y-2.5 animate-in fade-in duration-200",
                        children: [
                          // 4 Quick summary metrics for this batch
                          c.jsxs("div", {
                            className: "grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]",
                            children: [
                              c.jsxs("div", {
                                className: "bg-white/90 dark:bg-gray-800/90 p-2 rounded-xl border border-green-100 dark:border-green-900/30",
                                children: [
                                  c.jsx("span", { className: "text-gray-400 block text-[9px] uppercase font-bold", children: "Số rổ đã cân" }),
                                  c.jsxs("span", { className: "font-black text-gray-800 dark:text-gray-100 text-xs", children: [btWeightsList.length || bt.bales || 0, " rổ"] })
                                ]
                              }),
                              c.jsxs("div", {
                                className: "bg-white/90 dark:bg-gray-800/90 p-2 rounded-xl border border-green-100 dark:border-green-900/30",
                                children: [
                                  c.jsx("span", { className: "text-gray-400 block text-[9px] uppercase font-bold", children: "Cân gộp (Gross)" }),
                                  c.jsxs("span", { className: "font-black text-yellow-600 dark:text-yellow-400 text-xs", children: [Number(bt.gross || (btWeightsList.reduce((a, b) => a + b, 0)) || 0).toFixed(1), " kg"] })
                                ]
                              }),
                              c.jsxs("div", {
                                className: "bg-white/90 dark:bg-gray-800/90 p-2 rounded-xl border border-green-100 dark:border-green-900/30",
                                children: [
                                  c.jsx("span", { className: "text-gray-400 block text-[9px] uppercase font-bold", children: "Tôm sạch (Net)" }),
                                  c.jsxs("span", { className: "font-black text-green-700 dark:text-green-400 text-xs", children: [Number(bt.net || 0).toFixed(1), " kg"] })
                                ]
                              }),
                              c.jsxs("div", {
                                className: "bg-white/90 dark:bg-gray-800/90 p-2 rounded-xl border border-green-100 dark:border-green-900/30",
                                children: [
                                  c.jsx("span", { className: "text-gray-400 block text-[9px] uppercase font-bold", children: "Thành tiền mẻ" }),
                                  c.jsxs("span", { className: "font-black text-red-600 dark:text-red-400 text-xs font-mono", children: [Number(bt.money || (bt.net * bt.unitPrice) || 0).toLocaleString("vi-VN"), " đ"] })
                                ]
                              })
                            ]
                          }),

                          // All weighing chips for this batch
                          c.jsxs("div", {
                            className: "bg-white dark:bg-gray-800/90 rounded-xl p-3 border border-green-200 dark:border-green-800 space-y-1.5",
                            children: [
                              c.jsxs("div", {
                                className: "flex justify-between items-center text-[11px] font-bold text-gray-700 dark:text-gray-300",
                                children: [
                                  c.jsxs("span", {
                                    className: "flex items-center gap-1",
                                    children: [
                                      c.jsx("span", { children: "⚖️" }),
                                      \`Danh sách \${btWeightsList.length} mã cân của: \`,
                                      c.jsx("strong", { className: "text-green-700 dark:text-green-400", children: bt.typeName || "Tôm" })
                                    ]
                                  }),
                                  btWeightsList.length > 0 && c.jsxs("span", {
                                    className: "text-[10px] text-gray-400 font-normal",
                                    children: [\`TB: \${(btWeightsList.reduce((a, b) => a + b, 0) / btWeightsList.length).toFixed(1)} kg/rổ\`]
                                  })
                                ]
                              }),
                              btWeightsList.length > 0 ? c.jsx("div", {
                                className: "flex flex-wrap gap-1.5 pt-1 max-h-48 overflow-y-auto",
                                children: btWeightsList.map((val, wIdx) => c.jsxs("span", {
                                  key: wIdx,
                                  className: "px-2 py-1 bg-green-100/70 dark:bg-green-900/40 text-green-900 dark:text-green-200 rounded-lg text-xs font-mono font-bold flex items-center gap-1 border border-green-200 dark:border-green-800",
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
              })
            ]
          }),

          // Weights Grid (5x5) dynamically displaying the selected shrimp type
          (() => {
            const activeBatch = (O.batches && O.batches[selectedBatchIdx]) || (O.batches && O.batches[0]) || null;
            const activeWeightsList = activeBatch ? getWeightsListForBatch(activeBatch, selectedBatchIdx === 0 ? O.weights : []) : (Array.isArray(O.weights) ? getWeightsListFromGrid(O.weights) : []);
            const rawGrid = activeBatch ? getWeightsGridForBatch(activeBatch, selectedBatchIdx === 0 ? O.weights : []) : (Array.isArray(O.weights) ? O.weights : []);
            const displayGrid = rawGrid && rawGrid.length > 0 ? rawGrid : ensure5x5Grid(activeWeightsList, null);

            return c.jsxs("div", {
              className: "bg-white dark:bg-gray-900 rounded-[28px] p-5 shadow-sm border border-gray-100 dark:border-gray-800 space-y-4",
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
                          className: "text-[11px] text-green-700 dark:text-green-400 font-bold mt-0.5",
                          children: ["Đang hiển thị: ", activeBatch.typeName || "Tôm", \` (\${activeWeightsList.length} mã cân / \${activeBatch.bales || activeWeightsList.length || 0} rổ)\`]
                        })
                      ]
                    }),
                    // Quick batch selector tabs above 5x5 grid
                    O.batches && O.batches.length > 1 && c.jsx("div", {
                      className: "flex flex-wrap gap-1.5",
                      children: O.batches.map((bt, i) => c.jsxs("button", {
                        key: i,
                        type: "button",
                        onClick: () => setSelectedBatchIdx(i),
                        className: \`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer \${
                          selectedBatchIdx === i
                            ? "bg-green-600 text-white shadow-xs"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }\`,
                        children: [\`\${i + 1}. \`, bt.typeName || \`Mẻ \${i + 1}\`]
                      }))
                    })
                  ]
                }),

                // 5x5 pages grid for active batch
                displayGrid.length > 0 ? c.jsx("div", {
                  className: "space-y-4",
                  children: displayGrid.map((pageGrid, pIdx) => {
                    if (!Array.isArray(pageGrid)) return null;
                    return c.jsxs("div", {
                      key: pIdx,
                      className: "border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden text-center",
                      children: [
                        c.jsxs("div", {
                          className: "bg-green-700 text-white font-black text-xs py-1.5 uppercase flex justify-between px-4 items-center",
                          children: [
                            c.jsxs("span", { children: [\`Trang cân số \${pIdx + 1}\`] }),
                            activeBatch && c.jsx("span", { className: "text-[10px] font-normal text-green-100", children: activeBatch.typeName })
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
                            className: \`py-2 \${val > 0 ? "bg-green-50/50 dark:bg-green-950/20 font-black text-green-900 dark:text-green-300" : "bg-white dark:bg-gray-900 text-gray-400"}\`,
                            children: val > 0 ? Number(val).toFixed(1) : "-"
                          }, cIdx))
                        }))
                      ]
                    });
                  })
                }) : c.jsx("div", {
                  className: "py-6 text-center text-gray-400 text-xs italic",
                  children: "Chưa có bảng mã cân chi tiết cho mẻ này."
                })
              ]
            });
          })()
        ]
      })
    ]
  });
};
`;

  bundle = bundle.slice(0, startIdx) + newBatchesAndWeightsJSX + bundle.slice(endIdx);
  console.log("2. Successfully replaced batches and weights JSX in Dm!");
}

// Write to assets/index-v7.js
fs.writeFileSync(bundlePath, bundle, "utf8");

// Synchronize to public/assets/index-v7.js
const publicBundlePath = path.join(__dirname, "../public/assets/index-v7.js");
fs.writeFileSync(publicBundlePath, bundle, "utf8");

// Also synchronize to index-Os1X4Z7e.js in both locations
fs.writeFileSync(path.join(__dirname, "../assets/index-Os1X4Z7e.js"), bundle, "utf8");
fs.writeFileSync(path.join(__dirname, "../public/assets/index-Os1X4Z7e.js"), bundle, "utf8");

console.log("All bundle files updated and synchronized successfully!");
