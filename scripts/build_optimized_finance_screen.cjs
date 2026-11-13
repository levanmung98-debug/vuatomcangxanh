const fs = require("fs");
const path = require("path");

// Function that generates the complete, pristine Xm_FinanceScreen component code
function generateXmFinanceScreenCode() {
  return `const Xm_FinanceScreen = ({ setRoute, role }) => {
  const _fmt = (n) => Number(n || 0).toLocaleString("vi-VN");
  const _fmtKg = (n) => {
    if (!n || n <= 0) return "0";
    const r = Math.round(n * 10) / 10;
    return Number.isInteger(r) ? String(r) : String(r);
  };

  // Convert numbers to Vietnamese words for amount clarity (e.g. 1500000 -> 1 triệu 500 nghìn đồng)
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

  const [financeData, setFinanceData] = w.useState(() => me.getFinanceData());
  const [sessions, setSessions] = w.useState(() => {
    try { return (me.getSessions && me.getSessions()) || []; } catch(e) { return []; }
  });
  const [sales, setSales] = w.useState(() => {
    try { return (me.getSales && me.getSales()) || []; } catch(e) { return []; }
  });

  // Active sub-tab inside Finance screen: "OVERVIEW" | "EXPENSES" | "RECONCILE"
  const [activeSubTab, setActiveSubTab] = w.useState("OVERVIEW");

  // Sync latest sessions and sales
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

  const trip = financeData.activeTrip || {};
  const [tripName, setTripName] = w.useState(trip.name || "Chuyến thu mua tôm");
  const [tripDate, setTripDate] = w.useState(trip.startDate || new Date().toISOString().split("T")[0]);
  const [tripNote, setTripNote] = w.useState(trip.note || "");
  const [filterMode, setFilterMode] = w.useState(trip.filterMode || "DATE"); // "DATE" | "ALL"

  // 1. Thu - Chi Modal (Quản lý cả Khoản Chi & Khoản Thu)
  const [showThuChiModal, setShowThuChiModal] = w.useState(false);
  const [thuChiType, setThuChiType] = w.useState("EXPENSE"); // "EXPENSE" (Chi) | "INCOME" (Thu)
  const [editingThuChiId, setEditingThuChiId] = w.useState(null);
  const [thuChiCategory, setThuChiCategory] = w.useState("Tiền thuê xe / vận chuyển");
  const [thuChiAmount, setThuChiAmount] = w.useState("");
  const [thuChiPerson, setThuChiPerson] = w.useState("");
  const [thuChiNote, setThuChiNote] = w.useState("");
  const [thuChiFilterTab, setThuChiFilterTab] = w.useState("ALL"); // "ALL" | "EXPENSE" | "INCOME"
  const [thuChiSearchQuery, setThuChiSearchQuery] = w.useState("");

  // 2. Selection Modals (Sessions & Sales list)
  const [showSessionsModal, setShowSessionsModal] = w.useState(false);
  const [showSalesModal, setShowSalesModal] = w.useState(false);

  // 3. Trip Settings & Saved Trips Modals
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

  // Categories for Chi (Expense) and Thu (Income)
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

  // Open Thu - Chi Modal
  const handleOpenAddThuChi = (type = "EXPENSE") => {
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
  const retailRevenue = effectiveSales.filter(s => s.targetGroup === "RETAIL").reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);
  const marketRevenue = effectiveSales.filter(s => s.targetGroup === "MARKET").reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);
  const factoryRevenue = effectiveSales.filter(s => s.targetGroup === "FACTORY").reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);

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
    className: "flex flex-col h-screen bg-slate-100/70 dark:bg-[#0f172a] overflow-hidden text-slate-800 dark:text-slate-100 font-sans",
    children: [
      // =========================================================================
      // 1. HEADER: GỌN GÀNG, SANG TRỌNG, THÂN THIỆN TRÊN MỌI THIẾT BỊ
      // =========================================================================
      c.jsxs("header", {
        className: "bg-slate-900 border-b border-slate-800 text-white px-3 sm:px-5 py-2.5 shadow-md shrink-0 flex items-center justify-between z-20",
        children: [
          // Left: Nút quay lại & Tiêu đề
          c.jsxs("div", {
            className: "flex items-center gap-2 sm:gap-3 min-w-0",
            children: [
              c.jsx("button", {
                type: "button",
                onClick: () => setRoute(re.DASHBOARD),
                className: "p-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer shrink-0",
                title: "Quay về trang chính",
                children: c.jsx(On, { size: 18 })
              }),
              c.jsxs("div", {
                className: "min-w-0",
                children: [
                  c.jsxs("h1", {
                    className: "text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5 truncate",
                    children: [
                      c.jsx("span", { className: "text-base sm:text-lg", children: "💰" }),
                      c.jsx("span", { children: "Quản Lý Tài Chính" })
                    ]
                  }),
                  c.jsx("p", {
                    className: "text-[10px] text-emerald-400 font-semibold truncate hidden sm:block",
                    children: "Tự Doanh 100% • Đối Soát Dòng Tiền & Lợi Nhuận"
                  })
                ]
              })
            ]
          }),

          // Right: Action buttons (Thu - Chi, Đồng bộ, Lịch sử, Cài đặt)
          c.jsxs("div", {
            className: "flex items-center gap-1.5 sm:gap-2 shrink-0",
            children: [
              // 1. Nút Thu - Chi nổi bật
              c.jsxs("button", {
                type: "button",
                onClick: () => handleOpenAddThuChi("EXPENSE"),
                className: "px-3 py-1.5 sm:px-3.5 sm:py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer whitespace-nowrap",
                title: "Ghi chép nhanh khoản thu hoặc khoản chi",
                children: [
                  c.jsx("span", { className: "text-sm", children: "➕" }),
                  c.jsx("span", { children: "Thu - Chi" })
                ]
              }),

              // 2. Nút Đồng bộ
              c.jsxs("button", {
                type: "button",
                onClick: handleSyncFinance,
                className: "p-2 sm:px-2.5 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer flex items-center gap-1",
                title: "Đồng bộ số liệu từ Phiếu cân và Xuất bán",
                children: [
                  c.jsx("span", { className: "text-sm", children: "🔄" }),
                  c.jsx("span", { className: "hidden md:inline text-[11px]", children: "Đồng bộ" })
                ]
              }),

              // 3. Nút Lịch sử chuyến
              c.jsxs("button", {
                type: "button",
                onClick: () => setShowSavedTripsModal(true),
                className: "p-2 sm:px-2.5 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer flex items-center gap-1",
                title: "Xem lịch sử các chuyến đã lưu",
                children: [
                  c.jsx(Fd, { size: 16 }),
                  c.jsxs("span", { className: "hidden sm:inline text-[11px]", children: ["Lịch Sử (", (financeData.savedTrips || []).length, ")"] })
                ]
              }),

              // 4. Nút Thiết lập
              c.jsx("button", {
                type: "button",
                onClick: () => setShowTripSettingsModal(true),
                className: "p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer active:scale-95",
                title: "Thiết lập kỳ thu mua",
                children: c.jsx(ym, { size: 17 })
              })
            ]
          })
        ]
      }),

      // =========================================================================
      // 2. MAIN SCROLL VIEW WITH OPTIMIZED LAYOUT
      // =========================================================================
      c.jsx("div", {
        className: "flex-1 overflow-y-auto p-3 sm:p-5 max-w-4xl mx-auto w-full pb-24 space-y-3.5 sm:space-y-4",
        children: c.jsxs("div", {
          className: "space-y-3.5 sm:space-y-4",
          children: [
            // =====================================================================
            // BANNER KỲ THU MUA: TINH GIẢN, HIỆN ĐẠI, KHÔNG RƯỜM RÀ
            // =====================================================================
            c.jsxs("div", {
              className: "bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-xs space-y-2.5",
              children: [
                c.jsxs("div", {
                  className: "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2",
                  children: [
                    // Tên chuyến & badge
                    c.jsxs("div", {
                      className: "flex items-center gap-2 flex-1 min-w-0 w-full sm:w-auto",
                      children: [
                        c.jsx("span", { className: "text-lg shrink-0", children: "🚢" }),
                        c.jsx("input", {
                          type: "text",
                          value: tripName,
                          onChange: e => {
                            setTripName(e.target.value);
                            updateActiveTrip({ name: e.target.value });
                          },
                          placeholder: "Tên kỳ thu mua...",
                          className: "font-black text-sm sm:text-base text-slate-900 dark:text-white bg-transparent outline-none w-full border-b border-transparent focus:border-emerald-500 pb-0.5 transition-colors"
                        })
                      ]
                    }),

                    // Ngày & chế độ lọc
                    c.jsxs("div", {
                      className: "flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end shrink-0",
                      children: [
                        c.jsx("input", {
                          type: "date",
                          value: tripDate,
                          onChange: e => {
                            setTripDate(e.target.value);
                            updateActiveTrip({ startDate: e.target.value });
                          },
                          className: "px-2.5 py-1 bg-slate-100 dark:bg-slate-800 font-bold rounded-lg text-xs outline-none border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                        }),
                        c.jsx("button", {
                          type: "button",
                          onClick: () => {
                            const newMode = filterMode === "DATE" ? "ALL" : "DATE";
                            setFilterMode(newMode);
                            updateActiveTrip({ filterMode: newMode });
                          },
                          className: "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer " + (filterMode === "ALL" ? "bg-teal-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300"),
                          children: filterMode === "ALL" ? "Tất cả phiếu" : "Theo ngày"
                        })
                      ]
                    })
                  ]
                }),

                // Ghi chú chuyến
                c.jsxs("div", {
                  className: "flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500",
                  children: [
                    c.jsx("span", { children: "📝" }),
                    c.jsx("input", {
                      type: "text",
                      value: tripNote,
                      onChange: e => {
                        setTripNote(e.target.value);
                        updateActiveTrip({ note: e.target.value });
                      },
                      placeholder: "Ghi chú chuyến hàng (ví dụ: Chuyến xe 69C, ao Chú Năm, giao chợ đầu mối...)",
                      className: "w-full bg-transparent outline-none text-slate-700 dark:text-slate-300 placeholder-slate-400 text-xs"
                    })
                  ]
                })
              ]
            }),

            // =====================================================================
            // THANH ĐIỀU HƯỚNG PHÂN ĐOẠN (SEGMENTED CONTROL TABS)
            // =====================================================================
            c.jsxs("div", {
              className: "grid grid-cols-3 p-1 bg-slate-200/80 dark:bg-slate-800/90 rounded-2xl gap-1 text-xs font-black",
              children: [
                c.jsxs("button", {
                  type: "button",
                  onClick: () => setActiveSubTab("OVERVIEW"),
                  className: "py-2 sm:py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer " + (activeSubTab === "OVERVIEW" ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"),
                  children: [
                    c.jsx("span", { children: "📊" }),
                    c.jsx("span", { className: "truncate", children: "Tổng Quan" })
                  ]
                }),
                c.jsxs("button", {
                  type: "button",
                  onClick: () => setActiveSubTab("EXPENSES"),
                  className: "py-2 sm:py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer " + (activeSubTab === "EXPENSES" ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"),
                  children: [
                    c.jsx("span", { children: "💵" }),
                    c.jsxs("span", { className: "truncate", children: ["Sổ Thu - Chi", allTransactions.length > 0 ? " (" + allTransactions.length + ")" : ""] })
                  ]
                }),
                c.jsxs("button", {
                  type: "button",
                  onClick: () => setActiveSubTab("RECONCILE"),
                  className: "py-2 sm:py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer " + (activeSubTab === "RECONCILE" ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"),
                  children: [
                    c.jsx("span", { children: "⚖️" }),
                    c.jsx("span", { className: "truncate", children: "Đối Chiếu Tôm" })
                  ]
                })
              ]
            }),

            // =====================================================================
            // SUB-TAB 1: TỔNG QUAN & QUYẾT TOÁN TÀI CHÍNH
            // =====================================================================
            activeSubTab === "OVERVIEW" && c.jsxs("div", {
              className: "space-y-3.5 sm:space-y-4",
              children: [
                // 1. Thẻ Hero Lợi Nhuận Ròng Thượng Hạng
                c.jsxs("div", {
                  className: "p-4 sm:p-5 rounded-3xl shadow-sm border relative overflow-hidden transition-all " + (isProfit ? "bg-gradient-to-br from-emerald-900/90 via-teal-900 to-slate-900 text-white border-emerald-700/50" : "bg-gradient-to-br from-rose-950 via-red-900 to-slate-900 text-white border-rose-700/50"),
                  children: [
                    // Badge trên cùng
                    c.jsxs("div", {
                      className: "flex justify-between items-center mb-2",
                      children: [
                        c.jsxs("span", {
                          className: "text-[11px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5",
                          children: [
                            c.jsx("span", { children: isProfit ? "✨" : "⚠️" }),
                            "Lợi Nhuận Ròng Thực Thu (Tự Doanh 100%)"
                          ]
                        }),
                        c.jsx("span", {
                          className: "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase " + (isProfit ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-red-500/20 text-red-300 border border-red-500/40"),
                          children: isProfit ? ("CÓ LÃI +" + profitMarginPercent.toFixed(1) + "%") : ("BỊ LỖ " + profitMarginPercent.toFixed(1) + "%")
                        })
                      ]
                    }),

                    // Số tiền trung tâm
                    c.jsxs("div", {
                      className: "my-2",
                      children: [
                        c.jsxs("div", {
                          className: "text-3xl sm:text-4xl font-black font-mono tracking-tight flex items-baseline gap-1.5 " + (isProfit ? "text-emerald-400" : "text-rose-400"),
                          children: [
                            (isProfit ? "+" : "") + _fmt(netProfit),
                            c.jsx("span", { className: "text-base font-sans font-bold text-slate-300", children: "VNĐ" })
                          ]
                        }),
                        c.jsx("span", {
                          className: "text-xs font-semibold text-slate-300/80 block mt-0.5 italic",
                          children: _readVietnameseMoney(Math.abs(netProfit)) ? ("(" + (isProfit ? "Lãi " : "Lỗ ") + _readVietnameseMoney(Math.abs(netProfit)) + ")") : ""
                        })
                      ]
                    }),

                    // 2 cột đối ứng Doanh Thu vs Chi Phí
                    c.jsxs("div", {
                      className: "grid grid-cols-2 gap-2.5 pt-3 mt-3 border-t border-white/10 text-xs",
                      children: [
                        c.jsxs("div", {
                          className: "bg-white/5 rounded-2xl p-2.5 space-y-1",
                          children: [
                            c.jsxs("div", {
                              className: "flex justify-between items-center text-[10px] font-bold text-slate-300 uppercase",
                              children: [
                                c.jsx("span", { children: "📈 Tổng Doanh Thu" }),
                                c.jsx("span", { className: "text-emerald-300", children: effectiveSales.length + " đơn" })
                              ]
                            }),
                            c.jsxs("div", {
                              className: "font-mono font-black text-base text-emerald-300",
                              children: [_fmt(totalRevenue), " đ"]
                            }),
                            c.jsxs("div", {
                              className: "text-[10px] text-slate-400 font-medium flex justify-between",
                              children: [
                                c.jsxs("span", { children: ["Xuất: ", _fmtKg(autoRevenueKg), " kg"] }),
                                totalExtraIncome > 0 ? c.jsxs("span", { className: "text-emerald-400", children: ["+ ", _fmt(totalExtraIncome)] }) : null
                              ]
                            })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "bg-white/5 rounded-2xl p-2.5 space-y-1",
                          children: [
                            c.jsxs("div", {
                              className: "flex justify-between items-center text-[10px] font-bold text-slate-300 uppercase",
                              children: [
                                c.jsx("span", { children: "📉 Tổng Chi Phí" }),
                                c.jsx("span", { className: "text-orange-300", children: (effectiveSessions.length + operatingExpenses.length) + " mục" })
                              ]
                            }),
                            c.jsxs("div", {
                              className: "font-mono font-black text-base text-orange-300",
                              children: [_fmt(totalExpenses), " đ"]
                            }),
                            c.jsxs("div", {
                              className: "text-[10px] text-slate-400 font-medium flex justify-between",
                              children: [
                                c.jsxs("span", { children: ["Mua tôm: ", _fmt(shrimpPurchaseMoney)] }),
                                totalOperationExpenses > 0 ? c.jsxs("span", { className: "text-orange-400", children: ["Phí: ", _fmt(totalOperationExpenses)] }) : null
                              ]
                            })
                          ]
                        })
                      ]
                    }),

                    // Dòng tóm tắt sản lượng & hao hụt
                    c.jsxs("div", {
                      className: "flex justify-between items-center pt-2.5 mt-2.5 border-t border-white/10 text-[11px] text-slate-300 font-bold",
                      children: [
                        c.jsxs("span", {
                          children: [
                            "Mua bờ ao: ",
                            c.jsx("b", { className: "text-white font-mono", children: _fmtKg(autoShrimpPurchaseKg) + " kg" }),
                            " ➔ Xuất: ",
                            c.jsx("b", { className: "text-white font-mono", children: _fmtKg(autoRevenueKg) + " kg" })
                          ]
                        }),
                        c.jsxs("span", {
                          className: weightDiff > 0 ? "text-amber-300" : "text-emerald-300",
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

                // 2. Thanh Tác Vụ Nhanh (3 Nút to, trực quan, thân thiện)
                c.jsxs("div", {
                  className: "grid grid-cols-2 sm:grid-cols-3 gap-2",
                  children: [
                    c.jsxs("button", {
                      type: "button",
                      onClick: () => handleOpenAddThuChi("EXPENSE"),
                      className: "p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-500 rounded-2xl font-black text-xs text-orange-600 dark:text-orange-400 flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer",
                      children: [
                        c.jsx("span", { className: "text-base", children: "➖" }),
                        c.jsx("span", { children: "Ghi Khoản Chi" })
                      ]
                    }),
                    c.jsxs("button", {
                      type: "button",
                      onClick: () => handleOpenAddThuChi("INCOME"),
                      className: "p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 rounded-2xl font-black text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer",
                      children: [
                        c.jsx("span", { className: "text-base", children: "➕" }),
                        c.jsx("span", { children: "Ghi Khoản Thu" })
                      ]
                    }),
                    c.jsxs("button", {
                      type: "button",
                      onClick: handleSyncFinance,
                      className: "col-span-2 sm:col-span-1 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500 rounded-2xl font-black text-xs text-teal-600 dark:text-teal-400 flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer",
                      children: [
                        c.jsx("span", { className: "text-base", children: "🔄" }),
                        c.jsx("span", { children: "Đồng Bộ Số Liệu" })
                      ]
                    })
                  ]
                }),

                // 3. Bảng Chi Tiết Đối Soát Dòng Tiền (Thanh lịch & chuẩn xác)
                c.jsxs("div", {
                  className: "bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3",
                  children: [
                    c.jsxs("div", {
                      className: "flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2.5",
                      children: [
                        c.jsxs("div", {
                          children: [
                            c.jsx("h2", {
                              className: "text-xs sm:text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5",
                              children: [c.jsx("span", { children: "📋" }), "Bảng Đối Soát Quyết Toán Chuyến"]
                            }),
                            c.jsx("p", { className: "text-[10px] text-slate-500 font-semibold", children: "Chi tiết toàn bộ các dòng tiền ra và vào trong chuyến đi" })
                          ]
                        }),
                        c.jsx("button", {
                          type: "button",
                          onClick: () => setActiveSubTab("RECONCILE"),
                          className: "text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer",
                          children: "Chi tiết tôm ➔"
                        })
                      ]
                    }),

                    // Table
                    c.jsx("div", {
                      className: "overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800",
                      children: c.jsxs("table", {
                        className: "w-full text-left text-xs border-collapse",
                        children: [
                          c.jsx("thead", {
                            className: "bg-slate-50 dark:bg-slate-800/80 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700",
                            children: c.jsxs("tr", {
                              children: [
                                c.jsx("th", { className: "p-3", children: "Khoản Mục" }),
                                c.jsx("th", { className: "p-3 text-right", children: "Số Tiền" }),
                                c.jsx("th", { className: "p-3 hidden sm:table-cell", children: "Ghi Chú" })
                              ]
                            })
                          }),
                          c.jsxs("tbody", {
                            className: "divide-y divide-slate-100 dark:divide-slate-800 font-bold",
                            children: [
                              // Row 1: Doanh thu xuất bán tôm
                              c.jsxs("tr", {
                                className: "hover:bg-slate-50 dark:hover:bg-slate-800/40",
                                children: [
                                  c.jsxs("td", { className: "p-3", children: [c.jsx("span", { className: "text-emerald-600 font-black", children: "(+) Doanh thu xuất bán tôm" }), c.jsxs("span", { className: "block text-[10px] text-slate-400 font-normal", children: [effectiveSales.length, " đơn xuất bán • ", _fmtKg(autoRevenueKg), " kg"] })] }),
                                  c.jsxs("td", { className: "p-3 text-right font-mono font-black text-emerald-600", children: ["+ ", _fmt(baseRevenue), " đ"] }),
                                  c.jsx("td", { className: "p-3 text-slate-500 text-[11px] hidden sm:table-cell", children: "Tiền bán tôm thu về" })
                                ]
                              }),
                              // Row 2: Khoản thu ngoài
                              totalExtraIncome > 0 && c.jsxs("tr", {
                                className: "hover:bg-slate-50 dark:hover:bg-slate-800/40",
                                children: [
                                  c.jsxs("td", { className: "p-3", children: [c.jsx("span", { className: "text-emerald-600 font-black", children: "(+) Khoản thu phát sinh khác" }), c.jsxs("span", { className: "block text-[10px] text-slate-400 font-normal", children: [extraIncomes.length, " khoản thu ngoài"] })] }),
                                  c.jsxs("td", { className: "p-3 text-right font-mono font-black text-emerald-600", children: ["+ ", _fmt(totalExtraIncome), " đ"] }),
                                  c.jsx("td", { className: "p-3 text-slate-500 text-[11px] hidden sm:table-cell", children: "Thu nợ, cọc hoàn, thưởng..." })
                                ]
                              }),
                              // Row 3: Tiền mua tôm
                              c.jsxs("tr", {
                                className: "hover:bg-slate-50 dark:hover:bg-slate-800/40",
                                children: [
                                  c.jsxs("td", { className: "p-3", children: [c.jsx("span", { className: "text-orange-600 font-black", children: "(-) Tiền mua tôm bờ ao" }), c.jsxs("span", { className: "block text-[10px] text-slate-400 font-normal", children: [effectiveSessions.length, " phiếu cân • ", _fmtKg(autoShrimpPurchaseKg), " kg"] })] }),
                                  c.jsxs("td", { className: "p-3 text-right font-mono font-black text-orange-600", children: ["- ", _fmt(shrimpPurchaseMoney), " đ"] }),
                                  c.jsx("td", { className: "p-3 text-slate-500 text-[11px] hidden sm:table-cell", children: "Chi trả tiền tôm cho chủ ao" })
                                ]
                              }),
                              // Row 4: Chi phí vận hành
                              c.jsxs("tr", {
                                className: "hover:bg-slate-50 dark:hover:bg-slate-800/40",
                                children: [
                                  c.jsxs("td", { className: "p-3", children: [c.jsx("span", { className: "text-orange-600 font-black", children: "(-) Chi phí vận hành chuyến" }), c.jsxs("span", { className: "block text-[10px] text-slate-400 font-normal", children: [operatingExpenses.length, " khoản chi (xe, công, oxy, phà...)"] })] }),
                                  c.jsxs("td", { className: "p-3 text-right font-mono font-black text-orange-600", children: ["- ", _fmt(totalOperationExpenses), " đ"] }),
                                  c.jsx("td", { className: "p-3 text-slate-500 text-[11px] hidden sm:table-cell", children: "Chi phí nhân sự & vận chuyển" })
                                ]
                              }),
                              // Row 5: Lợi nhuận ròng
                              c.jsxs("tr", {
                                className: "bg-slate-50 dark:bg-slate-800 font-black text-xs border-t-2 border-slate-300 dark:border-slate-700",
                                children: [
                                  c.jsxs("td", { className: "p-3", children: [c.jsx("span", { className: "text-slate-900 dark:text-white uppercase", children: "🏆 LỢI NHUẬN RÒNG (LÃI THU VỀ)" }), c.jsx("span", { className: "block text-[10px] text-slate-500 font-normal", children: "Tổng Thu nhập trừ Toàn bộ Chi phí" })] }),
                                  c.jsxs("td", { className: "p-3 text-right font-mono text-sm sm:text-base " + (isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"), children: [(isProfit ? "+" : "") + _fmt(netProfit), " đ"] }),
                                  c.jsx("td", { className: "p-3 text-slate-700 dark:text-slate-300 text-[11px] hidden sm:table-cell", children: isProfit ? "Thu trọn về túi" : "Thâm hụt vốn" })
                                ]
                              })
                            ]
                          })
                        ]
                      })
                    }),

                    // Nút Khóa Chuyến To & Rõ ràng
                    c.jsx("div", {
                      className: "pt-2",
                      children: c.jsxs("button", {
                        type: "button",
                        onClick: handleSettleAndArchiveTrip,
                        className: "w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black rounded-2xl text-xs sm:text-sm uppercase flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer",
                        children: [
                          c.jsx("span", { className: "text-lg", children: "🔒" }),
                          "Khóa & Lưu Chuyến Vào Lịch Sử"
                        ]
                      })
                    })
                  ]
                })
              ]
            }),

            // =====================================================================
            // SUB-TAB 2: SỔ THU - CHI (KHOẢN CHI & KHOẢN THU PHÁT SINH)
            // =====================================================================
            activeSubTab === "EXPENSES" && c.jsxs("div", {
              className: "space-y-3.5 sm:space-y-4",
              children: [
                // 1. Thẻ tóm tắt dòng tiền vận hành
                c.jsxs("div", {
                  className: "grid grid-cols-2 sm:grid-cols-3 gap-2.5",
                  children: [
                    c.jsxs("div", {
                      className: "bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs",
                      children: [
                        c.jsx("span", { className: "text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase block", children: "Tổng Chi Vận Hành" }),
                        c.jsxs("div", { className: "font-mono font-black text-lg text-orange-600 dark:text-orange-400", children: ["- ", _fmt(totalOperationExpenses), " đ"] }),
                        c.jsxs("span", { className: "text-[10px] text-slate-400", children: [operatingExpenses.length, " khoản chi"] })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs",
                      children: [
                        c.jsx("span", { className: "text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block", children: "Tổng Khoản Thu Ngoài" }),
                        c.jsxs("div", { className: "font-mono font-black text-lg text-emerald-600 dark:text-emerald-400", children: ["+ ", _fmt(totalExtraIncome), " đ"] }),
                        c.jsxs("span", { className: "text-[10px] text-slate-400", children: [extraIncomes.length, " khoản thu"] })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "col-span-2 sm:col-span-1 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs",
                      children: [
                        c.jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase block", children: "Chênh Lệch Thu - Chi" }),
                        c.jsxs("div", { className: "font-mono font-black text-lg " + (totalExtraIncome >= totalOperationExpenses ? "text-emerald-600" : "text-orange-600"), children: [(totalExtraIncome >= totalOperationExpenses ? "+ " : "- ") + _fmt(Math.abs(totalExtraIncome - totalOperationExpenses)), " đ"] }),
                        c.jsx("span", { className: "text-[10px] text-slate-400", children: "Dòng tiền phụ" })
                      ]
                    })
                  ]
                }),

                // 2. Thanh thêm nhanh & Tìm kiếm & Bộ lọc
                c.jsxs("div", {
                  className: "bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3",
                  children: [
                    // Hàng nút thêm nhanh
                    c.jsxs("div", {
                      className: "flex gap-2",
                      children: [
                        c.jsxs("button", {
                          type: "button",
                          onClick: () => handleOpenAddThuChi("EXPENSE"),
                          className: "flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer",
                          children: [c.jsx("span", { className: "text-base", children: "➖" }), "Thêm Khoản Chi"]
                        }),
                        c.jsxs("button", {
                          type: "button",
                          onClick: () => handleOpenAddThuChi("INCOME"),
                          className: "flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer",
                          children: [c.jsx("span", { className: "text-base", children: "➕" }), "Thêm Khoản Thu"]
                        })
                      ]
                    }),

                    // Ô tìm kiếm & Bộ lọc
                    c.jsxs("div", {
                      className: "flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center pt-2 border-t border-slate-100 dark:border-slate-800",
                      children: [
                        // Filter buttons
                        c.jsxs("div", {
                          className: "flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold shrink-0",
                          children: [
                            c.jsxs("button", {
                              type: "button",
                              onClick: () => setThuChiFilterTab("ALL"),
                              className: "px-2.5 py-1 rounded-lg transition-all " + (thuChiFilterTab === "ALL" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black" : "text-slate-500 hover:text-slate-800"),
                              children: ["Tất cả (", allTransactions.length, ")"]
                            }),
                            c.jsxs("button", {
                              type: "button",
                              onClick: () => setThuChiFilterTab("EXPENSE"),
                              className: "px-2.5 py-1 rounded-lg transition-all " + (thuChiFilterTab === "EXPENSE" ? "bg-orange-600 text-white shadow-xs font-black" : "text-orange-600 hover:text-orange-700"),
                              children: ["Chi (", operatingExpenses.length, ")"]
                            }),
                            c.jsxs("button", {
                              type: "button",
                              onClick: () => setThuChiFilterTab("INCOME"),
                              className: "px-2.5 py-1 rounded-lg transition-all " + (thuChiFilterTab === "INCOME" ? "bg-emerald-600 text-white shadow-xs font-black" : "text-emerald-600 hover:text-emerald-700"),
                              children: ["Thu (", extraIncomes.length, ")"]
                            })
                          ]
                        }),

                        // Search box
                        c.jsxs("div", {
                          className: "flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl flex-1 max-w-xs",
                          children: [
                            c.jsx("span", { className: "text-slate-400 text-xs", children: "🔍" }),
                            c.jsx("input", {
                              type: "text",
                              value: thuChiSearchQuery,
                              onChange: e => setThuChiSearchQuery(e.target.value),
                              placeholder: "Tìm khoản chi, người nhận...",
                              className: "bg-transparent text-xs outline-none w-full text-slate-800 dark:text-slate-200 placeholder-slate-400"
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
                    })
                  ]
                }),

                // 3. Danh sách các giao dịch Thu - Chi
                displayedTransactions.length === 0 ? c.jsxs("div", {
                  className: "p-8 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3",
                  children: [
                    c.jsx("span", { className: "text-3xl block", children: "📝" }),
                    c.jsx("p", { className: "font-bold text-xs text-slate-500", children: "Chưa có khoản thu hoặc chi nào trong mục này." }),
                    c.jsxs("div", {
                      className: "flex justify-center gap-2 pt-2",
                      children: [
                        c.jsx("button", {
                          type: "button",
                          onClick: () => handleOpenAddThuChi("EXPENSE"),
                          className: "px-3 py-1.5 bg-orange-600 text-white rounded-xl text-xs font-bold cursor-pointer",
                          children: "Ghi Khoản Chi"
                        }),
                        c.jsx("button", {
                          type: "button",
                          onClick: () => handleOpenAddThuChi("INCOME"),
                          className: "px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer",
                          children: "Ghi Khoản Thu"
                        })
                      ]
                    })
                  ]
                }) : c.jsx("div", {
                  className: "space-y-2",
                  children: displayedTransactions.map(tx => {
                    const isIncome = tx.type === "INCOME";
                    return c.jsxs("div", {
                      key: tx.id,
                      className: "p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-3 text-xs shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all",
                      children: [
                        c.jsxs("div", {
                          className: "flex items-center gap-3 min-w-0",
                          children: [
                            c.jsx("div", {
                              className: "w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 " + (isIncome ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600" : "bg-orange-100 dark:bg-orange-950/60 text-orange-600"),
                              children: isIncome ? "➕" : "➖"
                            }),
                            c.jsxs("div", {
                              className: "min-w-0 space-y-0.5",
                              children: [
                                c.jsxs("div", {
                                  className: "font-black text-slate-900 dark:text-white flex items-center gap-1.5 truncate",
                                  children: [
                                    c.jsx("span", {
                                      className: "text-[9px] font-black uppercase px-1.5 py-0.2 rounded " + (isIncome ? "bg-emerald-600 text-white" : "bg-orange-600 text-white"),
                                      children: isIncome ? "THU" : "CHI"
                                    }),
                                    c.jsx("span", { className: "truncate", children: tx.category })
                                  ]
                                }),
                                (tx.person || tx.note) ? c.jsxs("div", {
                                  className: "text-[10px] text-slate-500 truncate",
                                  children: [
                                    tx.person ? ("👤 " + tx.person + (tx.note ? " • " : "")) : "",
                                    tx.note ? ("📝 " + tx.note) : ""
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
                              className: "font-mono font-black text-sm " + (isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"),
                              children: [(isIncome ? "+ " : "- ") + _fmt(tx.amount), " đ"]
                            }),
                            c.jsx("button", {
                              type: "button",
                              onClick: () => handleOpenEditThuChi(tx),
                              className: "p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg cursor-pointer",
                              title: "Chỉnh sửa",
                              children: c.jsx("span", { children: "✎" })
                            }),
                            c.jsx("button", {
                              type: "button",
                              onClick: () => handleDeleteThuChi(tx.id),
                              className: "p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer",
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
            // SUB-TAB 3: ĐỐI CHIẾU SẢN LƯỢNG TÔM (MUA VÀO VS XUẤT BÁN)
            // =====================================================================
            activeSubTab === "RECONCILE" && c.jsxs("div", {
              className: "space-y-3.5 sm:space-y-4",
              children: [
                // 1. Khối phân tích hao hụt & giá bình quân
                c.jsxs("div", {
                  className: "bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3",
                  children: [
                    c.jsxs("div", {
                      className: "flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2.5",
                      children: [
                        c.jsxs("div", {
                          children: [
                            c.jsx("h2", { className: "text-xs sm:text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5", children: [c.jsx("span", { children: "⚖️" }), "Đối Chiếu Khối Lượng & Giá Bình Quân"] }),
                            c.jsx("p", { className: "text-[10px] text-slate-500 font-semibold", children: "Kiểm tra độ hao hụt khi vận chuyển và mức lãi gộp chênh lệch giá" })
                          ]
                        }),
                        c.jsx("span", {
                          className: "px-2 py-0.5 rounded-full text-[10px] font-black uppercase " + (weightDiff <= 0 ? "bg-emerald-100 text-emerald-800" : (weightDiffPercent < 3 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800")),
                          children: weightDiff <= 0 ? "KHÔNG HAO HỤT" : ("HAO HỤT " + weightDiffPercent.toFixed(1) + "%")
                        })
                      ]
                    }),

                    c.jsxs("div", {
                      className: "grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs",
                      children: [
                        c.jsxs("div", {
                          className: "p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800",
                          children: [
                            c.jsx("span", { className: "text-[10px] font-bold text-slate-400 uppercase block", children: "Tổng Mua Vào" }),
                            c.jsxs("div", { className: "font-mono font-black text-base text-orange-600 dark:text-orange-400", children: [_fmtKg(autoShrimpPurchaseKg), " kg"] }),
                            c.jsxs("span", { className: "text-[10px] text-slate-500", children: ["TB: ", _fmt(Math.round(avgPurchasePrice)), " đ/kg"] })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800",
                          children: [
                            c.jsx("span", { className: "text-[10px] font-bold text-slate-400 uppercase block", children: "Tổng Xuất Bán" }),
                            c.jsxs("div", { className: "font-mono font-black text-base text-emerald-600 dark:text-emerald-400", children: [_fmtKg(autoRevenueKg), " kg"] }),
                            c.jsxs("span", { className: "text-[10px] text-slate-500", children: ["TB: ", _fmt(Math.round(avgSalePrice)), " đ/kg"] })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800",
                          children: [
                            c.jsx("span", { className: "text-[10px] font-bold text-slate-400 uppercase block", children: "Hao Hụt Vận Chuyển" }),
                            c.jsxs("div", { className: "font-mono font-black text-base " + (weightDiff > 0 ? "text-amber-600" : "text-emerald-600"), children: [(weightDiff > 0 ? "-" : "+") + _fmtKg(Math.abs(weightDiff)), " kg"] }),
                            c.jsxs("span", { className: "text-[10px] text-slate-500", children: ["Tỷ lệ: ", weightDiffPercent.toFixed(1), "%"] })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800",
                          children: [
                            c.jsx("span", { className: "text-[10px] font-bold text-slate-400 uppercase block", children: "Chênh Lệch Giá Bán-Mua" }),
                            c.jsxs("div", { className: "font-mono font-black text-base " + (grossProfitPerKg >= 0 ? "text-emerald-600" : "text-red-600"), children: [(grossProfitPerKg >= 0 ? "+" : "") + _fmt(Math.round(grossProfitPerKg)), " đ/kg"] }),
                            c.jsx("span", { className: "text-[10px] text-slate-500", children: "Lãi gộp trên 1kg" })
                          ]
                        })
                      ]
                    })
                  ]
                }),

                // 2. Nguồn mua tôm tại ao
                c.jsxs("div", {
                  className: "bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3",
                  children: [
                    c.jsxs("div", {
                      className: "flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2.5",
                      children: [
                        c.jsxs("div", {
                          children: [
                            c.jsx("h2", { className: "text-xs sm:text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5", children: [c.jsx("span", { children: "🦐" }), "Nguồn Mua Tôm Tại Bờ Ao"] }),
                            c.jsx("p", { className: "text-[10px] text-slate-500 font-semibold", children: "Tự động liên kết các phiếu cân tôm trong ngày hoặc nhập tay" })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "flex items-center gap-1.5",
                          children: [
                            c.jsx("button", {
                              type: "button",
                              onClick: () => setShowSessionsModal(true),
                              className: "px-2.5 py-1 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 rounded-xl text-[10px] font-bold hover:bg-orange-100 cursor-pointer",
                              children: "Chọn phiếu (" + effectiveSessions.length + ")"
                            }),
                            c.jsx("button", {
                              type: "button",
                              onClick: () => updateActiveTrip({ shrimpPurchaseAuto: !isShrimpAuto }),
                              className: "px-2 py-1 rounded-xl text-[10px] font-bold " + (isShrimpAuto ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700"),
                              children: isShrimpAuto ? "Tự động" : "Nhập tay"
                            })
                          ]
                        })
                      ]
                    }),

                    isShrimpAuto ? c.jsxs("div", {
                      className: "p-3.5 bg-orange-50/70 dark:bg-orange-950/20 rounded-2xl border border-orange-200 dark:border-orange-900/60 flex justify-between items-center",
                      children: [
                        c.jsxs("div", {
                          children: [
                            c.jsx("span", { className: "font-black text-xs uppercase text-orange-900 dark:text-orange-200 block", children: "Tổng Tiền Mua Tôm Theo Phiếu Cân" }),
                            c.jsxs("span", { className: "text-[10px] text-slate-500", children: [effectiveSessions.length, " phiếu cân • ", _fmtKg(autoShrimpPurchaseKg), " kg tôm"] })
                          ]
                        }),
                        c.jsxs("span", { className: "text-xl sm:text-2xl font-black font-mono text-orange-600 dark:text-orange-400", children: [_fmt(shrimpPurchaseMoney), " đ"] })
                      ]
                    }) : c.jsxs("div", {
                      className: "p-3.5 bg-orange-50/70 dark:bg-orange-950/20 rounded-2xl border border-orange-200 dark:border-orange-900/60 space-y-1",
                      children: [
                        c.jsx("label", { className: "text-[10px] font-bold text-slate-500 uppercase", children: "Nhập số tiền mua tôm thủ công (VNĐ):" }),
                        c.jsx("input", {
                          type: "number",
                          value: trip.shrimpPurchaseManualAmount || "",
                          onChange: e => updateActiveTrip({ shrimpPurchaseManualAmount: Number(e.target.value) || 0 }),
                          placeholder: "VD: 85000000",
                          className: "w-full p-2.5 bg-white dark:bg-slate-800 border border-orange-300 dark:border-orange-800 rounded-xl font-black font-mono text-sm outline-none text-orange-600"
                        })
                      ]
                    })
                  ]
                }),

                // 3. Nguồn xuất bán tôm
                c.jsxs("div", {
                  className: "bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3",
                  children: [
                    c.jsxs("div", {
                      className: "flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2.5",
                      children: [
                        c.jsxs("div", {
                          children: [
                            c.jsx("h2", { className: "text-xs sm:text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5", children: [c.jsx("span", { children: "🛒" }), "Nguồn Doanh Thu Xuất Bán Tôm"] }),
                            c.jsx("p", { className: "text-[10px] text-slate-500 font-semibold", children: "Tự động liên kết các đơn bán lẻ, chợ đầu mối và công ty" })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "flex items-center gap-1.5",
                          children: [
                            c.jsx("button", {
                              type: "button",
                              onClick: () => setShowSalesModal(true),
                              className: "px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-[10px] font-bold hover:bg-emerald-100 cursor-pointer",
                              children: "Chọn đơn (" + effectiveSales.length + ")"
                            }),
                            c.jsx("button", {
                              type: "button",
                              onClick: () => updateActiveTrip({ revenueAuto: !isRevenueAuto }),
                              className: "px-2 py-1 rounded-xl text-[10px] font-bold " + (isRevenueAuto ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700"),
                              children: isRevenueAuto ? "Tự động" : "Nhập tay"
                            })
                          ]
                        })
                      ]
                    }),

                    isRevenueAuto ? c.jsxs("div", {
                      className: "p-3.5 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 flex justify-between items-center",
                      children: [
                        c.jsxs("div", {
                          children: [
                            c.jsx("span", { className: "font-black text-xs uppercase text-emerald-900 dark:text-emerald-200 block", children: "Tổng Doanh Thu Xuất Bán Tôm" }),
                            c.jsxs("span", { className: "text-[10px] text-slate-500", children: [effectiveSales.length, " đơn bán • ", _fmtKg(autoRevenueKg), " kg đã xuất"] })
                          ]
                        }),
                        c.jsxs("span", { className: "text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400", children: [_fmt(baseRevenue), " đ"] })
                      ]
                    }) : c.jsxs("div", {
                      className: "p-3.5 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 space-y-1",
                      children: [
                        c.jsx("label", { className: "text-[10px] font-bold text-slate-500 uppercase", children: "Nhập số tiền doanh thu bán tôm thủ công (VNĐ):" }),
                        c.jsx("input", {
                          type: "number",
                          value: trip.revenueManualAmount || "",
                          onChange: e => updateActiveTrip({ revenueManualAmount: Number(e.target.value) || 0 }),
                          placeholder: "VD: 120000000",
                          className: "w-full p-2.5 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-800 rounded-xl font-black font-mono text-sm outline-none text-emerald-600"
                        })
                      ]
                    }),

                    // Phân bổ theo kênh
                    effectiveSales.length > 0 && c.jsxs("div", {
                      className: "grid grid-cols-3 gap-2 text-xs pt-1",
                      children: [
                        c.jsxs("div", {
                          className: "p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 text-center",
                          children: [
                            c.jsx("span", { className: "text-[9px] text-slate-400 font-bold uppercase block", children: "🛒 Bán Lẻ" }),
                            c.jsxs("span", { className: "font-black font-mono text-emerald-600", children: [_fmt(retailRevenue), " đ"] })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 text-center",
                          children: [
                            c.jsx("span", { className: "text-[9px] text-slate-400 font-bold uppercase block", children: "🏪 Đầu Mối" }),
                            c.jsxs("span", { className: "font-black font-mono text-blue-600", children: [_fmt(marketRevenue), " đ"] })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 text-center",
                          children: [
                            c.jsx("span", { className: "text-[9px] text-slate-400 font-bold uppercase block", children: "🏢 Công Ty" }),
                            c.jsxs("span", { className: "font-black font-mono text-purple-600", children: [_fmt(factoryRevenue), " đ"] })
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
      // MODAL 1: GHI NHẬN THU - CHI (HỖ TRỢ CẢ CHI TIỀN VÀ THU TIỀN)
      // =========================================================================
      showThuChiModal && c.jsx("div", {
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-5 sm:p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4 max-h-[95vh] overflow-y-auto",
          children: [
            // Modal Header with Type Selector
            c.jsxs("div", {
              className: "space-y-3",
              children: [
                c.jsxs("div", {
                  className: "flex justify-between items-center",
                  children: [
                    c.jsx("h3", {
                      className: "font-black text-base uppercase text-slate-900 dark:text-white",
                      children: editingThuChiId ? "✎ Chỉnh Sửa Thu - Chi" : "➕ Ghi Nhận Thu - Chi"
                    }),
                    c.jsx("button", {
                      type: "button",
                      onClick: () => setShowThuChiModal(false),
                      className: "p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer",
                      children: c.jsx(_a, { size: 18 })
                    })
                  ]
                }),
                // Tab chọn Loại: CHI TIỀN hay THU TIỀN
                c.jsxs("div", {
                  className: "grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl gap-1 text-xs font-black",
                  children: [
                    c.jsxs("button", {
                      type: "button",
                      onClick: () => {
                        setThuChiType("EXPENSE");
                        if (!editingThuChiId) setThuChiCategory("Tiền thuê xe / vận chuyển");
                      },
                      className: "py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer " + (thuChiType === "EXPENSE" ? "bg-orange-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"),
                      children: [c.jsx("span", { children: "➖" }), "KHOẢN CHI"]
                    }),
                    c.jsxs("button", {
                      type: "button",
                      onClick: () => {
                        setThuChiType("INCOME");
                        if (!editingThuChiId) setThuChiCategory("Thu tiền bán tôm mặt tại ao");
                      },
                      className: "py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer " + (thuChiType === "INCOME" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"),
                      children: [c.jsx("span", { children: "➕" }), "KHOẢN THU"]
                    })
                  ]
                })
              ]
            }),

            // Form Fields
            c.jsxs("div", {
              className: "space-y-3",
              children: [
                // Danh mục
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-[11px] font-bold text-slate-500 mb-1 block uppercase", children: "Danh mục *" }),
                    c.jsx("div", {
                      className: "grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1",
                      children: (thuChiType === "EXPENSE" ? expenseCategories : incomeCategories).map(cat => c.jsxs("button", {
                        key: cat.label,
                        type: "button",
                        onClick: () => setThuChiCategory(cat.label),
                        className: "p-2 rounded-xl text-[11px] font-bold text-left transition-all border " + (thuChiCategory === cat.label ? (thuChiType === "EXPENSE" ? "bg-orange-50 dark:bg-orange-950/40 border-orange-500 text-orange-900 dark:text-orange-200" : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200") : "bg-slate-50 dark:bg-slate-800/60 border-transparent text-slate-700 dark:text-slate-300"),
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
                        c.jsx("label", { className: "text-[11px] font-bold text-slate-500 uppercase", children: "Số tiền (VNĐ) *" }),
                        thuChiAmount && c.jsx("span", { className: "text-[10px] font-bold text-emerald-600 dark:text-emerald-400 italic", children: _readVietnameseMoney(thuChiAmount) })
                      ]
                    }),
                    c.jsx("input", {
                      type: "number",
                      placeholder: "VD: 1500000",
                      value: thuChiAmount,
                      onChange: e => setThuChiAmount(e.target.value),
                      className: "w-full p-3 border-2 border-slate-200 dark:border-slate-700 rounded-2xl bg-transparent font-bold text-xl font-mono outline-none " + (thuChiType === "EXPENSE" ? "focus:border-orange-500 text-orange-600" : "focus:border-emerald-500 text-emerald-600")
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
                        [5000000, "5tr"],
                        [10000000, "10tr"],
                        [20000000, "20tr"]
                      ].map(([val, label]) => c.jsx("button", {
                        key: val,
                        type: "button",
                        onClick: () => setThuChiAmount(String(val)),
                        className: "px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold font-mono text-slate-700 dark:text-slate-300 hover:bg-slate-200",
                        children: label
                      }))
                    })
                  ]
                }),

                // Người nhận / Người nộp
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-[11px] font-bold text-slate-500 mb-1 block uppercase", children: thuChiType === "EXPENSE" ? "Người nhận tiền / Tài xế / Nhân công" : "Người nộp tiền / Khách hàng" }),
                    c.jsx("input", {
                      type: "text",
                      placeholder: thuChiType === "EXPENSE" ? "VD: Anh Ba tài xế xe tải..." : "VD: Chú Bảy mua tôm...",
                      value: thuChiPerson,
                      onChange: e => setThuChiPerson(e.target.value),
                      className: "w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent font-bold text-xs outline-none"
                    })
                  ]
                }),

                // Ghi chú chi tiết
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-[11px] font-bold text-slate-500 mb-1 block uppercase", children: "Ghi chú chi tiết (nếu có)" }),
                    c.jsx("input", {
                      type: "text",
                      placeholder: "VD: Chuyến xe giao chợ Bình Điền...",
                      value: thuChiNote,
                      onChange: e => setThuChiNote(e.target.value),
                      className: "w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent font-bold text-xs outline-none"
                    })
                  ]
                })
              ]
            }),

            // Action Buttons
            c.jsxs("div", {
              className: "flex gap-2 justify-end pt-2 border-t border-slate-100 dark:border-slate-800",
              children: [
                c.jsx("button", {
                  type: "button",
                  onClick: () => setShowThuChiModal(false),
                  className: "px-4 py-2.5 bg-slate-200 dark:bg-slate-800 rounded-xl font-bold text-xs cursor-pointer",
                  children: "Hủy"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: handleSaveThuChi,
                  className: "px-5 py-2.5 rounded-xl font-black text-xs uppercase shadow-md text-white cursor-pointer " + (thuChiType === "EXPENSE" ? "bg-orange-600 hover:bg-orange-700" : "bg-emerald-600 hover:bg-emerald-700"),
                  children: editingThuChiId ? "Cập Nhật" : (thuChiType === "EXPENSE" ? "Lưu Khoản Chi" : "Lưu Khoản Thu")
                })
              ]
            })
          ]
        })
      }),

      // =========================================================================
      // MODAL 2: CHỌN PHIẾU CÂN MUA TÔM ĐÓNG GÓP VÀO CHUYẾN
      // =========================================================================
      showSessionsModal && c.jsx("div", {
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4 max-h-[85vh] flex flex-col",
          children: [
            c.jsxs("div", {
              className: "flex justify-between items-center border-b pb-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("h3", { className: "font-black text-base uppercase text-slate-900 dark:text-white", children: "Chọn Phiếu Mua Tôm Cho Chuyến Này" }),
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
                  className: "text-blue-600 font-bold cursor-pointer",
                  children: "Chọn tất cả"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => updateActiveTrip({ selectedSessionIds: [] }),
                  className: "text-slate-500 font-bold cursor-pointer",
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
                  className: "p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all " + (isChecked ? "bg-orange-50/80 dark:bg-orange-950/40 border-orange-400" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60"),
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
                            c.jsx("span", { className: "font-black text-xs text-slate-900 dark:text-white block", children: sess.farmerName || "Ao tôm" }),
                            c.jsxs("span", { className: "text-[10px] text-slate-500 font-mono", children: [new Date(sess.date).toLocaleDateString("vi-VN"), " • ", _fmtKg(sess.totalNet || sess.totalGross), " kg"] })
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
              className: "pt-2 flex justify-end border-t border-slate-100 dark:border-slate-800",
              children: c.jsx("button", {
                type: "button",
                onClick: () => setShowSessionsModal(false),
                className: "px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs uppercase shadow-md cursor-pointer",
                children: "Xong"
              })
            })
          ]
        })
      }),

      // =========================================================================
      // MODAL 3: CHỌN ĐƠN XUẤT BÁN ĐÓNG GÓP VÀO CHUYẾN
      // =========================================================================
      showSalesModal && c.jsx("div", {
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4 max-h-[85vh] flex flex-col",
          children: [
            c.jsxs("div", {
              className: "flex justify-between items-center border-b pb-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("h3", { className: "font-black text-base uppercase text-slate-900 dark:text-white", children: "Chọn Đơn Xuất Bán Cho Chuyến Này" }),
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
                  className: "text-emerald-600 font-bold cursor-pointer",
                  children: "Chọn tất cả"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => updateActiveTrip({ selectedSaleIds: [] }),
                  className: "text-slate-500 font-bold cursor-pointer",
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
                  className: "p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all " + (isChecked ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60"),
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
                              className: "font-black text-xs text-slate-900 dark:text-white flex items-center gap-1.5",
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
                    c.jsxs("span", { className: "font-mono font-black text-sm text-emerald-800 dark:text-emerald-300", children: [_fmt(sl.totalMoney), " đ"] })
                  ]
                });
              })
            }),
            c.jsx("div", {
              className: "pt-2 flex justify-end border-t border-slate-100 dark:border-slate-800",
              children: c.jsx("button", {
                type: "button",
                onClick: () => setShowSalesModal(false),
                className: "px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase shadow-md cursor-pointer",
                children: "Xong"
              })
            })
          ]
        })
      }),

      // =========================================================================
      // MODAL 4: THIẾT LẬP KỲ THU MUA
      // =========================================================================
      showTripSettingsModal && c.jsx("div", {
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4",
          children: [
            c.jsx("h3", { className: "font-black text-base uppercase text-slate-900 dark:text-white", children: "⚙️ Thiết Lập Kỳ Thu Mua" }),
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
                  className: "w-full p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-left flex justify-between items-center cursor-pointer",
                  children: [
                    c.jsxs("span", { children: ["Chế độ lọc phiếu: ", c.jsx("b", { children: filterMode === "DATE" ? "Theo ngày" : "Tất cả" })] }),
                    c.jsx("span", { className: "text-blue-600", children: "Đổi" })
                  ]
                }),
                c.jsxs("button", {
                  type: "button",
                  onClick: handleResetTrip,
                  className: "w-full p-3 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900/60 text-left flex justify-between items-center cursor-pointer",
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
                  className: "w-full p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900/60 text-left flex justify-between items-center cursor-pointer",
                  children: [
                    c.jsx("span", { children: "✨ Tạo chuyến mới tinh sạch" }),
                    c.jsx("span", { children: "➔" })
                  ]
                })
              ]
            }),
            c.jsx("div", {
              className: "flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800",
              children: c.jsx("button", {
                type: "button",
                onClick: () => setShowTripSettingsModal(false),
                className: "px-5 py-2.5 bg-slate-200 dark:bg-slate-800 rounded-xl font-bold text-xs cursor-pointer",
                children: "Đóng"
              })
            })
          ]
        })
      }),

      // =========================================================================
      // MODAL 5: LỊCH SỬ CÁC CHUYẾN ĐÃ LƯU
      // =========================================================================
      showSavedTripsModal && c.jsx("div", {
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4 max-h-[85vh] flex flex-col",
          children: [
            c.jsxs("div", {
              className: "flex justify-between items-center border-b pb-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("h3", { className: "font-black text-base uppercase text-slate-900 dark:text-white", children: "Lịch Sử Các Chuyến Đã Quyết Toán" }),
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
                className: "p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5",
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
                                className: "p-1 border rounded text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-700"
                              }),
                              c.jsx("button", {
                                type: "button",
                                onClick: handleSaveEditSavedTripName,
                                className: "px-2 py-1 bg-green-600 text-white rounded text-xs font-bold cursor-pointer",
                                children: "Lưu"
                              }),
                              c.jsx("button", {
                                type: "button",
                                onClick: () => setEditingSavedTripId(null),
                                className: "px-2 py-1 bg-slate-300 text-slate-700 rounded text-xs font-bold cursor-pointer",
                                children: "Hủy"
                              })
                            ]
                          }) : c.jsxs("div", {
                            className: "flex items-center gap-1.5",
                            children: [
                              c.jsx("h4", { className: "font-black text-sm text-slate-900 dark:text-white", children: st.name }),
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
                          c.jsxs("span", { className: "text-[10px] text-slate-400 block", children: ["Ngày: ", st.startDate, " • Quyết toán lúc: ", new Date(st.settledAt || Date.now()).toLocaleTimeString("vi-VN")] })
                        ]
                      }),
                      c.jsx("span", {
                        className: "px-2 py-0.5 rounded-md text-[10px] font-black uppercase " + (st.isProfit ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"),
                        children: st.isProfit ? "LỜI" : "LỖ"
                      })
                    ]
                  }),
                  c.jsxs("div", {
                    className: "grid grid-cols-2 gap-2 text-[11px] text-slate-500 font-bold",
                    children: [
                      c.jsxs("div", { children: ["Chi phí: ", c.jsx("b", { className: "text-red-600", children: _fmt(st.totalExpenses) })] }),
                      c.jsxs("div", { children: ["Doanh thu: ", c.jsx("b", { className: "text-green-600", children: _fmt(st.totalRevenue) })] })
                    ]
                  }),
                  c.jsxs("div", {
                    className: "flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 text-xs font-black",
                    children: [
                      c.jsxs("span", {
                        children: ["Lợi nhuận ròng: ", c.jsx("b", { className: st.isProfit ? "text-green-600" : "text-red-600", children: [(st.isProfit ? "+" : "") + _fmt(st.netProfit) + " đ"] })]
                      }),
                      c.jsxs("div", {
                        className: "flex items-center gap-1.5",
                        children: [
                          c.jsx("button", {
                            type: "button",
                            onClick: () => setViewingSavedTrip(st),
                            className: "px-2.5 py-1 bg-teal-600 text-white rounded-lg text-xs font-bold cursor-pointer",
                            children: "Xem Chi Tiết"
                          }),
                          c.jsx("button", {
                            type: "button",
                            onClick: () => handleRestoreSavedTrip(st),
                            className: "px-2 py-1 bg-amber-500 text-white rounded-lg text-xs font-bold cursor-pointer",
                            title: "Khôi phục làm chuyến hiện tại",
                            children: "Khôi Phục"
                          }),
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
      // MODAL 6: XEM CHI TIẾT CHUYẾN ĐÃ LƯU
      // =========================================================================
      viewingSavedTrip && c.jsx("div", {
        className: "fixed inset-0 z-[220] bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4 max-h-[90vh] flex flex-col",
          children: [
            c.jsxs("div", {
              className: "flex justify-between items-center border-b pb-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("h3", { className: "font-black text-base uppercase text-slate-900 dark:text-white", children: viewingSavedTrip.name }),
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
                  className: "p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl grid grid-cols-2 gap-3 font-bold",
                  children: [
                    c.jsxs("div", { children: ["Tổng chi phí: ", c.jsx("b", { className: "text-red-600 font-mono", children: _fmt(viewingSavedTrip.totalExpenses) + " đ" })] }),
                    c.jsxs("div", { children: ["Tổng doanh thu: ", c.jsx("b", { className: "text-green-600 font-mono", children: _fmt(viewingSavedTrip.totalRevenue) + " đ" })] }),
                    c.jsxs("div", { className: "col-span-2 pt-2 border-t", children: ["Lợi nhuận ròng: ", c.jsx("b", { className: (viewingSavedTrip.isProfit ? "text-green-600" : "text-red-600") + " font-mono text-sm", children: [(viewingSavedTrip.isProfit ? "+" : "") + _fmt(viewingSavedTrip.netProfit) + " đ"] })] })
                  ]
                }),
                // Breakdown Details
                c.jsxs("div", {
                  className: "p-4 bg-teal-50/60 dark:bg-teal-950/20 rounded-2xl border border-teal-200 dark:border-teal-800 space-y-2",
                  children: [
                    c.jsx("span", { className: "font-black uppercase text-teal-900 dark:text-teal-200 block text-xs", children: "🏆 Bảng Quyết Toán Chuyến:" }),
                    c.jsxs("div", {
                      className: "flex justify-between items-center text-xs font-bold",
                      children: [
                        c.jsx("span", { children: "Tiền mua tôm:" }),
                        c.jsxs("span", { className: "font-mono text-orange-600", children: ["- ", _fmt(viewingSavedTrip.shrimpPurchaseMoney), " đ"] })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "flex justify-between items-center text-xs font-bold",
                      children: [
                        c.jsx("span", { children: "Chi phí vận hành:" }),
                        c.jsxs("span", { className: "font-mono text-orange-600", children: ["- ", _fmt(viewingSavedTrip.totalOperationExpenses), " đ"] })
                      ]
                    }),
                    viewingSavedTrip.totalExtraIncome > 0 && c.jsxs("div", {
                      className: "flex justify-between items-center text-xs font-bold",
                      children: [
                        c.jsx("span", { children: "Khoản thu ngoài:" }),
                        c.jsxs("span", { className: "font-mono text-emerald-600", children: ["+ ", _fmt(viewingSavedTrip.totalExtraIncome), " đ"] })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "flex justify-between items-center text-xs font-bold",
                      children: [
                        c.jsx("span", { children: "Doanh thu bán tôm:" }),
                        c.jsxs("span", { className: "font-mono text-emerald-600", children: ["+ ", _fmt(viewingSavedTrip.totalRevenue - (viewingSavedTrip.totalExtraIncome || 0)), " đ"] })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "flex justify-between items-center text-xs font-black pt-2 border-t border-teal-200 dark:border-teal-800",
                      children: [
                        c.jsx("span", { className: "text-teal-950 dark:text-teal-100 uppercase", children: "Lợi nhuận ròng:" }),
                        c.jsxs("span", { className: "font-mono text-sm " + (viewingSavedTrip.isProfit ? "text-emerald-700 dark:text-emerald-300" : "text-red-600"), children: [(viewingSavedTrip.isProfit ? "+" : "") + _fmt(viewingSavedTrip.netProfit), " VNĐ"] })
                      ]
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
                  className: "px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-xl font-bold text-xs cursor-pointer",
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

// Function to apply update to target files
function run() {
  const newCode = generateXmFinanceScreenCode();
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

  // Update version in index.html, sw.js, public/sw.js
  const vStamp = "v18";
  const indexHtml = fs.readFileSync("index.html", "utf8");
  const updatedHtml = indexHtml.replace(/index-v7\.js\?v=[^"'\s]+/g, "index-v7.js?v=" + Date.now() + "_" + vStamp);
  fs.writeFileSync("index.html", updatedHtml, "utf8");
  console.log("Updated index.html to v18");

  ["sw.js", "public/sw.js"].forEach(swFile => {
    if (fs.existsSync(swFile)) {
      let sw = fs.readFileSync(swFile, "utf8");
      sw = sw.replace(/CACHE_NAME\s*=\s*['"][^'"]+['"]/g, `CACHE_NAME = 'tom-cang-xanh-${Date.now()}-${vStamp}'`);
      fs.writeFileSync(swFile, sw, "utf8");
      console.log("Updated cache in:", swFile);
    }
  });

  console.log("🎉 All files updated successfully!");
}

run();
