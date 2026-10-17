const fs = require("fs");
const path = require("path");

const bundlePath = path.join(__dirname, "../assets/index-v7.js");
let bundle = fs.readFileSync(bundlePath, "utf8");

// Component Xm_FinanceScreen
const financeScreenComponent = `
const Xm_FinanceScreen = ({ setRoute, role }) => {
  const _fmt = (n) => Number(n || 0).toLocaleString("vi-VN");
  const _fmtKg = (n) => {
    if (!n || n <= 0) return "0";
    const r = Math.round(n * 10) / 10;
    return Number.isInteger(r) ? String(r) : String(r);
  };

  const [financeData, setFinanceData] = w.useState(() => me.getFinanceData());
  const [sessions, setSessions] = w.useState(() => {
    try { return (me.getSessions && me.getSessions()) || []; } catch(e) { return []; }
  });
  const [sales, setSales] = w.useState(() => {
    try { return (me.getSales && me.getSales()) || []; } catch(e) { return []; }
  });

  // Active trip state
  const trip = financeData.activeTrip || {};
  const [tripName, setTripName] = w.useState(trip.name || "Chuyến thu mua tôm");
  const [tripDate, setTripDate] = w.useState(trip.startDate || new Date().toISOString().split("T")[0]);

  // Modal states
  const [showAddInvestorModal, setShowAddInvestorModal] = w.useState(false);
  const [newInvestorName, setNewInvestorName] = w.useState("");
  const [newInvestorAmount, setNewInvestorAmount] = w.useState("");

  const [showAddExpenseModal, setShowAddExpenseModal] = w.useState(false);
  const [newExpenseCat, setNewExpenseCat] = w.useState("Tiền thuê xe / vận chuyển");
  const [newExpenseAmount, setNewExpenseAmount] = w.useState("");
  const [newExpenseNote, setNewExpenseNote] = w.useState("");

  const [showSavedTripsModal, setShowSavedTripsModal] = w.useState(false);
  const [selectedSavedTrip, setSelectedSavedTrip] = w.useState(null);

  // Sync back to storage on change
  const updateActiveTrip = (updater) => {
    setFinanceData(prev => {
      const updatedTrip = typeof updater === "function" ? updater(prev.activeTrip) : { ...prev.activeTrip, ...updater };
      const nextData = { ...prev, activeTrip: updatedTrip };
      me.saveFinanceData(nextData);
      return nextData;
    });
  };

  // 1. INVESTORS & CAPITAL
  const investors = trip.investors || [];
  const totalCapital = investors.reduce((acc, inv) => acc + Number(inv.amount || 0), 0);

  const handleAddInvestor = () => {
    if (!newInvestorName.trim()) {
      alert("Vui lòng nhập tên người góp vốn!");
      return;
    }
    const amt = Number(newInvestorAmount) || 0;
    if (amt <= 0) {
      alert("Vui lòng nhập số tiền vốn hợp lệ!");
      return;
    }
    const newInv = {
      id: "inv_" + Date.now(),
      name: newInvestorName.trim(),
      amount: amt
    };
    updateActiveTrip(t => ({
      ...t,
      investors: [...(t.investors || []), newInv]
    }));
    setNewInvestorName("");
    setNewInvestorAmount("");
    setShowAddInvestorModal(false);
  };

  const handleRemoveInvestor = (id) => {
    if (investors.length <= 1) {
      alert("Phải có ít nhất 1 người góp vốn!");
      return;
    }
    if (confirm("Bạn có chắc chắn muốn xóa người góp vốn này?")) {
      updateActiveTrip(t => ({
        ...t,
        investors: (t.investors || []).filter(i => i.id !== id)
      }));
    }
  };

  // 2. SHRIMP PURCHASE (Tiền mua tôm)
  const isShrimpAuto = trip.shrimpPurchaseAuto !== false;
  // Match sessions for current trip date
  const tripSessions = sessions.filter(s => s.date && s.date.startsWith(tripDate));
  const activeSessions = tripSessions.length > 0 ? tripSessions : sessions.slice(0, 5);
  const autoShrimpPurchaseMoney = activeSessions.reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);
  const autoShrimpPurchaseKg = activeSessions.reduce((acc, s) => acc + Number(s.totalNet || s.totalGross || 0), 0);

  const shrimpPurchaseMoney = isShrimpAuto ? autoShrimpPurchaseMoney : Number(trip.shrimpPurchaseManualAmount || 0);

  // OPERATING EXPENSES (Chi phí vận hành)
  const expenseCategories = [
    { label: "Tiền thuê xe / vận chuyển", icon: "🚛" },
    { label: "Tiền nhân công kéo / lựa tôm", icon: "👷" },
    { label: "Tiền ăn uống, bồi dưỡng", icon: "🍲" },
    { label: "Tiền nước đá, oxy", icon: "🧊" },
    { label: "Tiền bến bãi, cầu phà, lộ phí", icon: "🌉" },
    { label: "Chi phí phát sinh khác", icon: "📝" }
  ];

  const expenses = trip.expenses || [];
  const totalOperationExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount || 0), 0);
  const totalExpenses = shrimpPurchaseMoney + totalOperationExpenses;

  const handleAddExpense = () => {
    const amt = Number(newExpenseAmount) || 0;
    if (amt <= 0) {
      alert("Vui lòng nhập số tiền chi phí hợp lệ!");
      return;
    }
    const newExp = {
      id: "exp_" + Date.now(),
      category: newExpenseCat,
      amount: amt,
      note: newExpenseNote.trim(),
      date: new Date().toISOString()
    };
    updateActiveTrip(t => ({
      ...t,
      expenses: [...(t.expenses || []), newExp]
    }));
    setNewExpenseAmount("");
    setNewExpenseNote("");
    setShowAddExpenseModal(false);
  };

  const handleRemoveExpense = (id) => {
    updateActiveTrip(t => ({
      ...t,
      expenses: (t.expenses || []).filter(e => e.id !== id)
    }));
  };

  // 3. REVENUE (Doanh thu bán tôm về)
  const isRevenueAuto = trip.revenueAuto !== false;
  // Completed sales
  const completedSales = sales.filter(s => s.status === "COMPLETED" || s.status === "SETTLED" || s.isPaidFull);
  const tripSales = completedSales.filter(s => s.date && s.date.startsWith(tripDate));
  const activeCompletedSales = tripSales.length > 0 ? tripSales : completedSales;
  const autoRevenueMoney = activeCompletedSales.reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);
  const autoRevenueKg = activeCompletedSales.reduce((acc, s) => acc + Number(s.totalNet || s.totalGross || 0), 0);

  const totalRevenue = isRevenueAuto ? autoRevenueMoney : Number(trip.revenueManualAmount || 0);

  // 4. NET PROFIT & LOSS DISTRIBUTION
  const netProfit = totalRevenue - totalExpenses;
  const isProfit = netProfit >= 0;
  const profitMarginPercent = totalExpenses > 0 ? ((netProfit / totalExpenses) * 100) : 0;

  // Investor payout calculation
  const investorPayouts = investors.map(inv => {
    const shareRatio = totalCapital > 0 ? (Number(inv.amount || 0) / totalCapital) : 0;
    const sharePercent = shareRatio * 100;
    const profitShare = Math.round(netProfit * shareRatio);
    const totalPayout = Number(inv.amount || 0) + profitShare;
    return {
      ...inv,
      shareRatio,
      sharePercent,
      profitShare,
      totalPayout
    };
  });

  // Zalo / Messenger Share Copy
  const handleShareZaloStatement = () => {
    let msg = "🦐 [BẢNG QUYẾT TOÁN HÙN VỐN & CHIA LỜI LỖ]\\n";
    msg += "Chuyến: " + tripName + "\\n";
    msg += "Ngày: " + tripDate + "\\n";
    msg += "--------------------------------\\n";
    msg += "1. NGUỒN VỐN GÓP: " + _fmt(totalCapital) + " đ\\n";
    investors.forEach((inv, i) => {
      const pct = totalCapital > 0 ? ((inv.amount / totalCapital) * 100).toFixed(1) : "0";
      msg += "  " + (i + 1) + ". " + inv.name + ": " + _fmt(inv.amount) + " đ (" + pct + "%)\\n";
    });
    msg += "--------------------------------\\n";
    msg += "2. TỔNG CHI PHÍ: " + _fmt(totalExpenses) + " đ\\n";
    msg += "  • Tiền mua tôm: " + _fmt(shrimpPurchaseMoney) + " đ\\n";
    msg += "  • Chi phí vận hành: " + _fmt(totalOperationExpenses) + " đ\\n";
    expenses.forEach((e, i) => {
      msg += "    - " + e.category + (e.note ? " (" + e.note + ")" : "") + ": " + _fmt(e.amount) + " đ\\n";
    });
    msg += "--------------------------------\\n";
    msg += "3. TỔNG DOANH THU: " + _fmt(totalRevenue) + " đ\\n";
    msg += "--------------------------------\\n";
    msg += "4. LỢI NHUẬN RÒNG: " + (isProfit ? "+" : "") + _fmt(netProfit) + " đ (" + (isProfit ? "LỜI" : "LỖ") + " " + Math.abs(profitMarginPercent).toFixed(1) + "%)\\n";
    msg += "--------------------------------\\n";
    msg += "5. BẢNG TIỀN THỰC NHẬN TỪNG NGƯỜI:\\n";
    investorPayouts.forEach((p, i) => {
      msg += "  " + (i + 1) + ". " + p.name + " (" + p.sharePercent.toFixed(1) + "%):\\n";
      msg += "     Vốn gốc: " + _fmt(p.amount) + " đ\\n";
      msg += "     " + (p.profitShare >= 0 ? "Chia lời: +" : "Chịu lỗ: ") + _fmt(p.profitShare) + " đ\\n";
      msg += "     => THỰC NHẬN: " + _fmt(p.totalPayout) + " VNĐ\\n";
    });
    msg += "--------------------------------\\n";
    msg += "Vựa Tôm Càng Xanh - Đối soát minh bạch.";

    try {
      navigator.clipboard.writeText(msg);
      alert("✅ Đã sao chép bảng quyết toán chi tiết! Đang mở Zalo...");
      window.open("https://zalo.me", "_blank");
    } catch(e) {
      alert("Nội dung quyết toán:\\n\\n" + msg);
    }
  };

  // Settle and archive trip
  const handleSettleAndArchiveTrip = () => {
    if (!confirm("Bạn có chắc chắn muốn khóa và lưu chuyến hạch toán này vào lịch sử? Sau khi lưu, hệ thống sẽ khởi tạo chuyến mới.")) {
      return;
    }
    const archivedTrip = {
      ...trip,
      name: tripName,
      startDate: tripDate,
      totalCapital,
      shrimpPurchaseMoney,
      totalOperationExpenses,
      totalExpenses,
      totalRevenue,
      netProfit,
      isProfit,
      profitMarginPercent,
      investorPayouts,
      settledAt: new Date().toISOString()
    };

    const newActiveTrip = {
      id: "trip_" + Date.now(),
      name: "Chuyến thu mua ngày " + new Date().toLocaleDateString("vi-VN"),
      startDate: new Date().toISOString().split("T")[0],
      investors: investors.map(i => ({ ...i })), // keep same investors
      shrimpPurchaseAuto: true,
      shrimpPurchaseManualAmount: 0,
      expenses: [],
      revenueAuto: true,
      revenueManualAmount: 0
    };

    const nextData = {
      activeTrip: newActiveTrip,
      savedTrips: [archivedTrip, ...(financeData.savedTrips || [])]
    };
    me.saveFinanceData(nextData);
    setFinanceData(nextData);
    setTripName(newActiveTrip.name);
    setTripDate(newActiveTrip.startDate);
    alert("✅ Đã quyết toán thành công và lưu vào lịch sử chuyến!");
  };

  return c.jsxs("div", {
    className: "flex flex-col h-screen bg-gray-50 dark:bg-[#121212] overflow-hidden text-gray-900 dark:text-gray-100",
    children: [
      // Header
      c.jsxs("header", {
        className: "bg-gradient-to-r from-[#141b63] via-[#1e4ea1] to-[#0284c7] text-white p-4 shadow-xl shrink-0 flex items-center justify-between",
        children: [
          c.jsxs("div", {
            className: "flex items-center gap-3",
            children: [
              c.jsx("button", {
                type: "button",
                onClick: () => setRoute(re.DASHBOARD),
                className: "p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all cursor-pointer active:scale-90",
                children: c.jsx(On, { size: 20 })
              }),
              c.jsxs("div", {
                children: [
                  c.jsxs("h1", {
                    className: "text-lg font-black uppercase italic tracking-tight flex items-center gap-2 leading-none",
                    children: [
                      c.jsx("span", { children: "💰" }),
                      "Quản Lý Tài Chính & Hùn Vốn"
                    ]
                  }),
                  c.jsx("span", {
                    className: "text-[10px] font-bold opacity-80 uppercase tracking-widest block mt-0.5",
                    children: "Hạch toán chuyến hàng • Chia lời lỗ theo tỷ lệ"
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
                onClick: () => setShowSavedTripsModal(true),
                className: "px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase flex items-center gap-1 active:scale-95 transition-all cursor-pointer",
                children: [c.jsx(Fd, { size: 14 }), "Lịch Sử"]
              }),
              c.jsxs("button", {
                type: "button",
                onClick: handleShareZaloStatement,
                className: "px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer",
                children: ["Zalo"]
              })
            ]
          })
        ]
      }),

      // Main content scroll
      c.jsx("div", {
        className: "flex-1 overflow-y-auto p-4 space-y-5 max-w-4xl mx-auto w-full pb-28",
        children: c.jsxs("div", {
          className: "space-y-5",
          children: [
            // Trip Meta Bar (Name & Date)
            c.jsxs("div", {
              className: "bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center",
              children: [
                c.jsxs("div", {
                  className: "flex items-center gap-2 flex-1 w-full",
                  children: [
                    c.jsx("span", { className: "text-2xl", children: "🚢" }),
                    c.jsxs("div", {
                      className: "flex-1",
                      children: [
                        c.jsx("label", { className: "text-[10px] font-black text-gray-400 uppercase italic block", children: "Tên chuyến hàng / Kỳ thu mua" }),
                        c.jsx("input", {
                          type: "text",
                          value: tripName,
                          onChange: e => {
                            setTripName(e.target.value);
                            updateActiveTrip({ name: e.target.value });
                          },
                          className: "text-base font-black text-gray-900 dark:text-white bg-transparent outline-none w-full"
                        })
                      ]
                    })
                  ]
                }),
                c.jsxs("div", {
                  className: "flex items-center gap-2 w-full sm:w-auto",
                  children: [
                    c.jsx("label", { className: "text-xs font-bold text-gray-500", children: "Ngày:" }),
                    c.jsx("input", {
                      type: "date",
                      value: tripDate,
                      onChange: e => {
                        setTripDate(e.target.value);
                        updateActiveTrip({ startDate: e.target.value });
                      },
                      className: "px-3 py-1.5 bg-gray-100 dark:bg-gray-800 font-bold rounded-xl text-xs outline-none border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                    })
                  ]
                })
              ]
            }),

            // =========================================================================
            // KHU VỰC 1: QUẢN LÝ NGUỒN VỐN GÓP (VỐN BAN ĐẦU)
            // =========================================================================
            c.jsxs("div", {
              className: "bg-white dark:bg-gray-900 p-5 rounded-[32px] border border-gray-200 dark:border-gray-800 shadow-sm space-y-4",
              children: [
                c.jsxs("div", {
                  className: "flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3",
                  children: [
                    c.jsxs("div", {
                      children: [
                        c.jsxs("h2", {
                          className: "text-sm font-black uppercase text-gray-900 dark:text-white flex items-center gap-1.5",
                          children: [c.jsx("span", { children: "1️⃣" }), "Nguồn Vốn Góp Ban Đầu"]
                        }),
                        c.jsx("p", { className: "text-[11px] text-gray-500 font-semibold", children: "Tự động tính tỷ lệ % vốn lưu động của từng người" })
                      ]
                    }),
                    c.jsxs("button", {
                      type: "button",
                      onClick: () => setShowAddInvestorModal(true),
                      className: "px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1 active:scale-95 transition-all shadow-sm cursor-pointer",
                      children: [c.jsx("span", { children: "+" }), "Thêm Người Góp"]
                    })
                  ]
                }),

                // Total Capital Card
                c.jsxs("div", {
                  className: "p-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-2xl text-blue-950 flex justify-between items-center shadow-md",
                  children: [
                    c.jsxs("div", {
                      children: [
                        c.jsx("span", { className: "text-[11px] font-black uppercase tracking-wider block opacity-80", children: "Tổng Quỹ Vốn Lưu Động Khả Dụng" }),
                        c.jsxs("div", {
                          className: "text-3xl font-black font-mono tracking-tight",
                          children: [_fmt(totalCapital), " ", c.jsx("span", { className: "text-base font-sans font-bold", children: "VNĐ" })]
                        })
                      ]
                    }),
                    c.jsx("div", { className: "text-4xl opacity-30", children: "🏦" })
                  ]
                }),

                // Multi-bar progress indicator of capital shares
                investors.length > 0 && c.jsx("div", {
                  className: "h-3.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex",
                  children: investors.map((inv, idx) => {
                    const pct = totalCapital > 0 ? (inv.amount / totalCapital) * 100 : 0;
                    const colors = ["bg-blue-600", "bg-emerald-500", "bg-purple-600", "bg-amber-500", "bg-pink-500", "bg-cyan-500"];
                    const color = colors[idx % colors.length];
                    return c.jsx("div", {
                      key: inv.id,
                      style: { width: pct + "%" },
                      className: color + " h-full transition-all duration-500",
                      title: inv.name + ": " + pct.toFixed(1) + "%"
                    });
                  })
                }),

                // Investors list
                c.jsx("div", {
                  className: "space-y-2",
                  children: investors.map((inv, idx) => {
                    const pct = totalCapital > 0 ? ((inv.amount / totalCapital) * 100).toFixed(1) : "0.0";
                    return c.jsxs("div", {
                      key: inv.id,
                      className: "p-3 bg-gray-50 dark:bg-gray-800/70 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3",
                      children: [
                        c.jsxs("div", {
                          className: "flex items-center gap-3",
                          children: [
                            c.jsx("div", {
                              className: "w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-xs flex items-center justify-center shrink-0",
                              children: idx + 1
                            }),
                            c.jsxs("div", {
                              children: [
                                c.jsx("span", { className: "font-black text-sm text-gray-900 dark:text-white block", children: inv.name }),
                                c.jsxs("span", { className: "text-[11px] font-bold text-gray-500 font-mono", children: [_fmt(inv.amount), " đ"] })
                              ]
                            })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "flex items-center gap-2",
                          children: [
                            c.jsxs("span", {
                              className: "px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-black font-mono shadow-xs",
                              children: [pct, "%"]
                            }),
                            c.jsx("button", {
                              type: "button",
                              onClick: () => handleRemoveInvestor(inv.id),
                              className: "p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer",
                              title: "Xóa",
                              children: c.jsx(xm, { size: 16 })
                            })
                          ]
                        })
                      ]
                    });
                  })
                })
              ]
            }),

            // =========================================================================
            // KHU VỰC 2: HẠCH TOÁN CHI PHÍ (TIỀN CHI)
            // =========================================================================
            c.jsxs("div", {
              className: "bg-white dark:bg-gray-900 p-5 rounded-[32px] border border-gray-200 dark:border-gray-800 shadow-sm space-y-4",
              children: [
                c.jsxs("div", {
                  className: "flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3",
                  children: [
                    c.jsxs("div", {
                      children: [
                        c.jsxs("h2", {
                          className: "text-sm font-black uppercase text-gray-900 dark:text-white flex items-center gap-1.5",
                          children: [c.jsx("span", { children: "2️⃣" }), "Hạch Toán Chi Phí (Tiền Chi)"]
                        }),
                        c.jsx("p", { className: "text-[11px] text-gray-500 font-semibold", children: "Tiền mua tôm + Các chi phí vận chuyển, bồi dưỡng, oxy..." })
                      ]
                    }),
                    c.jsxs("button", {
                      type: "button",
                      onClick: () => setShowAddExpenseModal(true),
                      className: "px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1 active:scale-95 transition-all shadow-sm cursor-pointer",
                      children: [c.jsx("span", { children: "+" }), "Thêm Chi Phí"]
                    })
                  ]
                }),

                // Item 1: Tiền mua tôm
                c.jsxs("div", {
                  className: "p-4 bg-orange-50/70 dark:bg-orange-950/30 rounded-2xl border border-orange-200 dark:border-orange-900/60 space-y-2",
                  children: [
                    c.jsxs("div", {
                      className: "flex justify-between items-center",
                      children: [
                        c.jsxs("div", {
                          className: "flex items-center gap-2",
                          children: [
                            c.jsx("span", { className: "text-lg", children: "🦐" }),
                            c.jsxs("div", {
                              children: [
                                c.jsx("span", { className: "font-black text-xs uppercase text-orange-900 dark:text-orange-200 block", children: "Tiền Mua Tôm" }),
                                c.jsxs("span", { className: "text-[10px] text-gray-500", children: [activeSessions.length, " phiếu cân • ", _fmtKg(autoShrimpPurchaseKg), " kg tôm"] })
                              ]
                            })
                          ]
                        }),
                        // Toggle Auto / Manual
                        c.jsxs("button", {
                          type: "button",
                          onClick: () => updateActiveTrip(t => ({ ...t, shrimpPurchaseAuto: !isShrimpAuto })),
                          className: \`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer \${
                            isShrimpAuto
                              ? "bg-orange-600 text-white"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                          }\`,
                          children: [isShrimpAuto ? "✓ Tự động từ phiếu cân" : "✎ Nhập thủ công"]
                        })
                      ]
                    }),
                    isShrimpAuto ? c.jsxs("div", {
                      className: "font-mono font-black text-2xl text-orange-900 dark:text-orange-100",
                      children: [_fmt(shrimpPurchaseMoney), " ", c.jsx("span", { className: "text-sm font-sans font-bold", children: "VNĐ" })]
                    }) : c.jsxs("div", {
                      className: "flex items-center gap-2 pt-1",
                      children: [
                        c.jsx("input", {
                          type: "number",
                          value: trip.shrimpPurchaseManualAmount || "",
                          placeholder: "Nhập số tiền mua tôm thủ công...",
                          onChange: e => updateActiveTrip(t => ({ ...t, shrimpPurchaseManualAmount: Number(e.target.value) || 0 })),
                          className: "w-full p-2.5 bg-white dark:bg-gray-800 border-2 border-orange-400 rounded-xl font-mono font-black text-lg text-orange-900 dark:text-orange-100 outline-none"
                        }),
                        c.jsx("span", { className: "font-bold text-xs text-gray-500", children: "VNĐ" })
                      ]
                    })
                  ]
                }),

                // Operating expenses list
                c.jsxs("div", {
                  className: "space-y-2",
                  children: [
                    c.jsx("span", { className: "text-[11px] font-black uppercase text-gray-500 tracking-wider block", children: "Các Chi Phí Vận Hành Khác:" }),
                    expenses.length === 0 ? c.jsx("p", {
                      className: "text-xs text-gray-400 italic py-2 text-center",
                      children: "Chưa có khoản chi phí vận hành nào. Bấm '+ Thêm Chi Phí' để nhập."
                    }) : expenses.map(exp => c.jsxs("div", {
                      key: exp.id,
                      className: "p-3 bg-gray-50 dark:bg-gray-800/70 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3",
                      children: [
                        c.jsxs("div", {
                          children: [
                            c.jsx("span", { className: "font-bold text-xs text-gray-900 dark:text-white block", children: exp.category }),
                            exp.note && c.jsx("span", { className: "text-[11px] text-gray-500 block", children: exp.note })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "flex items-center gap-2",
                          children: [
                            c.jsxs("span", { className: "font-mono font-black text-sm text-red-600 dark:text-red-400", children: [_fmt(exp.amount), " đ"] }),
                            c.jsx("button", {
                              type: "button",
                              onClick: () => handleRemoveExpense(exp.id),
                              className: "p-1.5 text-gray-400 hover:text-red-500 rounded-lg cursor-pointer",
                              children: c.jsx(xm, { size: 14 })
                            })
                          ]
                        })
                      ]
                    }))
                  ]
                }),

                // Total Expenses Summary Card
                c.jsxs("div", {
                  className: "p-4 bg-red-50 dark:bg-red-950/40 rounded-2xl border-2 border-red-200 dark:border-red-900/60 flex justify-between items-center",
                  children: [
                    c.jsxs("div", {
                      children: [
                        c.jsx("span", { className: "text-[11px] font-black uppercase text-red-800 dark:text-red-300 block", children: "TỔNG CHI PHÍ CHUYẾN NÀY" }),
                        c.jsx("span", { className: "text-[10px] text-gray-500", children: "Tiền mua tôm + Các chi phí vận hành" })
                      ]
                    }),
                    c.jsxs("span", {
                      className: "font-mono font-black text-2xl text-red-700 dark:text-red-400",
                      children: [_fmt(totalExpenses), " ", c.jsx("span", { className: "text-sm font-sans font-bold", children: "VNĐ" })]
                    })
                  ]
                })
              ]
            }),

            // =========================================================================
            // KHU VỰC 3: TỔNG HỢP DOANH THU (TIỀN BÁN TÔM VỀ)
            // =========================================================================
            c.jsxs("div", {
              className: "bg-white dark:bg-gray-900 p-5 rounded-[32px] border border-gray-200 dark:border-gray-800 shadow-sm space-y-4",
              children: [
                c.jsxs("div", {
                  className: "flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3",
                  children: [
                    c.jsxs("div", {
                      children: [
                        c.jsxs("h2", {
                          className: "text-sm font-black uppercase text-gray-900 dark:text-white flex items-center gap-1.5",
                          children: [c.jsx("span", { children: "3️⃣" }), "Tổng Hợp Doanh Thu (Tiền Bán Về)"]
                        }),
                        c.jsx("p", { className: "text-[11px] text-gray-500 font-semibold", children: "Tiền thực nhận từ Bán lẻ + Bán chợ (sau hoa hồng) + Bán công ty" })
                      ]
                    }),
                    c.jsxs("button", {
                      type: "button",
                      onClick: () => updateActiveTrip(t => ({ ...t, revenueAuto: !isRevenueAuto })),
                      className: \`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer \${
                        isRevenueAuto
                          ? "bg-emerald-600 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      }\`,
                      children: [isRevenueAuto ? "✓ Tự động từ đơn bán" : "✎ Nhập thủ công"]
                    })
                  ]
                }),

                // Total Revenue Card
                c.jsxs("div", {
                  className: "p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border-2 border-emerald-200 dark:border-emerald-900/60 flex justify-between items-center",
                  children: [
                    c.jsxs("div", {
                      children: [
                        c.jsx("span", { className: "text-[11px] font-black uppercase text-emerald-800 dark:text-emerald-300 block", children: "TỔNG DOANH THU THỰC NHẬN" }),
                        c.jsxs("span", { className: "text-[10px] text-gray-500", children: [activeCompletedSales.length, " đơn bán hoàn tất • ", _fmtKg(autoRevenueKg), " kg tôm"] })
                      ]
                    }),
                    isRevenueAuto ? c.jsxs("span", {
                      className: "font-mono font-black text-2xl text-emerald-700 dark:text-emerald-400",
                      children: [_fmt(totalRevenue), " ", c.jsx("span", { className: "text-sm font-sans font-bold", children: "VNĐ" })]
                    }) : c.jsxs("div", {
                      className: "flex items-center gap-2",
                      children: [
                        c.jsx("input", {
                          type: "number",
                          value: trip.revenueManualAmount || "",
                          placeholder: "Nhập doanh thu...",
                          onChange: e => updateActiveTrip(t => ({ ...t, revenueManualAmount: Number(e.target.value) || 0 })),
                          className: "w-44 p-2 bg-white dark:bg-gray-800 border-2 border-emerald-400 rounded-xl font-mono font-black text-lg text-emerald-700 dark:text-emerald-400 outline-none text-right"
                        }),
                        c.jsx("span", { className: "font-bold text-xs text-gray-500", children: "VNĐ" })
                      ]
                    })
                  ]
                }),

                // Summary of completed sales contributing
                activeCompletedSales.length > 0 && c.jsxs("div", {
                  className: "space-y-1.5",
                  children: [
                    c.jsx("span", { className: "text-[10px] font-black uppercase text-gray-400 tracking-wider block", children: "Các Đơn Bán Đã Hoàn Tất:" }),
                    c.jsx("div", {
                      className: "max-h-36 overflow-y-auto space-y-1 pr-1",
                      children: activeCompletedSales.map(s => c.jsxs("div", {
                        key: s.id,
                        className: "p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl flex justify-between items-center text-xs",
                        children: [
                          c.jsxs("div", {
                            className: "flex items-center gap-2",
                            children: [
                              c.jsx("span", { children: s.targetGroup === "FACTORY" ? "🏢" : (s.targetGroup === "MARKET" ? "🏪" : "🛒") }),
                              c.jsx("span", { className: "font-bold text-gray-800 dark:text-gray-200", children: s.buyerName }),
                              c.jsxs("span", { className: "text-[10px] text-gray-400 font-mono", children: ["(", _fmtKg(s.totalNet || s.totalGross), " kg)"] })
                            ]
                          }),
                          c.jsxs("span", { className: "font-mono font-black text-emerald-600 dark:text-emerald-400", children: [_fmt(s.totalMoney), " đ"] })
                        ]
                      }))
                    })
                  ]
                })
              ]
            }),

            // =========================================================================
            // KHU VỰC 4: QUYẾT TOÁN LỜI / LỖ & CHIA TIỀN THEO TỶ LỆ
            // =========================================================================
            c.jsxs("div", {
              className: "bg-white dark:bg-gray-900 p-5 rounded-[32px] border-2 border-blue-500/30 dark:border-blue-500/20 shadow-xl space-y-5",
              children: [
                c.jsxs("div", {
                  className: "border-b border-gray-100 dark:border-gray-800 pb-3",
                  children: [
                    c.jsxs("h2", {
                      className: "text-base font-black uppercase tracking-tight text-gray-900 dark:text-white flex items-center gap-2",
                      children: [c.jsx("span", { children: "4️⃣" }), "Quyết Toán Lời / Lỗ & Chia Tiền Theo Tỷ Lệ"]
                    }),
                    c.jsx("p", { className: "text-xs text-gray-500 font-semibold", children: "Lợi nhuận ròng = Tổng Doanh Thu - Tổng Chi Phí. Chia theo chính xác % vốn góp." })
                  ]
                }),

                // Net Profit Card
                c.jsxs("div", {
                  className: \`p-5 rounded-3xl border-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 \${
                    isProfit
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-100"
                      : "bg-red-50 dark:bg-red-950/40 border-red-400 text-red-900 dark:text-red-100"
                  }\`,
                  children: [
                    c.jsxs("div", {
                      children: [
                        c.jsxs("div", {
                          className: "flex items-center gap-2",
                          children: [
                            c.jsx("span", { className: "text-2xl", children: isProfit ? "📈" : "📉" }),
                            c.jsx("span", {
                              className: "text-xs font-black uppercase tracking-wider",
                              children: isProfit ? "KẾT QUẢ KINH DOANH: CÓ LỜI (LÃI)" : "KẾT QUẢ KINH DOANH: BỊ LỖ"
                            })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "text-3xl font-black font-mono tracking-tight mt-1",
                          children: [isProfit ? "+" : "", _fmt(netProfit), " ", c.jsx("span", { className: "text-base font-sans font-bold", children: "VNĐ" })]
                        })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "text-right",
                      children: [
                        c.jsx("span", { className: "text-[10px] font-bold text-gray-500 block uppercase", children: "Tỷ suất sinh lời" }),
                        c.jsxs("span", {
                          className: \`text-xl font-black font-mono \${isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}\`,
                          children: [isProfit ? "+" : "", profitMarginPercent.toFixed(1), "%"]
                        })
                      ]
                    })
                  ]
                }),

                // Investor Distribution Table
                c.jsxs("div", {
                  className: "space-y-3",
                  children: [
                    c.jsx("span", { className: "text-xs font-black uppercase text-gray-700 dark:text-gray-300 block", children: "Bảng Chi Tiết Tiền Thực Nhận Của Từng Người:" }),
                    c.jsx("div", {
                      className: "overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800",
                      children: c.jsxs("table", {
                        className: "w-full text-left text-xs border-collapse",
                        children: [
                          c.jsx("thead", {
                            className: "bg-gray-100 dark:bg-gray-800 text-[10px] font-black uppercase text-gray-500",
                            children: c.jsxs("tr", {
                              children: [
                                c.jsx("th", { className: "p-3", children: "Người Góp Vốn" }),
                                c.jsx("th", { className: "p-3 text-right", children: "Vốn Gốc" }),
                                c.jsx("th", { className: "p-3 text-right", children: isProfit ? "Chia Lãi (+)" : "Chịu Lỗ (-)" }),
                                c.jsx("th", { className: "p-3 text-right font-black text-blue-700 dark:text-blue-300", children: "TỔNG THỰC NHẬN" })
                              ]
                            })
                          }),
                          c.jsx("tbody", {
                            className: "divide-y divide-gray-100 dark:divide-gray-800 font-bold",
                            children: investorPayouts.map(p => c.jsxs("tr", {
                              key: p.id,
                              className: "hover:bg-gray-50 dark:hover:bg-gray-800/40",
                              children: [
                                c.jsxs("td", {
                                  className: "p-3",
                                  children: [
                                    c.jsx("div", { className: "font-black text-gray-900 dark:text-white", children: p.name }),
                                    c.jsxs("span", { className: "text-[10px] text-blue-600 dark:text-blue-400 font-mono", children: ["Tỷ lệ: ", p.sharePercent.toFixed(1), "%"] })
                                  ]
                                }),
                                c.jsx("td", { className: "p-3 text-right font-mono text-gray-600 dark:text-gray-400", children: _fmt(p.amount) }),
                                c.jsxs("td", {
                                  className: \`p-3 text-right font-mono font-black \${p.profitShare >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}\`,
                                  children: [(p.profitShare >= 0 ? "+" : "") + _fmt(p.profitShare)]
                                }),
                                c.jsxs("td", {
                                  className: "p-3 text-right font-mono font-black text-sm text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/20",
                                  children: [_fmt(p.totalPayout), " đ"]
                                })
                              ]
                            }, p.id))
                          })
                        ]
                      })
                    })
                  ]
                }),

                // Action Buttons
                c.jsxs("div", {
                  className: "pt-2 flex flex-col sm:flex-row gap-3",
                  children: [
                    c.jsxs("button", {
                      type: "button",
                      onClick: handleShareZaloStatement,
                      className: "flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black rounded-2xl text-sm uppercase italic flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer",
                      children: [
                        c.jsx("span", { children: "📋" }),
                        "Sao Chép Sao Kê / Chia Sẻ Zalo"
                      ]
                    }),
                    c.jsxs("button", {
                      type: "button",
                      onClick: handleSettleAndArchiveTrip,
                      className: "py-4 px-6 bg-gradient-to-r from-emerald-600 to-green-700 text-white font-black rounded-2xl text-sm uppercase italic flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer",
                      children: [
                        c.jsx("span", { children: "🔒" }),
                        "Quyết Toán Chuyến Này"
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      }),

      // MODAL: THÊM NGƯỜI GÓP VỐN
      showAddInvestorModal && c.jsx("div", {
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4",
          children: [
            c.jsx("h3", { className: "font-black text-base uppercase text-gray-900 dark:text-white", children: "+ Thêm Người Góp Vốn" }),
            c.jsxs("div", {
              className: "space-y-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-xs font-bold text-gray-500 mb-1 block uppercase", children: "Tên người góp vốn" }),
                    c.jsx("input", {
                      type: "text",
                      placeholder: "VD: Tôi, Anh B, Chị Lan...",
                      value: newInvestorName,
                      onChange: e => setNewInvestorName(e.target.value),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm outline-none focus:border-indigo-500"
                    })
                  ]
                }),
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-xs font-bold text-gray-500 mb-1 block uppercase", children: "Số tiền góp (VNĐ)" }),
                    c.jsx("input", {
                      type: "number",
                      placeholder: "VD: 100000000",
                      value: newInvestorAmount,
                      onChange: e => setNewInvestorAmount(e.target.value),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-lg font-mono outline-none focus:border-indigo-500"
                    }),
                    // Quick amount chips
                    c.jsxs("div", {
                      className: "flex flex-wrap gap-1.5 mt-2",
                      children: [
                        [20000000, "20tr"],
                        [50000000, "50tr"],
                        [100000000, "100tr"],
                        [200000000, "200tr"]
                      ].map(([val, label]) => c.jsx("button", {
                        key: val,
                        type: "button",
                        onClick: () => setNewInvestorAmount(String(val)),
                        className: "px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold font-mono text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-950",
                        children: label
                      }))
                    })
                  ]
                })
              ]
            }),
            c.jsxs("div", {
              className: "flex gap-2 justify-end pt-2",
              children: [
                c.jsx("button", {
                  type: "button",
                  onClick: () => setShowAddInvestorModal(false),
                  className: "px-4 py-2.5 bg-gray-200 dark:bg-gray-700 rounded-xl font-bold text-xs",
                  children: "Hủy"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: handleAddInvestor,
                  className: "px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase shadow-md",
                  children: "Lưu Người Góp"
                })
              ]
            })
          ]
        })
      }),

      // MODAL: THÊM CHI PHÍ VẬN HÀNH
      showAddExpenseModal && c.jsx("div", {
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4",
          children: [
            c.jsx("h3", { className: "font-black text-base uppercase text-gray-900 dark:text-white", children: "+ Thêm Chi Phí Vận Hành" }),
            c.jsxs("div", {
              className: "space-y-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-xs font-bold text-gray-500 mb-1 block uppercase", children: "Danh mục chi phí" }),
                    c.jsx("div", {
                      className: "grid grid-cols-2 gap-1.5",
                      children: expenseCategories.map(cat => c.jsxs("button", {
                        key: cat.label,
                        type: "button",
                        onClick: () => setNewExpenseCat(cat.label),
                        className: \`p-2 rounded-xl text-[11px] font-bold text-left transition-all border \${
                          newExpenseCat === cat.label
                            ? "bg-orange-50 dark:bg-orange-950/40 border-orange-500 text-orange-900 dark:text-orange-200"
                            : "bg-gray-50 dark:bg-gray-700/60 border-transparent text-gray-700 dark:text-gray-300"
                        }\`,
                        children: [cat.icon, " ", cat.label]
                      }))
                    })
                  ]
                }),
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-xs font-bold text-gray-500 mb-1 block uppercase", children: "Số tiền chi (VNĐ)" }),
                    c.jsx("input", {
                      type: "number",
                      placeholder: "VD: 1500000",
                      value: newExpenseAmount,
                      onChange: e => setNewExpenseAmount(e.target.value),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-lg font-mono outline-none focus:border-orange-500"
                    })
                  ]
                }),
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-xs font-bold text-gray-500 mb-1 block uppercase", children: "Ghi chú chi tiết (nếu có)" }),
                    c.jsx("input", {
                      type: "text",
                      placeholder: "VD: Xe tải giao Camimex 12 phi...",
                      value: newExpenseNote,
                      onChange: e => setNewExpenseNote(e.target.value),
                      className: "w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-xs outline-none"
                    })
                  ]
                })
              ]
            }),
            c.jsxs("div", {
              className: "flex gap-2 justify-end pt-2",
              children: [
                c.jsx("button", {
                  type: "button",
                  onClick: () => setShowAddExpenseModal(false),
                  className: "px-4 py-2.5 bg-gray-200 dark:bg-gray-700 rounded-xl font-bold text-xs",
                  children: "Hủy"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: handleAddExpense,
                  className: "px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs uppercase shadow-md",
                  children: "Lưu Khoản Chi"
                })
              ]
            })
          ]
        })
      }),

      // MODAL: LỊCH SỬ CÁC CHUYẾN ĐÃ LƯU
      showSavedTripsModal && c.jsx("div", {
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4 max-h-[85vh] flex flex-col",
          children: [
            c.jsxs("div", {
              className: "flex justify-between items-center border-b pb-3",
              children: [
                c.jsx("h3", { className: "font-black text-base uppercase text-gray-900 dark:text-white", children: "Lịch Sử Các Chuyến Hùn Vốn Đã Quyết Toán" }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => setShowSavedTripsModal(false),
                  className: "p-1.5 text-gray-400 hover:text-gray-600 rounded-full",
                  children: c.jsx(_a, { size: 18 })
                })
              ]
            }),
            c.jsx("div", {
              className: "overflow-y-auto flex-1 space-y-3 pr-1",
              children: (financeData.savedTrips || []).length === 0 ? c.jsx("p", {
                className: "text-center text-gray-400 py-12 italic text-xs font-bold",
                children: "Chưa có chuyến hùn vốn nào được lưu trước đây."
              }) : (financeData.savedTrips || []).map((st, sIdx) => c.jsxs("div", {
                key: st.id || sIdx,
                className: "p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-2",
                children: [
                  c.jsxs("div", {
                    className: "flex justify-between items-center",
                    children: [
                      c.jsx("h4", { className: "font-black text-sm text-gray-900 dark:text-white", children: st.name }),
                      c.jsx("span", {
                        className: \`px-2 py-0.5 rounded-md text-[10px] font-black uppercase \${st.isProfit ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}\`,
                        children: st.isProfit ? "LỜI" : "LỖ"
                      })
                    ]
                  }),
                  c.jsxs("div", {
                    className: "grid grid-cols-3 gap-2 text-[11px] text-gray-500 font-bold",
                    children: [
                      c.jsxs("div", { children: ["Vốn: ", c.jsx("b", { className: "text-gray-800 dark:text-gray-200", children: _fmt(st.totalCapital) })] }),
                      c.jsxs("div", { children: ["Chi: ", c.jsx("b", { className: "text-red-600", children: _fmt(st.totalExpenses) })] }),
                      c.jsxs("div", { children: ["Thu: ", c.jsx("b", { className: "text-green-600", children: _fmt(st.totalRevenue) })] })
                    ]
                  }),
                  c.jsxs("div", {
                    className: "flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700 text-xs font-black",
                    children: [
                      c.jsx("span", { children: "Lợi nhuận ròng:" }),
                      c.jsxs("span", {
                        className: st.isProfit ? "text-green-600 font-mono" : "text-red-600 font-mono",
                        children: [(st.isProfit ? "+" : "") + _fmt(st.netProfit) + " đ"]
                      })
                    ]
                  })
                ]
              }))
            })
          ]
        })
      })
    ]
  });
};
`;

// Insert Xm_FinanceScreen right before const BmMainApp=
const pBm = bundle.indexOf("const BmMainApp=");
if (pBm !== -1) {
  bundle = bundle.slice(0, pBm) + financeScreenComponent + "\n\n" + bundle.slice(pBm);
  console.log("Inserted Xm_FinanceScreen successfully!");
} else {
  console.error("Could not find const BmMainApp=!");
  process.exit(1);
}

fs.writeFileSync(bundlePath, bundle, "utf8");
console.log("Xm_FinanceScreen written to bundle!");
