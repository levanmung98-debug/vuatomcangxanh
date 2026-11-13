const fs = require("fs");

function generateLightFinanceScreenCode() {
  return `const Xm_FinanceScreen = ({ setRoute, role }) => {
  // Formatters
  const _fmt = (n) => Number(n || 0).toLocaleString("vi-VN");
  const _fmtKg = (n) => {
    if (!n || n <= 0) return "0";
    const r = Math.round(n * 10) / 10;
    return Number.isInteger(r) ? String(r) : String(r);
  };

  // Convert numbers to Vietnamese words for amount clarity
  const _readVietnameseMoney = (num) => {
    const n = Number(num);
    if (!n || isNaN(n) || n <= 0) return "";
    if (n >= 1000000000) {
      const ty = (n / 1000000000).toFixed(2).replace(/\\.00$/, "").replace(/\\.(\\d)0$/, ".$1");
      return ty + " Tỷ đồng";
    }
    if (n >= 1000000) {
      const tr = (n / 1000000).toFixed(2).replace(/\\.00$/, "").replace(/\\.(\\d)0$/, ".$1");
      return tr + " Triệu đồng";
    }
    if (n >= 1000) {
      const k = (n / 1000).toFixed(0);
      return k + " Nghìn đồng";
    }
    return _fmt(n) + " đồng";
  };

  // Data sources
  const [financeData, setFinanceData] = w.useState(() => me.getFinanceData());
  const [sessions, setSessions] = w.useState(() => {
    try { return (me.getSessions && me.getSessions()) || []; } catch(e) { return []; }
  });
  const [sales, setSales] = w.useState(() => {
    try { return (me.getSales && me.getSales()) || []; } catch(e) { return []; }
  });

  // Master Command Tab: "PL" (Dòng tiền & Lời lỗ) | "LEDGER" (Sổ Thu-Chi) | "BUY" (Mua tôm) | "SELL" (Xuất bán) | "AUDIT" (Hao hụt)
  const [mainTab, setMainTab] = w.useState("PL");

  // Floating Action Button (FAB) Speed Dial Open State
  const [fabOpen, setFabOpen] = w.useState(false);

  // Synchronize latest sessions and sales
  const handleSyncFinance = () => {
    try {
      const freshSessions = (me.getSessions && me.getSessions()) || [];
      const freshSales = (me.getSales && me.getSales()) || [];
      setSessions(freshSessions);
      setSales(freshSales);
      updateActiveTrip(t => ({
        ...t,
        shrimpPurchaseAuto: true,
        revenueAuto: true,
        selectedSessionIds: null,
        selectedSaleIds: null
      }));
      alert("✅ Đã đồng bộ số liệu mới nhất từ Cân tôm và Xuất bán!");
    } catch(e) {
      alert("Lỗi đồng bộ: " + e.message);
    }
  };

  // Active Trip state
  const trip = financeData.activeTrip || {};
  const [tripName, setTripName] = w.useState(trip.name || "Chuyến thu mua tôm");
  const [tripDate, setTripDate] = w.useState(trip.startDate || new Date().toISOString().split("T")[0]);
  const [tripNote, setTripNote] = w.useState(trip.note || "");
  const [filterMode, setFilterMode] = w.useState(trip.filterMode || "DATE"); // "DATE" | "ALL"

  // 1. Thu - Chi Modal
  const [showThuChiModal, setShowThuChiModal] = w.useState(false);
  const [thuChiType, setThuChiType] = w.useState("EXPENSE"); // "EXPENSE" (Chi) | "INCOME" (Thu)
  const [editingThuChiId, setEditingThuChiId] = w.useState(null);
  const [thuChiCategory, setThuChiCategory] = w.useState("Tiền thuê xe / vận chuyển");
  const [thuChiAmount, setThuChiAmount] = w.useState("");
  const [thuChiPerson, setThuChiPerson] = w.useState("");
  const [thuChiNote, setThuChiNote] = w.useState("");
  const [thuChiFilterTab, setThuChiFilterTab] = w.useState("ALL"); // "ALL" | "EXPENSE" | "INCOME"
  const [thuChiSearchQuery, setThuChiSearchQuery] = w.useState("");

  // 2. Modals for session/sales selection and management
  const [showSessionsModal, setShowSessionsModal] = w.useState(false);
  const [showSalesModal, setShowSalesModal] = w.useState(false);
  const [showTripSettingsModal, setShowTripSettingsModal] = w.useState(false);
  const [showSavedTripsModal, setShowSavedTripsModal] = w.useState(false);
  const [viewingSavedTrip, setViewingSavedTrip] = w.useState(null);
  const [editingSavedTripId, setEditingSavedTripId] = w.useState(null);
  const [editingSavedTripName, setEditingSavedTripName] = w.useState("");
  const [copiedSummary, setCopiedSummary] = w.useState(false);

  // Helper to persist updates to localStorage and cloud
  const updateActiveTrip = (updater) => {
    setFinanceData(prev => {
      const currentTrip = prev.activeTrip || {};
      const updatedTrip = typeof updater === "function" ? updater(currentTrip) : { ...currentTrip, ...updater };
      const nextData = { ...prev, activeTrip: updatedTrip };
      me.saveFinanceData(nextData);
      return nextData;
    });
  };

  // Categories
  const expenseCategories = [
    { label: "Tiền thuê xe / vận chuyển", icon: "🚛" },
    { label: "Tiền nhân công kéo / lựa tôm", icon: "👷" },
    { label: "Tiền nước đá, oxy", icon: "🧊" },
    { label: "Tiền ăn uống, bồi dưỡng", icon: "🍲" },
    { label: "Tiền xăng dầu, bến bãi, phà", icon: "⛽" },
    { label: "Tiền cọc ao mua tôm", icon: "📑" },
    { label: "Chi phí phát sinh khác", icon: "📝" }
  ];

  const incomeCategories = [
    { label: "Thu tiền bán tôm mặt tại ao", icon: "🦐" },
    { label: "Thu hồi nợ khách hàng", icon: "💵" },
    { label: "Thu tiền cọc ao hoàn trả", icon: "🔄" },
    { label: "Thu tiền thưởng / chiết khấu", icon: "🎁" },
    { label: "Khoản thu phát sinh khác", icon: "💰" }
  ];

  // Shrimp purchase calculations
  const isShrimpAuto = trip.shrimpPurchaseAuto !== false;
  const filteredSessions = sessions.filter(s => {
    if (filterMode === "ALL") return true;
    return s.date && s.date.startsWith(tripDate);
  });
  const selectedSessionIds = trip.selectedSessionIds;
  const effectiveSessions = Array.isArray(selectedSessionIds)
    ? filteredSessions.filter(s => selectedSessionIds.includes(s.id))
    : filteredSessions;

  const autoShrimpPurchaseMoney = effectiveSessions.reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);
  const autoShrimpPurchaseKg = effectiveSessions.reduce((acc, s) => acc + Number(s.totalNet || s.totalGross || 0), 0);
  const shrimpPurchaseMoney = isShrimpAuto ? autoShrimpPurchaseMoney : Number(trip.shrimpPurchaseManualAmount || 0);
  const avgPurchasePrice = autoShrimpPurchaseKg > 0 ? (shrimpPurchaseMoney / autoShrimpPurchaseKg) : 0;

  // Thu - Chi records in trip (trip.expenses holds both EXPENSE and INCOME)
  const allTransactions = trip.expenses || [];
  const operatingExpenses = allTransactions.filter(t => t.type !== "INCOME");
  const extraIncomes = allTransactions.filter(t => t.type === "INCOME");

  const totalOperationExpenses = operatingExpenses.reduce((acc, exp) => acc + Number(exp.amount || 0), 0);
  const totalExtraIncome = extraIncomes.reduce((acc, inc) => acc + Number(inc.amount || 0), 0);
  const totalExpenses = shrimpPurchaseMoney + totalOperationExpenses;

  // Open Thu - Chi Modal from FAB or elsewhere
  const handleOpenAddThuChi = (type = "EXPENSE") => {
    setFabOpen(false);
    setEditingThuChiId(null);
    setThuChiType(type);
    setThuChiCategory(type === "EXPENSE" ? "Tiền thuê xe / vận chuyển" : "Thu tiền bán tôm mặt tại ao");
    setThuChiAmount("");
    setThuChiPerson("");
    setThuChiNote("");
    setShowThuChiModal(true);
  };

  const handleOpenEditThuChi = (tx) => {
    setEditingThuChiId(tx.id);
    const type = tx.type === "INCOME" ? "INCOME" : "EXPENSE";
    setThuChiType(type);
    setThuChiCategory(tx.category || (type === "EXPENSE" ? "Tiền thuê xe / vận chuyển" : "Thu tiền bán tôm mặt tại ao"));
    setThuChiAmount(String(tx.amount || ""));
    setThuChiPerson(tx.person || "");
    setThuChiNote(tx.note || "");
    setShowThuChiModal(true);
  };

  const handleSaveThuChi = () => {
    const amt = Number(thuChiAmount) || 0;
    if (amt <= 0) {
      alert("Vui lòng nhập số tiền hợp lệ lớn hơn 0!");
      return;
    }

    if (editingThuChiId) {
      updateActiveTrip(t => ({
        ...t,
        expenses: (t.expenses || []).map(e => e.id === editingThuChiId ? {
          ...e,
          type: thuChiType,
          category: thuChiCategory,
          amount: amt,
          person: thuChiPerson.trim(),
          note: thuChiNote.trim()
        } : e)
      }));
    } else {
      const newTx = {
        id: "tx_" + Date.now(),
        type: thuChiType,
        category: thuChiCategory,
        amount: amt,
        person: thuChiPerson.trim(),
        note: thuChiNote.trim(),
        date: new Date().toISOString()
      };
      updateActiveTrip(t => ({
        ...t,
        expenses: [...(t.expenses || []), newTx]
      }));
    }
    setShowThuChiModal(false);
  };

  const handleDeleteThuChi = (id) => {
    const target = allTransactions.find(e => e.id === id);
    const label = (target?.type === "INCOME" ? "khoản thu" : "khoản chi") + " \\"" + (target?.category || "") + " (" + _fmt(target?.amount) + " đ)\\"";
    if (confirm("Bạn có chắc chắn muốn xóa " + label + "?")) {
      updateActiveTrip(t => ({
        ...t,
        expenses: (t.expenses || []).filter(e => e.id !== id)
      }));
    }
  };

  // Sales and Revenue calculations
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
  const baseRevenue = isRevenueAuto ? autoRevenueMoney : Number(trip.revenueManualAmount || 0);
  const totalRevenue = baseRevenue + totalExtraIncome;
  const avgSalePrice = autoRevenueKg > 0 ? (baseRevenue / autoRevenueKg) : 0;

  // Breakdown by channel
  const retailSalesList = effectiveSales.filter(s => s.targetGroup === "RETAIL");
  const marketSalesList = effectiveSales.filter(s => s.targetGroup === "MARKET");
  const factorySalesList = effectiveSales.filter(s => s.targetGroup === "FACTORY");

  const retailRevenue = retailSalesList.reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);
  const marketRevenue = marketSalesList.reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);
  const factoryRevenue = factorySalesList.reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);

  // Net Profit & Margins
  const netProfit = totalRevenue - totalExpenses;
  const isProfit = netProfit >= 0;
  const profitMarginPercent = totalExpenses > 0 ? ((netProfit / totalExpenses) * 100) : 0;

  // Weight shrinkage calculations
  const weightDiff = autoShrimpPurchaseKg - autoRevenueKg;
  const weightDiffPercent = autoShrimpPurchaseKg > 0 ? ((weightDiff / autoShrimpPurchaseKg) * 100) : 0;
  const grossProfitPerKg = (autoRevenueKg > 0 && autoShrimpPurchaseKg > 0) ? (avgSalePrice - avgPurchasePrice) : 0;

  // Archive and settle current trip
  const handleSettleAndArchiveTrip = () => {
    if (!confirm("Bạn có chắc chắn muốn khóa và lưu chuyến tài chính này vào lịch sử? Dữ liệu chuyến sẽ được lưu trữ an toàn và một chuyến mới sẽ được khởi tạo.")) {
      return;
    }

    const archivedTrip = {
      ...trip,
      name: tripName,
      startDate: tripDate,
      note: tripNote,
      shrimpPurchaseMoney,
      shrimpPurchaseKg: autoShrimpPurchaseKg,
      totalOperationExpenses,
      totalExtraIncome,
      totalExpenses,
      totalRevenue,
      revenueKg: autoRevenueKg,
      netProfit,
      isProfit,
      profitMarginPercent,
      settledAt: new Date().toISOString()
    };

    const newActiveTrip = {
      id: "trip_" + Date.now(),
      name: "Chuyến thu mua ngày " + new Date().toLocaleDateString("vi-VN"),
      startDate: new Date().toISOString().split("T")[0],
      note: "",
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
    if (confirm("Bạn có chắc chắn muốn đặt lại chi phí và thu chi của chuyến này về 0?")) {
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
    if (confirm("Bạn có chắc chắn muốn xóa chuyến này khỏi lịch sử? Thao tác này không thể hoàn tác.")) {
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

  // Copy quick summary text
  const handleCopySummary = () => {
    const text = [
      "📊 BÁO CÁO QUYẾT TOÁN TÀI CHÍNH CHUYẾN TÔM",
      "Kỳ: " + tripName + " (" + tripDate + ")",
      "----------------------------------",
      "1. Doanh thu xuất bán: +" + _fmt(baseRevenue) + " đ (" + _fmtKg(autoRevenueKg) + " kg)",
      totalExtraIncome > 0 ? ("2. Thu phát sinh ngoài: +" + _fmt(totalExtraIncome) + " đ") : "",
      "3. Tiền mua tôm ao: -" + _fmt(shrimpPurchaseMoney) + " đ (" + _fmtKg(autoShrimpPurchaseKg) + " kg)",
      "4. Chi phí vận hành: -" + _fmt(totalOperationExpenses) + " đ (" + operatingExpenses.length + " khoản)",
      "----------------------------------",
      "🏆 LỢI NHUẬN RÒNG: " + (isProfit ? "+" : "") + _fmt(netProfit) + " VNĐ (" + (isProfit ? "LỜI " : "LỖ ") + profitMarginPercent.toFixed(1) + "%)",
      "Hao hụt: " + (weightDiff > 0 ? ("-" + _fmtKg(weightDiff) + " kg (-" + weightDiffPercent.toFixed(1) + "%)") : "Không hao hụt"),
      "Tự doanh 100% • Tôm Càng Xanh"
    ].filter(Boolean).join("\\n");

    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
        setCopiedSummary(true);
        setTimeout(() => setCopiedSummary(false), 2500);
      } else {
        alert(text);
      }
    } catch(e) {
      alert(text);
    }
  };

  // Filtered transactions for the list
  const displayedTransactions = allTransactions.filter(t => {
    if (thuChiFilterTab === "EXPENSE" && t.type === "INCOME") return false;
    if (thuChiFilterTab === "INCOME" && t.type !== "INCOME") return false;
    if (thuChiSearchQuery.trim()) {
      const q = thuChiSearchQuery.toLowerCase();
      const cat = (t.category || "").toLowerCase();
      const per = (t.person || "").toLowerCase();
      const note = (t.note || "").toLowerCase();
      return cat.includes(q) || per.includes(q) || note.includes(q);
    }
    return true;
  });

  return c.jsxs("div", {
    className: "flex flex-col h-screen bg-slate-100/90 text-slate-900 font-sans overflow-hidden select-none relative",
    children: [
      // =========================================================================
      // 1. TOP HEADER: GIAO DIỆN SÁNG, TINH TẾ, ĐẲNG CẤP
      // =========================================================================
      c.jsxs("header", {
        className: "bg-white border-b border-slate-200/90 px-3.5 sm:px-5 py-2.5 shadow-xs shrink-0 flex items-center justify-between z-30",
        children: [
          // Left: Nút back & Brand Title
          c.jsxs("div", {
            className: "flex items-center gap-2.5 sm:gap-3 min-w-0",
            children: [
              c.jsx("button", {
                type: "button",
                onClick: () => setRoute(re.DASHBOARD),
                className: "p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer active:scale-95 shrink-0 border border-slate-200",
                title: "Về trang chính",
                children: c.jsx(On, { size: 18 })
              }),
              c.jsxs("div", {
                className: "min-w-0",
                children: [
                  c.jsxs("div", {
                    className: "flex items-center gap-2",
                    children: [
                      c.jsx("span", { className: "text-base sm:text-lg", children: "💰" }),
                      c.jsx("h1", {
                        className: "text-sm sm:text-base font-black tracking-tight text-slate-900 uppercase truncate",
                        children: "Quản Lý Tài Chính"
                      }),
                      c.jsx("span", {
                        className: "hidden md:inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200",
                        children: "Tự Doanh 100%"
                      })
                    ]
                  }),
                  c.jsxs("div", {
                    className: "text-[10px] text-slate-500 font-medium truncate flex items-center gap-1.5",
                    children: [
                      c.jsx("span", { className: "text-emerald-600 font-bold", children: "● Trực tiếp" }),
                      c.jsx("span", { children: "•" }),
                      c.jsxs("span", { children: [effectiveSessions.length, " phiếu mua"] }),
                      c.jsx("span", { children: "•" }),
                      c.jsxs("span", { children: [effectiveSales.length, " đơn bán"] }),
                      c.jsx("span", { children: "•" }),
                      c.jsxs("span", { children: [allTransactions.length, " thu chi"] })
                    ]
                  })
                ]
              })
            ]
          }),

          // Right: Action Buttons (Đồng bộ, Lịch sử, Cài đặt - Các nút Thu Chi đã gom vào nút + thả nổi)
          c.jsxs("div", {
            className: "flex items-center gap-1.5 sm:gap-2 shrink-0",
            children: [
              // Nút Đồng bộ dữ liệu
              c.jsxs("button", {
                type: "button",
                onClick: handleSyncFinance,
                className: "p-2 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer border border-slate-200 flex items-center gap-1.5",
                title: "Đồng bộ số liệu từ phiếu cân và đơn bán",
                children: [
                  c.jsx("span", { className: "text-sm", children: "🔄" }),
                  c.jsx("span", { className: "hidden md:inline text-[11px]", children: "Đồng bộ" })
                ]
              }),

              // Nút Lịch sử chuyến
              c.jsxs("button", {
                type: "button",
                onClick: () => setShowSavedTripsModal(true),
                className: "p-2 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer border border-slate-200 flex items-center gap-1.5",
                title: "Lịch sử các chuyến thu mua",
                children: [
                  c.jsx(Fd, { size: 16 }),
                  c.jsxs("span", { className: "hidden sm:inline text-[11px]", children: ["Lịch Sử (", (financeData.savedTrips || []).length, ")"] })
                ]
              }),

              // Nút Cài đặt
              c.jsx("button", {
                type: "button",
                onClick: () => setShowTripSettingsModal(true),
                className: "p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition-all cursor-pointer active:scale-95 border border-slate-200",
                title: "Cài đặt kỳ thu mua",
                children: c.jsx(ym, { size: 17 })
              })
            ]
          })
        ]
      }),

      // =========================================================================
      // 2. MAIN SCROLL VIEWPORT
      // =========================================================================
      c.jsx("div", {
        className: "flex-1 overflow-y-auto p-3 sm:p-5 max-w-5xl mx-auto w-full pb-32 space-y-4",
        children: c.jsxs("div", {
          className: "space-y-4",
          children: [
            // =====================================================================
            // A. DẢI THÔNG TIN KỲ THU MUA (GIAO DIỆN SÁNG)
            // =====================================================================
            c.jsxs("div", {
              className: "bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5",
              children: [
                // Tên chuyến (chạm chỉnh sửa)
                c.jsxs("div", {
                  className: "flex items-center gap-2.5 flex-1 min-w-0 w-full sm:w-auto",
                  children: [
                    c.jsx("div", {
                      className: "w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200",
                      children: "🚢"
                    }),
                    c.jsxs("div", {
                      className: "flex-1 min-w-0",
                      children: [
                        c.jsx("input", {
                          type: "text",
                          value: tripName,
                          onChange: e => {
                            setTripName(e.target.value);
                            updateActiveTrip({ name: e.target.value });
                          },
                          placeholder: "Tên kỳ thu mua tôm...",
                          className: "text-sm sm:text-base font-black text-slate-900 bg-transparent outline-none w-full border-b border-transparent focus:border-emerald-500 transition-colors placeholder-slate-400"
                        }),
                        c.jsx("input", {
                          type: "text",
                          value: tripNote,
                          onChange: e => {
                            setTripNote(e.target.value);
                            updateActiveTrip({ note: e.target.value });
                          },
                          placeholder: "Thêm ghi chú chuyến (ví dụ: Xe 69C, ao Năm Lực, xuất chợ Bình Điền...)",
                          className: "text-[11px] text-slate-500 bg-transparent outline-none w-full placeholder-slate-400 truncate mt-0.5"
                        })
                      ]
                    })
                  ]
                }),

                // Bộ chọn ngày & chế độ lọc phiếu
                c.jsxs("div", {
                  className: "flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100",
                  children: [
                    c.jsx("input", {
                      type: "date",
                      value: tripDate,
                      onChange: e => {
                        setTripDate(e.target.value);
                        updateActiveTrip({ startDate: e.target.value });
                      },
                      className: "px-2.5 py-1.5 bg-slate-50 font-mono font-bold rounded-xl text-xs outline-none border border-slate-200 text-slate-800"
                    }),
                    c.jsx("button", {
                      type: "button",
                      onClick: () => {
                        const newMode = filterMode === "DATE" ? "ALL" : "DATE";
                        setFilterMode(newMode);
                        updateActiveTrip({ filterMode: newMode });
                      },
                      className: "px-2.5 py-1.5 rounded-xl text-[11px] font-black uppercase transition-all cursor-pointer " + (filterMode === "ALL" ? "bg-teal-700 text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"),
                      children: filterMode === "ALL" ? "Tất Cả Phiếu" : "Theo Ngày"
                    })
                  ]
                })
              ]
            }),

            // =====================================================================
            // B. THẺ TÀI CHÍNH EXECUTIVE (GIAO DIỆN SÁNG SANG TRỌNG)
            // =====================================================================
            c.jsxs("div", {
              className: "relative rounded-3xl p-5 sm:p-6 overflow-hidden shadow-sm border " + (isProfit ? "bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white border-emerald-500/40" : "bg-gradient-to-br from-rose-600 via-red-600 to-rose-700 text-white border-rose-500/40"),
              children: [
                // Header thẻ
                c.jsxs("div", {
                  className: "flex justify-between items-start mb-4 relative z-10",
                  children: [
                    c.jsxs("div", {
                      className: "space-y-0.5",
                      children: [
                        c.jsxs("div", {
                          className: "flex items-center gap-2",
                          children: [
                            c.jsx("span", { className: "text-lg", children: "🦐" }),
                            c.jsx("span", { className: "text-xs font-black uppercase tracking-wider text-emerald-100", children: "Tôm Càng Xanh • Tự Doanh 100%" })
                          ]
                        }),
                        c.jsx("p", { className: "text-[11px] text-white/80 font-medium", children: "Tự bỏ vốn • Quyết toán chi phí & doanh thu • Thu trọn 100% lợi nhuận" })
                      ]
                    }),
                    // Badge lời / lỗ
                    c.jsx("span", {
                      className: "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs border bg-white/20 text-white border-white/30 backdrop-blur-xs",
                      children: isProfit ? ("🏆 CÓ LÃI +" + profitMarginPercent.toFixed(1) + "%") : ("⚠️ THÂM HỤT " + profitMarginPercent.toFixed(1) + "%")
                    })
                  ]
                }),

                // Lợi Nhuận Ròng (Hero Amount)
                c.jsxs("div", {
                  className: "my-3 relative z-10",
                  children: [
                    c.jsx("span", {
                      className: "text-[11px] font-black uppercase tracking-wider text-white/90 block mb-1",
                      children: "LỢI NHUẬN RÒNG THỰC THU (TIỀN LỜI VỀ TÚI)"
                    }),
                    c.jsxs("div", {
                      className: "text-3xl sm:text-5xl font-black font-mono tracking-tight flex items-baseline gap-2 text-white",
                      children: [
                        (isProfit ? "+" : "") + _fmt(netProfit),
                        c.jsx("span", { className: "text-lg font-sans font-bold text-white/90", children: "VNĐ" })
                      ]
                    }),
                    c.jsx("span", {
                      className: "text-xs font-semibold text-white/90 block mt-1 italic",
                      children: _readVietnameseMoney(Math.abs(netProfit)) ? ("(" + (isProfit ? "Lãi " : "Lỗ ") + _readVietnameseMoney(Math.abs(netProfit)) + ")") : ""
                    })
                  ]
                }),

                // 2 Cột Đối Ứng: Doanh Thu & Chi Phí
                c.jsxs("div", {
                  className: "grid grid-cols-2 gap-3 pt-4 mt-4 border-t border-white/20 relative z-10",
                  children: [
                    // Cột Doanh Thu
                    c.jsxs("div", {
                      className: "bg-black/15 rounded-2xl p-3 border border-white/20 space-y-1 backdrop-blur-xs",
                      children: [
                        c.jsxs("div", {
                          className: "flex justify-between items-center text-[10px] font-bold text-emerald-100 uppercase",
                          children: [
                            c.jsx("span", { children: "📈 Tổng Doanh Thu" }),
                            c.jsx("span", { className: "text-white font-mono", children: effectiveSales.length + " đơn" })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "font-mono font-black text-lg sm:text-xl text-white",
                          children: [_fmt(totalRevenue), " đ"]
                        }),
                        c.jsxs("div", {
                          className: "text-[10px] text-emerald-100 flex justify-between",
                          children: [
                            c.jsxs("span", { children: ["Xuất bán: ", _fmtKg(autoRevenueKg), " kg"] }),
                            totalExtraIncome > 0 ? c.jsxs("span", { className: "text-white font-mono", children: ["+", _fmt(totalExtraIncome)] }) : null
                          ]
                        })
                      ]
                    }),

                    // Cột Chi Phí
                    c.jsxs("div", {
                      className: "bg-black/15 rounded-2xl p-3 border border-white/20 space-y-1 backdrop-blur-xs",
                      children: [
                        c.jsxs("div", {
                          className: "flex justify-between items-center text-[10px] font-bold text-orange-100 uppercase",
                          children: [
                            c.jsx("span", { children: "📉 Tổng Chi Phí" }),
                            c.jsx("span", { className: "text-white font-mono", children: (effectiveSessions.length + operatingExpenses.length) + " mục" })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "font-mono font-black text-lg sm:text-xl text-white",
                          children: [_fmt(totalExpenses), " đ"]
                        }),
                        c.jsxs("div", {
                          className: "text-[10px] text-orange-100 flex justify-between",
                          children: [
                            c.jsxs("span", { children: ["Mua tôm: ", _fmt(shrimpPurchaseMoney)] }),
                            totalOperationExpenses > 0 ? c.jsxs("span", { className: "text-white font-mono", children: ["Phí: ", _fmt(totalOperationExpenses)] }) : null
                          ]
                        })
                      ]
                    })
                  ]
                }),

                // Dòng đối soát sản lượng & hao hụt
                c.jsxs("div", {
                  className: "flex justify-between items-center pt-3 mt-3 border-t border-white/20 text-xs text-white/90 font-bold relative z-10",
                  children: [
                    c.jsxs("span", {
                      children: [
                        "Cân mua ao: ",
                        c.jsx("b", { className: "text-white font-mono", children: _fmtKg(autoShrimpPurchaseKg) + " kg" }),
                        " ➔ Xuất: ",
                        c.jsx("b", { className: "text-white font-mono", children: _fmtKg(autoRevenueKg) + " kg" })
                      ]
                    }),
                    c.jsxs("span", {
                      className: "font-mono font-black",
                      children: [
                        weightDiff > 0 ? "Hao hụt: -" : "Dư tôm: +",
                        _fmtKg(Math.abs(weightDiff)), " kg",
                        weightDiff !== 0 ? (" (" + Math.abs(weightDiffPercent).toFixed(1) + "%)") : ""
                      ]
                    })
                  ]
                })
              ]
            }),

            // =====================================================================
            // C. THANH ĐIỀU HƯỚNG 5 TRUNG TÂM NGHIỆP VỤ (GIAO DIỆN SÁNG)
            // =====================================================================
            c.jsx("div", {
              className: "overflow-x-auto pb-1",
              children: c.jsxs("div", {
                className: "flex items-center gap-1.5 p-1.5 bg-slate-200/80 rounded-2xl border border-slate-300/80 min-w-max text-xs font-black",
                children: [
                  c.jsxs("button", {
                    type: "button",
                    onClick: () => setMainTab("PL"),
                    className: "px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer " + (mainTab === "PL" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-white/60"),
                    children: [
                      c.jsx("span", { children: "📊" }),
                      c.jsx("span", { children: "Dòng Tiền & Lời Lỗ" })
                    ]
                  }),
                  c.jsxs("button", {
                    type: "button",
                    onClick: () => setMainTab("LEDGER"),
                    className: "px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer " + (mainTab === "LEDGER" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-white/60"),
                    children: [
                      c.jsx("span", { children: "💸" }),
                      c.jsxs("span", { children: ["Sổ Thu - Chi", allTransactions.length > 0 ? " (" + allTransactions.length + ")" : ""] })
                    ]
                  }),
                  c.jsxs("button", {
                    type: "button",
                    onClick: () => setMainTab("BUY"),
                    className: "px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer " + (mainTab === "BUY" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-white/60"),
                    children: [
                      c.jsx("span", { children: "🦐" }),
                      c.jsxs("span", { children: ["Mua Tôm Ao", effectiveSessions.length > 0 ? " (" + effectiveSessions.length + ")" : ""] })
                    ]
                  }),
                  c.jsxs("button", {
                    type: "button",
                    onClick: () => setMainTab("SELL"),
                    className: "px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer " + (mainTab === "SELL" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-white/60"),
                    children: [
                      c.jsx("span", { children: "🛒" }),
                      c.jsxs("span", { children: ["Xuất Bán Tôm", effectiveSales.length > 0 ? " (" + effectiveSales.length + ")" : ""] })
                    ]
                  }),
                  c.jsxs("button", {
                    type: "button",
                    onClick: () => setMainTab("AUDIT"),
                    className: "px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer " + (mainTab === "AUDIT" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-white/60"),
                    children: [
                      c.jsx("span", { children: "⚖️" }),
                      c.jsx("span", { children: "Đối Soát Hao Hụt" })
                    ]
                  })
                ]
              })
            }),

            // =====================================================================
            // TAB 1: DÒNG TIỀN & BẢNG KÊ QUYẾT TOÁN LỜI LỖ
            // =====================================================================
            mainTab === "PL" && c.jsxs("div", {
              className: "space-y-4",
              children: [
                // Quick Action Bar (Sao chép, Đồng bộ)
                c.jsxs("div", {
                  className: "grid grid-cols-2 gap-2.5",
                  children: [
                    c.jsxs("button", {
                      type: "button",
                      onClick: handleCopySummary,
                      className: "p-3 bg-white border border-slate-200 hover:border-blue-400 text-blue-700 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-xs",
                      children: [
                        c.jsx("span", { className: "text-base", children: copiedSummary ? "✅" : "📋" }),
                        c.jsx("span", { children: copiedSummary ? "Đã Sao Chép!" : "Sao Chép Báo Cáo" })
                      ]
                    }),
                    c.jsxs("button", {
                      type: "button",
                      onClick: handleSyncFinance,
                      className: "p-3 bg-white border border-slate-200 hover:border-teal-400 text-teal-700 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-xs",
                      children: [
                        c.jsx("span", { className: "text-base", children: "🔄" }),
                        c.jsx("span", { children: "Đồng Bộ Mới" })
                      ]
                    })
                  ]
                }),

                // Bảng Kê Đối Soát Kế Toán Chuyên Nghiệp
                c.jsxs("div", {
                  className: "bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3",
                  children: [
                    c.jsxs("div", {
                      className: "flex justify-between items-center border-b border-slate-100 pb-3",
                      children: [
                        c.jsxs("div", {
                          children: [
                            c.jsx("h2", {
                              className: "text-xs sm:text-sm font-black uppercase text-slate-900 flex items-center gap-1.5",
                              children: [c.jsx("span", { children: "📑" }), "Bảng Kê Quyết Toán Dòng Tiền Chuyến Đi"]
                            }),
                            c.jsx("p", { className: "text-[10px] text-slate-500 font-medium", children: "Đối soát thu chi: Doanh thu bán tôm - Tiền mua ao - Chi phí vận hành" })
                          ]
                        }),
                        c.jsx("button", {
                          type: "button",
                          onClick: handleCopySummary,
                          className: "px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold border border-slate-200 cursor-pointer",
                          children: copiedSummary ? "Đã sao chép!" : "Sao chép"
                        })
                      ]
                    }),

                    // Bảng chi tiết
                    c.jsx("div", {
                      className: "overflow-x-auto rounded-2xl border border-slate-200",
                      children: c.jsxs("table", {
                        className: "w-full text-left text-xs border-collapse font-sans",
                        children: [
                          c.jsx("thead", {
                            className: "bg-slate-50 text-[10px] font-black uppercase text-slate-600 border-b border-slate-200",
                            children: c.jsxs("tr", {
                              children: [
                                c.jsx("th", { className: "p-3", children: "Mục Kế Toán" }),
                                c.jsx("th", { className: "p-3 text-right", children: "Số Tiền" }),
                                c.jsx("th", { className: "p-3 hidden sm:table-cell", children: "Diễn Giải Chi Tiết" })
                              ]
                            })
                          }),
                          c.jsxs("tbody", {
                            className: "divide-y divide-slate-100 font-bold",
                            children: [
                              // 1. Doanh thu xuất bán tôm
                              c.jsxs("tr", {
                                className: "hover:bg-slate-50/80 transition-colors",
                                children: [
                                  c.jsxs("td", {
                                    className: "p-3",
                                    children: [
                                      c.jsx("span", { className: "text-emerald-700 font-black", children: "1. Doanh thu xuất bán tôm (+)" }),
                                      c.jsxs("span", { className: "block text-[10px] text-slate-500 font-normal", children: [effectiveSales.length, " đơn xuất bán • ", _fmtKg(autoRevenueKg), " kg"] })
                                    ]
                                  }),
                                  c.jsxs("td", {
                                    className: "p-3 text-right font-mono font-black text-emerald-700 text-sm",
                                    children: ["+ ", _fmt(baseRevenue), " đ"]
                                  }),
                                  c.jsxs("td", {
                                    className: "p-3 text-slate-500 text-[11px] hidden sm:table-cell",
                                    children: ["Bán lẻ: ", _fmt(retailRevenue), " đ • Chợ: ", _fmt(marketRevenue), " đ • Cty: ", _fmt(factoryRevenue), " đ"]
                                  })
                                ]
                              }),

                              // 2. Khoản thu ngoài
                              totalExtraIncome > 0 && c.jsxs("tr", {
                                className: "hover:bg-slate-50/80 transition-colors",
                                children: [
                                  c.jsxs("td", {
                                    className: "p-3",
                                    children: [
                                      c.jsx("span", { className: "text-emerald-700 font-black", children: "2. Khoản thu phát sinh ngoài (+)" }),
                                      c.jsxs("span", { className: "block text-[10px] text-slate-500 font-normal", children: [extraIncomes.length, " khoản thu"] })
                                    ]
                                  }),
                                  c.jsxs("td", {
                                    className: "p-3 text-right font-mono font-black text-emerald-700 text-sm",
                                    children: ["+ ", _fmt(totalExtraIncome), " đ"]
                                  }),
                                  c.jsx("td", {
                                    className: "p-3 text-slate-500 text-[11px] hidden sm:table-cell",
                                    children: "Thu nợ khách, thưởng, hoàn cọc ao..."
                                  })
                                ]
                              }),

                              // 3. Tiền mua tôm ao
                              c.jsxs("tr", {
                                className: "hover:bg-slate-50/80 transition-colors",
                                children: [
                                  c.jsxs("td", {
                                    className: "p-3",
                                    children: [
                                      c.jsx("span", { className: "text-orange-600 font-black", children: "3. Tiền mua tôm tại bờ ao (-)" }),
                                      c.jsxs("span", { className: "block text-[10px] text-slate-500 font-normal", children: [effectiveSessions.length, " phiếu cân • ", _fmtKg(autoShrimpPurchaseKg), " kg"] })
                                    ]
                                  }),
                                  c.jsxs("td", {
                                    className: "p-3 text-right font-mono font-black text-orange-600 text-sm",
                                    children: ["- ", _fmt(shrimpPurchaseMoney), " đ"]
                                  }),
                                  c.jsx("td", {
                                    className: "p-3 text-slate-500 text-[11px] hidden sm:table-cell",
                                    children: "Chi trả trực tiếp cho các chủ ao tôm"
                                  })
                                ]
                              }),

                              // 4. Chi phí vận hành
                              c.jsxs("tr", {
                                className: "hover:bg-slate-50/80 transition-colors",
                                children: [
                                  c.jsxs("td", {
                                    className: "p-3",
                                    children: [
                                      c.jsx("span", { className: "text-orange-600 font-black", children: "4. Chi phí vận hành chuyến (-)" }),
                                      c.jsxs("span", { className: "block text-[10px] text-slate-500 font-normal", children: [operatingExpenses.length, " khoản chi (xe, công kéo, đá, phà...)"] })
                                    ]
                                  }),
                                  c.jsxs("td", {
                                    className: "p-3 text-right font-mono font-black text-orange-600 text-sm",
                                    children: ["- ", _fmt(totalOperationExpenses), " đ"]
                                  }),
                                  c.jsx("td", {
                                    className: "p-3 text-slate-500 text-[11px] hidden sm:table-cell",
                                    children: "Toàn bộ chi phí đưa tôm từ ao về điểm bán"
                                  })
                                ]
                              }),

                              // 5. Kết quả Lợi Nhuận Ròng
                              c.jsxs("tr", {
                                className: "bg-slate-50 font-black text-xs border-t-2 border-slate-300",
                                children: [
                                  c.jsxs("td", {
                                    className: "p-3.5",
                                    children: [
                                      c.jsx("span", { className: "text-slate-900 uppercase tracking-wider block", children: "🏆 LỢI NHUẬN RÒNG THỰC THU (100% LÃI VỀ TÚI)" }),
                                      c.jsx("span", { className: "text-[10px] text-slate-500 font-normal", children: "Tổng Doanh Thu trừ Toàn Bộ Chi Phí" })
                                    ]
                                  }),
                                  c.jsxs("td", {
                                    className: "p-3.5 text-right font-mono text-base sm:text-lg " + (isProfit ? "text-emerald-700" : "text-rose-700"),
                                    children: [(isProfit ? "+" : "") + _fmt(netProfit), " đ"]
                                  }),
                                  c.jsxs("td", {
                                    className: "p-3.5 text-slate-600 text-[11px] hidden sm:table-cell",
                                    children: [isProfit ? "Tiền lời ròng thu về trọn vẹn" : "Thâm hụt vốn chuyến này", " (ROI: ", profitMarginPercent.toFixed(1), "%)"]
                                  })
                                ]
                              })
                            ]
                          })
                        ]
                      })
                    }),

                    // Nút Khóa & Quyết Toán Chuyến Đi
                    c.jsx("div", {
                      className: "pt-2",
                      children: c.jsxs("button", {
                        type: "button",
                        onClick: handleSettleAndArchiveTrip,
                        className: "w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer",
                        children: [
                          c.jsx("span", { className: "text-lg", children: "🔒" }),
                          "Khóa & Lưu Quyết Toán Chuyến Vào Lịch Sử"
                        ]
                      })
                    })
                  ]
                })
              ]
            }),

            // =====================================================================
            // TAB 2: SỔ THU - CHI VẬN HÀNH (GIAO DIỆN SÁNG)
            // =====================================================================
            mainTab === "LEDGER" && c.jsxs("div", {
              className: "space-y-4",
              children: [
                // 3 Thẻ Tóm Tắt Dòng Tiền
                c.jsxs("div", {
                  className: "grid grid-cols-2 sm:grid-cols-3 gap-2.5",
                  children: [
                    c.jsxs("div", {
                      className: "bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs",
                      children: [
                        c.jsx("span", { className: "text-[10px] font-bold text-orange-600 uppercase block", children: "Tổng Chi Vận Hành" }),
                        c.jsxs("div", { className: "font-mono font-black text-xl text-orange-600 my-0.5", children: ["- ", _fmt(totalOperationExpenses), " đ"] }),
                        c.jsxs("span", { className: "text-[10px] text-slate-500", children: [operatingExpenses.length, " khoản chi ra"] })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs",
                      children: [
                        c.jsx("span", { className: "text-[10px] font-bold text-emerald-700 uppercase block", children: "Tổng Thu Ngoài" }),
                        c.jsxs("div", { className: "font-mono font-black text-xl text-emerald-700 my-0.5", children: ["+ ", _fmt(totalExtraIncome), " đ"] }),
                        c.jsxs("span", { className: "text-[10px] text-slate-500", children: [extraIncomes.length, " khoản thu vào"] })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "col-span-2 sm:col-span-1 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs",
                      children: [
                        c.jsx("span", { className: "text-[10px] font-bold text-slate-600 uppercase block", children: "Chênh Lệch Dòng Tiền Phụ" }),
                        c.jsxs("div", {
                          className: "font-mono font-black text-xl my-0.5 " + (totalExtraIncome >= totalOperationExpenses ? "text-emerald-700" : "text-orange-600"),
                          children: [(totalExtraIncome >= totalOperationExpenses ? "+ " : "- ") + _fmt(Math.abs(totalExtraIncome - totalOperationExpenses)), " đ"]
                        }),
                        c.jsx("span", { className: "text-[10px] text-slate-500", children: "Thu trừ chi phí" })
                      ]
                    })
                  ]
                }),

                // Thanh Tìm Kiếm & Bộ Lọc
                c.jsxs("div", {
                  className: "bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center",
                  children: [
                    // Tabs phân loại
                    c.jsxs("div", {
                      className: "flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold shrink-0 border border-slate-200",
                      children: [
                        c.jsxs("button", {
                          type: "button",
                          onClick: () => setThuChiFilterTab("ALL"),
                          className: "px-3 py-1 rounded-lg transition-all cursor-pointer " + (thuChiFilterTab === "ALL" ? "bg-white text-slate-900 shadow-xs font-black" : "text-slate-600 hover:text-slate-900"),
                          children: ["Tất cả (", allTransactions.length, ")"]
                        }),
                        c.jsxs("button", {
                          type: "button",
                          onClick: () => setThuChiFilterTab("EXPENSE"),
                          className: "px-3 py-1 rounded-lg transition-all cursor-pointer " + (thuChiFilterTab === "EXPENSE" ? "bg-orange-600 text-white font-black" : "text-orange-600 hover:text-orange-700"),
                          children: ["Khoản chi (", operatingExpenses.length, ")"]
                        }),
                        c.jsxs("button", {
                          type: "button",
                          onClick: () => setThuChiFilterTab("INCOME"),
                          className: "px-3 py-1 rounded-lg transition-all cursor-pointer " + (thuChiFilterTab === "INCOME" ? "bg-emerald-600 text-white font-black" : "text-emerald-700 hover:text-emerald-800"),
                          children: ["Khoản thu (", extraIncomes.length, ")"]
                        })
                      ]
                    }),

                    // Ô tìm kiếm
                    c.jsxs("div", {
                      className: "flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 flex-1 max-w-sm",
                      children: [
                        c.jsx("span", { className: "text-slate-400 text-xs", children: "🔍" }),
                        c.jsx("input", {
                          type: "text",
                          value: thuChiSearchQuery,
                          onChange: e => setThuChiSearchQuery(e.target.value),
                          placeholder: "Tìm khoản chi, người nhận...",
                          className: "bg-transparent text-xs outline-none w-full text-slate-800 placeholder-slate-400"
                        }),
                        thuChiSearchQuery && c.jsx("button", {
                          type: "button",
                          onClick: () => setThuChiSearchQuery(""),
                          className: "text-xs text-slate-400 hover:text-slate-600 cursor-pointer",
                          children: "✕"
                        })
                      ]
                    })
                  ]
                }),

                // Danh Sách Giao Dịch Thu - Chi
                displayedTransactions.length === 0 ? c.jsxs("div", {
                  className: "p-10 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-center space-y-3",
                  children: [
                    c.jsx("span", { className: "text-3xl block", children: "📝" }),
                    c.jsx("p", { className: "font-bold text-xs text-slate-500", children: "Chưa có khoản thu hoặc chi nào trong mục này." }),
                    c.jsx("p", { className: "text-[11px] text-slate-400 italic", children: "Bấm nút dấu '+' ở góc dưới bên phải màn hình để ghi chép nhanh." })
                  ]
                }) : c.jsx("div", {
                  className: "space-y-2",
                  children: displayedTransactions.map(tx => {
                    const isIncome = tx.type === "INCOME";
                    return c.jsxs("div", {
                      key: tx.id,
                      className: "p-3.5 bg-white rounded-2xl border border-slate-200/90 flex items-center justify-between gap-3 text-xs shadow-xs hover:border-slate-300 transition-all",
                      children: [
                        c.jsxs("div", {
                          className: "flex items-center gap-3 min-w-0",
                          children: [
                            c.jsx("div", {
                              className: "w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 " + (isIncome ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-orange-50 text-orange-600 border border-orange-200"),
                              children: isIncome ? "➕" : "➖"
                            }),
                            c.jsxs("div", {
                              className: "min-w-0 space-y-0.5",
                              children: [
                                c.jsxs("div", {
                                  className: "font-black text-slate-900 flex items-center gap-1.5 truncate",
                                  children: [
                                    c.jsx("span", {
                                      className: "text-[9px] font-black uppercase px-1.5 py-0.2 rounded " + (isIncome ? "bg-emerald-600 text-white" : "bg-orange-600 text-white"),
                                      children: isIncome ? "THU" : "CHI"
                                    }),
                                    c.jsx("span", { className: "truncate", children: tx.category })
                                  ]
                                }),
                                (tx.person || tx.note) ? c.jsxs("div", {
                                  className: "text-[10px] text-slate-500 truncate flex items-center gap-1.5",
                                  children: [
                                    tx.person ? c.jsxs("span", { children: ["👤 ", tx.person] }) : null,
                                    (tx.person && tx.note) ? c.jsx("span", { children: "•" }) : null,
                                    tx.note ? c.jsxs("span", { children: ["📝 ", tx.note] }) : null
                                  ]
                                }) : null
                              ]
                            })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "flex items-center gap-2 shrink-0",
                          children: [
                            c.jsxs("span", {
                              className: "font-mono font-black text-sm " + (isIncome ? "text-emerald-700" : "text-orange-600"),
                              children: [(isIncome ? "+ " : "- ") + _fmt(tx.amount), " đ"]
                            }),
                            c.jsx("button", {
                              type: "button",
                              onClick: () => handleOpenEditThuChi(tx),
                              className: "p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer",
                              title: "Sửa",
                              children: c.jsx("span", { children: "✎" })
                            }),
                            c.jsx("button", {
                              type: "button",
                              onClick: () => handleDeleteThuChi(tx.id),
                              className: "p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer",
                              title: "Xóa",
                              children: c.jsx(xm, { size: 15 })
                            })
                          ]
                        })
                      ]
                    });
                  })
                })
              ]
            }),

            // =====================================================================
            // TAB 3: CHI PHÍ MUA TÔM BỜ AO (GIAO DIỆN SÁNG)
            // =====================================================================
            mainTab === "BUY" && c.jsxs("div", {
              className: "space-y-4",
              children: [
                // Thẻ Thống Kê Nguồn Mua
                c.jsxs("div", {
                  className: "grid grid-cols-2 sm:grid-cols-4 gap-2.5",
                  children: [
                    c.jsxs("div", {
                      className: "bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs",
                      children: [
                        c.jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase block", children: "Tổng Khối Lượng" }),
                        c.jsxs("div", { className: "font-mono font-black text-xl text-orange-600 my-0.5", children: [_fmtKg(autoShrimpPurchaseKg), " kg"] }),
                        c.jsxs("span", { className: "text-[10px] text-slate-500", children: [effectiveSessions.length, " phiếu cân"] })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs",
                      children: [
                        c.jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase block", children: "Tổng Tiền Mua Ao" }),
                        c.jsxs("div", { className: "font-mono font-black text-xl text-orange-600 my-0.5", children: [_fmt(shrimpPurchaseMoney), " đ"] }),
                        c.jsx("span", { className: "text-[10px] text-slate-500", children: isShrimpAuto ? "Tự động liên kết" : "Nhập tay" })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs",
                      children: [
                        c.jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase block", children: "Giá Mua Bình Quân" }),
                        c.jsxs("div", { className: "font-mono font-black text-xl text-slate-900 my-0.5", children: [_fmt(Math.round(avgPurchasePrice)), " đ"] }),
                        c.jsx("span", { className: "text-[10px] text-slate-500", children: "trên 1 kg tôm" })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between",
                      children: [
                        c.jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase block", children: "Thao Tác Nguồn" }),
                        c.jsxs("div", {
                          className: "flex gap-1.5 pt-1",
                          children: [
                            c.jsx("button", {
                              type: "button",
                              onClick: () => setShowSessionsModal(true),
                              className: "flex-1 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[10px] font-bold cursor-pointer",
                              children: "Chọn phiếu"
                            }),
                            c.jsx("button", {
                              type: "button",
                              onClick: () => updateActiveTrip({ shrimpPurchaseAuto: !isShrimpAuto }),
                              className: "px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold border border-slate-200 cursor-pointer",
                              children: isShrimpAuto ? "Nhập tay" : "Tự động"
                            })
                          ]
                        })
                      ]
                    })
                  ]
                }),

                // Nhập tay nếu tắt tự động
                !isShrimpAuto && c.jsxs("div", {
                  className: "bg-white p-4 rounded-3xl border border-orange-200 shadow-xs space-y-2",
                  children: [
                    c.jsx("label", { className: "text-xs font-bold text-orange-600 uppercase block", children: "Nhập số tiền mua tôm thủ công cho chuyến này (VNĐ):" }),
                    c.jsx("input", {
                      type: "number",
                      value: trip.shrimpPurchaseManualAmount || "",
                      onChange: e => updateActiveTrip({ shrimpPurchaseManualAmount: Number(e.target.value) || 0 }),
                      placeholder: "VD: 95000000",
                      className: "w-full p-3 bg-slate-50 border border-orange-300 rounded-2xl font-mono font-black text-xl text-orange-600 outline-none"
                    })
                  ]
                }),

                // Danh sách chi tiết các phiếu cân đã liên kết
                c.jsxs("div", {
                  className: "bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3",
                  children: [
                    c.jsxs("div", {
                      className: "flex justify-between items-center border-b border-slate-100 pb-3",
                      children: [
                        c.jsxs("div", {
                          children: [
                            c.jsx("h2", { className: "text-xs sm:text-sm font-black uppercase text-slate-900 flex items-center gap-1.5", children: [c.jsx("span", { children: "🦐" }), "Danh Sách Phiếu Cân Mua Tôm Đã Liên Kết"] }),
                            c.jsx("p", { className: "text-[10px] text-slate-500 font-medium", children: "Dữ liệu được đồng bộ 100% từ mô-đun Cân Tôm tại bờ ao" })
                          ]
                        }),
                        c.jsx("button", {
                          type: "button",
                          onClick: () => setShowSessionsModal(true),
                          className: "px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl text-xs font-bold border border-orange-200 cursor-pointer",
                          children: "Tùy chọn phiếu ➔"
                        })
                      ]
                    }),

                    effectiveSessions.length === 0 ? c.jsxs("div", {
                      className: "p-8 text-center text-slate-400 text-xs space-y-2",
                      children: [
                        c.jsx("span", { className: "text-2xl block", children: "⚖️" }),
                        c.jsx("p", { children: "Chưa có phiếu cân thu mua nào được liên kết cho ngày này." }),
                        c.jsx("button", {
                          type: "button",
                          onClick: () => {
                            const newMode = filterMode === "DATE" ? "ALL" : "DATE";
                            setFilterMode(newMode);
                            updateActiveTrip({ filterMode: newMode });
                          },
                          className: "text-orange-600 hover:underline font-bold text-xs cursor-pointer",
                          children: "Chuyển sang chế độ: Tất Cả Phiếu"
                        })
                      ]
                    }) : c.jsx("div", {
                      className: "space-y-2",
                      children: effectiveSessions.map((s, idx) => c.jsxs("div", {
                        key: s.id || idx,
                        className: "p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 text-xs",
                        children: [
                          c.jsxs("div", {
                            className: "flex items-center gap-3 min-w-0",
                            children: [
                              c.jsxs("div", {
                                className: "w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-black text-xs shrink-0 border border-orange-200",
                                children: [idx + 1]
                              }),
                              c.jsxs("div", {
                                className: "min-w-0",
                                children: [
                                  c.jsx("span", { className: "font-black text-slate-900 text-sm block truncate", children: s.farmerName || "Ao tôm" }),
                                  c.jsxs("span", { className: "text-[10px] text-slate-500 font-mono", children: [new Date(s.date || Date.now()).toLocaleDateString("vi-VN"), " • ", _fmtKg(s.totalNet || s.totalGross), " kg", s.truck ? (" • Xe: " + s.truck) : ""] })
                                ]
                              })
                            ]
                          }),
                          c.jsxs("div", {
                            className: "text-right shrink-0",
                            children: [
                              c.jsxs("span", { className: "font-mono font-black text-sm text-orange-600 block", children: [_fmt(s.totalMoney), " đ"] }),
                              c.jsxs("span", { className: "text-[10px] text-slate-500 font-mono", children: ["TB: ", _fmt(Math.round(Number(s.totalMoney || 0) / (Number(s.totalNet || s.totalGross || 1)))), " đ/kg"] })
                            ]
                          })
                        ]
                      }))
                    })
                  ]
                })
              ]
            }),

            // =====================================================================
            // TAB 4: DOANH THU XUẤT BÁN TÔM (GIAO DIỆN SÁNG)
            // =====================================================================
            mainTab === "SELL" && c.jsxs("div", {
              className: "space-y-4",
              children: [
                // Thẻ Thống Kê Đầu Ra
                c.jsxs("div", {
                  className: "grid grid-cols-2 sm:grid-cols-4 gap-2.5",
                  children: [
                    c.jsxs("div", {
                      className: "bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs",
                      children: [
                        c.jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase block", children: "Tổng Khối Lượng Xuất" }),
                        c.jsxs("div", { className: "font-mono font-black text-xl text-emerald-700 my-0.5", children: [_fmtKg(autoRevenueKg), " kg"] }),
                        c.jsxs("span", { className: "text-[10px] text-slate-500", children: [effectiveSales.length, " đơn xuất bán"] })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs",
                      children: [
                        c.jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase block", children: "Tổng Doanh Thu Bán" }),
                        c.jsxs("div", { className: "font-mono font-black text-xl text-emerald-700 my-0.5", children: [_fmt(baseRevenue), " đ"] }),
                        c.jsx("span", { className: "text-[10px] text-slate-500", children: isRevenueAuto ? "Tự động liên kết" : "Nhập tay" })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs",
                      children: [
                        c.jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase block", children: "Giá Bán Bình Quân" }),
                        c.jsxs("div", { className: "font-mono font-black text-xl text-slate-900 my-0.5", children: [_fmt(Math.round(avgSalePrice)), " đ"] }),
                        c.jsx("span", { className: "text-[10px] text-slate-500", children: "trên 1 kg xuất" })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between",
                      children: [
                        c.jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase block", children: "Thao Tác Đơn" }),
                        c.jsxs("div", {
                          className: "flex gap-1.5 pt-1",
                          children: [
                            c.jsx("button", {
                              type: "button",
                              onClick: () => setShowSalesModal(true),
                              className: "flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold cursor-pointer",
                              children: "Chọn đơn"
                            }),
                            c.jsx("button", {
                              type: "button",
                              onClick: () => updateActiveTrip({ revenueAuto: !isRevenueAuto }),
                              className: "px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold border border-slate-200 cursor-pointer",
                              children: isRevenueAuto ? "Nhập tay" : "Tự động"
                            })
                          ]
                        })
                      ]
                    })
                  ]
                }),

                // Phân Bổ Kênh Bán Hàng
                c.jsxs("div", {
                  className: "grid grid-cols-3 gap-2.5",
                  children: [
                    c.jsxs("div", {
                      className: "bg-white p-3.5 rounded-2xl border border-slate-200 text-center space-y-1 shadow-xs",
                      children: [
                        c.jsx("span", { className: "text-[10px] text-slate-500 font-bold uppercase block", children: "🛒 Bán Lẻ Tại Vựa" }),
                        c.jsxs("div", { className: "font-mono font-black text-base text-emerald-700", children: [_fmt(retailRevenue), " đ"] }),
                        c.jsxs("span", { className: "text-[10px] text-slate-400", children: [retailSalesList.length, " đơn"] })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "bg-white p-3.5 rounded-2xl border border-slate-200 text-center space-y-1 shadow-xs",
                      children: [
                        c.jsx("span", { className: "text-[10px] text-slate-500 font-bold uppercase block", children: "🏪 Chợ Đầu Mối" }),
                        c.jsxs("div", { className: "font-mono font-black text-base text-blue-700", children: [_fmt(marketRevenue), " đ"] }),
                        c.jsxs("span", { className: "text-[10px] text-slate-400", children: [marketSalesList.length, " đơn"] })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "bg-white p-3.5 rounded-2xl border border-slate-200 text-center space-y-1 shadow-xs",
                      children: [
                        c.jsx("span", { className: "text-[10px] text-slate-500 font-bold uppercase block", children: "🏢 Nhà Máy Công Ty" }),
                        c.jsxs("div", { className: "font-mono font-black text-base text-purple-700", children: [_fmt(factoryRevenue), " đ"] }),
                        c.jsxs("span", { className: "text-[10px] text-slate-400", children: [factorySalesList.length, " đơn"] })
                      ]
                    })
                  ]
                }),

                // Danh sách chi tiết các đơn xuất bán đã liên kết
                c.jsxs("div", {
                  className: "bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3",
                  children: [
                    c.jsxs("div", {
                      className: "flex justify-between items-center border-b border-slate-100 pb-3",
                      children: [
                        c.jsxs("div", {
                          children: [
                            c.jsx("h2", { className: "text-xs sm:text-sm font-black uppercase text-slate-900 flex items-center gap-1.5", children: [c.jsx("span", { children: "🛒" }), "Danh Sách Đơn Xuất Bán Tôm Đã Liên Kết"] }),
                            c.jsx("p", { className: "text-[10px] text-slate-500 font-medium", children: "Dữ liệu được đồng bộ 100% từ mô-đun Xuất Bán Tôm" })
                          ]
                        }),
                        c.jsx("button", {
                          type: "button",
                          onClick: () => setShowSalesModal(true),
                          className: "px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 cursor-pointer",
                          children: "Tùy chọn đơn ➔"
                        })
                      ]
                    }),

                    effectiveSales.length === 0 ? c.jsxs("div", {
                      className: "p-8 text-center text-slate-400 text-xs space-y-2",
                      children: [
                        c.jsx("span", { className: "text-2xl block", children: "📦" }),
                        c.jsx("p", { children: "Chưa có đơn xuất bán nào được liên kết cho ngày này." }),
                        c.jsx("button", {
                          type: "button",
                          onClick: () => {
                            const newMode = filterMode === "DATE" ? "ALL" : "DATE";
                            setFilterMode(newMode);
                            updateActiveTrip({ filterMode: newMode });
                          },
                          className: "text-emerald-700 hover:underline font-bold text-xs cursor-pointer",
                          children: "Chuyển sang chế độ: Tất Cả Phiếu"
                        })
                      ]
                    }) : c.jsx("div", {
                      className: "space-y-2",
                      children: effectiveSales.map((sl, idx) => c.jsxs("div", {
                        key: sl.id || idx,
                        className: "p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 text-xs",
                        children: [
                          c.jsxs("div", {
                            className: "flex items-center gap-3 min-w-0",
                            children: [
                              c.jsxs("div", {
                                className: "w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0 border border-emerald-200",
                                children: [idx + 1]
                              }),
                              c.jsxs("div", {
                                className: "min-w-0",
                                children: [
                                  c.jsxs("span", {
                                    className: "font-black text-slate-900 text-sm flex items-center gap-1.5 truncate",
                                    children: [
                                      c.jsx("span", { children: sl.targetGroup === "FACTORY" ? "🏢" : (sl.targetGroup === "MARKET" ? "🏪" : "🛒") }),
                                      sl.buyerName || "Khách mua tôm"
                                    ]
                                  }),
                                  c.jsxs("span", { className: "text-[10px] text-slate-500 font-mono", children: [new Date(sl.date || Date.now()).toLocaleDateString("vi-VN"), " • ", _fmtKg(sl.totalNet || sl.totalGross), " kg", sl.targetGroup === "FACTORY" ? " (Công ty)" : (sl.targetGroup === "MARKET" ? " (Chợ đầu mối)" : " (Bán lẻ)")] })
                                ]
                              })
                            ]
                          }),
                          c.jsxs("div", {
                            className: "text-right shrink-0",
                            children: [
                              c.jsxs("span", { className: "font-mono font-black text-sm text-emerald-700 block", children: [_fmt(sl.totalMoney), " đ"] }),
                              c.jsxs("span", { className: "text-[10px] text-slate-500 font-mono", children: ["Giá: ", _fmt(Math.round(Number(sl.totalMoney || 0) / (Number(sl.totalNet || sl.totalGross || 1)))), " đ/kg"] })
                            ]
                          })
                        ]
                      }))
                    })
                  ]
                })
              ]
            }),

            // =====================================================================
            // TAB 5: ĐỐI SOÁT HAO HỤT & HIỆU QUẢ KINH DOANH (GIAO DIỆN SÁNG)
            // =====================================================================
            mainTab === "AUDIT" && c.jsxs("div", {
              className: "space-y-4",
              children: [
                // Thẻ đánh giá hiệu quả
                c.jsxs("div", {
                  className: "bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4",
                  children: [
                    c.jsxs("div", {
                      className: "flex justify-between items-center border-b border-slate-100 pb-3",
                      children: [
                        c.jsxs("div", {
                          children: [
                            c.jsx("h2", { className: "text-sm font-black uppercase text-slate-900 flex items-center gap-1.5", children: [c.jsx("span", { children: "⚖️" }), "Đối Chiếu Cân Bằng Khối Lượng & Giá"] }),
                            c.jsx("p", { className: "text-[10px] text-slate-500 font-medium", children: "Kiểm soát độ hao hụt sống/chết khi vận chuyển và chênh lệch giá bán - mua" })
                          ]
                        }),
                        c.jsx("span", {
                          className: "px-3 py-1 rounded-full text-[10px] font-black uppercase " + (weightDiff <= 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : (weightDiffPercent < 3 ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-red-50 text-red-700 border border-red-200")),
                          children: weightDiff <= 0 ? "TỐT • KHÔNG HAO HỤT" : ("HAO HỤT " + weightDiffPercent.toFixed(1) + "%")
                        })
                      ]
                    }),

                    // 4 Chỉ Số Cốt Lõi
                    c.jsxs("div", {
                      className: "grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs",
                      children: [
                        c.jsxs("div", {
                          className: "p-3.5 bg-slate-50 rounded-2xl border border-slate-200",
                          children: [
                            c.jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase block", children: "Tổng Mua Vào" }),
                            c.jsxs("div", { className: "font-mono font-black text-xl text-orange-600 my-0.5", children: [_fmtKg(autoShrimpPurchaseKg), " kg"] }),
                            c.jsxs("span", { className: "text-[10px] text-slate-500", children: ["TB: ", _fmt(Math.round(avgPurchasePrice)), " đ/kg"] })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "p-3.5 bg-slate-50 rounded-2xl border border-slate-200",
                          children: [
                            c.jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase block", children: "Tổng Xuất Bán" }),
                            c.jsxs("div", { className: "font-mono font-black text-xl text-emerald-700 my-0.5", children: [_fmtKg(autoRevenueKg), " kg"] }),
                            c.jsxs("span", { className: "text-[10px] text-slate-500", children: ["TB: ", _fmt(Math.round(avgSalePrice)), " đ/kg"] })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "p-3.5 bg-slate-50 rounded-2xl border border-slate-200",
                          children: [
                            c.jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase block", children: "Độ Lệch Khối Lượng" }),
                            c.jsxs("div", {
                              className: "font-mono font-black text-xl my-0.5 " + (weightDiff > 0 ? "text-amber-600" : "text-emerald-700"),
                              children: [(weightDiff > 0 ? "-" : "+") + _fmtKg(Math.abs(weightDiff)), " kg"]
                            }),
                            c.jsxs("span", { className: "text-[10px] text-slate-500", children: ["Tỷ lệ: ", weightDiffPercent.toFixed(1), "%"] })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "p-3.5 bg-slate-50 rounded-2xl border border-slate-200",
                          children: [
                            c.jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase block", children: "Lãi Gộp Chênh Giá" }),
                            c.jsxs("div", {
                              className: "font-mono font-black text-xl my-0.5 " + (grossProfitPerKg >= 0 ? "text-emerald-700" : "text-rose-600"),
                              children: [(grossProfitPerKg >= 0 ? "+" : "") + _fmt(Math.round(grossProfitPerKg)), " đ"]
                            }),
                            c.jsx("span", { className: "text-[10px] text-slate-500", children: "Lãi gộp trên mỗi kg" })
                          ]
                        })
                      ]
                    }),

                    // Nhận xét hiệu quả
                    c.jsxs("div", {
                      className: "p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5",
                      children: [
                        c.jsx("span", { className: "font-black text-slate-900 uppercase text-[11px] block", children: "💡 Đánh Giá Chuyến Hàng:" }),
                        c.jsxs("p", {
                          className: "text-slate-600 text-[11px] leading-relaxed",
                          children: [
                            "Chuyến hàng đạt tổng doanh thu ",
                            c.jsx("b", { className: "text-emerald-700 font-mono", children: _fmt(totalRevenue) + " đ" }),
                            " trên tổng chi phí ",
                            c.jsx("b", { className: "text-orange-600 font-mono", children: _fmt(totalExpenses) + " đ" }),
                            ". Lợi nhuận ròng thu về đạt ",
                            c.jsx("b", { className: (isProfit ? "text-emerald-700" : "text-rose-600") + " font-mono", children: (isProfit ? "+" : "") + _fmt(netProfit) + " VNĐ" }),
                            " (tương đương tỷ suất sinh lời ",
                            c.jsx("b", { className: "text-slate-900 font-mono", children: profitMarginPercent.toFixed(1) + "%" }),
                            "). ",
                            weightDiff > 0 ? ("Hao hụt khối lượng là " + _fmtKg(weightDiff) + " kg (" + weightDiffPercent.toFixed(1) + "%), " + (weightDiffPercent < 3 ? "nằm trong ngưỡng an toàn cho phép." : "cần chú ý nhiệt độ đá oxy khi vận chuyển đường dài.")) : "Không bị hao hụt khối lượng."
                          ]
                        })
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
      // 3. NÚT DẤU '+' THẢ NỔI Ở GÓC DƯỚI BÊN PHẢI MÀN HÌNH (FLOATING ACTION BUTTON)
      // =========================================================================
      // Màn che nền mờ khi mở speed dial
      fabOpen && c.jsx("div", {
        className: "fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150",
        onClick: () => setFabOpen(false)
      }),

      // Container chứa nút FAB và các nút con
      c.jsxs("div", {
        className: "fixed bottom-6 right-5 sm:bottom-8 sm:right-8 z-50 flex flex-col items-end gap-2.5",
        children: [
          // Nút con 1: Ghi Khoản Thu (Xanh ngọc)
          fabOpen && c.jsxs("div", {
            className: "flex items-center gap-2.5 animate-in slide-in-from-bottom-2 duration-150",
            children: [
              c.jsx("span", {
                className: "px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg whitespace-nowrap",
                children: "Ghi Khoản Thu (➕)"
              }),
              c.jsx("button", {
                type: "button",
                onClick: () => handleOpenAddThuChi("INCOME"),
                className: "w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl flex items-center justify-center text-lg active:scale-95 transition-all cursor-pointer border-2 border-white",
                title: "Ghi khoản thu tiền mới",
                children: "➕"
              })
            ]
          }),

          // Nút con 2: Ghi Khoản Chi (Cam hổ phách)
          fabOpen && c.jsxs("div", {
            className: "flex items-center gap-2.5 animate-in slide-in-from-bottom-2 duration-150",
            children: [
              c.jsx("span", {
                className: "px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg whitespace-nowrap",
                children: "Ghi Khoản Chi (➖)"
              }),
              c.jsx("button", {
                type: "button",
                onClick: () => handleOpenAddThuChi("EXPENSE"),
                className: "w-12 h-12 rounded-full bg-orange-600 hover:bg-orange-500 text-white shadow-xl flex items-center justify-center text-lg active:scale-95 transition-all cursor-pointer border-2 border-white",
                title: "Ghi khoản chi tiền mới",
                children: "➖"
              })
            ]
          }),

          // NÚT CHÍNH: DẤU '+' THẢ NỔI
          c.jsxs("button", {
            type: "button",
            onClick: () => setFabOpen(!fabOpen),
            className: "w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-2xl shadow-emerald-700/50 flex items-center justify-center text-2xl font-black active:scale-90 transition-all cursor-pointer border-2 border-white focus:outline-none",
            title: fabOpen ? "Đóng menu" : "Thêm khoản Thu - Chi mới",
            children: [
              c.jsx("span", {
                className: "transition-transform duration-200 select-none " + (fabOpen ? "rotate-45" : "rotate-0"),
                children: "+"
              })
            ]
          })
        ]
      }),

      // =========================================================================
      // MODAL 1: GHI NHẬN THU - CHI CHUYÊN NGHIỆP (GIAO DIỆN SÁNG)
      // =========================================================================
      showThuChiModal && c.jsx("div", {
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs",
        children: c.jsxs("div", {
          className: "bg-white text-slate-900 rounded-3xl w-full max-w-sm p-5 sm:p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4 max-h-[95vh] overflow-y-auto border border-slate-200",
          children: [
            // Modal Header with Type Selector
            c.jsxs("div", {
              className: "space-y-3",
              children: [
                c.jsxs("div", {
                  className: "flex justify-between items-center",
                  children: [
                    c.jsx("h3", {
                      className: "font-black text-base uppercase text-slate-900",
                      children: editingThuChiId ? "✎ Chỉnh Sửa Thu - Chi" : "➕ Ghi Nhận Thu - Chi"
                    }),
                    c.jsx("button", {
                      type: "button",
                      onClick: () => setShowThuChiModal(false),
                      className: "p-1.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer",
                      children: c.jsx(_a, { size: 18 })
                    })
                  ]
                }),
                // Tab chọn Loại: CHI TIỀN hay THU TIỀN
                c.jsxs("div", {
                  className: "grid grid-cols-2 p-1 bg-slate-100 rounded-2xl gap-1 text-xs font-black border border-slate-200",
                  children: [
                    c.jsxs("button", {
                      type: "button",
                      onClick: () => {
                        setThuChiType("EXPENSE");
                        if (!editingThuChiId) setThuChiCategory("Tiền thuê xe / vận chuyển");
                      },
                      className: "py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer " + (thuChiType === "EXPENSE" ? "bg-orange-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"),
                      children: [c.jsx("span", { children: "➖" }), "KHOẢN CHI"]
                    }),
                    c.jsxs("button", {
                      type: "button",
                      onClick: () => {
                        setThuChiType("INCOME");
                        if (!editingThuChiId) setThuChiCategory("Thu tiền bán tôm mặt tại ao");
                      },
                      className: "py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer " + (thuChiType === "INCOME" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"),
                      children: [c.jsx("span", { children: "➕" }), "KHOẢN THU"]
                    })
                  ]
                })
              ]
            }),

            // Form Fields
            c.jsxs("div", {
              className: "space-y-3.5",
              children: [
                // Danh mục
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider", children: "Danh mục *" }),
                    c.jsx("div", {
                      className: "grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1",
                      children: (thuChiType === "EXPENSE" ? expenseCategories : incomeCategories).map(cat => c.jsxs("button", {
                        key: cat.label,
                        type: "button",
                        onClick: () => setThuChiCategory(cat.label),
                        className: "p-2 rounded-xl text-[11px] font-bold text-left transition-all border " + (thuChiCategory === cat.label ? (thuChiType === "EXPENSE" ? "bg-orange-50 border-orange-500 text-orange-800" : "bg-emerald-50 border-emerald-500 text-emerald-800") : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"),
                        children: [cat.icon, " ", cat.label]
                      }))
                    })
                  ]
                }),

                // Số tiền & Chữ đọc số
                c.jsxs("div", {
                  children: [
                    c.jsxs("div", {
                      className: "flex justify-between items-center mb-1",
                      children: [
                        c.jsx("label", { className: "text-[11px] font-bold text-slate-500 uppercase tracking-wider", children: "Số tiền (VNĐ) *" }),
                        thuChiAmount && c.jsx("span", { className: "text-[10px] font-bold text-emerald-700 italic", children: _readVietnameseMoney(thuChiAmount) })
                      ]
                    }),
                    c.jsx("input", {
                      type: "number",
                      placeholder: "VD: 1500000",
                      value: thuChiAmount,
                      onChange: e => setThuChiAmount(e.target.value),
                      className: "w-full p-3 bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 rounded-2xl font-bold text-xl font-mono outline-none " + (thuChiType === "EXPENSE" ? "text-orange-600" : "text-emerald-700")
                    }),
                    // Quick chips
                    c.jsxs("div", {
                      className: "flex flex-wrap gap-1.5 mt-2",
                      children: [
                        [100000, "100k"],
                        [200000, "200k"],
                        [500000, "500k"],
                        [1000000, "1tr"],
                        [2000000, "2tr"],
                        [3000000, "3tr"],
                        [5000000, "5tr"],
                        [10000000, "10tr"],
                        [20000000, "20tr"]
                      ].map(([val, label]) => c.jsx("button", {
                        key: val,
                        type: "button",
                        onClick: () => setThuChiAmount(String(val)),
                        className: "px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold font-mono text-slate-700 border border-slate-200 cursor-pointer",
                        children: label
                      }))
                    })
                  ]
                }),

                // Người nhận / Người nộp
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-[11px] font-bold text-slate-500 mb-1 block uppercase tracking-wider", children: thuChiType === "EXPENSE" ? "Người nhận tiền / Tài xế / Nhân công" : "Người nộp tiền / Khách hàng" }),
                    c.jsx("input", {
                      type: "text",
                      placeholder: thuChiType === "EXPENSE" ? "VD: Anh Ba tài xế xe tải..." : "VD: Chú Bảy mua tôm...",
                      value: thuChiPerson,
                      onChange: e => setThuChiPerson(e.target.value),
                      className: "w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none text-slate-900 focus:border-slate-400"
                    })
                  ]
                }),

                // Ghi chú chi tiết
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-[11px] font-bold text-slate-500 mb-1 block uppercase tracking-wider", children: "Ghi chú chi tiết (nếu có)" }),
                    c.jsx("input", {
                      type: "text",
                      placeholder: "VD: Chuyến xe giao chợ Bình Điền...",
                      value: thuChiNote,
                      onChange: e => setThuChiNote(e.target.value),
                      className: "w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none text-slate-900 focus:border-slate-400"
                    })
                  ]
                })
              ]
            }),

            // Action Buttons
            c.jsxs("div", {
              className: "flex gap-2 justify-end pt-2 border-t border-slate-100",
              children: [
                c.jsx("button", {
                  type: "button",
                  onClick: () => setShowThuChiModal(false),
                  className: "px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer",
                  children: "Hủy"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: handleSaveThuChi,
                  className: "px-5 py-2.5 rounded-xl font-black text-xs uppercase shadow-md text-white cursor-pointer " + (thuChiType === "EXPENSE" ? "bg-orange-600 hover:bg-orange-500" : "bg-emerald-600 hover:bg-emerald-500"),
                  children: editingThuChiId ? "Cập Nhật" : (thuChiType === "EXPENSE" ? "Lưu Khoản Chi" : "Lưu Khoản Thu")
                })
              ]
            })
          ]
        })
      }),

      // =========================================================================
      // MODAL 2: CHỌN PHIẾU CÂN MUA TÔM (GIAO DIỆN SÁNG)
      // =========================================================================
      showSessionsModal && c.jsx("div", {
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs",
        children: c.jsxs("div", {
          className: "bg-white text-slate-900 border border-slate-200 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4 max-h-[85vh] flex flex-col",
          children: [
            c.jsxs("div", {
              className: "flex justify-between items-center border-b border-slate-100 pb-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("h3", { className: "font-black text-base uppercase text-slate-900", children: "Chọn Phiếu Mua Tôm Cho Chuyến Này" }),
                    c.jsxs("p", { className: "text-xs text-slate-500 font-bold", children: ["Đang chọn: ", effectiveSessions.length, " / ", filteredSessions.length, " phiếu"] })
                  ]
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => setShowSessionsModal(false),
                  className: "p-1.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer",
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
                  className: "text-emerald-700 font-bold cursor-pointer hover:underline",
                  children: "Chọn tất cả"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => updateActiveTrip({ selectedSessionIds: [] }),
                  className: "text-slate-500 font-bold cursor-pointer hover:underline",
                  children: "Bỏ chọn tất cả"
                })
              ]
            }),
            c.jsx("div", {
              className: "overflow-y-auto flex-1 space-y-2 pr-1",
              children: filteredSessions.length === 0 ? c.jsx("p", {
                className: "text-center text-slate-400 py-12 italic text-xs font-bold",
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
                  className: "p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all " + (isChecked ? "bg-orange-50 border-orange-300" : "bg-slate-50 border-slate-200 opacity-60"),
                  children: [
                    c.jsxs("div", {
                      className: "flex items-center gap-3",
                      children: [
                        c.jsx("input", {
                          type: "checkbox",
                          checked: isChecked,
                          readOnly: true,
                          className: "w-4 h-4 text-orange-600 rounded bg-white border-slate-300"
                        }),
                        c.jsxs("div", {
                          children: [
                            c.jsx("span", { className: "font-black text-xs text-slate-900 block", children: sess.farmerName || "Ao tôm" }),
                            c.jsxs("span", { className: "text-[10px] text-slate-500 font-mono", children: [new Date(sess.date).toLocaleDateString("vi-VN"), " • ", _fmtKg(sess.totalNet || sess.totalGross), " kg"] })
                          ]
                        })
                      ]
                    }),
                    c.jsxs("span", { className: "font-mono font-black text-sm text-orange-600", children: [_fmt(sess.totalMoney), " đ"] })
                  ]
                });
              })
            }),
            c.jsx("div", {
              className: "pt-2 flex justify-end border-t border-slate-100",
              children: c.jsx("button", {
                type: "button",
                onClick: () => setShowSessionsModal(false),
                className: "px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-black text-xs uppercase shadow-xs cursor-pointer",
                children: "Xong"
              })
            })
          ]
        })
      }),

      // =========================================================================
      // MODAL 3: CHỌN ĐƠN XUẤT BÁN (GIAO DIỆN SÁNG)
      // =========================================================================
      showSalesModal && c.jsx("div", {
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs",
        children: c.jsxs("div", {
          className: "bg-white text-slate-900 border border-slate-200 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4 max-h-[85vh] flex flex-col",
          children: [
            c.jsxs("div", {
              className: "flex justify-between items-center border-b border-slate-100 pb-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("h3", { className: "font-black text-base uppercase text-slate-900", children: "Chọn Đơn Xuất Bán Cho Chuyến Này" }),
                    c.jsxs("p", { className: "text-xs text-slate-500 font-bold", children: ["Đang chọn: ", effectiveSales.length, " / ", filteredSales.length, " đơn"] })
                  ]
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => setShowSalesModal(false),
                  className: "p-1.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer",
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
                  className: "text-emerald-700 font-bold cursor-pointer hover:underline",
                  children: "Chọn tất cả"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => updateActiveTrip({ selectedSaleIds: [] }),
                  className: "text-slate-500 font-bold cursor-pointer hover:underline",
                  children: "Bỏ chọn tất cả"
                })
              ]
            }),
            c.jsx("div", {
              className: "overflow-y-auto flex-1 space-y-2 pr-1",
              children: filteredSales.length === 0 ? c.jsx("p", {
                className: "text-center text-slate-400 py-12 italic text-xs font-bold",
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
                  className: "p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all " + (isChecked ? "bg-emerald-50 border-emerald-300" : "bg-slate-50 border-slate-200 opacity-60"),
                  children: [
                    c.jsxs("div", {
                      className: "flex items-center gap-3",
                      children: [
                        c.jsx("input", {
                          type: "checkbox",
                          checked: isChecked,
                          readOnly: true,
                          className: "w-4 h-4 text-emerald-600 rounded bg-white border-slate-300"
                        }),
                        c.jsxs("div", {
                          children: [
                            c.jsxs("span", {
                              className: "font-black text-xs text-slate-900 flex items-center gap-1.5",
                              children: [
                                c.jsx("span", { children: sl.targetGroup === "FACTORY" ? "🏢" : (sl.targetGroup === "MARKET" ? "🏪" : "🛒") }),
                                sl.buyerName
                              ]
                            }),
                            c.jsxs("span", { className: "text-[10px] text-slate-500 font-mono", children: [new Date(sl.date).toLocaleDateString("vi-VN"), " • ", _fmtKg(sl.totalNet || sl.totalGross), " kg"] })
                          ]
                        })
                      ]
                    }),
                    c.jsxs("span", { className: "font-mono font-black text-sm text-emerald-700", children: [_fmt(sl.totalMoney), " đ"] })
                  ]
                });
              })
            }),
            c.jsx("div", {
              className: "pt-2 flex justify-end border-t border-slate-100",
              children: c.jsx("button", {
                type: "button",
                onClick: () => setShowSalesModal(false),
                className: "px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase shadow-xs cursor-pointer",
                children: "Xong"
              })
            })
          ]
        })
      }),

      // =========================================================================
      // MODAL 4: THIẾT LẬP KỲ THU MUA (GIAO DIỆN SÁNG)
      // =========================================================================
      showTripSettingsModal && c.jsx("div", {
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs",
        children: c.jsxs("div", {
          className: "bg-white text-slate-900 border border-slate-200 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4",
          children: [
            c.jsx("h3", { className: "font-black text-base uppercase text-slate-900", children: "⚙️ Thiết Lập Kỳ Thu Mua" }),
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
                  className: "w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-left flex justify-between items-center cursor-pointer hover:bg-slate-100",
                  children: [
                    c.jsxs("span", { children: ["Chế độ lọc phiếu: ", c.jsx("b", { className: "text-emerald-700", children: filterMode === "DATE" ? "Theo ngày" : "Tất cả" })] }),
                    c.jsx("span", { className: "text-blue-600", children: "Đổi" })
                  ]
                }),
                c.jsxs("button", {
                  type: "button",
                  onClick: handleResetTrip,
                  className: "w-full p-3 rounded-2xl bg-orange-50 border border-orange-200 text-orange-700 text-left flex justify-between items-center cursor-pointer hover:bg-orange-100",
                  children: [
                    c.jsx("span", { children: "🔄 Đặt lại thu chi chuyến này về 0" }),
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
                  className: "w-full p-3 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 text-left flex justify-between items-center cursor-pointer hover:bg-teal-100",
                  children: [
                    c.jsx("span", { children: "✨ Tạo chuyến mới tinh sạch" }),
                    c.jsx("span", { children: "➔" })
                  ]
                })
              ]
            }),
            c.jsx("div", {
              className: "flex justify-end pt-2 border-t border-slate-100",
              children: c.jsx("button", {
                type: "button",
                onClick: () => setShowTripSettingsModal(false),
                className: "px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer",
                children: "Đóng"
              })
            })
          ]
        })
      }),

      // =========================================================================
      // MODAL 5: LỊCH SỬ CÁC CHUYẾN ĐÃ LƯU (GIAO DIỆN SÁNG)
      // =========================================================================
      showSavedTripsModal && c.jsx("div", {
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs",
        children: c.jsxs("div", {
          className: "bg-white text-slate-900 border border-slate-200 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4 max-h-[85vh] flex flex-col",
          children: [
            c.jsxs("div", {
              className: "flex justify-between items-center border-b border-slate-100 pb-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("h3", { className: "font-black text-base uppercase text-slate-900", children: "Lịch Sử Các Chuyến Đã Quyết Toán" }),
                    c.jsxs("p", { className: "text-xs text-slate-500 font-bold", children: ["Tổng số: ", (financeData.savedTrips || []).length, " chuyến đã lưu"] })
                  ]
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => setShowSavedTripsModal(false),
                  className: "p-1.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer",
                  children: c.jsx(_a, { size: 18 })
                })
              ]
            }),
            c.jsx("div", {
              className: "overflow-y-auto flex-1 space-y-3 pr-1",
              children: (financeData.savedTrips || []).length === 0 ? c.jsx("p", {
                className: "text-center text-slate-400 py-12 italic text-xs font-bold",
                children: "Chưa có chuyến nào được lưu trước đây."
              }) : (financeData.savedTrips || []).map((st, sIdx) => c.jsxs("div", {
                key: st.id || sIdx,
                className: "p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5",
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
                                className: "p-1 border border-slate-300 rounded text-xs font-bold text-slate-900 bg-white outline-none"
                              }),
                              c.jsx("button", {
                                type: "button",
                                onClick: handleSaveEditSavedTripName,
                                className: "px-2 py-1 bg-emerald-600 text-white rounded text-xs font-bold cursor-pointer",
                                children: "Lưu"
                              }),
                              c.jsx("button", {
                                type: "button",
                                onClick: () => setEditingSavedTripId(null),
                                className: "px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs font-bold cursor-pointer",
                                children: "Hủy"
                              })
                            ]
                          }) : c.jsxs("div", {
                            className: "flex items-center gap-1.5",
                            children: [
                              c.jsx("h4", { className: "font-black text-sm text-slate-900", children: st.name }),
                              c.jsx("button", {
                                type: "button",
                                onClick: () => {
                                  setEditingSavedTripId(st.id);
                                  setEditingSavedTripName(st.name || "");
                                },
                                className: "text-slate-400 hover:text-blue-600 text-xs cursor-pointer",
                                title: "Sửa tên chuyến",
                                children: "✎"
                              })
                            ]
                          }),
                          c.jsxs("span", { className: "text-[10px] text-slate-500 block font-mono", children: ["Ngày: ", st.startDate, " • Quyết toán: ", new Date(st.settledAt || Date.now()).toLocaleTimeString("vi-VN")] })
                        ]
                      }),
                      c.jsx("span", {
                        className: "px-2 py-0.5 rounded-md text-[10px] font-black uppercase " + (st.isProfit ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"),
                        children: st.isProfit ? "CÓ LÃI" : "BỊ LỖ"
                      })
                    ]
                  }),
                  c.jsxs("div", {
                    className: "grid grid-cols-2 gap-2 text-[11px] text-slate-600 font-bold",
                    children: [
                      c.jsxs("div", { children: ["Chi phí: ", c.jsx("b", { className: "text-orange-600 font-mono", children: _fmt(st.totalExpenses) })] }),
                      c.jsxs("div", { children: ["Doanh thu: ", c.jsx("b", { className: "text-emerald-700 font-mono", children: _fmt(st.totalRevenue) })] })
                    ]
                  }),
                  c.jsxs("div", {
                    className: "flex justify-between items-center pt-2 border-t border-slate-200 text-xs font-black",
                    children: [
                      c.jsxs("span", {
                        children: ["Lợi nhuận ròng: ", c.jsx("b", { className: st.isProfit ? "text-emerald-700 font-mono" : "text-rose-600 font-mono", children: [(st.isProfit ? "+" : "") + _fmt(st.netProfit) + " đ"] })]
                      }),
                      c.jsxs("div", {
                        className: "flex items-center gap-1.5",
                        children: [
                          c.jsx("button", {
                            type: "button",
                            onClick: () => setViewingSavedTrip(st),
                            className: "px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold cursor-pointer",
                            children: "Xem Chi Tiết"
                          }),
                          c.jsx("button", {
                            type: "button",
                            onClick: () => handleRestoreSavedTrip(st),
                            className: "px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold cursor-pointer",
                            title: "Khôi phục làm chuyến hiện tại",
                            children: "Khôi Phục"
                          }),
                          c.jsx("button", {
                            type: "button",
                            onClick: () => handleDeleteSavedTrip(st.id),
                            className: "p-1 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer",
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
      // MODAL 6: XEM CHI TIẾT CHUYẾN ĐÃ LƯU (GIAO DIỆN SÁNG)
      // =========================================================================
      viewingSavedTrip && c.jsx("div", {
        className: "fixed inset-0 z-[220] bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs",
        children: c.jsxs("div", {
          className: "bg-white text-slate-900 border border-slate-200 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4 max-h-[90vh] flex flex-col",
          children: [
            c.jsxs("div", {
              className: "flex justify-between items-center border-b border-slate-100 pb-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("h3", { className: "font-black text-base uppercase text-slate-900", children: viewingSavedTrip.name }),
                    c.jsxs("p", { className: "text-xs text-slate-500 font-bold", children: ["Ngày: ", viewingSavedTrip.startDate] })
                  ]
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => setViewingSavedTrip(null),
                  className: "p-1.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer",
                  children: c.jsx(_a, { size: 18 })
                })
              ]
            }),
            c.jsxs("div", {
              className: "overflow-y-auto flex-1 space-y-4 pr-1 text-xs",
              children: [
                // Summary block
                c.jsxs("div", {
                  className: "p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 gap-3 font-bold",
                  children: [
                    c.jsxs("div", { children: ["Tổng chi phí: ", c.jsx("b", { className: "text-orange-600 font-mono", children: _fmt(viewingSavedTrip.totalExpenses) + " đ" })] }),
                    c.jsxs("div", { children: ["Tổng doanh thu: ", c.jsx("b", { className: "text-emerald-700 font-mono", children: _fmt(viewingSavedTrip.totalRevenue) + " đ" })] }),
                    c.jsxs("div", { className: "col-span-2 pt-2 border-t border-slate-200", children: ["Lợi nhuận ròng: ", c.jsx("b", { className: (viewingSavedTrip.isProfit ? "text-emerald-700" : "text-rose-600") + " font-mono text-sm", children: [(viewingSavedTrip.isProfit ? "+" : "") + _fmt(viewingSavedTrip.netProfit) + " đ"] })] })
                  ]
                }),
                // Breakdown Details
                c.jsxs("div", {
                  className: "p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2",
                  children: [
                    c.jsx("span", { className: "font-black uppercase text-emerald-800 block text-xs", children: "🏆 Bảng Quyết Toán Chuyến:" }),
                    c.jsxs("div", {
                      className: "flex justify-between items-center text-xs font-bold",
                      children: [
                        c.jsx("span", { className: "text-slate-700", children: "Tiền mua tôm ao:" }),
                        c.jsxs("span", { className: "font-mono text-orange-600", children: ["- ", _fmt(viewingSavedTrip.shrimpPurchaseMoney), " đ"] })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "flex justify-between items-center text-xs font-bold",
                      children: [
                        c.jsx("span", { className: "text-slate-700", children: "Chi phí vận hành:" }),
                        c.jsxs("span", { className: "font-mono text-orange-600", children: ["- ", _fmt(viewingSavedTrip.totalOperationExpenses), " đ"] })
                      ]
                    }),
                    viewingSavedTrip.totalExtraIncome > 0 && c.jsxs("div", {
                      className: "flex justify-between items-center text-xs font-bold",
                      children: [
                        c.jsx("span", { className: "text-slate-700", children: "Khoản thu ngoài:" }),
                        c.jsxs("span", { className: "font-mono text-emerald-700", children: ["+ ", _fmt(viewingSavedTrip.totalExtraIncome), " đ"] })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "flex justify-between items-center text-xs font-bold",
                      children: [
                        c.jsx("span", { className: "text-slate-700", children: "Doanh thu bán tôm:" }),
                        c.jsxs("span", { className: "font-mono text-emerald-700", children: ["+ ", _fmt(viewingSavedTrip.totalRevenue - (viewingSavedTrip.totalExtraIncome || 0)), " đ"] })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "flex justify-between items-center text-xs font-black pt-2 border-t border-emerald-200",
                      children: [
                        c.jsx("span", { className: "text-slate-900 uppercase", children: "Lợi nhuận ròng:" }),
                        c.jsxs("span", { className: "font-mono text-sm " + (viewingSavedTrip.isProfit ? "text-emerald-700" : "text-rose-600"), children: [(viewingSavedTrip.isProfit ? "+" : "") + _fmt(viewingSavedTrip.netProfit), " VNĐ"] })
                      ]
                    })
                  ]
                })
              ]
            }),
            c.jsxs("div", {
              className: "flex justify-between items-center pt-2 border-t border-slate-100",
              children: [
                c.jsx("button", {
                  type: "button",
                  onClick: () => handleRestoreSavedTrip(viewingSavedTrip),
                  className: "px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs cursor-pointer",
                  children: "Khôi Phục Làm Chuyến Hiện Tại"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => setViewingSavedTrip(null),
                  className: "px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer",
                  children: "Đóng"
                })
              ]
            })
          ]
        })
      })
    ]
  });
};`;
}

