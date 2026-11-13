const fs = require("fs");
const path = require("path");

console.log("Upgrading Finance Tab: Remove subtitle, remove Zalo, upgrade header buttons, add Thu-Chi features...");

const bundlePath = path.join(__dirname, "../assets/index-v7.js");
let bundle = fs.readFileSync(bundlePath, "utf8");

// Locate Xm_FinanceScreen
const pStart = bundle.indexOf("const Xm_FinanceScreen =");
const pEnd = bundle.indexOf("const BmMainApp=");

if (pStart === -1 || pEnd === -1) {
  console.error("Could not find Xm_FinanceScreen boundaries!", { pStart, pEnd });
  process.exit(1);
}

const polishedFinanceComponent = `const Xm_FinanceScreen = ({ setRoute, role }) => {
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

  // Breakdown by channel
  const retailRevenue = effectiveSales.filter(s => s.targetGroup === "RETAIL").reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);
  const marketRevenue = effectiveSales.filter(s => s.targetGroup === "MARKET").reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);
  const factoryRevenue = effectiveSales.filter(s => s.targetGroup === "FACTORY").reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);

  // Net Profit
  const netProfit = totalRevenue - totalExpenses;
  const isProfit = netProfit >= 0;
  const profitMarginPercent = totalExpenses > 0 ? ((netProfit / totalExpenses) * 100) : 0;
  const weightDiff = autoShrimpPurchaseKg - autoRevenueKg;

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
    if (thuChiFilterTab === "EXPENSE") return t.type !== "INCOME";
    if (thuChiFilterTab === "INCOME") return t.type === "INCOME";
    return true;
  });

  return c.jsxs("div", {
    className: "flex flex-col h-screen bg-gray-50 dark:bg-[#121212] overflow-hidden text-gray-900 dark:text-gray-100",
    children: [
      // =========================================================================
      // HEADER: TỐI ƯU GỌN GÀNG, SẮP XẾP LẠI NÚT, KHÔNG CÓ PHỤ ĐỀ, KHÔNG CÓ NÚT ZALO
      // =========================================================================
      c.jsxs("header", {
        className: "bg-gradient-to-r from-emerald-800 via-teal-800 to-cyan-900 text-white px-4 py-3 shadow-lg shrink-0 flex items-center justify-between",
        children: [
          // Left: Back button & Title (No subtitle)
          c.jsxs("div", {
            className: "flex items-center gap-3",
            children: [
              c.jsx("button", {
                type: "button",
                onClick: () => setRoute(re.DASHBOARD),
                className: "p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all cursor-pointer active:scale-90",
                title: "Quay về trang chính",
                children: c.jsx(On, { size: 20 })
              }),
              c.jsxs("h1", {
                className: "text-lg sm:text-xl font-black uppercase tracking-tight flex items-center gap-2",
                children: [
                  c.jsx("span", { children: "💰" }),
                  "Quản Lý Tài Chính"
                ]
              })
            ]
          }),

          // Right: Action Buttons (Thu Chi, Đồng Bộ, Lịch Sử, Cài Đặt)
          c.jsxs("div", {
            className: "flex items-center gap-2",
            children: [
              // 1. Nút Thu - Chi nổi bật
              c.jsxs("button", {
                type: "button",
                onClick: () => handleOpenAddThuChi("EXPENSE"),
                className: "px-3 sm:px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer",
                title: "Ghi nhận khoản thu hoặc chi mới",
                children: [
                  c.jsx("span", { className: "text-sm", children: "➕" }),
                  c.jsx("span", { children: "Thu - Chi" })
                ]
              }),

              // 2. Nút Đồng bộ
              c.jsxs("button", {
                type: "button",
                onClick: handleSyncFinance,
                className: "p-2 sm:px-2.5 sm:py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1",
                title: "Đồng bộ số liệu mới nhất từ Cân tôm và Xuất bán",
                children: [
                  c.jsx("span", { className: "text-sm", children: "🔄" }),
                  c.jsx("span", { className: "hidden md:inline text-[11px]", children: "Đồng bộ" })
                ]
              }),

              // 3. Nút Lịch sử
              c.jsxs("button", {
                type: "button",
                onClick: () => setShowSavedTripsModal(true),
                className: "p-2 sm:px-3 sm:py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase flex items-center gap-1 active:scale-95 transition-all cursor-pointer",
                title: "Xem các kỳ / chuyến đã lưu",
                children: [
                  c.jsx(Fd, { size: 15 }),
                  c.jsxs("span", { className: "hidden sm:inline", children: ["Lịch Sử (", (financeData.savedTrips || []).length, ")"] })
                ]
              }),

              // 4. Nút Thiết lập
              c.jsx("button", {
                type: "button",
                onClick: () => setShowTripSettingsModal(true),
                className: "p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase transition-all cursor-pointer active:scale-95",
                title: "Thiết lập kỳ thu mua",
                children: c.jsx(ym, { size: 18 })
              })
            ]
          })
        ]
      }),

      // Main Scroll Container
      c.jsx("div", {
        className: "flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 sm:space-y-5 max-w-4xl mx-auto w-full pb-28",
        children: c.jsxs("div", {
          className: "space-y-4 sm:space-y-5",
          children: [
            // =========================================================================
            // TOP BAR: THÔNG TIN KỲ THU MUA
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
                            c.jsx("label", { className: "text-[10px] font-black text-gray-400 uppercase italic block", children: "Tên kỳ / Chuyến thu mua" }),
                            c.jsx("input", {
                              type: "text",
                              value: tripName,
                              onChange: e => {
                                setTripName(e.target.value);
                                updateActiveTrip({ name: e.target.value });
                              },
                              className: "text-base font-black text-gray-900 dark:text-white bg-transparent outline-none w-full border-b border-dashed border-gray-300 dark:border-gray-700 pb-0.5 focus:border-teal-500"
                            })
                          ]
                        })
                      ]
                    }),
                    // Date & Mode selector
                    c.jsxs("div", {
                      className: "flex items-center gap-2 w-full sm:w-auto shrink-0",
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
                          className: "px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all " + (filterMode === "ALL" ? "bg-teal-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"),
                          children: [filterMode === "ALL" ? "Tất cả phiếu" : "Theo ngày"]
                        })
                      ]
                    })
                  ]
                }),
                // Note input
                c.jsxs("div", {
                  className: "flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-800",
                  children: [
                    c.jsx("span", { className: "text-xs text-gray-400", children: "📝" }),
                    c.jsx("input", {
                      type: "text",
                      placeholder: "Ghi chú chuyến hàng (ví dụ: Xe giao Bình Điền, ao Chú Năm...)",
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
            // 3 THẺ KPI CỐT LÕI (TỔNG THU - TỔNG CHI - LỢI NHUẬN RÒNG)
            // =========================================================================
            c.jsxs("div", {
              className: "grid grid-cols-1 sm:grid-cols-3 gap-3.5",
              children: [
                // KPI 1: TỔNG CHI PHÍ
                c.jsxs("div", {
                  className: "p-4 bg-white dark:bg-gray-900 rounded-3xl border-2 border-orange-100 dark:border-orange-950/60 shadow-sm relative overflow-hidden flex flex-col justify-between",
                  children: [
                    c.jsx("div", { className: "absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-400 to-amber-500" }),
                    c.jsxs("div", {
                      children: [
                        c.jsxs("div", {
                          className: "flex items-center justify-between mb-1",
                          children: [
                            c.jsx("span", { className: "text-[11px] font-black uppercase text-orange-600 dark:text-orange-400 tracking-wider", children: "Tổng Chi Phí" }),
                            c.jsx("span", { className: "text-sm", children: "📉" })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "text-2xl sm:text-3xl font-black font-mono text-orange-600 dark:text-orange-400 tracking-tight",
                          children: [_fmt(totalExpenses), " ", c.jsx("span", { className: "text-xs font-sans font-bold", children: "đ" })]
                        })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "pt-2 mt-2 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-500 font-bold flex justify-between",
                      children: [
                        c.jsxs("span", { children: ["Mua tôm: ", c.jsx("b", { className: "text-gray-800 dark:text-gray-200", children: _fmt(shrimpPurchaseMoney) + " đ" })] }),
                        c.jsxs("span", { children: ["Vận hành: ", c.jsx("b", { className: "text-gray-800 dark:text-gray-200", children: _fmt(totalOperationExpenses) + " đ" })] })
                      ]
                    })
                  ]
                }),

                // KPI 2: TỔNG DOANH THU
                c.jsxs("div", {
                  className: "p-4 bg-white dark:bg-gray-900 rounded-3xl border-2 border-emerald-100 dark:border-emerald-950/60 shadow-sm relative overflow-hidden flex flex-col justify-between",
                  children: [
                    c.jsx("div", { className: "absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" }),
                    c.jsxs("div", {
                      children: [
                        c.jsxs("div", {
                          className: "flex items-center justify-between mb-1",
                          children: [
                            c.jsx("span", { className: "text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider", children: "Tổng Doanh Thu" }),
                            c.jsx("span", { className: "text-sm", children: "📈" })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight",
                          children: [_fmt(totalRevenue), " ", c.jsx("span", { className: "text-xs font-sans font-bold", children: "đ" })]
                        })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "pt-2 mt-2 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-500 font-bold flex justify-between",
                      children: [
                        c.jsxs("span", { children: ["Đã xuất bán: ", c.jsx("b", { className: "text-emerald-700 dark:text-emerald-400", children: _fmtKg(autoRevenueKg) + " kg" })] }),
                        c.jsxs("span", { children: [effectiveSales.length, " đơn bán", totalExtraIncome > 0 ? " (+thu khác)" : ""] })
                      ]
                    })
                  ]
                }),

                // KPI 3: LỢI NHUẬN RÒNG (LỜI / LỖ)
                c.jsxs("div", {
                  className: "p-4 rounded-3xl border-2 shadow-sm relative overflow-hidden flex flex-col justify-between " + (isProfit ? "bg-gradient-to-br from-teal-50 to-emerald-50/60 dark:from-teal-950/40 dark:to-emerald-950/40 border-teal-300 dark:border-teal-700 text-teal-950 dark:text-teal-100" : "bg-gradient-to-br from-red-50 to-rose-50/60 dark:from-red-950/40 dark:to-rose-950/40 border-red-300 dark:border-red-700 text-red-950 dark:text-red-100"),
                  children: [
                    c.jsx("div", { className: "absolute top-0 left-0 right-0 h-1.5 " + (isProfit ? "bg-gradient-to-r from-teal-500 to-emerald-600" : "bg-gradient-to-r from-red-500 to-rose-600") }),
                    c.jsxs("div", {
                      children: [
                        c.jsxs("div", {
                          className: "flex items-center justify-between mb-1",
                          children: [
                            c.jsx("span", { className: "text-[11px] font-black uppercase tracking-wider", children: isProfit ? "Lợi Nhuận Ròng (Lời)" : "Lợi Nhuận Ròng (Lỗ)" }),
                            c.jsx("span", { className: "text-sm", children: isProfit ? "🏆" : "⚠️" })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "text-2xl sm:text-3xl font-black font-mono tracking-tight " + (isProfit ? "text-emerald-600 dark:text-emerald-300" : "text-red-600 dark:text-red-300"),
                          children: [(isProfit ? "+" : "") + _fmt(netProfit), " ", c.jsx("span", { className: "text-xs font-sans font-bold", children: "đ" })]
                        })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "pt-2 mt-2 border-t border-black/5 dark:border-white/10 text-[10px] font-black flex justify-between items-center",
                      children: [
                        c.jsxs("span", { className: isProfit ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-300", children: ["Tỷ suất: ", (isProfit ? "+" : "") + profitMarginPercent.toFixed(1), "%"] }),
                        c.jsx("span", { className: "px-2 py-0.5 rounded-full text-[9px] font-black uppercase " + (isProfit ? "bg-emerald-600 text-white" : "bg-red-600 text-white"), children: isProfit ? "CÓ LÃI" : "BỊ LỖ" })
                      ]
                    })
                  ]
                })
              ]
            }),

            // =========================================================================
            // MỤC MỚI: SỔ THU - CHI (KHOẢN CHI & KHOẢN THU PHÁT SINH)
            // =========================================================================
            c.jsxs("div", {
              className: "bg-white dark:bg-gray-900 p-5 rounded-[32px] border border-gray-200 dark:border-gray-800 shadow-sm space-y-4",
              children: [
                c.jsxs("div", {
                  className: "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3",
                  children: [
                    c.jsxs("div", {
                      children: [
                        c.jsxs("h2", {
                          className: "text-sm font-black uppercase text-gray-900 dark:text-white flex items-center gap-1.5",
                          children: [c.jsx("span", { children: "💵" }), "Sổ Thu - Chi Vận Hành & Phát Sinh"]
                        }),
                        c.jsx("p", { className: "text-[11px] text-gray-500 font-semibold", children: "Ghi nhận mọi khoản tiền chi ra và tiền thu vào trong chuyến hàng" })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "flex items-center gap-2 w-full sm:w-auto",
                      children: [
                        c.jsxs("button", {
                          type: "button",
                          onClick: () => handleOpenAddThuChi("EXPENSE"),
                          className: "flex-1 sm:flex-none px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1 active:scale-95 transition-all shadow-sm cursor-pointer",
                          children: [c.jsx("span", { children: "➖" }), "Ghi Chi"]
                        }),
                        c.jsxs("button", {
                          type: "button",
                          onClick: () => handleOpenAddThuChi("INCOME"),
                          className: "flex-1 sm:flex-none px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1 active:scale-95 transition-all shadow-sm cursor-pointer",
                          children: [c.jsx("span", { children: "➕" }), "Ghi Thu"]
                        })
                      ]
                    })
                  ]
                }),

                // Filter tabs: Tất cả / Khoản chi / Khoản thu
                c.jsxs("div", {
                  className: "flex items-center justify-between gap-2",
                  children: [
                    c.jsxs("div", {
                      className: "flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl text-[11px] font-bold",
                      children: [
                        c.jsxs("button", {
                          type: "button",
                          onClick: () => setThuChiFilterTab("ALL"),
                          className: "px-2.5 py-1 rounded-lg transition-all " + (thuChiFilterTab === "ALL" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs font-black" : "text-gray-500 hover:text-gray-800"),
                          children: ["Tất cả (", allTransactions.length, ")"]
                        }),
                        c.jsxs("button", {
                          type: "button",
                          onClick: () => setThuChiFilterTab("EXPENSE"),
                          className: "px-2.5 py-1 rounded-lg transition-all " + (thuChiFilterTab === "EXPENSE" ? "bg-orange-600 text-white shadow-xs font-black" : "text-orange-600 dark:text-orange-400 hover:text-orange-700"),
                          children: ["Khoản chi (", operatingExpenses.length, ")"]
                        }),
                        c.jsxs("button", {
                          type: "button",
                          onClick: () => setThuChiFilterTab("INCOME"),
                          className: "px-2.5 py-1 rounded-lg transition-all " + (thuChiFilterTab === "INCOME" ? "bg-emerald-600 text-white shadow-xs font-black" : "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"),
                          children: ["Khoản thu (", extraIncomes.length, ")"]
                        })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "text-[11px] font-bold text-gray-500 text-right",
                      children: [
                        c.jsxs("span", { className: "text-orange-600 mr-2", children: ["Chi: -", _fmt(totalOperationExpenses), " đ"] }),
                        c.jsxs("span", { className: "text-emerald-600", children: ["Thu: +", _fmt(totalExtraIncome), " đ"] })
                      ]
                    })
                  ]
                }),

                // Danh sách các giao dịch Thu - Chi
                displayedTransactions.length === 0 ? c.jsxs("div", {
                  className: "p-6 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-center text-gray-400 text-xs space-y-2",
                  children: [
                    c.jsx("span", { className: "text-2xl block", children: "📝" }),
                    c.jsx("p", { className: "italic", children: "Chưa có khoản thu chi nào. Bấm nút '+ Thu - Chi' phía trên để ghi chép nhanh." })
                  ]
                }) : c.jsx("div", {
                  className: "space-y-2 max-h-72 overflow-y-auto pr-1",
                  children: displayedTransactions.map(tx => {
                    const isIncome = tx.type === "INCOME";
                    return c.jsxs("div", {
                      key: tx.id,
                      className: "p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs transition-all " + (isIncome ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60" : "bg-gray-50 dark:bg-gray-800/70 border-gray-100 dark:border-gray-800"),
                      children: [
                        c.jsxs("div", {
                          className: "flex items-center gap-2.5 min-w-0",
                          children: [
                            c.jsx("div", {
                              className: "w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 " + (isIncome ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-600" : "bg-orange-100 dark:bg-orange-950 text-orange-600"),
                              children: isIncome ? "➕" : "➖"
                            }),
                            c.jsxs("div", {
                              className: "min-w-0",
                              children: [
                                c.jsxs("span", {
                                  className: "font-black text-gray-900 dark:text-white flex items-center gap-1.5 truncate",
                                  children: [
                                    c.jsx("span", { className: "text-[9px] font-black uppercase px-1.5 py-0.2 rounded " + (isIncome ? "bg-emerald-600 text-white" : "bg-orange-600 text-white"), children: isIncome ? "THU" : "CHI" }),
                                    tx.category
                                  ]
                                }),
                                (tx.person || tx.note) && c.jsxs("span", {
                                  className: "text-[10px] text-gray-500 block truncate",
                                  children: [tx.person ? ("Người: " + tx.person + (tx.note ? " • " : "")) : "", tx.note || ""]
                                })
                              ]
                            })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "flex items-center gap-2 shrink-0",
                          children: [
                            c.jsxs("span", {
                              className: "font-black font-mono text-sm " + (isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"),
                              children: [(isIncome ? "+ " : "- ") + _fmt(tx.amount), " đ"]
                            }),
                            c.jsx("button", {
                              type: "button",
                              onClick: () => handleOpenEditThuChi(tx),
                              className: "p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg cursor-pointer",
                              title: "Sửa",
                              children: c.jsx("span", { children: "✎" })
                            }),
                            c.jsx("button", {
                              type: "button",
                              onClick: () => handleDeleteThuChi(tx.id),
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
            // MỤC 2: TIỀN MUA TÔM TẠI BỜ AO
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
                          children: [c.jsx("span", { children: "🦐" }), "Tiền Mua Tôm Tại Bờ Ao"]
                        }),
                        c.jsx("p", { className: "text-[11px] text-gray-500 font-semibold", children: "Tự động liên kết các phiếu cân tôm trong ngày hoặc nhập tay" })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "flex items-center gap-1.5",
                      children: [
                        c.jsx("button", {
                          type: "button",
                          onClick: () => setShowSessionsModal(true),
                          className: "px-2.5 py-1 bg-white dark:bg-gray-800 border border-orange-300 dark:border-orange-800 text-orange-800 dark:text-orange-300 rounded-xl text-[10px] font-bold hover:bg-orange-100 cursor-pointer",
                          children: "Chọn phiếu (" + effectiveSessions.length + ")"
                        }),
                        c.jsx("button", {
                          type: "button",
                          onClick: () => updateActiveTrip({ shrimpPurchaseAuto: !isShrimpAuto }),
                          className: "px-2 py-1 rounded-xl text-[10px] font-bold " + (isShrimpAuto ? "bg-emerald-600 text-white" : "bg-gray-300 text-gray-700"),
                          children: isShrimpAuto ? "Tự động" : "Nhập tay"
                        })
                      ]
                    })
                  ]
                }),

                isShrimpAuto ? c.jsxs("div", {
                  className: "p-4 bg-orange-50/70 dark:bg-orange-950/30 rounded-2xl border border-orange-200 dark:border-orange-900/60 flex justify-between items-center",
                  children: [
                    c.jsxs("div", {
                      children: [
                        c.jsx("span", { className: "font-black text-xs uppercase text-orange-900 dark:text-orange-200 block", children: "Tổng Tiền Mua Tôm Theo Phiếu Cân" }),
                        c.jsxs("span", { className: "text-[10px] text-gray-500", children: [effectiveSessions.length, " phiếu cân • ", _fmtKg(autoShrimpPurchaseKg), " kg tôm"] })
                      ]
                    }),
                    c.jsxs("span", { className: "text-2xl font-black font-mono text-orange-600 dark:text-orange-400", children: [_fmt(shrimpPurchaseMoney), " đ"] })
                  ]
                }) : c.jsxs("div", {
                  className: "p-4 bg-orange-50/70 dark:bg-orange-950/30 rounded-2xl border border-orange-200 dark:border-orange-900/60 space-y-1",
                  children: [
                    c.jsx("label", { className: "text-[10px] font-bold text-gray-400 uppercase", children: "Nhập số tiền mua tôm thủ công (VNĐ):" }),
                    c.jsx("input", {
                      type: "number",
                      value: trip.shrimpPurchaseManualAmount || "",
                      onChange: e => updateActiveTrip({ shrimpPurchaseManualAmount: Number(e.target.value) || 0 }),
                      placeholder: "VD: 85000000",
                      className: "w-full p-2.5 bg-white dark:bg-gray-800 border border-orange-300 dark:border-orange-800 rounded-xl font-black font-mono text-sm outline-none text-orange-600"
                    })
                  ]
                })
              ]
            }),

            // =========================================================================
            // MỤC 3: DOANH THU XUẤT BÁN TÔM
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
                          children: [c.jsx("span", { children: "🛒" }), "Doanh Thu Xuất Bán Tôm"]
                        }),
                        c.jsx("p", { className: "text-[11px] text-gray-500 font-semibold", children: "Tự động liên kết các đơn bán lẻ, chợ đầu mối và công ty" })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "flex items-center gap-1.5",
                      children: [
                        c.jsx("button", {
                          type: "button",
                          onClick: () => setShowSalesModal(true),
                          className: "px-2.5 py-1 bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-[10px] font-bold hover:bg-emerald-100 cursor-pointer",
                          children: "Chọn đơn (" + effectiveSales.length + ")"
                        }),
                        c.jsx("button", {
                          type: "button",
                          onClick: () => updateActiveTrip({ revenueAuto: !isRevenueAuto }),
                          className: "px-2 py-1 rounded-xl text-[10px] font-bold " + (isRevenueAuto ? "bg-emerald-600 text-white" : "bg-gray-300 text-gray-700"),
                          children: isRevenueAuto ? "Tự động" : "Nhập tay"
                        })
                      ]
                    })
                  ]
                }),

                // Revenue Amount Box
                isRevenueAuto ? c.jsxs("div", {
                  className: "p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 flex justify-between items-center",
                  children: [
                    c.jsxs("div", {
                      children: [
                        c.jsx("span", { className: "font-black text-xs uppercase text-emerald-900 dark:text-emerald-200 block", children: "Tổng Doanh Thu Xuất Bán Tôm" }),
                        c.jsxs("span", { className: "text-[10px] text-gray-500", children: [effectiveSales.length, " đơn bán • ", _fmtKg(autoRevenueKg), " kg đã xuất"] })
                      ]
                    }),
                    c.jsxs("span", { className: "text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400", children: [_fmt(baseRevenue), " đ"] })
                  ]
                }) : c.jsxs("div", {
                  className: "p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 space-y-1",
                  children: [
                    c.jsx("label", { className: "text-[10px] font-bold text-gray-400 uppercase", children: "Nhập số tiền doanh thu bán tôm thủ công (VNĐ):" }),
                    c.jsx("input", {
                      type: "number",
                      value: trip.revenueManualAmount || "",
                      onChange: e => updateActiveTrip({ revenueManualAmount: Number(e.target.value) || 0 }),
                      placeholder: "VD: 120000000",
                      className: "w-full p-2.5 bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-800 rounded-xl font-black font-mono text-sm outline-none text-emerald-600"
                    })
                  ]
                }),

                // Breakdown by channel
                effectiveSales.length > 0 && c.jsxs("div", {
                  className: "grid grid-cols-3 gap-2 text-xs",
                  children: [
                    c.jsxs("div", {
                      className: "p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 text-center",
                      children: [
                        c.jsx("span", { className: "text-[10px] text-gray-400 font-bold uppercase block", children: "🛒 Bán Lẻ" }),
                        c.jsxs("span", { className: "font-black font-mono text-emerald-600", children: [_fmt(retailRevenue), " đ"] })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 text-center",
                      children: [
                        c.jsx("span", { className: "text-[10px] text-gray-400 font-bold uppercase block", children: "🏪 Chợ Đầu Mối" }),
                        c.jsxs("span", { className: "font-black font-mono text-blue-600", children: [_fmt(marketRevenue), " đ"] })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 text-center",
                      children: [
                        c.jsx("span", { className: "text-[10px] text-gray-400 font-bold uppercase block", children: "🏢 Công Ty" }),
                        c.jsxs("span", { className: "font-black font-mono text-purple-600", children: [_fmt(factoryRevenue), " đ"] })
                      ]
                    })
                  ]
                })
              ]
            }),

            // =========================================================================
            // MỤC 4: BẢNG TỔNG KẾT QUYẾT TOÁN LỜI / LỖ
            // =========================================================================
            c.jsxs("div", {
              className: "bg-white dark:bg-gray-900 p-5 rounded-[32px] border-2 border-teal-500/30 dark:border-teal-500/20 shadow-xl space-y-4",
              children: [
                c.jsxs("div", {
                  className: "border-b border-gray-100 dark:border-gray-800 pb-3",
                  children: [
                    c.jsxs("h2", {
                      className: "text-base font-black uppercase tracking-tight text-gray-900 dark:text-white flex items-center gap-2",
                      children: [c.jsx("span", { children: "🏆" }), "Bảng Quyết Toán & Lợi Nhuận Chuyến Đi"]
                    }),
                    c.jsx("p", { className: "text-xs text-gray-500 font-semibold", children: "Đối soát thu chi minh bạch: Lợi nhuận ròng = Tổng Doanh Thu - Tổng Chi Phí" })
                  ]
                }),

                // Net Profit Card
                c.jsxs("div", {
                  className: "p-5 rounded-3xl border-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 " + (isProfit ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-100" : "bg-red-50 dark:bg-red-950/40 border-red-400 text-red-900 dark:text-red-100"),
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
                          className: "text-xl font-black font-mono " + (isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"),
                          children: [isProfit ? "+" : "", profitMarginPercent.toFixed(1), "%"]
                        })
                      ]
                    })
                  ]
                }),

                // Reconciliation Table
                c.jsxs("div", {
                  className: "space-y-2",
                  children: [
                    c.jsx("span", { className: "text-xs font-black uppercase text-gray-700 dark:text-gray-300 block", children: "Bảng Chi Tiết Đối Soát Dòng Tiền:" }),
                    c.jsx("div", {
                      className: "overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800",
                      children: c.jsxs("table", {
                        className: "w-full text-left text-xs border-collapse",
                        children: [
                          c.jsx("thead", {
                            className: "bg-gray-100 dark:bg-gray-800 text-[10px] font-black uppercase text-gray-500",
                            children: c.jsxs("tr", {
                              children: [
                                c.jsx("th", { className: "p-3", children: "Khoản Mục" }),
                                c.jsx("th", { className: "p-3 text-right", children: "Số Tiền (VNĐ)" }),
                                c.jsx("th", { className: "p-3", children: "Diễn Giải" })
                              ]
                            })
                          }),
                          c.jsxs("tbody", {
                            className: "divide-y divide-gray-100 dark:border-gray-800 font-bold",
                            children: [
                              // Row 1: Doanh thu bán tôm
                              c.jsxs("tr", {
                                className: "hover:bg-gray-50 dark:hover:bg-gray-800/40",
                                children: [
                                  c.jsxs("td", { className: "p-3", children: [c.jsx("span", { className: "text-emerald-600 font-black", children: "1. Doanh thu xuất bán tôm (+)" }), c.jsx("span", { className: "block text-[10px] text-gray-400", children: effectiveSales.length + " đơn xuất bán (" + _fmtKg(autoRevenueKg) + " kg)" })] }),
                                  c.jsxs("td", { className: "p-3 text-right font-mono font-black text-emerald-600", children: ["+ ", _fmt(baseRevenue), " đ"] }),
                                  c.jsx("td", { className: "p-3 text-gray-500 text-[11px]", children: "Tiền bán tôm thu về" })
                                ]
                              }),
                              // Row 2: Khoản thu khác nếu có
                              totalExtraIncome > 0 && c.jsxs("tr", {
                                className: "hover:bg-gray-50 dark:hover:bg-gray-800/40",
                                children: [
                                  c.jsxs("td", { className: "p-3", children: [c.jsx("span", { className: "text-emerald-600 font-black", children: "2. Khoản thu phát sinh khác (+)" }), c.jsx("span", { className: "block text-[10px] text-gray-400", children: extraIncomes.length + " khoản thu ngoài" })] }),
                                  c.jsxs("td", { className: "p-3 text-right font-mono font-black text-emerald-600", children: ["+ ", _fmt(totalExtraIncome), " đ"] }),
                                  c.jsx("td", { className: "p-3 text-gray-500 text-[11px]", children: "Thu nợ, thưởng, cọc hoàn..." })
                                ]
                              }),
                              // Row 3: Tiền mua tôm
                              c.jsxs("tr", {
                                className: "hover:bg-gray-50 dark:hover:bg-gray-800/40",
                                children: [
                                  c.jsxs("td", { className: "p-3", children: [c.jsx("span", { className: "text-orange-600 font-black", children: "3. Tiền mua tôm tại ao (-)" }), c.jsx("span", { className: "block text-[10px] text-gray-400", children: effectiveSessions.length + " phiếu cân (" + _fmtKg(autoShrimpPurchaseKg) + " kg)" })] }),
                                  c.jsxs("td", { className: "p-3 text-right font-mono font-black text-orange-600", children: ["- ", _fmt(shrimpPurchaseMoney), " đ"] }),
                                  c.jsx("td", { className: "p-3 text-gray-500 text-[11px]", children: "Chi trả tiền tôm cho chủ ao" })
                                ]
                              }),
                              // Row 4: Chi phí vận hành
                              c.jsxs("tr", {
                                className: "hover:bg-gray-50 dark:hover:bg-gray-800/40",
                                children: [
                                  c.jsxs("td", { className: "p-3", children: [c.jsx("span", { className: "text-orange-600 font-black", children: "4. Chi phí vận hành chuyến (-)" }), c.jsx("span", { className: "block text-[10px] text-gray-400", children: operatingExpenses.length + " khoản chi (xe, công, oxy, phà...)" })] }),
                                  c.jsxs("td", { className: "p-3 text-right font-mono font-black text-orange-600", children: ["- ", _fmt(totalOperationExpenses), " đ"] }),
                                  c.jsx("td", { className: "p-3 text-gray-500 text-[11px]", children: "Chi phí nhân sự & vận chuyển" })
                                ]
                              }),
                              // Row 5: Lợi nhuận ròng
                              c.jsxs("tr", {
                                className: "bg-teal-50/70 dark:bg-teal-950/40 font-black text-xs border-t-2 border-teal-300 dark:border-teal-700",
                                children: [
                                  c.jsxs("td", { className: "p-3", children: [c.jsx("span", { className: "text-teal-900 dark:text-teal-200 uppercase", children: "🏆 LỢI NHUẬN RÒNG (LÃI THU VỀ)" }), c.jsx("span", { className: "block text-[10px] text-teal-600 dark:text-teal-400 font-normal", children: "Tổng Thu nhập trừ Toàn bộ Chi phí" })] }),
                                  c.jsxs("td", { className: "p-3 text-right font-mono text-base " + (isProfit ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400"), children: [(isProfit ? "+" : "") + _fmt(netProfit), " VNĐ"] }),
                                  c.jsx("td", { className: "p-3 text-teal-800 dark:text-teal-300 text-[11px]", children: isProfit ? "Tiền lời thực tế thu về" : "Khoản tiền thâm hụt" })
                                ]
                              })
                            ]
                          })
                        ]
                      })
                    })
                  ]
                }),

                // Action Area: ONLY Lock & Save Trip Button (NO ZALO BUTTON)
                c.jsx("div", {
                  className: "pt-2",
                  children: c.jsxs("button", {
                    type: "button",
                    onClick: handleSettleAndArchiveTrip,
                    className: "w-full py-4 bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black rounded-2xl text-sm uppercase italic flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all cursor-pointer",
                    children: [
                      c.jsx("span", { className: "text-xl", children: "🔒" }),
                      "Khóa & Lưu Chuyến Vào Lịch Sử"
                    ]
                  })
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
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4",
          children: [
            // Modal Header with Type Selector
            c.jsxs("div", {
              className: "space-y-3",
              children: [
                c.jsx("h3", {
                  className: "font-black text-base uppercase text-gray-900 dark:text-white",
                  children: editingThuChiId ? "✎ Chỉnh Sửa Phiếu Thu - Chi" : "+ Ghi Nhận Thu - Chi Mới"
                }),
                // Tab chọn Loại: CHI TIỀN hay THU TIỀN
                c.jsxs("div", {
                  className: "grid grid-cols-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-2xl gap-1 text-xs font-black",
                  children: [
                    c.jsxs("button", {
                      type: "button",
                      onClick: () => {
                        setThuChiType("EXPENSE");
                        if (!editingThuChiId) setThuChiCategory("Tiền thuê xe / vận chuyển");
                      },
                      className: "py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer " + (thuChiType === "EXPENSE" ? "bg-orange-600 text-white shadow-sm" : "text-gray-600 dark:text-gray-300 hover:text-gray-900"),
                      children: [c.jsx("span", { children: "➖" }), "PHIẾU CHI"]
                    }),
                    c.jsxs("button", {
                      type: "button",
                      onClick: () => {
                        setThuChiType("INCOME");
                        if (!editingThuChiId) setThuChiCategory("Thu tiền bán tôm mặt tại ao");
                      },
                      className: "py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer " + (thuChiType === "INCOME" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-600 dark:text-gray-300 hover:text-gray-900"),
                      children: [c.jsx("span", { children: "➕" }), "PHIẾU THU"]
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
                    c.jsx("label", { className: "text-xs font-bold text-gray-500 mb-1 block uppercase", children: "Danh mục *" }),
                    c.jsx("div", {
                      className: "grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1",
                      children: (thuChiType === "EXPENSE" ? expenseCategories : incomeCategories).map(cat => c.jsxs("button", {
                        key: cat.label,
                        type: "button",
                        onClick: () => setThuChiCategory(cat.label),
                        className: "p-2 rounded-xl text-[11px] font-bold text-left transition-all border " + (thuChiCategory === cat.label ? (thuChiType === "EXPENSE" ? "bg-orange-50 dark:bg-orange-950/40 border-orange-500 text-orange-900 dark:text-orange-200" : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200") : "bg-gray-50 dark:bg-gray-700/60 border-transparent text-gray-700 dark:text-gray-300"),
                        children: [cat.icon, " ", cat.label]
                      }))
                    })
                  ]
                }),

                // Số tiền
                c.jsxs("div", {
                  children: [
                    c.jsxs("label", { className: "text-xs font-bold text-gray-500 mb-1 block uppercase", children: ["Số tiền (VNĐ) * ", thuChiType === "EXPENSE" ? "(Tiền chi ra)" : "(Tiền thu vào)"] }),
                    c.jsx("input", {
                      type: "number",
                      placeholder: "VD: 1500000",
                      value: thuChiAmount,
                      onChange: e => setThuChiAmount(e.target.value),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-lg font-mono outline-none " + (thuChiType === "EXPENSE" ? "focus:border-orange-500 text-orange-600" : "focus:border-emerald-500 text-emerald-600")
                    }),
                    // Quick chips
                    c.jsxs("div", {
                      className: "flex flex-wrap gap-1.5 mt-2",
                      children: [
                        [200000, "200k"],
                        [500000, "500k"],
                        [1000000, "1tr"],
                        [2000000, "2tr"],
                        [5000000, "5tr"],
                        [10000000, "10tr"]
                      ].map(([val, label]) => c.jsx("button", {
                        key: val,
                        type: "button",
                        onClick: () => setThuChiAmount(String(val)),
                        className: "px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold font-mono text-gray-700 dark:text-gray-300 hover:bg-gray-200",
                        children: label
                      }))
                    })
                  ]
                }),

                // Người nhận / Người nộp
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-xs font-bold text-gray-500 mb-1 block uppercase", children: thuChiType === "EXPENSE" ? "Người nhận tiền / Tài xế / Nhân công" : "Người nộp tiền / Khách hàng" }),
                    c.jsx("input", {
                      type: "text",
                      placeholder: thuChiType === "EXPENSE" ? "VD: Anh Ba tài xế, Đội kéo ao Năm..." : "VD: Chú Bảy mua tôm lẻ...",
                      value: thuChiPerson,
                      onChange: e => setThuChiPerson(e.target.value),
                      className: "w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-xs outline-none"
                    })
                  ]
                }),

                // Ghi chú chi tiết
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-xs font-bold text-gray-500 mb-1 block uppercase", children: "Ghi chú chi tiết (nếu có)" }),
                    c.jsx("input", {
                      type: "text",
                      placeholder: "VD: Chuyến xe 69C giao chợ Bình Điền...",
                      value: thuChiNote,
                      onChange: e => setThuChiNote(e.target.value),
                      className: "w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-xs outline-none"
                    })
                  ]
                })
              ]
            }),

            // Action Buttons
            c.jsxs("div", {
              className: "flex gap-2 justify-end pt-2",
              children: [
                c.jsx("button", {
                  type: "button",
                  onClick: () => setShowThuChiModal(false),
                  className: "px-4 py-2.5 bg-gray-200 dark:bg-gray-700 rounded-xl font-bold text-xs cursor-pointer",
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
                  className: "p-1.5 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer",
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
                  className: "text-gray-500 font-bold cursor-pointer",
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
                  className: "p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all " + (isChecked ? "bg-orange-50/80 dark:bg-orange-950/40 border-orange-400" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60"),
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
                  className: "p-1.5 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer",
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
                  className: "text-gray-500 font-bold cursor-pointer",
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
                  className: "p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all " + (isChecked ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60"),
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
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4",
          children: [
            c.jsx("h3", { className: "font-black text-base uppercase text-gray-900 dark:text-white", children: "⚙️ Thiết Lập Kỳ Thu Mua" }),
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
                  className: "w-full p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 text-left flex justify-between items-center cursor-pointer",
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
                className: "px-5 py-2.5 bg-gray-200 dark:bg-gray-700 rounded-xl font-bold text-xs cursor-pointer",
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
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4 max-h-[85vh] flex flex-col",
          children: [
            c.jsxs("div", {
              className: "flex justify-between items-center border-b pb-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("h3", { className: "font-black text-base uppercase text-gray-900 dark:text-white", children: "Lịch Sử Các Chuyến Đã Quyết Toán" }),
                    c.jsxs("p", { className: "text-xs text-gray-500 font-bold", children: ["Tổng số: ", (financeData.savedTrips || []).length, " chuyến đã lưu"] })
                  ]
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => setShowSavedTripsModal(false),
                  className: "p-1.5 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer",
                  children: c.jsx(_a, { size: 18 })
                })
              ]
            }),
            c.jsx("div", {
              className: "overflow-y-auto flex-1 space-y-3 pr-1",
              children: (financeData.savedTrips || []).length === 0 ? c.jsx("p", {
                className: "text-center text-gray-400 py-12 italic text-xs font-bold",
                children: "Chưa có chuyến nào được lưu trước đây."
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
                                className: "px-2 py-1 bg-green-600 text-white rounded text-xs font-bold cursor-pointer",
                                children: "Lưu"
                              }),
                              c.jsx("button", {
                                type: "button",
                                onClick: () => setEditingSavedTripId(null),
                                className: "px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs font-bold cursor-pointer",
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
                                className: "text-gray-400 hover:text-blue-600 text-xs cursor-pointer",
                                title: "Sửa tên chuyến",
                                children: "✎"
                              })
                            ]
                          }),
                          c.jsxs("span", { className: "text-[10px] text-gray-400 block", children: ["Ngày: ", st.startDate, " • Quyết toán lúc: ", new Date(st.settledAt || Date.now()).toLocaleTimeString("vi-VN")] })
                        ]
                      }),
                      c.jsx("span", {
                        className: "px-2 py-0.5 rounded-md text-[10px] font-black uppercase " + (st.isProfit ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"),
                        children: st.isProfit ? "LỜI" : "LỖ"
                      })
                    ]
                  }),
                  c.jsxs("div", {
                    className: "grid grid-cols-2 gap-2 text-[11px] text-gray-500 font-bold",
                    children: [
                      c.jsxs("div", { children: ["Chi phí: ", c.jsx("b", { className: "text-red-600", children: _fmt(st.totalExpenses) })] }),
                      c.jsxs("div", { children: ["Doanh thu: ", c.jsx("b", { className: "text-green-600", children: _fmt(st.totalRevenue) })] })
                    ]
                  }),
                  c.jsxs("div", {
                    className: "flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700 text-xs font-black",
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
                  className: "p-1.5 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer",
                  children: c.jsx(_a, { size: 18 })
                })
              ]
            }),
            c.jsxs("div", {
              className: "overflow-y-auto flex-1 space-y-4 pr-1 text-xs",
              children: [
                // Summary block
                c.jsxs("div", {
                  className: "p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl grid grid-cols-2 gap-3 font-bold",
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
                  className: "px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-xl font-bold text-xs cursor-pointer",
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

bundle = bundle.slice(0, pStart) + polishedFinanceComponent + "\n\n" + bundle.slice(pEnd);
fs.writeFileSync(bundlePath, bundle, "utf8");
console.log("Successfully replaced Xm_FinanceScreen with updated polished header and Thu-Chi component!");

// Synchronize all bundle files
const copies = [
  path.join(__dirname, "../public/assets/index-v7.js"),
  path.join(__dirname, "../assets/index-Os1X4Z7e.js"),
  path.join(__dirname, "../public/assets/index-Os1X4Z7e.js")
];

for (const copyPath of copies) {
  fs.writeFileSync(copyPath, bundle, "utf8");
  console.log("Synchronized bundle to:", copyPath);
}

// Bump cache version in index.html and sw.js
let indexHtml = fs.readFileSync("index.html", "utf8");
indexHtml = indexHtml.replace("/assets/index-v7.js?v=20261017_v16", "/assets/index-v7.js?v=20261017_v17");
indexHtml = indexHtml.replace("/sw.js?v=16", "/sw.js?v=17");
indexHtml = indexHtml.replace("vuatomcangxanh-v16", "vuatomcangxanh-v17");
fs.writeFileSync("index.html", indexHtml, "utf8");
console.log("Bumped index.html to v17");

let sw = fs.readFileSync("sw.js", "utf8");
sw = sw.replaceAll("vuatomcangxanh-v16", "vuatomcangxanh-v17");
fs.writeFileSync("sw.js", sw, "utf8");
fs.writeFileSync("public/sw.js", sw, "utf8");
console.log("Bumped sw.js to v17");

console.log("ALL UPDATES APPLIED CLEANLY!");
