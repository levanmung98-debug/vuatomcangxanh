const fs = require("fs");
const path = require("path");

const bundlePath = path.join(__dirname, "../assets/index-v7.js");
let bundle = fs.readFileSync(bundlePath, "utf8");

const pStart = bundle.indexOf("const Xm_FinanceScreen =");
const pEnd = bundle.indexOf("const BmMainApp=");

if (pStart === -1 || pEnd === -1) {
  console.error("Could not find Xm_FinanceScreen boundaries:", { pStart, pEnd });
  process.exit(1);
}

const advancedFinanceComponent = `
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

  const trip = financeData.activeTrip || {};
  const [tripName, setTripName] = w.useState(trip.name || "Chuyến thu mua tôm");
  const [tripDate, setTripDate] = w.useState(trip.startDate || new Date().toISOString().split("T")[0]);
  const [tripNote, setTripNote] = w.useState(trip.note || "");
  const [filterMode, setFilterMode] = w.useState(trip.filterMode || "DATE"); // "DATE" | "ALL"

  // Modal states
  // 1. Investor Modals (Add & Edit)
  const [showInvestorModal, setShowInvestorModal] = w.useState(false);
  const [editingInvestorId, setEditingInvestorId] = w.useState(null);
  const [investorFormName, setInvestorFormName] = w.useState("");
  const [investorFormAmount, setInvestorFormAmount] = w.useState("");

  // 2. Expense Modals (Add & Edit)
  const [showExpenseModal, setShowExpenseModal] = w.useState(false);
  const [editingExpenseId, setEditingExpenseId] = w.useState(null);
  const [expenseFormCat, setExpenseFormCat] = w.useState("Tiền thuê xe / vận chuyển");
  const [expenseFormAmount, setExpenseFormAmount] = w.useState("");
  const [expenseFormNote, setExpenseFormNote] = w.useState("");

  // 3. Selection Modals (Sessions & Sales list)
  const [showSessionsModal, setShowSessionsModal] = w.useState(false);
  const [showSalesModal, setShowSalesModal] = w.useState(false);

  // 4. Trip Settings & Saved Trips Modals
  const [showTripSettingsModal, setShowTripSettingsModal] = w.useState(false);
  const [showSavedTripsModal, setShowSavedTripsModal] = w.useState(false);
  const [viewingSavedTrip, setViewingSavedTrip] = w.useState(null);
  const [editingSavedTripId, setEditingSavedTripId] = w.useState(null);
  const [editingSavedTripName, setEditingSavedTripName] = w.useState("");

  // Helper to persist updates to localStorage
  const updateActiveTrip = (updater) => {
    setFinanceData(prev => {
      const currentTrip = prev.activeTrip || {};
      const updatedTrip = typeof updater === "function" ? updater(currentTrip) : { ...currentTrip, ...updater };
      const nextData = { ...prev, activeTrip: updatedTrip };
      me.saveFinanceData(nextData);
      return nextData;
    });
  };

  // =========================================================================
  // 1. INVESTORS (VỐN GÓP)
  // =========================================================================
  const investors = trip.investors || [];
  const totalCapital = investors.reduce((acc, inv) => acc + Number(inv.amount || 0), 0);

  const handleOpenAddInvestor = () => {
    setEditingInvestorId(null);
    setInvestorFormName("");
    setInvestorFormAmount("");
    setShowInvestorModal(true);
  };

  const handleOpenEditInvestor = (inv) => {
    setEditingInvestorId(inv.id);
    setInvestorFormName(inv.name);
    setInvestorFormAmount(String(inv.amount || ""));
    setShowInvestorModal(true);
  };

  const handleSaveInvestorForm = () => {
    if (!investorFormName.trim()) {
      alert("Vui lòng nhập tên người góp vốn!");
      return;
    }
    const amt = Number(investorFormAmount) || 0;
    if (amt <= 0) {
      alert("Vui lòng nhập số tiền vốn góp hợp lệ (lớn hơn 0)!");
      return;
    }

    if (editingInvestorId) {
      // Edit existing
      updateActiveTrip(t => ({
        ...t,
        investors: (t.investors || []).map(i => i.id === editingInvestorId ? { ...i, name: investorFormName.trim(), amount: amt } : i)
      }));
    } else {
      // Add new
      const newInv = {
        id: "inv_" + Date.now(),
        name: investorFormName.trim(),
        amount: amt
      };
      updateActiveTrip(t => ({
        ...t,
        investors: [...(t.investors || []), newInv]
      }));
    }
    setShowInvestorModal(false);
  };

  const handleDeleteInvestor = (id) => {
    if (investors.length <= 1) {
      alert("Phải giữ lại ít nhất 1 người góp vốn để phân chia!");
      return;
    }
    const target = investors.find(i => i.id === id);
    if (confirm("Bạn có chắc chắn muốn xóa người góp vốn \\"" + (target?.name || "") + "\\"?")) {
      updateActiveTrip(t => ({
        ...t,
        investors: (t.investors || []).filter(i => i.id !== id)
      }));
    }
  };

  // =========================================================================
  // 2. EXPENSES (CHI PHÍ)
  // =========================================================================
  const expenseCategories = [
    { label: "Tiền thuê xe / vận chuyển", icon: "🚛" },
    { label: "Tiền nhân công kéo / lựa tôm", icon: "👷" },
    { label: "Tiền ăn uống, bồi dưỡng", icon: "🍲" },
    { label: "Tiền nước đá, oxy", icon: "🧊" },
    { label: "Tiền bến bãi, cầu phà, lộ phí", icon: "🌉" },
    { label: "Chi phí phát sinh khác", icon: "📝" }
  ];

  // Shrimp purchase calculations
  const isShrimpAuto = trip.shrimpPurchaseAuto !== false;
  const filteredSessions = sessions.filter(s => {
    if (filterMode === "ALL") return true;
    return s.date && s.date.startsWith(tripDate);
  });
  // Active selected sessions (if user toggled specific tickets)
  const selectedSessionIds = trip.selectedSessionIds;
  const effectiveSessions = Array.isArray(selectedSessionIds)
    ? filteredSessions.filter(s => selectedSessionIds.includes(s.id))
    : filteredSessions;

  const autoShrimpPurchaseMoney = effectiveSessions.reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);
  const autoShrimpPurchaseKg = effectiveSessions.reduce((acc, s) => acc + Number(s.totalNet || s.totalGross || 0), 0);
  const shrimpPurchaseMoney = isShrimpAuto ? autoShrimpPurchaseMoney : Number(trip.shrimpPurchaseManualAmount || 0);

  // Operating expenses calculations
  const expenses = trip.expenses || [];
  const totalOperationExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount || 0), 0);
  const totalExpenses = shrimpPurchaseMoney + totalOperationExpenses;

  const handleOpenAddExpense = () => {
    setEditingExpenseId(null);
    setExpenseFormCat("Tiền thuê xe / vận chuyển");
    setExpenseFormAmount("");
    setExpenseFormNote("");
    setShowExpenseModal(true);
  };

  const handleOpenEditExpense = (exp) => {
    setEditingExpenseId(exp.id);
    setExpenseFormCat(exp.category || "Tiền thuê xe / vận chuyển");
    setExpenseFormAmount(String(exp.amount || ""));
    setExpenseFormNote(exp.note || "");
    setShowExpenseModal(true);
  };

  const handleSaveExpenseForm = () => {
    const amt = Number(expenseFormAmount) || 0;
    if (amt <= 0) {
      alert("Vui lòng nhập số tiền chi phí hợp lệ!");
      return;
    }

    if (editingExpenseId) {
      updateActiveTrip(t => ({
        ...t,
        expenses: (t.expenses || []).map(e => e.id === editingExpenseId ? {
          ...e,
          category: expenseFormCat,
          amount: amt,
          note: expenseFormNote.trim()
        } : e)
      }));
    } else {
      const newExp = {
        id: "exp_" + Date.now(),
        category: expenseFormCat,
        amount: amt,
        note: expenseFormNote.trim(),
        date: new Date().toISOString()
      };
      updateActiveTrip(t => ({
        ...t,
        expenses: [...(t.expenses || []), newExp]
      }));
    }
    setShowExpenseModal(false);
  };

  const handleDeleteExpense = (id) => {
    const target = expenses.find(e => e.id === id);
    if (confirm("Bạn có chắc chắn muốn xóa khoản chi \\"" + (target?.category || "") + " (" + _fmt(target?.amount) + " đ)\\"?")) {
      updateActiveTrip(t => ({
        ...t,
        expenses: (t.expenses || []).filter(e => e.id !== id)
      }));
    }
  };

  // =========================================================================
  // 3. REVENUE (DOANH THU)
  // =========================================================================
  const isRevenueAuto = trip.revenueAuto !== false;
  const completedSales = sales.filter(s => s.status === "COMPLETED" || s.status === "SETTLED" || s.isPaidFull);
  const filteredSales = completedSales.filter(s => {
    if (filterMode === "ALL") return true;
    return s.date && s.date.startsWith(tripDate);
  });
  const selectedSaleIds = trip.selectedSaleIds;
  const effectiveSales = Array.isArray(selectedSaleIds)
    ? filteredSales.filter(s => selectedSaleIds.includes(s.id))
    : filteredSales;

  const autoRevenueMoney = effectiveSales.reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);
  const autoRevenueKg = effectiveSales.reduce((acc, s) => acc + Number(s.totalNet || s.totalGross || 0), 0);
  const totalRevenue = isRevenueAuto ? autoRevenueMoney : Number(trip.revenueManualAmount || 0);

  // Breakdown by channel
  const retailRevenue = effectiveSales.filter(s => s.targetGroup === "RETAIL").reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);
  const marketRevenue = effectiveSales.filter(s => s.targetGroup === "MARKET").reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);
  const factoryRevenue = effectiveSales.filter(s => s.targetGroup === "FACTORY").reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);

  // =========================================================================
  // 4. NET PROFIT & DISTRIBUTION (QUYẾT TOÁN & PHÂN CHIA)
  // =========================================================================
  const netProfit = totalRevenue - totalExpenses;
  const isProfit = netProfit >= 0;
  const profitMarginPercent = totalExpenses > 0 ? ((netProfit / totalExpenses) * 100) : 0;

  // Individual investor distribution
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

  // Share statement via Zalo / Messenger
  const handleShareZaloStatement = () => {
    let msg = "🦐 [BẢNG QUYẾT TOÁN HÙN VỐN & CHIA LỜI LỖ TÔM]\\n";
    msg += "Chuyến: " + tripName + "\\n";
    msg += "Ngày: " + tripDate + "\\n";
    if (tripNote) msg += "Ghi chú: " + tripNote + "\\n";
    msg += "================================\\n";
    msg += "1. NGUỒN VỐN GÓP: " + _fmt(totalCapital) + " đ\\n";
    investors.forEach((inv, i) => {
      const pct = totalCapital > 0 ? ((inv.amount / totalCapital) * 100).toFixed(1) : "0.0";
      msg += "  " + (i + 1) + ". " + inv.name + ": " + _fmt(inv.amount) + " đ (" + pct + "%)\\n";
    });
    msg += "--------------------------------\\n";
    msg += "2. TỔNG CHI PHÍ: " + _fmt(totalExpenses) + " đ\\n";
    msg += "  • Tiền mua tôm: " + _fmt(shrimpPurchaseMoney) + " đ (" + effectiveSessions.length + " phiếu, " + _fmtKg(autoShrimpPurchaseKg) + " kg)\\n";
    msg += "  • Chi phí vận hành: " + _fmt(totalOperationExpenses) + " đ\\n";
    expenses.forEach((e, i) => {
      msg += "    - " + e.category + (e.note ? " [" + e.note + "]" : "") + ": " + _fmt(e.amount) + " đ\\n";
    });
    msg += "--------------------------------\\n";
    msg += "3. TỔNG DOANH THU: " + _fmt(totalRevenue) + " đ\\n";
    if (effectiveSales.length > 0) {
      if (retailRevenue > 0) msg += "  • Bán lẻ: " + _fmt(retailRevenue) + " đ\\n";
      if (marketRevenue > 0) msg += "  • Chợ đầu mối: " + _fmt(marketRevenue) + " đ\\n";
      if (factoryRevenue > 0) msg += "  • Công ty: " + _fmt(factoryRevenue) + " đ\\n";
    }
    msg += "================================\\n";
    msg += "4. LỢI NHUẬN RÒNG: " + (isProfit ? "+" : "") + _fmt(netProfit) + " đ\\n";
    msg += "   Kết quả: " + (isProfit ? "LỜI (LÃI)" : "BỊ LỖ") + " " + Math.abs(profitMarginPercent).toFixed(1) + "%\\n";
    msg += "================================\\n";
    msg += "5. BẢNG TIỀN THỰC NHẬN CỦA TỪNG NGƯỜI:\\n";
    investorPayouts.forEach((p, i) => {
      msg += "  " + (i + 1) + ". " + p.name + " (" + p.sharePercent.toFixed(1) + "%):\\n";
      msg += "     • Vốn gốc: " + _fmt(p.amount) + " đ\\n";
      msg += "     • " + (p.profitShare >= 0 ? "Chia lời: +" : "Chịu lỗ: ") + _fmt(p.profitShare) + " đ\\n";
      msg += "     ==> THỰC NHẬN: " + _fmt(p.totalPayout) + " VNĐ\\n";
    });
    msg += "--------------------------------\\n";
    msg += "Vựa Tôm Càng Xanh - Đối soát minh bạch 100%.";

    try {
      navigator.clipboard.writeText(msg);
      alert("✅ Đã sao chép bảng quyết toán chi tiết! Đang mở Zalo để gửi...");
      window.open("https://zalo.me", "_blank");
    } catch(e) {
      alert("Nội dung quyết toán:\\n\\n" + msg);
    }
  };

  // Archive and settle current trip
  const handleSettleAndArchiveTrip = () => {
    if (!confirm("Bạn có chắc chắn muốn khóa và lưu chuyến hạch toán này vào lịch sử? Dữ liệu chuyến sẽ được lưu trữ an toàn và một chuyến mới sẽ được khởi tạo.")) {
      return;
    }

    const archivedTrip = {
      ...trip,
      name: tripName,
      startDate: tripDate,
      note: tripNote,
      totalCapital,
      shrimpPurchaseMoney,
      shrimpPurchaseKg: autoShrimpPurchaseKg,
      totalOperationExpenses,
      totalExpenses,
      totalRevenue,
      revenueKg: autoRevenueKg,
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
      note: "",
      investors: investors.map(i => ({ ...i })), // keep current investor directory
      shrimpPurchaseAuto: true,
      shrimpPurchaseManualAmount: 0,
      selectedSessionIds: null,
      expenses: [],
      revenueAuto: true,
      revenueManualAmount: 0,
      selectedSaleIds: null
    };

    const nextData = {
      activeTrip: newActiveTrip,
      savedTrips: [archivedTrip, ...(financeData.savedTrips || [])]
    };

    me.saveFinanceData(nextData);
    setFinanceData(nextData);
    setTripName(newActiveTrip.name);
    setTripDate(newActiveTrip.startDate);
    setTripNote("");
    alert("✅ Đã quyết toán thành công và lưu vào lịch sử chuyến!");
  };

  // Reset or create fresh trip
  const handleResetTrip = () => {
    if (confirm("Bạn có chắc chắn muốn đặt lại chuyến này? Các chi phí vận hành sẽ được xóa về 0, giữ nguyên danh sách người góp vốn.")) {
      updateActiveTrip(t => ({
        ...t,
        expenses: [],
        shrimpPurchaseManualAmount: 0,
        revenueManualAmount: 0,
        selectedSessionIds: null,
        selectedSaleIds: null
      }));
      setShowTripSettingsModal(false);
      alert("✅ Đã đặt lại dữ liệu chuyến!");
    }
  };

  // Saved trip actions
  const handleDeleteSavedTrip = (id) => {
    if (confirm("Bạn có chắc chắn muốn xóa chuyến hạch toán này khỏi lịch sử? Thao tác này không thể hoàn tác.")) {
      const nextSaved = (financeData.savedTrips || []).filter(t => t.id !== id);
      const nextData = { ...financeData, savedTrips: nextSaved };
      me.saveFinanceData(nextData);
      setFinanceData(nextData);
      if (viewingSavedTrip && viewingSavedTrip.id === id) setViewingSavedTrip(null);
    }
  };

  const handleRestoreSavedTrip = (savedTrip) => {
    if (confirm("Bạn có chắc chắn muốn khôi phục chuyến \\"" + savedTrip.name + "\\" làm chuyến đang hoạt động? Chuyến hiện tại chưa quyết toán sẽ được thay thế.")) {
      const nextData = {
        ...financeData,
        activeTrip: { ...savedTrip, id: "trip_" + Date.now() }
      };
      me.saveFinanceData(nextData);
      setFinanceData(nextData);
      setTripName(savedTrip.name || "");
      setTripDate(savedTrip.startDate || "");
      setTripNote(savedTrip.note || "");
      setShowSavedTripsModal(false);
      setViewingSavedTrip(null);
      alert("✅ Đã khôi phục chuyến thành công!");
    }
  };

  const handleSaveEditSavedTripName = () => {
    if (!editingSavedTripName.trim()) return;
    const nextSaved = (financeData.savedTrips || []).map(t => {
      if (t.id === editingSavedTripId) {
        return { ...t, name: editingSavedTripName.trim() };
      }
      return t;
    });
    const nextData = { ...financeData, savedTrips: nextSaved };
    me.saveFinanceData(nextData);
    setFinanceData(nextData);
    if (viewingSavedTrip && viewingSavedTrip.id === editingSavedTripId) {
      setViewingSavedTrip({ ...viewingSavedTrip, name: editingSavedTripName.trim() });
    }
    setEditingSavedTripId(null);
    setEditingSavedTripName("");
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
                      "Tài Chính & Hùn Vốn"
                    ]
                  }),
                  c.jsx("span", {
                    className: "text-[10px] font-bold opacity-80 uppercase tracking-widest block mt-0.5",
                    children: "Hùn vốn • Hạch toán chi phí • Chia lời lỗ theo chuyến"
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
                onClick: () => setShowTripSettingsModal(true),
                className: "p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase transition-all cursor-pointer active:scale-95",
                title: "Thiết lập chuyến",
                children: c.jsx(ym, { size: 18 })
              }),
              c.jsxs("button", {
                type: "button",
                onClick: () => setShowSavedTripsModal(true),
                className: "px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase flex items-center gap-1 active:scale-95 transition-all cursor-pointer",
                children: [c.jsx(Fd, { size: 14 }), "Lịch Sử (", (financeData.savedTrips || []).length, ")"]
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

      // Main Scroll Container
      c.jsx("div", {
        className: "flex-1 overflow-y-auto p-4 space-y-5 max-w-4xl mx-auto w-full pb-28",
        children: c.jsxs("div", {
          className: "space-y-5",
          children: [
            // =========================================================================
            // TOP BAR: THÔNG TIN VÀ THIẾT LẬP CHUYẾN
            // =========================================================================
            c.jsxs("div", {
              className: "bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3",
              children: [
                c.jsxs("div", {
                  className: "flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center",
                  children: [
                    c.jsxs("div", {
                      className: "flex items-center gap-2.5 flex-1 w-full",
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
                              className: "text-base font-black text-gray-900 dark:text-white bg-transparent outline-none w-full border-b border-dashed border-gray-300 dark:border-gray-700 pb-0.5 focus:border-indigo-500"
                            })
                          ]
                        })
                      ]
                    }),
                    // Date & Mode selector
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
                        }),
                        c.jsxs("button", {
                          type: "button",
                          onClick: () => {
                            const newMode = filterMode === "DATE" ? "ALL" : "DATE";
                            setFilterMode(newMode);
                            updateActiveTrip({ filterMode: newMode });
                          },
                          className: \`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all \${
                            filterMode === "ALL" ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                          }\`,
                          children: [filterMode === "ALL" ? "Tất cả phiếu" : "Theo ngày"]
                        })
                      ]
                    })
                  ]
                }),
                // Optional Note
                c.jsxs("div", {
                  className: "flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-800",
                  children: [
                    c.jsx("span", { className: "text-xs text-gray-400", children: "📝" }),
                    c.jsx("input", {
                      type: "text",
                      placeholder: "Ghi chú chuyến hàng (ví dụ: Xe 69C giao Bình Điền, ao Chú Năm...)",
                      value: tripNote,
                      onChange: e => {
                        setTripNote(e.target.value);
                        updateActiveTrip({ note: e.target.value });
                      },
                      className: "w-full text-xs bg-transparent outline-none text-gray-600 dark:text-gray-300 placeholder-gray-400"
                    })
                  ]
                })
              ]
            }),

            // =========================================================================
            // KHU VỰC 1: QUẢN LÝ NGUỒN VỐN GÓP (ĐẦY ĐỦ THÊM, SỬA, XÓA, THIẾT LẬP)
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
                        c.jsx("p", { className: "text-[11px] text-gray-500 font-semibold", children: "Tự động tính toán tỷ lệ % và quỹ vốn lưu động khả dụng" })
                      ]
                    }),
                    c.jsxs("button", {
                      type: "button",
                      onClick: handleOpenAddInvestor,
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

                // Multi-colored progress bar
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

                // Investors list with EDIT & DELETE
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
                            // Edit button
                            c.jsx("button", {
                              type: "button",
                              onClick: () => handleOpenEditInvestor(inv),
                              className: "p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg cursor-pointer",
                              title: "Sửa người góp vốn",
                              children: c.jsx("span", { className: "text-sm", children: "✎" })
                            }),
                            // Delete button
                            c.jsx("button", {
                              type: "button",
                              onClick: () => handleDeleteInvestor(inv.id),
                              className: "p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer",
                              title: "Xóa người góp vốn",
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
            // KHU VỰC 2: HẠCH TOÁN CHI PHÍ (TIỀN CHI) - ĐẦY ĐỦ THÊM, SỬA, XÓA
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
                        c.jsx("p", { className: "text-[11px] text-gray-500 font-semibold", children: "Tiền mua tôm + Các chi phí vận hành (thuê xe, công, oxy, phà...)" })
                      ]
                    }),
                    c.jsxs("button", {
                      type: "button",
                      onClick: handleOpenAddExpense,
                      className: "px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1 active:scale-95 transition-all shadow-sm cursor-pointer",
                      children: [c.jsx("span", { children: "+" }), "Thêm Chi Phí"]
                    })
                  ]
                }),

                // Tiền Mua Tôm
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
                                c.jsx("span", { className: "font-black text-xs uppercase text-orange-900 dark:text-orange-200 block", children: "Tiền Mua Tôm Vào" }),
                                c.jsxs("span", { className: "text-[10px] text-gray-500", children: [effectiveSessions.length, " phiếu cân • ", _fmtKg(autoShrimpPurchaseKg), " kg tôm"] })
                              ]
                            })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "flex items-center gap-1.5",
                          children: [
                            isShrimpAuto && c.jsx("button", {
                              type: "button",
                              onClick: () => setShowSessionsModal(true),
                              className: "px-2 py-1 bg-white dark:bg-gray-800 border border-orange-300 rounded-lg text-[10px] font-bold text-orange-700 dark:text-orange-300 cursor-pointer",
                              children: "📋 Chọn phiếu (" + effectiveSessions.length + ")"
                            }),
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

                // Operating Expenses List with EDIT & DELETE
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
                            // Edit expense button
                            c.jsx("button", {
                              type: "button",
                              onClick: () => handleOpenEditExpense(exp),
                              className: "p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg cursor-pointer",
                              title: "Sửa khoản chi",
                              children: c.jsx("span", { className: "text-sm", children: "✎" })
                            }),
                            // Delete expense button
                            c.jsx("button", {
                              type: "button",
                              onClick: () => handleDeleteExpense(exp.id),
                              className: "p-1.5 text-gray-400 hover:text-red-500 rounded-lg cursor-pointer",
                              title: "Xóa khoản chi",
                              children: c.jsx(xm, { size: 14 })
                            })
                          ]
                        })
                      ]
                    }))
                  ]
                }),

                // Total Expenses Summary
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
                        c.jsx("p", { className: "text-[11px] text-gray-500 font-semibold", children: "Bán lẻ + Bán chợ (sau trừ hoa hồng) + Bán công ty" })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "flex items-center gap-1.5",
                      children: [
                        isRevenueAuto && c.jsx("button", {
                          type: "button",
                          onClick: () => setShowSalesModal(true),
                          className: "px-2 py-1 bg-white dark:bg-gray-800 border border-emerald-300 rounded-lg text-[10px] font-bold text-emerald-700 dark:text-emerald-300 cursor-pointer",
                          children: "📋 Chọn đơn (" + effectiveSales.length + ")"
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
                        c.jsxs("span", { className: "text-[10px] text-gray-500", children: [effectiveSales.length, " đơn bán hoàn tất • ", _fmtKg(autoRevenueKg), " kg tôm"] })
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

                // Breakdown Channels
                effectiveSales.length > 0 && c.jsxs("div", {
                  className: "grid grid-cols-3 gap-2 text-xs",
                  children: [
                    c.jsxs("div", {
                      className: "p-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl",
                      children: [
                        c.jsx("span", { className: "text-[10px] text-gray-400 block", children: "🛒 Bán lẻ" }),
                        c.jsxs("span", { className: "font-mono font-bold text-gray-800 dark:text-gray-200", children: [_fmt(retailRevenue), " đ"] })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "p-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl",
                      children: [
                        c.jsx("span", { className: "text-[10px] text-gray-400 block", children: "🏪 Chợ đầu mối" }),
                        c.jsxs("span", { className: "font-mono font-bold text-gray-800 dark:text-gray-200", children: [_fmt(marketRevenue), " đ"] })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "p-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl",
                      children: [
                        c.jsx("span", { className: "text-[10px] text-gray-400 block", children: "🏢 Công ty" }),
                        c.jsxs("span", { className: "font-mono font-bold text-gray-800 dark:text-gray-200", children: [_fmt(factoryRevenue), " đ"] })
                      ]
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
                    c.jsx("p", { className: "text-xs text-gray-500 font-semibold", children: "Lợi nhuận ròng = Tổng Doanh Thu - Tổng Chi Phí. Chia đều chuẩn 100% tỷ lệ vốn góp." })
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

                // Investor Distribution Table with Quick Edit & Integrity Total
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
                                c.jsx("th", { className: "p-3 text-right font-black text-blue-700 dark:text-blue-300", children: "TỔNG THỰC NHẬN" }),
                                c.jsx("th", { className: "p-3 text-center", children: "Sửa" })
                              ]
                            })
                          }),
                          c.jsxs("tbody", {
                            className: "divide-y divide-gray-100 dark:divide-gray-800 font-bold",
                            children: [
                              investorPayouts.map(p => c.jsxs("tr", {
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
                                  }),
                                  c.jsx("td", {
                                    className: "p-3 text-center",
                                    children: c.jsx("button", {
                                      type: "button",
                                      onClick: () => handleOpenEditInvestor(p),
                                      className: "p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-950 rounded cursor-pointer",
                                      children: "✎"
                                    })
                                  })
                                ]
                              }, p.id)),
                              // Integrity Total Footer
                              c.jsxs("tr", {
                                className: "bg-gray-100/80 dark:bg-gray-800/80 font-black text-xs border-t-2 border-gray-300 dark:border-gray-700",
                                children: [
                                  c.jsx("td", { className: "p-3 uppercase text-gray-600 dark:text-gray-300", children: "TỔNG CỘNG ĐỐI SOÁT" }),
                                  c.jsxs("td", { className: "p-3 text-right font-mono text-gray-900 dark:text-white", children: [_fmt(totalCapital), " đ"] }),
                                  c.jsxs("td", {
                                    className: \`p-3 text-right font-mono \${netProfit >= 0 ? "text-emerald-600" : "text-red-600"}\`,
                                    children: [(netProfit >= 0 ? "+" : "") + _fmt(netProfit), " đ"]
                                  }),
                                  c.jsxs("td", {
                                    className: "p-3 text-right font-mono font-black text-sm text-blue-800 dark:text-blue-200 bg-blue-100/40 dark:bg-blue-900/30",
                                    children: [_fmt(investorPayouts.reduce((a, b) => a + b.totalPayout, 0)), " đ"]
                                  }),
                                  c.jsx("td", { className: "p-3 text-center", children: "✓" })
                                ]
                              })
                            ]
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

      // =========================================================================
      // MODAL 1: THÊM / SỬA NGƯỜI GÓP VỐN
      // =========================================================================
      showInvestorModal && c.jsx("div", {
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4",
          children: [
            c.jsx("h3", {
              className: "font-black text-base uppercase text-gray-900 dark:text-white",
              children: editingInvestorId ? "✎ Sửa Người Góp Vốn" : "+ Thêm Người Góp Vốn"
            }),
            c.jsxs("div", {
              className: "space-y-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-xs font-bold text-gray-500 mb-1 block uppercase", children: "Tên người góp vốn *" }),
                    c.jsx("input", {
                      type: "text",
                      placeholder: "VD: Tôi, Anh B, Chị Lan...",
                      value: investorFormName,
                      onChange: e => setInvestorFormName(e.target.value),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm outline-none focus:border-indigo-500"
                    }),
                    // Quick names
                    c.jsxs("div", {
                      className: "flex flex-wrap gap-1 mt-1.5",
                      children: ["Tôi (Chủ vựa)", "Anh B", "Anh C", "Chị Lan"].map(nm => c.jsx("button", {
                        key: nm,
                        type: "button",
                        onClick: () => setInvestorFormName(nm),
                        className: "px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-[10px] font-bold hover:bg-gray-200",
                        children: nm
                      }))
                    })
                  ]
                }),
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-xs font-bold text-gray-500 mb-1 block uppercase", children: "Số tiền góp vốn (VNĐ) *" }),
                    c.jsx("input", {
                      type: "number",
                      placeholder: "VD: 100000000",
                      value: investorFormAmount,
                      onChange: e => setInvestorFormAmount(e.target.value),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-lg font-mono outline-none focus:border-indigo-500"
                    }),
                    // Quick amount chips
                    c.jsxs("div", {
                      className: "flex flex-wrap gap-1.5 mt-2",
                      children: [
                        [20000000, "20tr"],
                        [50000000, "50tr"],
                        [100000000, "100tr"],
                        [200000000, "200tr"],
                        [500000000, "500tr"]
                      ].map(([val, label]) => c.jsx("button", {
                        key: val,
                        type: "button",
                        onClick: () => setInvestorFormAmount(String(val)),
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
                  onClick: () => setShowInvestorModal(false),
                  className: "px-4 py-2.5 bg-gray-200 dark:bg-gray-700 rounded-xl font-bold text-xs",
                  children: "Hủy"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: handleSaveInvestorForm,
                  className: "px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase shadow-md",
                  children: editingInvestorId ? "Cập Nhật" : "Lưu Người Góp"
                })
              ]
            })
          ]
        })
      }),

      // =========================================================================
      // MODAL 2: THÊM / SỬA CHI PHÍ VẬN HÀNH
      // =========================================================================
      showExpenseModal && c.jsx("div", {
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4",
          children: [
            c.jsx("h3", {
              className: "font-black text-base uppercase text-gray-900 dark:text-white",
              children: editingExpenseId ? "✎ Sửa Chi Phí Vận Hành" : "+ Thêm Chi Phí Vận Hành"
            }),
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
                        onClick: () => setExpenseFormCat(cat.label),
                        className: \`p-2 rounded-xl text-[11px] font-bold text-left transition-all border \${
                          expenseFormCat === cat.label
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
                    c.jsx("label", { className: "text-xs font-bold text-gray-500 mb-1 block uppercase", children: "Số tiền chi (VNĐ) *" }),
                    c.jsx("input", {
                      type: "number",
                      placeholder: "VD: 1500000",
                      value: expenseFormAmount,
                      onChange: e => setExpenseFormAmount(e.target.value),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-lg font-mono outline-none focus:border-orange-500"
                    }),
                    // Quick expense chips
                    c.jsxs("div", {
                      className: "flex flex-wrap gap-1.5 mt-2",
                      children: [
                        [200000, "200k"],
                        [500000, "500k"],
                        [1000000, "1tr"],
                        [2000000, "2tr"],
                        [5000000, "5tr"]
                      ].map(([val, label]) => c.jsx("button", {
                        key: val,
                        type: "button",
                        onClick: () => setExpenseFormAmount(String(val)),
                        className: "px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold font-mono text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-950",
                        children: label
                      }))
                    })
                  ]
                }),
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-xs font-bold text-gray-500 mb-1 block uppercase", children: "Ghi chú chi tiết (nếu có)" }),
                    c.jsx("input", {
                      type: "text",
                      placeholder: "VD: Xe tải giao Camimex 12 phi...",
                      value: expenseFormNote,
                      onChange: e => setExpenseFormNote(e.target.value),
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
                  onClick: () => setShowExpenseModal(false),
                  className: "px-4 py-2.5 bg-gray-200 dark:bg-gray-700 rounded-xl font-bold text-xs",
                  children: "Hủy"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: handleSaveExpenseForm,
                  className: "px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs uppercase shadow-md",
                  children: editingExpenseId ? "Cập Nhật" : "Lưu Khoản Chi"
                })
              ]
            })
          ]
        })
      }),

      // =========================================================================
      // MODAL 3: CHỌN PHIẾU CÂN MUA TÔM ĐÓNG GÓP VÀO CHUYẾN
      // =========================================================================
      showSessionsModal && c.jsx("div", {
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4 max-h-[85vh] flex flex-col",
          children: [
            c.jsxs("div", {
              className: "flex justify-between items-center border-b pb-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("h3", { className: "font-black text-base uppercase text-gray-900 dark:text-white", children: "Chọn Phiếu Mua Tôm Cho Chuyến Này" }),
                    c.jsxs("p", { className: "text-xs text-gray-500 font-bold", children: ["Đang chọn: ", effectiveSessions.length, " / ", filteredSessions.length, " phiếu"] })
                  ]
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => setShowSessionsModal(false),
                  className: "p-1.5 text-gray-400 hover:text-gray-600 rounded-full",
                  children: c.jsx(_a, { size: 18 })
                })
              ]
            }),
            c.jsxs("div", {
              className: "flex justify-between items-center text-xs",
              children: [
                c.jsx("button", {
                  type: "button",
                  onClick: () => updateActiveTrip({ selectedSessionIds: null }),
                  className: "text-blue-600 font-bold",
                  children: "Chọn tất cả"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => updateActiveTrip({ selectedSessionIds: [] }),
                  className: "text-gray-500 font-bold",
                  children: "Bỏ chọn tất cả"
                })
              ]
            }),
            c.jsx("div", {
              className: "overflow-y-auto flex-1 space-y-2 pr-1",
              children: filteredSessions.length === 0 ? c.jsx("p", {
                className: "text-center text-gray-400 py-12 italic text-xs font-bold",
                children: "Không có phiếu cân thu mua nào trong ngày này."
              }) : filteredSessions.map(sess => {
                const isChecked = !Array.isArray(selectedSessionIds) || selectedSessionIds.includes(sess.id);
                return c.jsxs("div", {
                  key: sess.id,
                  onClick: () => {
                    let nextIds;
                    if (!Array.isArray(selectedSessionIds)) {
                      nextIds = filteredSessions.map(s => s.id).filter(id => id !== sess.id);
                    } else if (selectedSessionIds.includes(sess.id)) {
                      nextIds = selectedSessionIds.filter(id => id !== sess.id);
                    } else {
                      nextIds = [...selectedSessionIds, sess.id];
                    }
                    updateActiveTrip({ selectedSessionIds: nextIds });
                  },
                  className: \`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all \${
                    isChecked
                      ? "bg-orange-50/80 dark:bg-orange-950/40 border-orange-400"
                      : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60"
                  }\`,
                  children: [
                    c.jsxs("div", {
                      className: "flex items-center gap-3",
                      children: [
                        c.jsx("input", {
                          type: "checkbox",
                          checked: isChecked,
                          readOnly: true,
                          className: "w-4 h-4 text-orange-600 rounded"
                        }),
                        c.jsxs("div", {
                          children: [
                            c.jsx("span", { className: "font-black text-xs text-gray-900 dark:text-white block", children: sess.farmerName || "Ao tôm" }),
                            c.jsxs("span", { className: "text-[10px] text-gray-500 font-mono", children: [new Date(sess.date).toLocaleDateString("vi-VN"), " • ", _fmtKg(sess.totalNet || sess.totalGross), " kg"] })
                          ]
                        })
                      ]
                    }),
                    c.jsxs("span", { className: "font-mono font-black text-sm text-orange-900 dark:text-orange-200", children: [_fmt(sess.totalMoney), " đ"] })
                  ]
                });
              })
            }),
            c.jsx("div", {
              className: "pt-2 flex justify-end",
              children: c.jsx("button", {
                type: "button",
                onClick: () => setShowSessionsModal(false),
                className: "px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs uppercase shadow-md",
                children: "Xong"
              })
            })
          ]
        })
      }),

      // =========================================================================
      // MODAL 4: CHỌN ĐƠN XUẤT BÁN ĐÓNG GÓP VÀO CHUYẾN
      // =========================================================================
      showSalesModal && c.jsx("div", {
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4 max-h-[85vh] flex flex-col",
          children: [
            c.jsxs("div", {
              className: "flex justify-between items-center border-b pb-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("h3", { className: "font-black text-base uppercase text-gray-900 dark:text-white", children: "Chọn Đơn Xuất Bán Cho Chuyến Này" }),
                    c.jsxs("p", { className: "text-xs text-gray-500 font-bold", children: ["Đang chọn: ", effectiveSales.length, " / ", filteredSales.length, " đơn"] })
                  ]
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => setShowSalesModal(false),
                  className: "p-1.5 text-gray-400 hover:text-gray-600 rounded-full",
                  children: c.jsx(_a, { size: 18 })
                })
              ]
            }),
            c.jsxs("div", {
              className: "flex justify-between items-center text-xs",
              children: [
                c.jsx("button", {
                  type: "button",
                  onClick: () => updateActiveTrip({ selectedSaleIds: null }),
                  className: "text-emerald-600 font-bold",
                  children: "Chọn tất cả"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => updateActiveTrip({ selectedSaleIds: [] }),
                  className: "text-gray-500 font-bold",
                  children: "Bỏ chọn tất cả"
                })
              ]
            }),
            c.jsx("div", {
              className: "overflow-y-auto flex-1 space-y-2 pr-1",
              children: filteredSales.length === 0 ? c.jsx("p", {
                className: "text-center text-gray-400 py-12 italic text-xs font-bold",
                children: "Không có đơn bán nào hoàn tất trong ngày này."
              }) : filteredSales.map(sl => {
                const isChecked = !Array.isArray(selectedSaleIds) || selectedSaleIds.includes(sl.id);
                return c.jsxs("div", {
                  key: sl.id,
                  onClick: () => {
                    let nextIds;
                    if (!Array.isArray(selectedSaleIds)) {
                      nextIds = filteredSales.map(s => s.id).filter(id => id !== sl.id);
                    } else if (selectedSaleIds.includes(sl.id)) {
                      nextIds = selectedSaleIds.filter(id => id !== sl.id);
                    } else {
                      nextIds = [...selectedSaleIds, sl.id];
                    }
                    updateActiveTrip({ selectedSaleIds: nextIds });
                  },
                  className: \`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all \${
                    isChecked
                      ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400"
                      : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60"
                  }\`,
                  children: [
                    c.jsxs("div", {
                      className: "flex items-center gap-3",
                      children: [
                        c.jsx("input", {
                          type: "checkbox",
                          checked: isChecked,
                          readOnly: true,
                          className: "w-4 h-4 text-emerald-600 rounded"
                        }),
                        c.jsxs("div", {
                          children: [
                            c.jsxs("span", {
                              className: "font-black text-xs text-gray-900 dark:text-white flex items-center gap-1.5",
                              children: [
                                c.jsx("span", { children: sl.targetGroup === "FACTORY" ? "🏢" : (sl.targetGroup === "MARKET" ? "🏪" : "🛒") }),
                                sl.buyerName
                              ]
                            }),
                            c.jsxs("span", { className: "text-[10px] text-gray-500 font-mono", children: [new Date(sl.date).toLocaleDateString("vi-VN"), " • ", _fmtKg(sl.totalNet || sl.totalGross), " kg"] })
                          ]
                        })
                      ]
                    }),
                    c.jsxs("span", { className: "font-mono font-black text-sm text-emerald-800 dark:text-emerald-300", children: [_fmt(sl.totalMoney), " đ"] })
                  ]
                });
              })
            }),
            c.jsx("div", {
              className: "pt-2 flex justify-end",
              children: c.jsx("button", {
                type: "button",
                onClick: () => setShowSalesModal(false),
                className: "px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase shadow-md",
                children: "Xong"
              })
            })
          ]
        })
      }),

      // =========================================================================
      // MODAL 5: THIẾT LẬP CHUYẾN (SETTINGS)
      // =========================================================================
      showTripSettingsModal && c.jsx("div", {
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4",
          children: [
            c.jsx("h3", { className: "font-black text-base uppercase text-gray-900 dark:text-white", children: "⚙️ Thiết Lập Chuyến Hùn Vốn" }),
            c.jsxs("div", {
              className: "space-y-3 text-xs font-bold",
              children: [
                c.jsxs("button", {
                  type: "button",
                  onClick: () => {
                    const newMode = filterMode === "DATE" ? "ALL" : "DATE";
                    setFilterMode(newMode);
                    updateActiveTrip({ filterMode: newMode });
                    setShowTripSettingsModal(false);
                  },
                  className: "w-full p-3 rounded-2xl bg-gray-100 dark:bg-gray-700 text-left flex justify-between items-center cursor-pointer",
                  children: [
                    c.jsxs("span", { children: ["Chế độ lọc phiếu: ", c.jsx("b", { children: filterMode === "DATE" ? "Theo ngày" : "Tất cả" })] }),
                    c.jsx("span", { className: "text-blue-600", children: "Đổi" })
                  ]
                }),
                c.jsxs("button", {
                  type: "button",
                  onClick: handleResetTrip,
                  className: "w-full p-3 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 text-left flex justify-between items-center cursor-pointer",
                  children: [
                    c.jsx("span", { children: "🔄 Đặt lại chi phí chuyến này về 0" }),
                    c.jsx("span", { children: "➔" })
                  ]
                }),
                c.jsxs("button", {
                  type: "button",
                  onClick: () => {
                    if (confirm("Khởi tạo chuyến mới tinh sạch hoàn toàn?")) {
                      const newActiveTrip = {
                        id: "trip_" + Date.now(),
                        name: "Chuyến thu mua ngày " + new Date().toLocaleDateString("vi-VN"),
                        startDate: new Date().toISOString().split("T")[0],
                        note: "",
                        investors: [
                          { id: "inv_1", name: "Tôi (Chủ vựa)", amount: 100000000 },
                          { id: "inv_2", name: "Anh B (Hùn vốn)", amount: 100000000 }
                        ],
                        shrimpPurchaseAuto: true,
                        shrimpPurchaseManualAmount: 0,
                        expenses: [],
                        revenueAuto: true,
                        revenueManualAmount: 0
                      };
                      const nextData = { ...financeData, activeTrip: newActiveTrip };
                      me.saveFinanceData(nextData);
                      setFinanceData(nextData);
                      setTripName(newActiveTrip.name);
                      setTripDate(newActiveTrip.startDate);
                      setTripNote("");
                      setShowTripSettingsModal(false);
                      alert("✅ Đã tạo chuyến mới tinh sạch!");
                    }
                  },
                  className: "w-full p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 text-left flex justify-between items-center cursor-pointer",
                  children: [
                    c.jsx("span", { children: "✨ Tạo chuyến mới tinh sạch" }),
                    c.jsx("span", { children: "➔" })
                  ]
                })
              ]
            }),
            c.jsx("div", {
              className: "flex justify-end pt-2",
              children: c.jsx("button", {
                type: "button",
                onClick: () => setShowTripSettingsModal(false),
                className: "px-5 py-2.5 bg-gray-200 dark:bg-gray-700 rounded-xl font-bold text-xs",
                children: "Đóng"
              })
            })
          ]
        })
      }),

      // =========================================================================
      // MODAL 6: LỊCH SỬ CÁC CHUYẾN ĐÃ LƯU (ĐẦY ĐỦ XEM, SỬA, KHÔI PHỤC, XÓA)
      // =========================================================================
      showSavedTripsModal && c.jsx("div", {
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4 max-h-[85vh] flex flex-col",
          children: [
            c.jsxs("div", {
              className: "flex justify-between items-center border-b pb-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("h3", { className: "font-black text-base uppercase text-gray-900 dark:text-white", children: "Lịch Sử Các Chuyến Hùn Vốn Đã Quyết Toán" }),
                    c.jsxs("p", { className: "text-xs text-gray-500 font-bold", children: ["Tổng số: ", (financeData.savedTrips || []).length, " chuyến đã lưu"] })
                  ]
                }),
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
                className: "p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-2.5",
                children: [
                  c.jsxs("div", {
                    className: "flex justify-between items-start",
                    children: [
                      c.jsxs("div", {
                        className: "space-y-0.5",
                        children: [
                          editingSavedTripId === st.id ? c.jsxs("div", {
                            className: "flex items-center gap-1",
                            children: [
                              c.jsx("input", {
                                type: "text",
                                value: editingSavedTripName,
                                onChange: e => setEditingSavedTripName(e.target.value),
                                className: "p-1 border rounded text-xs font-bold text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                              }),
                              c.jsx("button", {
                                type: "button",
                                onClick: handleSaveEditSavedTripName,
                                className: "px-2 py-1 bg-green-600 text-white rounded text-xs font-bold",
                                children: "Lưu"
                              }),
                              c.jsx("button", {
                                type: "button",
                                onClick: () => setEditingSavedTripId(null),
                                className: "px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs font-bold",
                                children: "Hủy"
                              })
                            ]
                          }) : c.jsxs("div", {
                            className: "flex items-center gap-1.5",
                            children: [
                              c.jsx("h4", { className: "font-black text-sm text-gray-900 dark:text-white", children: st.name }),
                              c.jsx("button", {
                                type: "button",
                                onClick: () => {
                                  setEditingSavedTripId(st.id);
                                  setEditingSavedTripName(st.name || "");
                                },
                                className: "text-gray-400 hover:text-blue-600 text-xs",
                                title: "Sửa tên chuyến",
                                children: "✎"
                              })
                            ]
                          }),
                          c.jsxs("span", { className: "text-[10px] text-gray-400 block", children: ["Ngày: ", st.startDate, " • Quyết toán lúc: ", new Date(st.settledAt || Date.now()).toLocaleTimeString("vi-VN")] })
                        ]
                      }),
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
                      c.jsxs("span", {
                        children: ["Lợi nhuận: ", c.jsx("b", { className: st.isProfit ? "text-green-600" : "text-red-600", children: [(st.isProfit ? "+" : "") + _fmt(st.netProfit) + " đ"] })]
                      }),
                      c.jsxs("div", {
                        className: "flex items-center gap-1.5",
                        children: [
                          // Xem chi tiết
                          c.jsx("button", {
                            type: "button",
                            onClick: () => setViewingSavedTrip(st),
                            className: "px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer",
                            children: "Xem Chi Tiết"
                          }),
                          // Khôi phục
                          c.jsx("button", {
                            type: "button",
                            onClick: () => handleRestoreSavedTrip(st),
                            className: "px-2 py-1 bg-amber-500 text-white rounded-lg text-xs font-bold cursor-pointer",
                            title: "Khôi phục làm chuyến hiện tại",
                            children: "Khôi Phục"
                          }),
                          // Xóa
                          c.jsx("button", {
                            type: "button",
                            onClick: () => handleDeleteSavedTrip(st.id),
                            className: "p-1 text-red-500 hover:bg-red-100 rounded-lg cursor-pointer",
                            title: "Xóa chuyến",
                            children: c.jsx(xm, { size: 14 })
                          })
                        ]
                      })
                    ]
                  })
                ]
              }))
            })
          ]
        })
      }),

      // =========================================================================
      // MODAL 7: XEM CHI TIẾT CHUYẾN ĐÃ LƯU
      // =========================================================================
      viewingSavedTrip && c.jsx("div", {
        className: "fixed inset-0 z-[220] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4 max-h-[90vh] flex flex-col",
          children: [
            c.jsxs("div", {
              className: "flex justify-between items-center border-b pb-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("h3", { className: "font-black text-base uppercase text-gray-900 dark:text-white", children: viewingSavedTrip.name }),
                    c.jsxs("p", { className: "text-xs text-gray-500 font-bold", children: ["Ngày: ", viewingSavedTrip.startDate] })
                  ]
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => setViewingSavedTrip(null),
                  className: "p-1.5 text-gray-400 hover:text-gray-600 rounded-full",
                  children: c.jsx(_a, { size: 18 })
                })
              ]
            }),
            c.jsxs("div", {
              className: "overflow-y-auto flex-1 space-y-4 pr-1 text-xs",
              children: [
                // Summary block
                c.jsxs("div", {
                  className: "p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl grid grid-cols-2 gap-2 font-bold",
                  children: [
                    c.jsxs("div", { children: ["Vốn góp: ", c.jsx("b", { className: "text-blue-600 font-mono", children: _fmt(viewingSavedTrip.totalCapital) + " đ" })] }),
                    c.jsxs("div", { children: ["Tổng chi phí: ", c.jsx("b", { className: "text-red-600 font-mono", children: _fmt(viewingSavedTrip.totalExpenses) + " đ" })] }),
                    c.jsxs("div", { children: ["Tổng doanh thu: ", c.jsx("b", { className: "text-green-600 font-mono", children: _fmt(viewingSavedTrip.totalRevenue) + " đ" })] }),
                    c.jsxs("div", { children: ["Lợi nhuận ròng: ", c.jsx("b", { className: (viewingSavedTrip.isProfit ? "text-green-600" : "text-red-600") + " font-mono", children: [(viewingSavedTrip.isProfit ? "+" : "") + _fmt(viewingSavedTrip.netProfit) + " đ"] })] })
                  ]
                }),
                // Payout table
                c.jsxs("div", {
                  className: "space-y-1.5",
                  children: [
                    c.jsx("span", { className: "font-black uppercase text-gray-500 block text-[10px]", children: "Bảng Chia Tiền Thực Nhận:" }),
                    c.jsx("div", {
                      className: "rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden",
                      children: c.jsxs("table", {
                        className: "w-full text-left text-xs",
                        children: [
                          c.jsx("thead", {
                            className: "bg-gray-100 dark:bg-gray-800 text-[10px] font-black uppercase text-gray-500",
                            children: c.jsxs("tr", {
                              children: [
                                c.jsx("th", { className: "p-2", children: "Người Góp" }),
                                c.jsx("th", { className: "p-2 text-right", children: "Vốn" }),
                                c.jsx("th", { className: "p-2 text-right", children: "Lời/Lỗ" }),
                                c.jsx("th", { className: "p-2 text-right font-black text-blue-600", children: "Thực Nhận" })
                              ]
                            })
                          }),
                          c.jsx("tbody", {
                            className: "divide-y font-bold",
                            children: (viewingSavedTrip.investorPayouts || []).map((p, idx) => c.jsxs("tr", {
                              key: idx,
                              children: [
                                c.jsxs("td", { className: "p-2", children: [p.name, " (", (p.sharePercent || 0).toFixed(1), "%)"] }),
                                c.jsx("td", { className: "p-2 text-right font-mono", children: _fmt(p.amount) }),
                                c.jsxs("td", { className: "p-2 text-right font-mono " + (p.profitShare >= 0 ? "text-green-600" : "text-red-600"), children: [(p.profitShare >= 0 ? "+" : "") + _fmt(p.profitShare)] }),
                                c.jsxs("td", { className: "p-2 text-right font-mono font-black text-blue-700 bg-blue-50/50", children: [_fmt(p.totalPayout), " đ"] })
                              ]
                            }, idx))
                          })
                        ]
                      })
                    })
                  ]
                })
              ]
            }),
            c.jsxs("div", {
              className: "flex justify-between items-center pt-2 border-t",
              children: [
                c.jsx("button", {
                  type: "button",
                  onClick: () => handleRestoreSavedTrip(viewingSavedTrip),
                  className: "px-4 py-2 bg-amber-500 text-white rounded-xl font-bold text-xs cursor-pointer",
                  children: "Khôi Phục Làm Chuyến Hiện Tại"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => setViewingSavedTrip(null),
                  className: "px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-xl font-bold text-xs",
                  children: "Đóng"
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

// Replace Xm_FinanceScreen with the comprehensive upgraded version
bundle = bundle.slice(0, pStart) + advancedFinanceComponent + "\n\n" + bundle.slice(pEnd);
fs.writeFileSync(bundlePath, bundle, "utf8");
console.log("Replaced Xm_FinanceScreen with advanced full CRUD component!");