function run() {
  const newCode = generateLightFinanceScreenCode();
  const startMarker = "const Xm_FinanceScreen =";
  const endMarker = "\nconst BmMainApp=";

  const targetFiles = [
    "assets/index-v7.js",
    "public/assets/index-v7.js",
    "assets/index-Os1X4Z7e.js",
    "public/assets/index-Os1X4Z7e.js"
  ];

  for (const f of targetFiles) {
    if (!fs.existsSync(f)) {
      console.log("File does not exist, skipping:", f);
      continue;
    }
    const orig = fs.readFileSync(f, "utf8");
    const sIdx = orig.indexOf(startMarker);
    const eIdx = orig.indexOf(endMarker);
    if (sIdx === -1 || eIdx === -1 || eIdx <= sIdx) {
      console.error("Could not find markers in:", f);
      process.exit(1);
    }
    const updated = orig.slice(0, sIdx) + newCode + orig.slice(eIdx);
    fs.writeFileSync(f, updated, "utf8");
    console.log("Successfully replaced Xm_FinanceScreen in:", f);
  }

  // Bump version stamp
  const vStamp = "v20_light_fab";
  const indexHtml = fs.readFileSync("index.html", "utf8");
  const updatedHtml = indexHtml.replace(/index-v7\.js\?v=[^"'\s]+/g, "index-v7.js?v=" + Date.now() + "_" + vStamp);
  fs.writeFileSync("index.html", updatedHtml, "utf8");
  console.log("Updated index.html with new bundle version");

  ["sw.js", "public/sw.js"].forEach(swFile => {
    if (fs.existsSync(swFile)) {
      let sw = fs.readFileSync(swFile, "utf8");
      sw = sw.replace(/CACHE_NAME\s*=\s*['"][^'"]+['"]/g, `CACHE_NAME = 'tom-cang-xanh-${Date.now()}-${vStamp}'`);
      fs.writeFileSync(swFile, sw, "utf8");
      console.log("Updated cache in:", swFile);
    }
  });

  console.log("🎉 Complete light finance screen with floating FAB successfully injected!");
}

run();
