const fs = require("fs");
const path = require("path");

console.log("Preparing Solo Capital & Profit Finance Screen...");

const bundlePath = path.join(__dirname, "../assets/index-v7.js");
let bundle = fs.readFileSync(bundlePath, "utf8");

// 1. Locate me.getFinanceData and me.getRemainingCapital
const finDataMarker = "me.getFinanceData = function() {";
const finDataIdx = bundle.indexOf(finDataMarker);
const buyersIdx = bundle.indexOf("me.getBuyers = function() {", finDataIdx);

if (finDataIdx === -1 || buyersIdx === -1) {
  console.error("Could not find me.getFinanceData boundaries!", { finDataIdx, buyersIdx });
  process.exit(1);
}

const newFinanceStorageCode = `me.getFinanceData = function() {
  try {
    const raw = localStorage.getItem(Ot.FINANCE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.activeTrip) {
        // Ensure migration to solo capital if older trip had investors
        const at = parsed.activeTrip;
        if (at.capitalAmount === undefined) {
          if (Array.isArray(at.investors) && at.investors.length > 0) {
            at.capitalAmount = at.investors.reduce((acc, inv) => acc + Number(inv.amount || 0), 0);
          } else {
            at.capitalAmount = 150000000;
          }
        }
        if (!at.ownerName) {
          const tp = typeof getTraderProfileV3 === "function" ? getTraderProfileV3() : {};
          at.ownerName = tp.representative || tp.fullName || "Tôi (Chủ vựa)";
        }
        return parsed;
      }
    }
  } catch(e) {}

  const tp = typeof getTraderProfileV3 === "function" ? getTraderProfileV3() : {};
  const ownerName = tp.representative || tp.fullName || "Tôi (Chủ vựa)";

  return {
    activeTrip: {
      id: "trip_" + Date.now(),
      name: "Chuyến thu mua ngày " + new Date().toLocaleDateString("vi-VN"),
      startDate: new Date().toISOString().split("T")[0],
      ownerName: ownerName,
      capitalAmount: 150000000, // 1 người tự bỏ vốn
      shrimpPurchaseAuto: true,
      shrimpPurchaseManualAmount: 0,
      selectedSessionIds: null,
      expenses: [
        { id: "exp_1", category: "Tiền thuê xe / vận chuyển", amount: 1500000, note: "Xe giao tôm", date: new Date().toISOString() },
        { id: "exp_2", category: "Tiền nước đá, oxy", amount: 600000, note: "20 cây đá + nạp oxy", date: new Date().toISOString() },
        { id: "exp_3", category: "Tiền nhân công kéo / lựa tôm", amount: 1200000, note: "4 nhân công", date: new Date().toISOString() }
      ],
      revenueAuto: true,
      revenueManualAmount: 0,
      selectedSaleIds: null
    },
    savedTrips: []
  };
};

me.saveFinanceData = function(data) {
  try {
    localStorage.setItem(Ot.FINANCE, JSON.stringify(data));
    if (typeof me !== "undefined" && me.syncAllToCloud) me.syncAllToCloud();
  } catch(e) {
    console.warn("Save finance data error", e);
  }
};

me.getRemainingCapital = function() {
  try {
    const fin = me.getFinanceData();
    const trip = (fin && fin.activeTrip) || {};
    const totalCapital = Number(trip.capitalAmount !== undefined ? trip.capitalAmount : 150000000) || 150000000;
    const sessions = (me.getSessions && me.getSessions()) || [];
    const totalBuyMoney = sessions.reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);
    const expenses = trip.expenses || [];
    const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const sales = (me.getSales && me.getSales()) || [];
    const completedSales = sales.filter(s => s.status === "COMPLETED" || s.status === "SETTLED" || s.isPaidFull);
    const totalRevenue = completedSales.reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);
    return totalCapital - (totalBuyMoney + totalExpenses) + totalRevenue;
  } catch(e) {
    return 150000000;
  }
};
`;

bundle = bundle.slice(0, finDataIdx) + newFinanceStorageCode + bundle.slice(buyersIdx);
console.log("Updated me.getFinanceData & me.getRemainingCapital for solo capital model.");

// 2. Update Dashboard banner from "Chia Lời Lỗ Hùn Vốn" to "Lợi Nhuận Chuyến Đi (Tự Bỏ Vốn)"
bundle = bundle.replaceAll(
  "Quyết Toán Tài Chính & Chia Lời Lỗ Hùn Vốn",
  "Quyết Toán Tài Chính & Lợi Nhuận Chuyến Đi (Tự Bỏ Vốn)"
);
bundle = bundle.replaceAll(
  "Hùn vốn • Đối soát lời lỗ • Chia tiền từng đối tác",
  "Tự bỏ vốn • Quyết toán chi phí & doanh thu • Thu trọn 100% lợi nhuận"
);

// 3. Locate Xm_FinanceScreen component
const pStart = bundle.indexOf("const Xm_FinanceScreen =");
const pEnd = bundle.indexOf("const BmMainApp=");

if (pStart === -1 || pEnd === -1) {
  console.error("Could not find Xm_FinanceScreen boundaries!", { pStart, pEnd });
  process.exit(1);
}

const soloFinanceComponent = `const Xm_FinanceScreen = ({ setRoute, role }) => {
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
      alert("✅ Đã đồng bộ thành công số tiền đi cân tôm và số tiền bán tôm mới nhất!");
    } catch(e) {
      alert("Lỗi đồng bộ: " + e.message);
    }
  };

  const trip = financeData.activeTrip || {};
  const [tripName, setTripName] = w.useState(trip.name || "Chuyến thu mua tôm");
  const [tripDate, setTripDate] = w.useState(trip.startDate || new Date().toISOString().split("T")[0]);
  const [tripNote, setTripNote] = w.useState(trip.note || "");
  const [filterMode, setFilterMode] = w.useState(trip.filterMode || "DATE"); // "DATE" | "ALL"

  // 1. Solo Capital Modal
  const [showCapitalModal, setShowCapitalModal] = w.useState(false);
  const [capitalFormOwner, setCapitalFormOwner] = w.useState(trip.ownerName || "Tôi (Chủ vựa)");
  const [capitalFormAmount, setCapitalFormAmount] = w.useState(String(trip.capitalAmount !== undefined ? trip.capitalAmount : 150000000));

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
  // 1. VỐN TỰ ĐẦU TƯ (SOLO CAPITAL - 1 NGƯỜI TỰ BỎ VỐN)
  // =========================================================================
  const ownerName = trip.ownerName || (() => {
    const tp = typeof getTraderProfileV3 === "function" ? getTraderProfileV3() : {};
    return tp.representative || tp.fullName || "Tôi (Chủ vựa)";
  })();
  const totalCapital = Number(trip.capitalAmount !== undefined ? trip.capitalAmount : 150000000) || 0;

  const handleOpenEditCapital = () => {
    setCapitalFormOwner(ownerName);
    setCapitalFormAmount(String(totalCapital));
    setShowCapitalModal(true);
  };

  const handleSaveCapital = () => {
    const amt = Number(capitalFormAmount) || 0;
    if (amt <= 0) {
      alert("Vui lòng nhập số tiền vốn tự bỏ ra hợp lệ (lớn hơn 0)!");
      return;
    }
    const name = capitalFormOwner.trim() || "Tôi (Chủ vựa)";
    updateActiveTrip(t => ({
      ...t,
      ownerName: name,
      capitalAmount: amt
    }));
    setShowCapitalModal(false);
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
  // 4. NET PROFIT & TOTAL RETURN (QUYẾT TOÁN & THU LỢI NHUẬN 100%)
  // =========================================================================
  const netProfit = totalRevenue - totalExpenses;
  const isProfit = netProfit >= 0;
  const profitMarginPercent = totalExpenses > 0 ? ((netProfit / totalExpenses) * 100) : 0;
  const roiOnCapital = totalCapital > 0 ? ((netProfit / totalCapital) * 100) : 0;
  // Total cash balance / cash return = Capital - Expenses + Revenue
  const totalCashReturn = totalCapital - totalExpenses + totalRevenue;
  const capitalUsagePercent = totalCapital > 0 ? Math.min(100, Math.round((totalExpenses / totalCapital) * 100)) : 0;

  // Share statement via Zalo / Messenger
  const handleShareZaloStatement = () => {
    let msg = "🦐 [BẢNG QUYẾT TOÁN TÀI CHÍNH & LỢI NHUẬN TỰ DOANH]\\n";
    msg += "Chuyến: " + tripName + "\\n";
    msg += "Ngày: " + tripDate + "\\n";
    msg += "Chủ đầu tư / Tự bỏ vốn: " + ownerName + " (100% Vốn & Lợi nhuận)\\n";
    if (tripNote) msg += "Ghi chú: " + tripNote + "\\n";
    msg += "================================\\n";
    msg += "1. VỐN TỰ BỎ RA BAN ĐẦU: " + _fmt(totalCapital) + " đ\\n";
    msg += "--------------------------------\\n";
    msg += "2. TỔNG CHI PHÍ THU MUA & VẬN HÀNH: " + _fmt(totalExpenses) + " đ\\n";
    msg += "  • Tiền mua tôm: " + _fmt(shrimpPurchaseMoney) + " đ (" + effectiveSessions.length + " phiếu, " + _fmtKg(autoShrimpPurchaseKg) + " kg)\\n";
    msg += "  • Chi phí vận hành chuyến: " + _fmt(totalOperationExpenses) + " đ\\n";
    expenses.forEach((e, i) => {
      msg += "    - " + e.category + (e.note ? " [" + e.note + "]" : "") + ": " + _fmt(e.amount) + " đ\\n";
    });
    msg += "--------------------------------\\n";
    msg += "3. TỔNG DOANH THU XUẤT BÁN: " + _fmt(totalRevenue) + " đ\\n";
    if (effectiveSales.length > 0) {
      if (retailRevenue > 0) msg += "  • Bán lẻ: " + _fmt(retailRevenue) + " đ\\n";
      if (marketRevenue > 0) msg += "  • Chợ đầu mối: " + _fmt(marketRevenue) + " đ\\n";
      if (factoryRevenue > 0) msg += "  • Công ty xí nghiệp: " + _fmt(factoryRevenue) + " đ\\n";
    }
    msg += "================================\\n";
    msg += "4. LỢI NHUẬN RÒNG (100% THU VỀ): " + (isProfit ? "+" : "") + _fmt(netProfit) + " VNĐ\\n";
    msg += "   Kết quả chuyến: " + (isProfit ? "LỜI (LÃI)" : "BỊ LỖ") + " " + Math.abs(profitMarginPercent).toFixed(1) + "% trên chi phí\\n";
    msg += "================================\\n";
    msg += "5. TỔNG TIỀN MẶT CẦN THU VỀ (VỐN GỐC + LÃI):\\n";
    msg += "   ==> THỰC THU: " + _fmt(totalCashReturn) + " VNĐ\\n";
    msg += "   (Toàn bộ lợi nhuận và tiền mặt thu về 100% cho: " + ownerName + ")\\n";
    msg += "--------------------------------\\n";
    msg += "Vua Tôm Càng Xanh - Phần Mềm Quản Lý Thu Mua 4.0";

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(msg);
      }
      alert("✅ Đã sao chép bảng quyết toán tài chính tự doanh! Đang mở Zalo để gửi...");
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
      ownerName: ownerName,
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
      totalCashReturn,
      settledAt: new Date().toISOString()
    };

    const newActiveTrip = {
      id: "trip_" + Date.now(),
      name: "Chuyến thu mua ngày " + new Date().toLocaleDateString("vi-VN"),
      startDate: new Date().toISOString().split("T")[0],
      note: "",
      ownerName: ownerName,
      capitalAmount: totalCapital,
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
    if (confirm("Bạn có chắc chắn muốn đặt lại chuyến này? Các chi phí vận hành sẽ được xóa về 0, giữ nguyên số vốn tự bỏ.")) {
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
                      "Tài Chính & Lợi Nhuận"
                    ]
                  }),
                  c.jsx("span", {
                    className: "text-[10px] font-bold opacity-80 uppercase tracking-widest block mt-0.5",
                    children: "Tự bỏ vốn • Quyết toán chi phí & doanh thu • Thu trọn 100% lợi nhuận"
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
                onClick: handleSyncFinance,
                className: "p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase transition-all cursor-pointer active:scale-95",
                title: "Đồng bộ mới nhất từ cân tôm và xuất bán",
                children: c.jsx("span", { children: "🔄" })
              }),
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
                          className: "px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all " + (filterMode === "ALL" ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"),
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
            // TOP KPI DASHBOARD: 5 THẺ TỔNG QUAN TÀI CHÍNH TỰ DOANH
            // =========================================================================
            c.jsxs("div", {
              className: "grid grid-cols-2 sm:grid-cols-5 gap-3",
              children: [
                // Thẻ 1: Vốn tự bỏ ra
                c.jsxs("div", {
                  className: "p-3.5 bg-white dark:bg-gray-900 rounded-2xl border border-blue-200 dark:border-blue-900 shadow-xs relative overflow-hidden",
                  children: [
                    c.jsx("div", { className: "absolute top-0 left-0 right-0 h-1 bg-blue-500" }),
                    c.jsx("span", { className: "text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 block", children: "Vốn Tự Bỏ Ra" }),
                    c.jsxs("div", {
                      className: "text-sm sm:text-base font-black font-mono text-gray-900 dark:text-white mt-1",
                      children: [_fmt(totalCapital), " đ"]
                    }),
                    c.jsxs("span", { className: "text-[10px] text-gray-500 font-bold block truncate mt-0.5", children: ["👤 ", ownerName] })
                  ]
                }),

                // Thẻ 2: Tổng chi phí
                c.jsxs("div", {
                  className: "p-3.5 bg-white dark:bg-gray-900 rounded-2xl border border-orange-200 dark:border-orange-900 shadow-xs relative overflow-hidden",
                  children: [
                    c.jsx("div", { className: "absolute top-0 left-0 right-0 h-1 bg-orange-500" }),
                    c.jsx("span", { className: "text-[10px] font-black uppercase text-orange-600 dark:text-orange-400 block", children: "Tổng Chi Phí" }),
                    c.jsxs("div", {
                      className: "text-sm sm:text-base font-black font-mono text-orange-600 dark:text-orange-400 mt-1",
                      children: [_fmt(totalExpenses), " đ"]
                    }),
                    c.jsxs("span", { className: "text-[10px] text-gray-500 font-bold block truncate mt-0.5", children: [effectiveSessions.length, " phiếu cân"] })
                  ]
                }),

                // Thẻ 3: Tổng doanh thu
                c.jsxs("div", {
                  className: "p-3.5 bg-white dark:bg-gray-900 rounded-2xl border border-emerald-200 dark:border-emerald-900 shadow-xs relative overflow-hidden",
                  children: [
                    c.jsx("div", { className: "absolute top-0 left-0 right-0 h-1 bg-emerald-500" }),
                    c.jsx("span", { className: "text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 block", children: "Tổng Doanh Thu" }),
                    c.jsxs("div", {
                      className: "text-sm sm:text-base font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1",
                      children: [_fmt(totalRevenue), " đ"]
                    }),
                    c.jsxs("span", { className: "text-[10px] text-gray-500 font-bold block truncate mt-0.5", children: [effectiveSales.length, " đơn bán"] })
                  ]
                }),

                // Thẻ 4: Lợi nhuận ròng
                c.jsxs("div", {
                  className: "p-3.5 bg-white dark:bg-gray-900 rounded-2xl border border-purple-200 dark:border-purple-900 shadow-xs relative overflow-hidden",
                  children: [
                    c.jsx("div", { className: "absolute top-0 left-0 right-0 h-1 bg-purple-500" }),
                    c.jsx("span", { className: "text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 block", children: "Lợi Nhuận Thực Thu" }),
                    c.jsxs("div", {
                      className: "text-sm sm:text-base font-black font-mono " + (isProfit ? "text-emerald-600" : "text-red-600") + " mt-1",
                      children: [(isProfit ? "+" : "") + _fmt(netProfit), " đ"]
                    }),
                    c.jsxs("span", { className: "text-[10px] font-bold " + (isProfit ? "text-emerald-600" : "text-red-500") + " block truncate mt-0.5", children: [(isProfit ? "Lãi: +" : "Lỗ: ") + profitMarginPercent.toFixed(1), "%"] })
                  ]
                }),

                // Thẻ 5: Tồn quỹ / Thu về
                c.jsxs("div", {
                  className: "col-span-2 sm:col-span-1 p-3.5 bg-gradient-to-br from-indigo-900 to-blue-900 text-white rounded-2xl shadow-xs relative overflow-hidden",
                  children: [
                    c.jsx("span", { className: "text-[10px] font-black uppercase text-blue-200 block", children: "Tiền Mặt Thu Về" }),
                    c.jsxs("div", {
                      className: "text-sm sm:text-base font-black font-mono mt-1",
                      children: [_fmt(totalCashReturn), " đ"]
                    }),
                    c.jsx("span", { className: "text-[9px] text-blue-200/80 font-bold block truncate mt-0.5", children: "Vốn gốc + Lợi nhuận" })
                  ]
                })
              ]
            }),

            // =========================================================================
            // KHU VỰC 1: QUẢN LÝ NGUỒN VỐN TỰ ĐẦU TƯ (1 NGƯỜI TỰ BỎ VỐN 100%)
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
                          children: [c.jsx("span", { children: "1️⃣" }), "Nguồn Vốn Tự Bỏ Ra (Tự Doanh 100%)"]
                        }),
                        c.jsx("p", { className: "text-[11px] text-gray-500 font-semibold", children: "Một người tự đầu tư vốn, tự chịu trách nhiệm và thu trọn 100% lợi nhuận" })
                      ]
                    }),
                    c.jsxs("button", {
                      type: "button",
                      onClick: handleOpenEditCapital,
                      className: "px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer",
                      children: [c.jsx("span", { children: "✎" }), "Thay Đổi Số Vốn"]
                    })
                  ]
                }),

                // Big Solo Capital Display
                c.jsxs("div", {
                  className: "p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 rounded-3xl text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg",
                  children: [
                    c.jsxs("div", {
                      className: "space-y-1",
                      children: [
                        c.jsxs("div", {
                          className: "flex items-center gap-2",
                          children: [
                            c.jsx("span", { className: "px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-sm", children: "Chủ Vốn Độc Quyền" }),
                            c.jsxs("span", { className: "text-xs font-bold text-blue-100", children: ["👤 ", ownerName] })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "text-3xl sm:text-4xl font-black font-mono tracking-tight text-white",
                          children: [_fmt(totalCapital), " ", c.jsx("span", { className: "text-base font-sans font-bold text-blue-100", children: "VNĐ" })]
                        }),
                        c.jsx("p", { className: "text-xs text-blue-100/90 font-medium", children: "Vốn lưu động sẵn sàng dùng chi trả tiền tôm tại bờ ao và toàn bộ chi phí chuyến" })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/10",
                      children: [
                        c.jsx("span", { className: "text-[11px] font-bold text-blue-100 uppercase", children: "Tiến độ sử dụng vốn:" }),
                        c.jsxs("span", { className: "text-xl font-black font-mono text-white", children: [capitalUsagePercent, "%"] }),
                        c.jsxs("span", { className: "text-[10px] text-blue-200", children: ["Đã chi: ", _fmt(totalExpenses), " đ"] })
                      ]
                    })
                  ]
                }),

                // Capital Usage Progress Bar
                c.jsxs("div", {
                  className: "space-y-1.5",
                  children: [
                    c.jsxs("div", {
                      className: "flex justify-between text-xs font-bold text-gray-500",
                      children: [
                        c.jsxs("span", { children: ["Đã dùng: ", c.jsx("b", { className: "text-orange-600", children: _fmt(totalExpenses) + " đ" })] }),
                        c.jsxs("span", { children: ["Vốn còn lại trước bán: ", c.jsx("b", { className: (totalCapital - totalExpenses >= 0 ? "text-emerald-600" : "text-red-500"), children: _fmt(totalCapital - totalExpenses) + " đ" })] })
                      ]
                    }),
                    c.jsx("div", {
                      className: "h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden",
                      children: c.jsx("div", {
                        style: { width: Math.min(100, capitalUsagePercent) + "%" },
                        className: (capitalUsagePercent > 100 ? "bg-red-500" : "bg-gradient-to-r from-blue-500 to-indigo-600") + " h-full transition-all duration-500"
                      })
                    })
                  ]
                }),

                // Solo Investor Details Box
                c.jsxs("div", {
                  className: "p-4 bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs",
                  children: [
                    c.jsxs("div", {
                      className: "flex items-center gap-3",
                      children: [
                        c.jsx("div", { className: "w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0", children: "👤" }),
                        c.jsxs("div", {
                          children: [
                            c.jsxs("span", { className: "font-black text-sm text-gray-900 dark:text-white block", children: [ownerName, " (Tự bỏ vốn 100%)"] }),
                            c.jsx("span", { className: "text-gray-500 font-medium", children: "Toàn bộ tiền lãi ròng sẽ được thu về 100%, không phải phân chia cho đối tác nào." })
                          ]
                        })
                      ]
                    }),
                    c.jsxs("button", {
                      type: "button",
                      onClick: handleOpenEditCapital,
                      className: "px-3 py-1.5 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-xl font-bold hover:bg-blue-50 cursor-pointer text-xs shrink-0",
                      children: ["Sửa vốn tự bỏ"]
                    })
                  ]
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
                      className: "flex justify-between items-center pt-1 border-t border-orange-200/60 dark:border-orange-900/40",
                      children: [
                        c.jsx("span", { className: "text-xs font-bold text-gray-500", children: "Tổng cộng từ phiếu cân:" }),
                        c.jsxs("span", { className: "text-xl font-black font-mono text-orange-600 dark:text-orange-400", children: [_fmt(shrimpPurchaseMoney), " đ"] })
                      ]
                    }) : c.jsxs("div", {
                      className: "pt-1 space-y-1",
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

                // Chi Phí Vận Hành (Expenses List)
                c.jsxs("div", {
                  className: "space-y-2",
                  children: [
                    c.jsxs("div", {
                      className: "flex justify-between items-center text-xs font-bold text-gray-500 pt-1",
                      children: [
                        c.jsx("span", { children: "Chi Phí Vận Hành Khác (" + expenses.length + "):" }),
                        c.jsxs("span", { className: "font-mono font-black text-gray-800 dark:text-gray-200", children: ["Tổng: ", _fmt(totalOperationExpenses), " đ"] })
                      ]
                    }),
                    expenses.length === 0 ? c.jsx("div", {
                      className: "p-4 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-center text-gray-400 text-xs italic",
                      children: "Chưa có chi phí vận hành nào. Bấm nút '+ Thêm Chi Phí' phía trên."
                    }) : expenses.map(exp => c.jsxs("div", {
                      key: exp.id,
                      className: "p-3 bg-gray-50 dark:bg-gray-800/70 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 text-xs",
                      children: [
                        c.jsxs("div", {
                          className: "flex items-center gap-2.5",
                          children: [
                            c.jsx("div", { className: "w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0", children: "📝" }),
                            c.jsxs("div", {
                              children: [
                                c.jsx("span", { className: "font-black text-gray-900 dark:text-white block", children: exp.category }),
                                exp.note && c.jsx("span", { className: "text-[10px] text-gray-500 block", children: exp.note })
                              ]
                            })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "flex items-center gap-2",
                          children: [
                            c.jsxs("span", { className: "font-black font-mono text-sm text-gray-900 dark:text-white", children: [_fmt(exp.amount), " đ"] }),
                            c.jsx("button", {
                              type: "button",
                              onClick: () => handleOpenEditExpense(exp),
                              className: "p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg cursor-pointer",
                              title: "Sửa chi phí",
                              children: c.jsx("span", { children: "✎" })
                            }),
                            c.jsx("button", {
                              type: "button",
                              onClick: () => handleDeleteExpense(exp.id),
                              className: "p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer",
                              title: "Xóa chi phí",
                              children: c.jsx(xm, { size: 16 })
                            })
                          ]
                        })
                      ]
                    }))
                  ]
                }),

                // Total Expense Summary Footer
                c.jsxs("div", {
                  className: "p-3 bg-orange-100/50 dark:bg-orange-950/40 rounded-2xl flex justify-between items-center text-xs font-black border border-orange-200 dark:border-orange-900",
                  children: [
                    c.jsx("span", { className: "uppercase text-orange-900 dark:text-orange-200", children: "Tổng Toàn Bộ Chi Phí:" }),
                    c.jsxs("span", { className: "text-lg font-mono text-orange-700 dark:text-orange-300", children: [_fmt(totalExpenses), " VNĐ"] })
                  ]
                })
              ]
            }),

            // =========================================================================
            // KHU VỰC 3: DOANH THU XUẤT BÁN (TIỀN THU VỀ)
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
                          children: [c.jsx("span", { children: "3️⃣" }), "Doanh Thu Xuất Bán (Tiền Thu)"]
                        }),
                        c.jsx("p", { className: "text-[11px] text-gray-500 font-semibold", children: "Tự động lấy từ đơn bán lẻ, chợ đầu mối và công ty xuất khẩu" })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "flex items-center gap-2",
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
                        c.jsx("span", { className: "font-black text-xs uppercase text-emerald-900 dark:text-emerald-200 block", children: "Tổng Doanh Thu Bán Tôm" }),
                        c.jsxs("span", { className: "text-[10px] text-gray-500", children: [effectiveSales.length, " đơn bán • ", _fmtKg(autoRevenueKg), " kg đã xuất"] })
                      ]
                    }),
                    c.jsxs("span", { className: "text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400", children: [_fmt(totalRevenue), " đ"] })
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
            // KHU VỰC 4: QUYẾT TOÁN LỜI / LỖ & 100% THU LỢI NHUẬN VỀ CHO CHỦ VỐN
            // =========================================================================
            c.jsxs("div", {
              className: "bg-white dark:bg-gray-900 p-5 rounded-[32px] border-2 border-indigo-500/30 dark:border-indigo-500/20 shadow-xl space-y-5",
              children: [
                c.jsxs("div", {
                  className: "border-b border-gray-100 dark:border-gray-800 pb-3",
                  children: [
                    c.jsxs("h2", {
                      className: "text-base font-black uppercase tracking-tight text-gray-900 dark:text-white flex items-center gap-2",
                      children: [c.jsx("span", { children: "4️⃣" }), "Bảng Quyết Toán & Thu Lợi Nhuận (100% Thu Về)"]
                    }),
                    c.jsx("p", { className: "text-xs text-gray-500 font-semibold", children: "Lợi nhuận ròng = Doanh Thu Bán Tôm - Tổng Chi Phí. Toàn bộ tiền lời thu về cho chủ vốn." })
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
                        c.jsx("span", { className: "text-[10px] font-bold text-gray-500 block uppercase", children: "Tỷ suất sinh lời / Chi phí" }),
                        c.jsxs("span", {
                          className: "text-xl font-black font-mono " + (isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"),
                          children: [isProfit ? "+" : "", profitMarginPercent.toFixed(1), "%"]
                        })
                      ]
                    })
                  ]
                }),

                // Solo Settlement Table (Đối Soát Dòng Tiền Độc Quyền)
                c.jsxs("div", {
                  className: "space-y-3",
                  children: [
                    c.jsx("span", { className: "text-xs font-black uppercase text-gray-700 dark:text-gray-300 block", children: "Bảng Chi Tiết Quyết Toán Dòng Tiền & Thu Về:" }),
                    c.jsx("div", {
                      className: "overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800",
                      children: c.jsxs("table", {
                        className: "w-full text-left text-xs border-collapse",
                        children: [
                          c.jsx("thead", {
                            className: "bg-gray-100 dark:bg-gray-800 text-[10px] font-black uppercase text-gray-500",
                            children: c.jsxs("tr", {
                              children: [
                                c.jsx("th", { className: "p-3", children: "Khoản Mục Hạch Toán" }),
                                c.jsx("th", { className: "p-3 text-right", children: "Số Tiền (VNĐ)" }),
                                c.jsx("th", { className: "p-3", children: "Ý Nghĩa Dòng Tiền" })
                              ]
                            })
                          }),
                          c.jsxs("tbody", {
                            className: "divide-y divide-gray-100 dark:border-gray-800 font-bold",
                            children: [
                              // Row 1: Vốn tự bỏ ban đầu
                              c.jsxs("tr", {
                                className: "hover:bg-gray-50 dark:hover:bg-gray-800/40",
                                children: [
                                  c.jsxs("td", { className: "p-3", children: [c.jsx("span", { className: "text-blue-600 font-black", children: "1. Vốn tự bỏ ra ban đầu" }), c.jsx("span", { className: "block text-[10px] text-gray-400", children: "Chủ vốn: " + ownerName })] }),
                                  c.jsxs("td", { className: "p-3 text-right font-mono font-black text-gray-900 dark:text-white", children: [_fmt(totalCapital), " đ"] }),
                                  c.jsx("td", { className: "p-3 text-gray-500 text-[11px]", children: "Quỹ tiền mặt tự chuẩn bị thu mua" })
                                ]
                              }),
                              // Row 2: Tiền mua tôm
                              c.jsxs("tr", {
                                className: "hover:bg-gray-50 dark:hover:bg-gray-800/40",
                                children: [
                                  c.jsxs("td", { className: "p-3", children: [c.jsx("span", { className: "text-orange-600 font-black", children: "2. Tiền chi mua tôm tại ao" }), c.jsx("span", { className: "block text-[10px] text-gray-400", children: effectiveSessions.length + " phiếu cân (" + _fmtKg(autoShrimpPurchaseKg) + " kg)" })] }),
                                  c.jsxs("td", { className: "p-3 text-right font-mono font-black text-orange-600", children: ["- ", _fmt(shrimpPurchaseMoney), " đ"] }),
                                  c.jsx("td", { className: "p-3 text-gray-500 text-[11px]", children: "Đã chi trả tại bờ ao" })
                                ]
                              }),
                              // Row 3: Chi phí vận hành
                              c.jsxs("tr", {
                                className: "hover:bg-gray-50 dark:hover:bg-gray-800/40",
                                children: [
                                  c.jsxs("td", { className: "p-3", children: [c.jsx("span", { className: "text-orange-600 font-black", children: "3. Chi phí vận hành chuyến" }), c.jsx("span", { className: "block text-[10px] text-gray-400", children: expenses.length + " khoản chi (xe, công, oxy, phà...)" })] }),
                                  c.jsxs("td", { className: "p-3 text-right font-mono font-black text-orange-600", children: ["- ", _fmt(totalOperationExpenses), " đ"] }),
                                  c.jsx("td", { className: "p-3 text-gray-500 text-[11px]", children: "Chi phí nhân sự & vận chuyển" })
                                ]
                              }),
                              // Row 4: Tổng doanh thu
                              c.jsxs("tr", {
                                className: "hover:bg-gray-50 dark:hover:bg-gray-800/40",
                                children: [
                                  c.jsxs("td", { className: "p-3", children: [c.jsx("span", { className: "text-emerald-600 font-black", children: "4. Tổng doanh thu xuất bán" }), c.jsx("span", { className: "block text-[10px] text-gray-400", children: effectiveSales.length + " đơn bán (" + _fmtKg(autoRevenueKg) + " kg)" })] }),
                                  c.jsxs("td", { className: "p-3 text-right font-mono font-black text-emerald-600", children: ["+ ", _fmt(totalRevenue), " đ"] }),
                                  c.jsx("td", { className: "p-3 text-gray-500 text-[11px]", children: "Tiền bán tôm thu về" })
                                ]
                              }),
                              // Row 5: Lợi nhuận ròng
                              c.jsxs("tr", {
                                className: "bg-purple-50/50 dark:bg-purple-950/20 font-black text-xs border-t-2 border-purple-200 dark:border-purple-800",
                                children: [
                                  c.jsxs("td", { className: "p-3", children: [c.jsx("span", { className: "text-purple-700 dark:text-purple-300 uppercase", children: "5. LỢI NHUẬN RÒNG (100% THU VỀ)" }), c.jsx("span", { className: "block text-[10px] text-purple-600", children: "Doanh thu trừ Tổng chi phí" })] }),
                                  c.jsxs("td", { className: "p-3 text-right font-mono text-sm " + (isProfit ? "text-emerald-600" : "text-red-600"), children: [(isProfit ? "+" : "") + _fmt(netProfit), " đ"] }),
                                  c.jsxs("td", { className: "p-3 text-purple-700 dark:text-purple-300 text-[11px]", children: [ownerName, " thu trọn 100%"] })
                                ]
                              }),
                              // Row 6: Tổng tiền mặt thu về
                              c.jsxs("tr", {
                                className: "bg-blue-100/60 dark:bg-blue-900/40 font-black text-xs border-t-2 border-blue-400 dark:border-blue-600",
                                children: [
                                  c.jsxs("td", { className: "p-3 uppercase text-blue-950 dark:text-blue-100", children: [c.jsx("span", { children: "💰 TỔNG TIỀN MẶT CẦN THU VỀ" }), c.jsx("span", { className: "block text-[10px] text-blue-700 dark:text-blue-300 font-normal", children: "Vốn tự bỏ ban đầu + Lợi nhuận ròng" })] }),
                                  c.jsxs("td", { className: "p-3 text-right font-mono text-base text-blue-800 dark:text-blue-200", children: [_fmt(totalCashReturn), " VNĐ"] }),
                                  c.jsx("td", { className: "p-3 text-blue-700 dark:text-blue-300 text-[11px]", children: "Tổng tiền mặt thực tế trong tay" })
                                ]
                              })
                            ]
                          })
                        ]
                      })
                    }),
                    // Guarantee message
                    c.jsxs("div", {
                      className: "p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-200",
                      children: [
                        c.jsx("span", { className: "text-lg shrink-0", children: "🏆" }),
                        c.jsxs("p", {
                          className: "font-semibold leading-relaxed",
                          children: [
                            "Mô hình Tự Doanh: Toàn bộ ",
                            c.jsx("strong", { children: _fmt(netProfit) + " VNĐ" }),
                            " tiền lợi nhuận ròng của chuyến thu mua này thuộc về ",
                            c.jsx("strong", { children: ownerName }),
                            ". Hệ thống đã đồng bộ tự động số tiền cân tôm, chi phí và đơn xuất bán."
                          ]
                        })
                      ]
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
                        c.jsx("span", { className: "text-lg", children: "📲" }),
                        "Chia Sẻ Quyết Toán Qua Zalo"
                      ]
                    }),
                    c.jsxs("button", {
                      type: "button",
                      onClick: handleSettleAndArchiveTrip,
                      className: "flex-1 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black rounded-2xl text-sm uppercase italic flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer",
                      children: [
                        c.jsx("span", { className: "text-lg", children: "🔒" }),
                        "Khóa & Lưu Chuyến Vào Lịch Sử"
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
      // MODAL 1: SỬA VỐN TỰ BỎ & CHỦ ĐẦU TƯ
      // =========================================================================
      showCapitalModal && c.jsx("div", {
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4",
          children: [
            c.jsx("h3", {
              className: "font-black text-base uppercase text-gray-900 dark:text-white flex items-center gap-2",
              children: "💼 Thiết Lập Nguồn Vốn Tự Bỏ"
            }),
            c.jsxs("div", {
              className: "space-y-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-xs font-bold text-gray-500 mb-1 block uppercase", children: "Tên chủ đầu tư / người tự bỏ vốn *" }),
                    c.jsx("input", {
                      type: "text",
                      placeholder: "VD: Lê Văn Mừng (Chủ vựa)",
                      value: capitalFormOwner,
                      onChange: e => setCapitalFormOwner(e.target.value),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm outline-none focus:border-indigo-500"
                    })
                  ]
                }),
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-xs font-bold text-gray-500 mb-1 block uppercase", children: "Số tiền vốn tự chuẩn bị (VNĐ) *" }),
                    c.jsx("input", {
                      type: "number",
                      placeholder: "VD: 150000000",
                      value: capitalFormAmount,
                      onChange: e => setCapitalFormAmount(e.target.value),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-lg font-mono outline-none focus:border-indigo-500"
                    }),
                    // Quick amount chips
                    c.jsxs("div", {
                      className: "flex flex-wrap gap-1.5 mt-2",
                      children: [
                        [50000000, "50tr"],
                        [100000000, "100tr"],
                        [150000000, "150tr"],
                        [200000000, "200tr"],
                        [300000000, "300tr"],
                        [500000000, "500tr"]
                      ].map(([val, label]) => c.jsx("button", {
                        key: val,
                        type: "button",
                        onClick: () => setCapitalFormAmount(String(val)),
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
                  onClick: () => setShowCapitalModal(false),
                  className: "px-4 py-2.5 bg-gray-200 dark:bg-gray-700 rounded-xl font-bold text-xs",
                  children: "Hủy"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: handleSaveCapital,
                  className: "px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase shadow-md",
                  children: "Lưu Số Vốn"
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
                        className: "p-2 rounded-xl text-[11px] font-bold text-left transition-all border " + (expenseFormCat === cat.label ? "bg-orange-50 dark:bg-orange-950/40 border-orange-500 text-orange-900 dark:text-orange-200" : "bg-gray-50 dark:bg-gray-700/60 border-transparent text-gray-700 dark:text-gray-300"),
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
            c.jsx("h3", { className: "font-black text-base uppercase text-gray-900 dark:text-white", children: "⚙️ Thiết Lập Chuyến Tự Doanh" }),
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
                        ownerName: ownerName,
                        capitalAmount: totalCapital,
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
      // MODAL 6: LỊCH SỬ CÁC CHUYẾN ĐÃ LƯU
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
                  className: "p-1.5 text-gray-400 hover:text-gray-600 rounded-full",
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
                        className: "px-2 py-0.5 rounded-md text-[10px] font-black uppercase " + (st.isProfit ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"),
                        children: st.isProfit ? "LỜI" : "LỖ"
                      })
                    ]
                  }),
                  c.jsxs("div", {
                    className: "grid grid-cols-3 gap-2 text-[11px] text-gray-500 font-bold",
                    children: [
                      c.jsxs("div", { children: ["Vốn tự bỏ: ", c.jsx("b", { className: "text-gray-800 dark:text-gray-200", children: _fmt(st.totalCapital || st.capitalAmount) })] }),
                      c.jsxs("div", { children: ["Chi: ", c.jsx("b", { className: "text-red-600", children: _fmt(st.totalExpenses) })] }),
                      c.jsxs("div", { children: ["Thu: ", c.jsx("b", { className: "text-green-600", children: _fmt(st.totalRevenue) })] })
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
                            className: "px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer",
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
                    c.jsxs("p", { className: "text-xs text-gray-500 font-bold", children: ["Ngày: ", viewingSavedTrip.startDate, " • Chủ vốn: ", viewingSavedTrip.ownerName || "Chủ vựa"] })
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
                  className: "p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl grid grid-cols-2 gap-3 font-bold",
                  children: [
                    c.jsxs("div", { children: ["Vốn tự bỏ: ", c.jsx("b", { className: "text-blue-600 font-mono", children: _fmt(viewingSavedTrip.totalCapital || viewingSavedTrip.capitalAmount) + " đ" })] }),
                    c.jsxs("div", { children: ["Tổng chi phí: ", c.jsx("b", { className: "text-red-600 font-mono", children: _fmt(viewingSavedTrip.totalExpenses) + " đ" })] }),
                    c.jsxs("div", { children: ["Tổng doanh thu: ", c.jsx("b", { className: "text-green-600 font-mono", children: _fmt(viewingSavedTrip.totalRevenue) + " đ" })] }),
                    c.jsxs("div", { children: ["Lợi nhuận ròng: ", c.jsx("b", { className: (viewingSavedTrip.isProfit ? "text-green-600" : "text-red-600") + " font-mono", children: [(viewingSavedTrip.isProfit ? "+" : "") + _fmt(viewingSavedTrip.netProfit) + " đ"] })] })
                  ]
                }),
                // Solo Settlement Details
                c.jsxs("div", {
                  className: "p-4 bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-800 space-y-2",
                  children: [
                    c.jsx("span", { className: "font-black uppercase text-blue-900 dark:text-blue-200 block text-xs", children: "🏆 Kết Quả Tài Chính Tự Doanh:" }),
                    c.jsxs("div", {
                      className: "flex justify-between items-center text-xs font-bold",
                      children: [
                        c.jsx("span", { children: "Lợi nhuận ròng (100% thu về):" }),
                        c.jsxs("span", { className: "font-mono " + (viewingSavedTrip.isProfit ? "text-emerald-600" : "text-red-600"), children: [(viewingSavedTrip.isProfit ? "+" : "") + _fmt(viewingSavedTrip.netProfit) + " VNĐ"] })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "flex justify-between items-center text-xs font-black pt-2 border-t border-blue-200 dark:border-blue-800",
                      children: [
                        c.jsx("span", { className: "text-blue-950 dark:text-blue-100", children: "Tổng tiền mặt cần thu về (Vốn + Lãi):" }),
                        c.jsxs("span", { className: "font-mono text-sm text-blue-700 dark:text-blue-300", children: [_fmt(viewingSavedTrip.totalCashReturn || ((viewingSavedTrip.totalCapital || viewingSavedTrip.capitalAmount || 0) + (viewingSavedTrip.netProfit || 0))), " VNĐ"] })
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

bundle = bundle.slice(0, pStart) + soloFinanceComponent + "\n\n" + bundle.slice(pEnd);
fs.writeFileSync(bundlePath, bundle, "utf8");
console.log("Replaced Xm_FinanceScreen with Solo Capital & 100% Profit component successfully!");

// 4. Synchronize all bundle files
const copies = [
  path.join(__dirname, "../public/assets/index-v7.js"),
  path.join(__dirname, "../assets/index-Os1X4Z7e.js"),
  path.join(__dirname, "../public/assets/index-Os1X4Z7e.js")
];

for (const copyPath of copies) {
  fs.writeFileSync(copyPath, bundle, "utf8");
  console.log("Synchronized bundle to:", copyPath);
}

// 5. Bump cache version in index.html and sw.js
let indexHtml = fs.readFileSync("index.html", "utf8");
indexHtml = indexHtml.replace("/assets/index-v7.js?v=20261017_v14", "/assets/index-v7.js?v=20261017_v15");
indexHtml = indexHtml.replace("/sw.js?v=14", "/sw.js?v=15");
indexHtml = indexHtml.replace("vuatomcangxanh-v14", "vuatomcangxanh-v15");
fs.writeFileSync("index.html", indexHtml, "utf8");
console.log("Bumped index.html to v15");

let sw = fs.readFileSync("sw.js", "utf8");
sw = sw.replaceAll("vuatomcangxanh-v14", "vuatomcangxanh-v15");
fs.writeFileSync("sw.js", sw, "utf8");
fs.writeFileSync("public/sw.js", sw, "utf8");
console.log("Bumped sw.js to v15");

console.log("ALL DONE!");
