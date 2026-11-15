const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = process.cwd();
const targetFile = path.join(root, "assets/index-v7.js");
let code = fs.readFileSync(targetFile, "utf8");

function replaceExact(label, oldStr, newStr) {
  const idx = code.indexOf(oldStr);
  if (idx === -1) {
    throw new Error("Could not find anchor for: " + label);
  }
  const secondIdx = code.indexOf(oldStr, idx + oldStr.length);
  if (secondIdx !== -1) {
    throw new Error("Multiple matches found for: " + label);
  }
  code = code.slice(0, idx) + newStr + code.slice(idx + oldStr.length);
  console.log("✔ Applied:", label);
}

// 1. Auto-sync hook inside Cs (deleteSession, addSession, addFarmer, deleteFarmer)
replaceExact(
  "Cs session & farmer auto-sync hooks",
  `static deleteSession(b){const p=this.getSessions().filter(f=>f.id!==b);this.save(Ot.SESSIONS,p)}static addSession(b){const p=this.checkQuota("SESSIONS");if(!p.canAdd)return alert(p.message),!1;const f=this.getSessions();return f.unshift(b),this.save(Ot.SESSIONS,f),!0}`,
  `static syncActiveTripAfterSession(sessionId,isDelete){try{const raw=localStorage.getItem(Ot.FINANCE);if(!raw)return;const fin=JSON.parse(raw);if(!fin||!fin.activeTrip)return;const at=fin.activeTrip;if(isDelete){if(Array.isArray(at.selectedSessionIds)){at.selectedSessionIds=at.selectedSessionIds.filter(id=>id!==sessionId);}if(Array.isArray(at.archivedSessionIds)){at.archivedSessionIds=at.archivedSessionIds.filter(id=>id!==sessionId);}}else{at.shrimpPurchaseAuto=true;if(Array.isArray(at.archivedSessionIds)){at.archivedSessionIds=at.archivedSessionIds.filter(id=>id!==sessionId);}if(Array.isArray(at.selectedSessionIds)&&sessionId&&!at.selectedSessionIds.includes(sessionId)){at.selectedSessionIds=[...at.selectedSessionIds,sessionId];}}localStorage.setItem(Ot.FINANCE,JSON.stringify(fin));}catch(e){}}static deleteSession(b){const p=this.getSessions().filter(f=>f.id!==b);this.syncActiveTripAfterSession(b,true);this.save(Ot.SESSIONS,p)}static addSession(b){const p=this.checkQuota("SESSIONS");if(!p.canAdd)return alert(p.message),!1;const f=this.getSessions();f.unshift(b);this.syncActiveTripAfterSession(b&&b.id,false);this.save(Ot.SESSIONS,f);return !0}`
);

// 2. Include pondId in Om newSession and avoid wiping selectedSessionIds / archivedSessionIds unnecessarily
replaceExact(
  "Om handleConfirmSaveSession pondId & clean finance auto-sync",
  `      tareSpec: \`100kg tôm trừ bì \${tarePer100Kg} kg\`, tareWeight: Z, tarePer100Kg: tarePer100Kg,
      contractId: A.contractId
    };`,
  `      tareSpec: \`100kg tôm trừ bì \${tarePer100Kg} kg\`, tareWeight: Z, tarePer100Kg: tarePer100Kg,
      contractId: A.contractId || "",
      pondId: A.pondId || ""
    };`
);

replaceExact(
  "Om handleConfirmSaveSession preserve archivedSessionIds",
  `    // Auto sync with finance data
    try {
      const fin = me.getFinanceData();
      if (fin && fin.activeTrip) {
        fin.activeTrip.shrimpPurchaseAuto = true;
        fin.activeTrip.selectedSessionIds = null;
        me.saveFinanceData(fin);
      }
    } catch(e) {}`,
  `    // Auto sync with finance data (me.addSession already synced sessionId, ensure auto flag is active)
    try {
      const fin = me.getFinanceData();
      if (fin && fin.activeTrip) {
        fin.activeTrip.shrimpPurchaseAuto = true;
        me.saveFinanceData(fin);
      }
    } catch(e) {}`
);

// 3. Shared Finance auto-calculation engine + Sales auto-sync hooks (lines ~9640-9802)
replaceExact(
  "me sales auto-sync + getFinanceData + getFinanceSummary + getRemainingCapital",
  `me.updateSale = function(id, updates) {
  const list = me.getSales();
  const index = list.findIndex(s => s.id === id);
  if (index !== -1) {
    list[index] = { ...list[index], ...updates };
    me.saveSales(list);
    return list[index];
  }
  return null;
};
me.addSale = function(sale) {
  const list = me.getSales();
  list.unshift(sale);
  me.saveSales(list);
  return sale;
};

me.deleteSale = function(id) {
  const list = me.getSales().filter(s => s.id !== id);
  me.saveSales(list);
};


me.getFinanceData = function() {
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
      startDate: getLocalYYYYMMDD_v4(),
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
    emitAppDataUpdated_v4(Ot.FINANCE);
    if (typeof me !== "undefined" && me.syncAllToCloud) me.syncAllToCloud();
  } catch(e) {
    console.warn("Save finance data error", e);
  }
};

me.getFinanceSummary = function() {
  try {
    const fin = me.getFinanceData();
    const trip = (fin && fin.activeTrip) || {};
    const tripDate = trip.startDate || getLocalYYYYMMDD_v4();
    const filterMode = trip.filterMode || "DATE";
    const sessions = (me.getSessions && me.getSessions()) || [];
    const filteredSessions = sessions.filter(s => filterMode === "ALL" ? true : (s.date && isSameLocalDate_v4(s.date, tripDate)));
    const effectiveSessions = Array.isArray(trip.selectedSessionIds)
      ? filteredSessions.filter(s => trip.selectedSessionIds.includes(s.id))
      : filteredSessions;
    const autoBuyMoney = effectiveSessions.reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);
    const totalBuyKg = effectiveSessions.reduce((acc, s) => acc + Number(s.totalNet || s.totalGross || 0), 0);
    const shrimpPurchaseMoney = trip.shrimpPurchaseAuto !== false ? autoBuyMoney : Number(trip.shrimpPurchaseManualAmount || 0);

    const allTx = trip.expenses || [];
    const totalOperationExpenses = allTx.filter(t => t.type !== "INCOME").reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const totalExtraIncome = allTx.filter(t => t.type === "INCOME").reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const totalExpenses = shrimpPurchaseMoney + totalOperationExpenses;

    const sales = (me.getSales && me.getSales()) || [];
    const completedSales = sales.filter(s => s.status === "COMPLETED" || s.status === "SETTLED" || s.isPaidFull);
    const filteredSales = completedSales.filter(s => filterMode === "ALL" ? true : (s.date && isSameLocalDate_v4(s.date, tripDate)));
    const effectiveSales = Array.isArray(trip.selectedSaleIds)
      ? filteredSales.filter(s => trip.selectedSaleIds.includes(s.id))
      : filteredSales;
    const autoRevenueMoney = effectiveSales.reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);
    const revenueKg = effectiveSales.reduce((acc, s) => acc + Number(s.totalNet || s.totalGross || 0), 0);
    const baseRevenue = trip.revenueAuto !== false ? autoRevenueMoney : Number(trip.revenueManualAmount || 0);
    const totalRevenue = baseRevenue + totalExtraIncome;
    const netProfit = totalRevenue - totalExpenses;
    return {
      tripDate,
      filterMode,
      shrimpPurchaseMoney,
      totalBuyKg,
      totalOperationExpenses,
      totalExtraIncome,
      totalExpenses,
      baseRevenue,
      totalRevenue,
      revenueKg,
      netProfit,
      isProfit: netProfit >= 0,
      sessionCount: effectiveSessions.length,
      saleCount: effectiveSales.length,
      txCount: allTx.length
    };
  } catch (e) {
    return {
      tripDate: getLocalYYYYMMDD_v4(),
      filterMode: "DATE",
      shrimpPurchaseMoney: 0,
      totalBuyKg: 0,
      totalOperationExpenses: 0,
      totalExtraIncome: 0,
      totalExpenses: 0,
      baseRevenue: 0,
      totalRevenue: 0,
      revenueKg: 0,
      netProfit: 0,
      isProfit: true,
      sessionCount: 0,
      saleCount: 0,
      txCount: 0
    };
  }
};

me.getRemainingCapital = function() {
  try {
    const fin = me.getFinanceData();
    const trip = (fin && fin.activeTrip) || {};
    const totalCapital = Number(trip.capitalAmount !== undefined ? trip.capitalAmount : 150000000) || 150000000;
    const sum = me.getFinanceSummary();
    return totalCapital - sum.totalExpenses + sum.totalRevenue;
  } catch(e) {
    return 150000000;
  }
};`,
  `me.syncActiveTripAfterSale = function(saleId, isDelete) {
  try {
    const raw = localStorage.getItem(Ot.FINANCE);
    if (!raw) return;
    const fin = JSON.parse(raw);
    if (!fin || !fin.activeTrip) return;
    const at = fin.activeTrip;
    if (isDelete) {
      if (Array.isArray(at.selectedSaleIds)) {
        at.selectedSaleIds = at.selectedSaleIds.filter(id => id !== saleId);
      }
      if (Array.isArray(at.archivedSaleIds)) {
        at.archivedSaleIds = at.archivedSaleIds.filter(id => id !== saleId);
      }
    } else {
      at.revenueAuto = true;
      if (Array.isArray(at.archivedSaleIds)) {
        at.archivedSaleIds = at.archivedSaleIds.filter(id => id !== saleId);
      }
      if (Array.isArray(at.selectedSaleIds) && saleId && !at.selectedSaleIds.includes(saleId)) {
        at.selectedSaleIds = [...at.selectedSaleIds, saleId];
      }
    }
    localStorage.setItem(Ot.FINANCE, JSON.stringify(fin));
  } catch(e) {}
};

me.updateSale = function(id, updates) {
  const list = me.getSales();
  const index = list.findIndex(s => s.id === id);
  if (index !== -1) {
    list[index] = { ...list[index], ...updates };
    me.syncActiveTripAfterSale(id, false);
    me.saveSales(list);
    return list[index];
  }
  return null;
};
me.addSale = function(sale) {
  const list = me.getSales();
  list.unshift(sale);
  me.syncActiveTripAfterSale(sale && sale.id, false);
  me.saveSales(list);
  return sale;
};

me.deleteSale = function(id) {
  const list = me.getSales().filter(s => s.id !== id);
  me.syncActiveTripAfterSale(id, true);
  me.saveSales(list);
};

// Shared breakdown helpers for sales & unweighed pond deposits
function getFinanceSaleBreakdown_v4(s) {
  if (!s) return { realizedMoney: 0, debtMoney: 0, isCompleted: false, isPendingSettlement: false };
  const totalMoney = Number(s.totalMoney || 0);
  const paidAmount = Number(s.paidAmount || 0);
  const remainingDebt = Number(s.remainingDebt || 0);
  const isCompleted = s.status === "COMPLETED" || s.status === "SETTLED" || !!s.isPaidFull;
  const isPendingSettlement = !isCompleted && (s.status === "SELLING" || s.status === "PENDING_SETTLEMENT" || s.status === "AWAITING_RESULT");
  if (isCompleted) {
    return { realizedMoney: totalMoney, debtMoney: 0, isCompleted: true, isPendingSettlement: false };
  }
  if (isPendingSettlement) {
    const realized = paidAmount > 0 ? paidAmount : 0;
    return { realizedMoney: realized, debtMoney: 0, isCompleted: false, isPendingSettlement: true };
  }
  let realized = 0;
  if (paidAmount > 0) {
    realized = totalMoney > 0 ? Math.min(totalMoney, paidAmount) : paidAmount;
  } else if (totalMoney > 0 && remainingDebt > 0) {
    realized = Math.max(0, totalMoney - remainingDebt);
  }
  const debt = Math.max(0, totalMoney - realized);
  return { realizedMoney: realized, debtMoney: debt, isCompleted: false, isPendingSettlement: false };
}

function getUnweighedDepositFarmers_v4(farmersList, sessionsList) {
  const farmers = Array.isArray(farmersList) ? farmersList : [];
  const sessions = Array.isArray(sessionsList) ? sessionsList : [];
  return farmers.filter(fm => {
    if (!fm || fm.weighed || fm.status === "WEIGHED") return false;
    const dep = Number(fm.defaultDeposit || 0);
    if (dep <= 0) return false;
    const alreadyWeighedSession = sessions.some(s =>
      (fm.sessionId && s.id === fm.sessionId) ||
      (fm.contractId && s.contractId === fm.contractId) ||
      (fm.id && s.pondId === fm.id)
    );
    return !alreadyWeighedSession;
  });
}

me.getFinanceData = function() {
  try {
    const raw = localStorage.getItem(Ot.FINANCE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.activeTrip) {
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
        if (!at.filterMode) {
          at.filterMode = "ALL";
        }
        if (at.includePondDeposits === undefined) {
          at.includePondDeposits = true;
        }
        if (!Array.isArray(at.archivedSessionIds)) {
          at.archivedSessionIds = [];
        }
        if (!Array.isArray(at.archivedSaleIds)) {
          at.archivedSaleIds = [];
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
      startDate: getLocalYYYYMMDD_v4(),
      ownerName: ownerName,
      capitalAmount: 150000000,
      filterMode: "ALL",
      includePondDeposits: true,
      archivedSessionIds: [],
      archivedSaleIds: [],
      shrimpPurchaseAuto: true,
      shrimpPurchaseManualAmount: 0,
      selectedSessionIds: null,
      expenses: [],
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
    emitAppDataUpdated_v4(Ot.FINANCE);
    if (typeof me !== "undefined" && me.syncAllToCloud) me.syncAllToCloud();
  } catch(e) {
    console.warn("Save finance data error", e);
  }
};

me.getFinanceSummary = function() {
  try {
    const fin = me.getFinanceData();
    const trip = (fin && fin.activeTrip) || {};
    const tripDate = trip.startDate || getLocalYYYYMMDD_v4();
    const filterMode = trip.filterMode || "ALL";
    const archivedSessionSet = new Set(Array.isArray(trip.archivedSessionIds) ? trip.archivedSessionIds : []);
    const archivedSaleSet = new Set(Array.isArray(trip.archivedSaleIds) ? trip.archivedSaleIds : []);

    const sessions = (me.getSessions && me.getSessions()) || [];
    const openSessions = sessions.filter(s => s && !archivedSessionSet.has(s.id));
    const filteredSessions = openSessions.filter(s => filterMode === "ALL" ? true : (s.date && isSameLocalDate_v4(s.date, tripDate)));
    const effectiveSessions = Array.isArray(trip.selectedSessionIds)
      ? filteredSessions.filter(s => trip.selectedSessionIds.includes(s.id))
      : filteredSessions;
    const autoBuyMoney = effectiveSessions.reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);
    const totalBuyKg = effectiveSessions.reduce((acc, s) => acc + Number(s.totalNet || s.totalGross || 0), 0);
    const shrimpPurchaseMoney = trip.shrimpPurchaseAuto !== false ? autoBuyMoney : Number(trip.shrimpPurchaseManualAmount || 0);

    const farmers = (me.getFarmers && me.getFarmers()) || [];
    const unweighedDepositFarmers = getUnweighedDepositFarmers_v4(farmers, sessions);
    const unweighedDepositsTotal = unweighedDepositFarmers.reduce((acc, fm) => acc + Number(fm.defaultDeposit || 0), 0);
    const includePondDeposits = trip.includePondDeposits !== false;
    const countedPondDeposits = includePondDeposits ? unweighedDepositsTotal : 0;

    const allTx = trip.expenses || [];
    const totalOperationExpenses = allTx.filter(t => t.type !== "INCOME").reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const totalExtraIncome = allTx.filter(t => t.type === "INCOME").reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const totalExpenses = shrimpPurchaseMoney + countedPondDeposits + totalOperationExpenses;

    const sales = (me.getSales && me.getSales()) || [];
    const openSales = sales.filter(s => s && !archivedSaleSet.has(s.id));
    const revenueCandidateSales = openSales.filter(s => {
      const bd = getFinanceSaleBreakdown_v4(s);
      return bd.isCompleted || bd.realizedMoney > 0;
    });
    const filteredSales = revenueCandidateSales.filter(s => filterMode === "ALL" ? true : (s.date && isSameLocalDate_v4(s.date, tripDate)));
    const effectiveSales = Array.isArray(trip.selectedSaleIds)
      ? filteredSales.filter(s => trip.selectedSaleIds.includes(s.id))
      : filteredSales;

    const autoRevenueMoney = effectiveSales.reduce((acc, s) => acc + getFinanceSaleBreakdown_v4(s).realizedMoney, 0);
    const revenueKg = effectiveSales.reduce((acc, s) => acc + Number(s.totalNet || s.totalGross || 0), 0);
    const baseRevenue = trip.revenueAuto !== false ? autoRevenueMoney : Number(trip.revenueManualAmount || 0);
    const totalRevenue = baseRevenue + totalExtraIncome;
    const netProfit = totalRevenue - totalExpenses;

    const pendingMarketSales = openSales.filter(s => s.targetGroup === "MARKET" && (s.status === "SELLING" || s.status === "PENDING_SETTLEMENT"));
    const pendingFactorySales = openSales.filter(s => s.targetGroup === "FACTORY" && s.status === "AWAITING_RESULT");
    const pendingReceivableDebt = openSales.reduce((acc, s) => acc + getFinanceSaleBreakdown_v4(s).debtMoney, 0);

    return {
      tripDate,
      filterMode,
      shrimpPurchaseMoney,
      totalBuyKg,
      unweighedDepositsTotal,
      countedPondDeposits,
      unweighedDepositCount: unweighedDepositFarmers.length,
      totalOperationExpenses,
      totalExtraIncome,
      totalExpenses,
      baseRevenue,
      totalRevenue,
      revenueKg,
      netProfit,
      isProfit: netProfit >= 0,
      sessionCount: effectiveSessions.length,
      saleCount: effectiveSales.length,
      txCount: allTx.length,
      pendingMarketCount: pendingMarketSales.length,
      pendingFactoryCount: pendingFactorySales.length,
      pendingReceivableDebt
    };
  } catch (e) {
    return {
      tripDate: getLocalYYYYMMDD_v4(),
      filterMode: "ALL",
      shrimpPurchaseMoney: 0,
      totalBuyKg: 0,
      unweighedDepositsTotal: 0,
      countedPondDeposits: 0,
      unweighedDepositCount: 0,
      totalOperationExpenses: 0,
      totalExtraIncome: 0,
      totalExpenses: 0,
      baseRevenue: 0,
      totalRevenue: 0,
      revenueKg: 0,
      netProfit: 0,
      isProfit: true,
      sessionCount: 0,
      saleCount: 0,
      txCount: 0,
      pendingMarketCount: 0,
      pendingFactoryCount: 0,
      pendingReceivableDebt: 0
    };
  }
};

me.getRemainingCapital = function() {
  try {
    const fin = me.getFinanceData();
    const trip = (fin && fin.activeTrip) || {};
    const totalCapital = Number(trip.capitalAmount !== undefined ? trip.capitalAmount : 150000000) || 150000000;
    const sum = me.getFinanceSummary();
    return totalCapital - sum.totalExpenses + sum.totalRevenue;
  } catch(e) {
    return 150000000;
  }
};`
);

// 4. Replace Xm_FinanceScreen completely with unified 100% auto-sync FinanceScreen (preserving exact light UI + FAB)
const finStartMarker = "const Xm_FinanceScreen = ({ setRoute, role }) => {";
const finEndMarker = "const BmMainApp=()=>{";
const sIdx = code.indexOf(finStartMarker);
const eIdx = code.indexOf(finEndMarker);
if (sIdx === -1 || eIdx === -1 || eIdx <= sIdx) {
  throw new Error("Could not locate Xm_FinanceScreen boundaries");
}

const newFinanceScreen = `const Xm_FinanceScreen = ({ setRoute, role }) => {
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

  // Internal write guard so self-updates don't double-bounce
  const selfUpdatingRef = w.useRef(false);

  // Data sources (auto-synced with Cân tôm, Xuất bán, Chủ ao, Sổ Thu-Chi)
  const [financeData, setFinanceData] = w.useState(() => me.getFinanceData());
  const [sessions, setSessions] = w.useState(() => {
    try { return (me.getSessions && me.getSessions()) || []; } catch(e) { return []; }
  });
  const [sales, setSales] = w.useState(() => {
    try { return (me.getSales && me.getSales()) || []; } catch(e) { return []; }
  });
  const [farmers, setFarmers] = w.useState(() => {
    try { return (me.getFarmers && me.getFarmers()) || []; } catch(e) { return []; }
  });

  // Active Trip state (declared before listeners/memos)
  const trip = financeData.activeTrip || {};
  const [tripName, setTripName] = w.useState(trip.name || "Chuyến thu mua tôm");
  const [tripDate, setTripDate] = w.useState(trip.startDate || getLocalYYYYMMDD_v4());
  const [tripNote, setTripNote] = w.useState(trip.note || "");
  const [filterMode, setFilterMode] = w.useState(trip.filterMode || "ALL"); // "ALL" (default auto-all) | "DATE"

  w.useEffect(() => {
    const syncFinanceListeners = (ev) => {
      try {
        setSessions((me.getSessions && me.getSessions()) || []);
        setSales((me.getSales && me.getSales()) || []);
        setFarmers((me.getFarmers && me.getFarmers()) || []);
        if (!selfUpdatingRef.current) {
          const freshFin = me.getFinanceData();
          setFinanceData(freshFin);
          if (freshFin && freshFin.activeTrip) {
            setTripName(freshFin.activeTrip.name || "Chuyến thu mua tôm");
            setTripDate(freshFin.activeTrip.startDate || getLocalYYYYMMDD_v4());
            setTripNote(freshFin.activeTrip.note || "");
            setFilterMode(freshFin.activeTrip.filterMode || "ALL");
          }
        }
      } catch(e) {}
    };
    window.addEventListener("app-data-updated", syncFinanceListeners);
    window.addEventListener("cloud_data_synced", syncFinanceListeners);
    window.addEventListener("tom_contract_updated", syncFinanceListeners);
    return () => {
      window.removeEventListener("app-data-updated", syncFinanceListeners);
      window.removeEventListener("cloud_data_synced", syncFinanceListeners);
      window.removeEventListener("tom_contract_updated", syncFinanceListeners);
    };
  }, []);

  // Master Command Tab: "PL" | "LEDGER" | "BUY" | "SELL" | "AUDIT"
  const [mainTab, setMainTab] = w.useState("PL");

  // Floating Action Button (FAB) Speed Dial Open State
  const [fabOpen, setFabOpen] = w.useState(false);

  // Quick settle modal directly inside Finance (for pending Market / Factory / Debt orders)
  const [quickSettleSale, setQuickSettleSale] = w.useState(null);
  const [quickSettleKg, setQuickSettleKg] = w.useState("");
  const [quickSettleMoney, setQuickSettleMoney] = w.useState("");

  // 1. Thu - Chi Modal
  const [showThuChiModal, setShowThuChiModal] = w.useState(false);
  const [thuChiType, setThuChiType] = w.useState("EXPENSE"); // "EXPENSE" | "INCOME"
  const [editingThuChiId, setEditingThuChiId] = w.useState(null);
  const [thuChiCategory, setThuChiCategory] = w.useState("Tiền thuê xe / vận chuyển");
  const [thuChiAmount, setThuChiAmount] = w.useState("");
  const [thuChiPerson, setThuChiPerson] = w.useState("");
  const [thuChiNote, setThuChiNote] = w.useState("");
  const [thuChiFilterTab, setThuChiFilterTab] = w.useState("ALL"); // "ALL" | "EXPENSE" | "INCOME" | "BUY" | "SELL"
  const [thuChiSearchQuery, setThuChiSearchQuery] = w.useState("");
  const [showAutoInLedger, setShowAutoInLedger] = w.useState(true);

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
    selfUpdatingRef.current = true;
    try {
      setFinanceData(prev => {
        const currentTrip = prev.activeTrip || {};
        const updatedTrip = typeof updater === "function" ? updater(currentTrip) : { ...currentTrip, ...updater };
        const nextData = { ...prev, activeTrip: updatedTrip };
        me.saveFinanceData(nextData);
        return nextData;
      });
    } finally {
      setTimeout(() => { selfUpdatingRef.current = false; }, 0);
    }
  };

  // Synchronize latest sessions, sales, farmers & reset selections to auto
  const handleSyncFinance = () => {
    try {
      const freshSessions = (me.getSessions && me.getSessions()) || [];
      const freshSales = (me.getSales && me.getSales()) || [];
      const freshFarmers = (me.getFarmers && me.getFarmers()) || [];
      setSessions(freshSessions);
      setSales(freshSales);
      setFarmers(freshFarmers);
      setFilterMode("ALL");
      updateActiveTrip(t => ({
        ...t,
        filterMode: "ALL",
        includePondDeposits: true,
        shrimpPurchaseAuto: true,
        revenueAuto: true,
        selectedSessionIds: null,
        selectedSaleIds: null
      }));
      alert("✅ Đã đồng bộ tự động 100% số liệu Cân tôm, Cọc ao, Xuất bán và Thu-Chi!");
    } catch(e) {
      alert("Lỗi đồng bộ: " + e.message);
    }
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

  // Open vs archived IDs
  const archivedSessionSet = new Set(Array.isArray(trip.archivedSessionIds) ? trip.archivedSessionIds : []);
  const archivedSaleSet = new Set(Array.isArray(trip.archivedSaleIds) ? trip.archivedSaleIds : []);

  // Shrimp purchase calculations (always synced from open sessions)
  const isShrimpAuto = trip.shrimpPurchaseAuto !== false;
  const openSessions = sessions.filter(s => s && !archivedSessionSet.has(s.id));
  const filteredSessions = openSessions.filter(s => {
    if (filterMode === "ALL") return true;
    return s.date && isSameLocalDate_v4(s.date, tripDate);
  });
  const selectedSessionIds = trip.selectedSessionIds;
  const effectiveSessions = Array.isArray(selectedSessionIds)
    ? filteredSessions.filter(s => selectedSessionIds.includes(s.id))
    : filteredSessions;

  const autoShrimpPurchaseMoney = effectiveSessions.reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);
  const autoShrimpPurchaseKg = effectiveSessions.reduce((acc, s) => acc + Number(s.totalNet || s.totalGross || 0), 0);
  const shrimpPurchaseMoney = isShrimpAuto ? autoShrimpPurchaseMoney : Number(trip.shrimpPurchaseManualAmount || 0);
  const avgPurchasePrice = autoShrimpPurchaseKg > 0 ? (shrimpPurchaseMoney / autoShrimpPurchaseKg) : 0;

  // Unweighed pond deposits (auto-tracked from Chủ Ao without double-counting)
  const includePondDeposits = trip.includePondDeposits !== false;
  const unweighedDepositFarmers = getUnweighedDepositFarmers_v4(farmers, sessions);
  const unweighedDepositsTotal = unweighedDepositFarmers.reduce((acc, fm) => acc + Number(fm.defaultDeposit || 0), 0);
  const countedPondDeposits = includePondDeposits ? unweighedDepositsTotal : 0;

  // Farmer payable balance (sessions not marked isPaidFull)
  const payableFarmerDebt = effectiveSessions.reduce((acc, s) => {
    if (s.isPaidFull) return acc;
    const total = Number(s.totalMoney || 0);
    const dep = Number(s.deposit || 0);
    const paid = Number(s.paidAmount || 0);
    return acc + Math.max(0, total - dep - paid);
  }, 0);

  // Thu - Chi records in trip (trip.expenses holds both EXPENSE and INCOME)
  const allTransactions = trip.expenses || [];
  const operatingExpenses = allTransactions.filter(t => t.type !== "INCOME");
  const extraIncomes = allTransactions.filter(t => t.type === "INCOME");

  const totalOperationExpenses = operatingExpenses.reduce((acc, exp) => acc + Number(exp.amount || 0), 0);
  const totalExtraIncome = extraIncomes.reduce((acc, inc) => acc + Number(inc.amount || 0), 0);
  const totalExpenses = shrimpPurchaseMoney + countedPondDeposits + totalOperationExpenses;

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

  // Sales and Revenue calculations (includes COMPLETED/SETTLED/isPaidFull + any partial paidAmount!)
  const isRevenueAuto = trip.revenueAuto !== false;
  const openSales = sales.filter(s => s && !archivedSaleSet.has(s.id));
  const completedSales = openSales.filter(s => {
    const bd = getFinanceSaleBreakdown_v4(s);
    return bd.isCompleted || bd.realizedMoney > 0;
  });
  const filteredSales = completedSales.filter(s => {
    if (filterMode === "ALL") return true;
    return s.date && isSameLocalDate_v4(s.date, tripDate);
  });
  const selectedSaleIds = trip.selectedSaleIds;
  const effectiveSales = Array.isArray(selectedSaleIds)
    ? filteredSales.filter(s => selectedSaleIds.includes(s.id))
    : filteredSales;

  // Pending / in-progress / debt orders (tracked automatically so nothing is invisible)
  const pendingMarketSales = openSales.filter(s => s.targetGroup === "MARKET" && (s.status === "SELLING" || s.status === "PENDING_SETTLEMENT"));
  const pendingFactorySales = openSales.filter(s => s.targetGroup === "FACTORY" && s.status === "AWAITING_RESULT");
  const debtSalesList = openSales.filter(s => getFinanceSaleBreakdown_v4(s).debtMoney > 0);
  const totalPendingMarketPhi = pendingMarketSales.reduce((acc, s) => acc + Number(s.phiCount || s.totalBales || 0), 0);
  const totalPendingFactoryKg = pendingFactorySales.reduce((acc, s) => acc + Number(s.factoryDeliveredKg || s.totalNet || 0), 0);
  const pendingReceivableDebt = debtSalesList.reduce((acc, s) => acc + getFinanceSaleBreakdown_v4(s).debtMoney, 0);

  // Other-date items count when user selects DATE filter
  const hiddenSessionsCount = filterMode === "DATE" ? Math.max(0, openSessions.length - filteredSessions.length) : 0;
  const hiddenSalesCount = filterMode === "DATE" ? Math.max(0, completedSales.length - filteredSales.length) : 0;

  const autoRevenueMoney = effectiveSales.reduce((acc, s) => acc + getFinanceSaleBreakdown_v4(s).realizedMoney, 0);
  const autoRevenueKg = effectiveSales.reduce((acc, s) => acc + Number(s.totalNet || s.totalGross || 0), 0);
  const baseRevenue = isRevenueAuto ? autoRevenueMoney : Number(trip.revenueManualAmount || 0);
  const totalRevenue = baseRevenue + totalExtraIncome;
  const avgSalePrice = autoRevenueKg > 0 ? (baseRevenue / autoRevenueKg) : 0;

  // Breakdown by channel
  const retailSalesList = effectiveSales.filter(s => s.targetGroup === "RETAIL");
  const marketSalesList = effectiveSales.filter(s => s.targetGroup === "MARKET");
  const factorySalesList = effectiveSales.filter(s => s.targetGroup === "FACTORY");

  const retailRevenue = retailSalesList.reduce((acc, s) => acc + getFinanceSaleBreakdown_v4(s).realizedMoney, 0);
  const marketRevenue = marketSalesList.reduce((acc, s) => acc + getFinanceSaleBreakdown_v4(s).realizedMoney, 0);
  const factoryRevenue = factorySalesList.reduce((acc, s) => acc + getFinanceSaleBreakdown_v4(s).realizedMoney, 0);

  // Net Profit & Margins
  const netProfit = totalRevenue - totalExpenses;
  const isProfit = netProfit >= 0;
  const profitMarginPercent = totalExpenses > 0 ? ((netProfit / totalExpenses) * 100) : 0;

  // Weight shrinkage calculations
  const weightDiff = autoShrimpPurchaseKg - autoRevenueKg;
  const weightDiffPercent = autoShrimpPurchaseKg > 0 ? ((weightDiff / autoShrimpPurchaseKg) * 100) : 0;
  const grossProfitPerKg = (autoRevenueKg > 0 && autoShrimpPurchaseKg > 0) ? (avgSalePrice - avgPurchasePrice) : 0;

  // Quick settle pending sale directly from Finance
  const handleSaveQuickSettleInFinance = () => {
    if (!quickSettleSale) return;
    const kg = Number(quickSettleKg) || 0;
    const money = Number(quickSettleMoney) || 0;
    if (kg <= 0 || money <= 0) {
      alert("Vui lòng nhập đầy đủ số kg và tổng tiền thực nhận!");
      return;
    }
    const updates = {
      status: "COMPLETED",
      isPaidFull: true,
      remainingDebt: 0,
      paidAmount: money,
      totalNet: kg,
      totalGross: kg,
      unitPrice: kg > 0 ? Math.round(money / kg) : 0,
      totalMoney: money,
      settledAt: new Date().toISOString(),
      notes: quickSettleSale.targetGroup === "MARKET"
        ? "Đã chốt đơn chợ: " + _fmtKg(kg) + " kg - thực nhận " + _fmt(money) + " đ"
        : "Đã nghiệm thu công ty: " + _fmtKg(kg) + " kg - thanh toán " + _fmt(money) + " đ"
    };
    me.updateSale(quickSettleSale.id, updates);
    setQuickSettleSale(null);
    setQuickSettleKg("");
    setQuickSettleMoney("");
    alert("✅ Đã chốt đơn thành công và tự động cộng +" + _fmt(money) + " đ vào doanh thu tài chính!");
  };

  // Archive and settle current trip (records settled IDs so next trip starts fresh without double-counting)
  const handleSettleAndArchiveTrip = () => {
    if (!confirm("Bạn có chắc chắn muốn khóa và lưu chuyến tài chính này vào lịch sử? Các phiếu mua/đơn bán của chuyến này sẽ được lưu trữ và chuyến mới sẽ khởi tạo sạch.")) {
      return;
    }

    const justSettledSessionIds = effectiveSessions.map(s => s.id).filter(Boolean);
    const justSettledSaleIds = effectiveSales.map(s => s.id).filter(Boolean);

    const archivedTrip = {
      ...trip,
      name: tripName,
      startDate: tripDate,
      note: tripNote,
      shrimpPurchaseMoney,
      shrimpPurchaseKg: autoShrimpPurchaseKg,
      countedPondDeposits,
      totalOperationExpenses,
      totalExtraIncome,
      totalExpenses,
      totalRevenue,
      revenueKg: autoRevenueKg,
      netProfit,
      isProfit,
      profitMarginPercent,
      settledSessionIds: justSettledSessionIds,
      settledSaleIds: justSettledSaleIds,
      settledAt: new Date().toISOString()
    };

    const nextArchivedSessions = Array.from(new Set([...(trip.archivedSessionIds || []), ...justSettledSessionIds]));
    const nextArchivedSales = Array.from(new Set([...(trip.archivedSaleIds || []), ...justSettledSaleIds]));

    const newActiveTrip = {
      id: "trip_" + Date.now(),
      name: "Chuyến thu mua ngày " + new Date().toLocaleDateString("vi-VN"),
      startDate: getLocalYYYYMMDD_v4(),
      note: "",
      filterMode: "ALL",
      includePondDeposits: true,
      archivedSessionIds: nextArchivedSessions,
      archivedSaleIds: nextArchivedSales,
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

    selfUpdatingRef.current = true;
    me.saveFinanceData(nextData);
    setFinanceData(nextData);
    setTripName(newActiveTrip.name);
    setTripDate(newActiveTrip.startDate);
    setTripNote("");
    setFilterMode("ALL");
    setTimeout(() => { selfUpdatingRef.current = false; }, 0);
    alert("✅ Đã quyết toán thành công và lưu vào lịch sử chuyến!");
  };

  // Reset manual Thu-Chi in current trip
  const handleResetTrip = () => {
    if (confirm("Bạn có chắc chắn muốn đặt lại sổ Thu - Chi của chuyến này về 0 và khôi phục đồng bộ tự động?")) {
      updateActiveTrip(t => ({
        ...t,
        expenses: [],
        filterMode: "ALL",
        includePondDeposits: true,
        shrimpPurchaseAuto: true,
        revenueAuto: true,
        shrimpPurchaseManualAmount: 0,
        revenueManualAmount: 0,
        selectedSessionIds: null,
        selectedSaleIds: null
      }));
      setFilterMode("ALL");
      setShowTripSettingsModal(false);
      alert("✅ Đã đặt lại thu chi và bật đồng bộ tự động!");
    }
  };

  // Saved trip actions
  const handleDeleteSavedTrip = (id) => {
    if (confirm("Bạn có chắc chắn muốn xóa chuyến này khỏi lịch sử? Thao tác này không thể hoàn tác.")) {
      const nextSaved = (financeData.savedTrips || []).filter(t => t.id !== id);
      const nextData = { ...financeData, savedTrips: nextSaved };
      selfUpdatingRef.current = true;
      me.saveFinanceData(nextData);
      setFinanceData(nextData);
      if (viewingSavedTrip && viewingSavedTrip.id === id) setViewingSavedTrip(null);
      setTimeout(() => { selfUpdatingRef.current = false; }, 0);
    }
  };

  const handleRestoreSavedTrip = (savedTrip) => {
    if (confirm("Bạn có chắc chắn muốn khôi phục chuyến \\"" + savedTrip.name + "\\" làm chuyến đang hoạt động? Chuyến hiện tại chưa quyết toán sẽ được thay thế.")) {
      const restoredSettledSessions = new Set(Array.isArray(savedTrip.settledSessionIds) ? savedTrip.settledSessionIds : []);
      const restoredSettledSales = new Set(Array.isArray(savedTrip.settledSaleIds) ? savedTrip.settledSaleIds : []);
      const curArchSess = Array.isArray(trip.archivedSessionIds) ? trip.archivedSessionIds : [];
      const curArchSale = Array.isArray(trip.archivedSaleIds) ? trip.archivedSaleIds : [];

      const nextData = {
        ...financeData,
        activeTrip: {
          ...savedTrip,
          id: "trip_" + Date.now(),
          filterMode: savedTrip.filterMode || "ALL",
          archivedSessionIds: curArchSess.filter(id => !restoredSettledSessions.has(id)),
          archivedSaleIds: curArchSale.filter(id => !restoredSettledSales.has(id))
        }
      };
      selfUpdatingRef.current = true;
      me.saveFinanceData(nextData);
      setFinanceData(nextData);
      setTripName(savedTrip.name || "");
      setTripDate(savedTrip.startDate || "");
      setTripNote(savedTrip.note || "");
      setFilterMode(savedTrip.filterMode || "ALL");
      setShowSavedTripsModal(false);
      setViewingSavedTrip(null);
      setTimeout(() => { selfUpdatingRef.current = false; }, 0);
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
    selfUpdatingRef.current = true;
    me.saveFinanceData(nextData);
    setFinanceData(nextData);
    if (viewingSavedTrip && viewingSavedTrip.id === editingSavedTripId) {
      setViewingSavedTrip({ ...viewingSavedTrip, name: editingSavedTripName.trim() });
    }
    setEditingSavedTripId(null);
    setEditingSavedTripName("");
    setTimeout(() => { selfUpdatingRef.current = false; }, 0);
  };

  // Copy quick summary text
  const handleCopySummary = () => {
    const text = [
      "📊 BÁO CÁO QUYẾT TOÁN TÀI CHÍNH CHUYẾN TÔM",
      "Kỳ: " + tripName + " (" + (filterMode === "ALL" ? "Tự động tất cả" : tripDate) + ")",
      "----------------------------------",
      "1. Doanh thu xuất bán: +" + _fmt(baseRevenue) + " đ (" + _fmtKg(autoRevenueKg) + " kg)",
      totalExtraIncome > 0 ? ("2. Thu phát sinh ngoài: +" + _fmt(totalExtraIncome) + " đ") : "",
      "3. Tiền mua tôm ao: -" + _fmt(shrimpPurchaseMoney) + " đ (" + _fmtKg(autoShrimpPurchaseKg) + " kg)",
      countedPondDeposits > 0 ? ("4. Tiền đặt cọc ao chưa cân: -" + _fmt(countedPondDeposits) + " đ") : "",
      "5. Chi phí vận hành: -" + _fmt(totalOperationExpenses) + " đ (" + operatingExpenses.length + " khoản)",
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

  // Unified Cashflow Stream (Manual Thu-Chi + Auto-Synced Purchases + Auto-Synced Pond Deposits + Auto-Synced Sales)
  const unifiedCashflowEntries = w.useMemo(() => {
    const entries = [];
    // 1. Manual Thu - Chi entries
    allTransactions.forEach(tx => {
      entries.push({
        id: tx.id,
        sourceType: "MANUAL",
        flow: tx.type === "INCOME" ? "INCOME" : "EXPENSE",
        category: tx.category || (tx.type === "INCOME" ? "Khoản thu" : "Khoản chi"),
        amount: Number(tx.amount || 0),
        person: tx.person || "",
        note: tx.note || "",
        date: tx.date || "",
        raw: tx
      });
    });

    if (showAutoInLedger) {
      // 2. Auto shrimp purchase sessions
      if (isShrimpAuto) {
        effectiveSessions.forEach(sess => {
          entries.push({
            id: "auto_buy_" + sess.id,
            sourceType: "AUTO_BUY",
            flow: "EXPENSE",
            category: "Mua tôm tại ao: " + (sess.farmerName || "Chủ ao"),
            amount: Number(sess.totalMoney || 0),
            person: sess.farmerName || "",
            note: _fmtKg(sess.totalNet || sess.totalGross) + " kg • " + (sess.riceType || "Tôm càng xanh"),
            date: sess.date || "",
            raw: sess
          });
        });
      }

      // 3. Auto unweighed pond deposits
      if (includePondDeposits) {
        unweighedDepositFarmers.forEach(fm => {
          entries.push({
            id: "auto_dep_" + fm.id,
            sourceType: "AUTO_DEPOSIT",
            flow: "EXPENSE",
            category: "Đặt cọc ao (chờ cân): " + (fm.name || "Chủ ao"),
            amount: Number(fm.defaultDeposit || 0),
            person: fm.name || "",
            note: "Tự động tính từ Chủ Ao • Tự cấn trừ khi cân",
            date: fm.weighingDate || "",
            raw: fm
          });
        });
      }

      // 4. Auto completed / partial-paid sales
      if (isRevenueAuto) {
        effectiveSales.forEach(sl => {
          const bd = getFinanceSaleBreakdown_v4(sl);
          if (bd.realizedMoney > 0) {
            entries.push({
              id: "auto_sell_" + sl.id,
              sourceType: "AUTO_SELL",
              flow: "INCOME",
              category: (sl.targetGroup === "FACTORY" ? "Bán Công ty: " : (sl.targetGroup === "MARKET" ? "Bán Chợ: " : "Bán lẻ: ")) + (sl.buyerName || "Khách hàng"),
              amount: bd.realizedMoney,
              person: sl.buyerName || "",
              note: _fmtKg(sl.totalNet || sl.totalGross) + " kg" + (bd.debtMoney > 0 ? (" • Còn nợ " + _fmt(bd.debtMoney) + " đ") : ""),
              date: sl.settledAt || sl.date || "",
              raw: sl
            });
          }
        });
      }
    }

    return entries.sort((a, b) => {
      const ta = a.date ? new Date(a.date).getTime() : 0;
      const tb = b.date ? new Date(b.date).getTime() : 0;
      return tb - ta;
    });
  }, [allTransactions, showAutoInLedger, isShrimpAuto, effectiveSessions, includePondDeposits, unweighedDepositFarmers, isRevenueAuto, effectiveSales]);

  // Filtered ledger list
  const displayedTransactions = unifiedCashflowEntries.filter(entry => {
    if (thuChiFilterTab === "EXPENSE" && entry.flow !== "EXPENSE") return false;
    if (thuChiFilterTab === "INCOME" && entry.flow !== "INCOME") return false;
    if (thuChiFilterTab === "BUY" && entry.sourceType !== "AUTO_BUY" && entry.sourceType !== "AUTO_DEPOSIT") return false;
    if (thuChiFilterTab === "SELL" && entry.sourceType !== "AUTO_SELL") return false;
    if (thuChiSearchQuery.trim()) {
      const q = thuChiSearchQuery.toLowerCase();
      const cat = (entry.category || "").toLowerCase();
      const per = (entry.person || "").toLowerCase();
      const note = (entry.note || "").toLowerCase();
      return cat.includes(q) || per.includes(q) || note.includes(q);
    }
    return true;
  });

  const autoBuyEntryCount = effectiveSessions.length + (includePondDeposits ? unweighedDepositFarmers.length : 0);
  const autoSellEntryCount = effectiveSales.length;

  return c.jsxs("div", {
    className: "flex flex-col h-screen bg-slate-100/90 text-slate-900 font-sans overflow-hidden select-none relative",
    children: [
      // =========================================================================
      // 1. TOP HEADER: GIAO DIỆN SÁNG, TINH TẾ, TỰ ĐỘNG ĐỒNG BỘ 100%
      // =========================================================================
      c.jsxs("header", {
        className: "bg-white border-b border-slate-200/90 px-3.5 sm:px-5 py-2.5 shadow-xs shrink-0 flex items-center justify-between z-30",
        children: [
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
                        children: "Tự Động 100%"
                      })
                    ]
                  }),
                  c.jsxs("div", {
                    className: "text-[10px] text-slate-500 font-medium truncate flex items-center gap-1.5",
                    children: [
                      c.jsx("span", { className: "text-emerald-600 font-bold", children: "● Tự động tính" }),
                      c.jsx("span", { children: "•" }),
                      c.jsxs("span", { children: [effectiveSessions.length, " mua"] }),
                      unweighedDepositFarmers.length > 0 && c.jsxs(c.Fragment, {
                        children: [
                          c.jsx("span", { children: "•" }),
                          c.jsxs("span", { className: "text-amber-600 font-bold", children: [unweighedDepositFarmers.length, " cọc ao"] })
                        ]
                      }),
                      c.jsx("span", { children: "•" }),
                      c.jsxs("span", { children: [effectiveSales.length, " bán"] }),
                      c.jsx("span", { children: "•" }),
                      c.jsxs("span", { children: [allTransactions.length, " thu chi"] })
                    ]
                  })
                ]
              })
            ]
          }),

          c.jsxs("div", {
            className: "flex items-center gap-1.5 sm:gap-2 shrink-0",
            children: [
              c.jsxs("button", {
                type: "button",
                onClick: handleSyncFinance,
                className: "p-2 sm:px-3 sm:py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer border border-emerald-200 flex items-center gap-1.5",
                title: "Đồng bộ tự động tất cả mua, cọc ao, bán và thu chi",
                children: [
                  c.jsx("span", { className: "text-sm", children: "🔄" }),
                  c.jsx("span", { className: "hidden md:inline text-[11px]", children: "Đồng bộ" })
                ]
              }),
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
              className: "bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-xs space-y-2.5",
              children: [
                c.jsxs("div", {
                  className: "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5",
                  children: [
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

                    c.jsxs("div", {
                      className: "flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100",
                      children: [
                        filterMode === "DATE" && c.jsx("input", {
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
                          className: "px-3 py-1.5 rounded-xl text-[11px] font-black uppercase transition-all cursor-pointer " + (filterMode === "ALL" ? "bg-emerald-700 text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"),
                          children: filterMode === "ALL" ? "🔄 Tự Động Tất Cả" : "📅 Lọc Theo Ngày"
                        })
                      ]
                    })
                  ]
                }),

                // Alert if DATE filter hides sessions/sales from other dates
                filterMode === "DATE" && (hiddenSessionsCount > 0 || hiddenSalesCount > 0) && c.jsxs("div", {
                  onClick: () => {
                    setFilterMode("ALL");
                    updateActiveTrip({ filterMode: "ALL" });
                  },
                  className: "p-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl flex items-center justify-between gap-2 text-[11px] text-amber-900 font-bold cursor-pointer transition-colors",
                  children: [
                    c.jsxs("span", {
                      children: ["⚡ Đang lọc riêng ngày ", tripDate, " — còn ", hiddenSessionsCount, " phiếu mua & ", hiddenSalesCount, " đơn bán ngày khác chưa tính."]
                    }),
                    c.jsx("span", { className: "text-amber-700 underline shrink-0 font-black", children: "Gộp tất cả ➔" })
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
                        c.jsx("p", { className: "text-[11px] text-white/85 font-medium", children: "Mọi khoản chi tiêu, đặt cọc, thu mua & xuất bán tự động đồng bộ" })
                      ]
                    }),
                    c.jsx("span", {
                      className: "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs border bg-white/20 text-white border-white/30 backdrop-blur-xs",
                      children: isProfit ? ("🏆 CÓ LÃI +" + profitMarginPercent.toFixed(1) + "%") : ("⚠️ THÂM HỤT " + profitMarginPercent.toFixed(1) + "%")
                    })
                  ]
                }),

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

                c.jsxs("div", {
                  className: "grid grid-cols-2 gap-3 pt-4 mt-4 border-t border-white/20 relative z-10",
                  children: [
                    c.jsxs("div", {
                      className: "bg-black/15 rounded-2xl p-3 border border-white/20 space-y-1 backdrop-blur-xs",
                      children: [
                        c.jsxs("div", {
                          className: "flex justify-between items-center text-[10px] font-bold text-emerald-100 uppercase",
                          children: [
                            c.jsx("span", { children: "📈 Tổng Tiền Thu" }),
                            c.jsx("span", { className: "text-white font-mono", children: (effectiveSales.length + extraIncomes.length) + " mục" })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "font-mono font-black text-lg sm:text-xl text-white",
                          children: [_fmt(totalRevenue), " đ"]
                        }),
                        c.jsxs("div", {
                          className: "text-[10px] text-emerald-100 flex justify-between",
                          children: [
                            c.jsxs("span", { children: ["Bán tôm: ", _fmt(baseRevenue)] }),
                            totalExtraIncome > 0 ? c.jsxs("span", { className: "text-white font-mono", children: ["+", _fmt(totalExtraIncome)] }) : null
                          ]
                        })
                      ]
                    }),

                    c.jsxs("div", {
                      className: "bg-black/15 rounded-2xl p-3 border border-white/20 space-y-1 backdrop-blur-xs",
                      children: [
                        c.jsxs("div", {
                          className: "flex justify-between items-center text-[10px] font-bold text-orange-100 uppercase",
                          children: [
                            c.jsx("span", { children: "📉 Tổng Tiền Chi" }),
                            c.jsx("span", { className: "text-white font-mono", children: (effectiveSessions.length + operatingExpenses.length + (includePondDeposits ? unweighedDepositFarmers.length : 0)) + " mục" })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "font-mono font-black text-lg sm:text-xl text-white",
                          children: [_fmt(totalExpenses), " đ"]
                        }),
                        c.jsxs("div", {
                          className: "text-[10px] text-orange-100 flex justify-between gap-1",
                          children: [
                            c.jsxs("span", { className: "truncate", children: ["Mua: ", _fmt(shrimpPurchaseMoney)] }),
                            (totalOperationExpenses + countedPondDeposits) > 0 ? c.jsxs("span", { className: "text-white font-mono shrink-0", children: ["+", _fmt(totalOperationExpenses + countedPondDeposits)] }) : null
                          ]
                        })
                      ]
                    })
                  ]
                }),

                // Production balance & pending alerts strip
                c.jsxs("div", {
                  className: "flex flex-wrap justify-between items-center gap-2 pt-3 mt-3 border-t border-white/20 text-xs text-white/90 font-bold relative z-10",
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
                }),

                (pendingMarketSales.length > 0 || pendingFactorySales.length > 0 || pendingReceivableDebt > 0 || countedPondDeposits > 0) && c.jsxs("div", {
                  className: "flex flex-wrap gap-1.5 pt-2.5 mt-2.5 border-t border-white/15 relative z-10 text-[10px] font-black",
                  children: [
                    pendingMarketSales.length > 0 && c.jsxs("button", {
                      type: "button",
                      onClick: () => setMainTab("SELL"),
                      className: "px-2.5 py-1 rounded-full bg-amber-300 text-amber-950 cursor-pointer hover:bg-amber-200 transition-colors",
                      children: ["🏪 ", pendingMarketSales.length, " đơn chợ đang bán (", totalPendingMarketPhi, " phi)"]
                    }),
                    pendingFactorySales.length > 0 && c.jsxs("button", {
                      type: "button",
                      onClick: () => setMainTab("SELL"),
                      className: "px-2.5 py-1 rounded-full bg-sky-200 text-sky-950 cursor-pointer hover:bg-sky-100 transition-colors",
                      children: ["🏢 ", pendingFactorySales.length, " đơn cty chờ kết quả (", _fmtKg(totalPendingFactoryKg), " kg)"]
                    }),
                    pendingReceivableDebt > 0 && c.jsxs("button", {
                      type: "button",
                      onClick: () => setMainTab("SELL"),
                      className: "px-2.5 py-1 rounded-full bg-white/25 text-white border border-white/30 cursor-pointer",
                      children: ["💵 Khách còn nợ: ", _fmt(pendingReceivableDebt), " đ"]
                    }),
                    countedPondDeposits > 0 && c.jsxs("button", {
                      type: "button",
                      onClick: () => setMainTab("BUY"),
                      className: "px-2.5 py-1 rounded-full bg-white/25 text-white border border-white/30 cursor-pointer",
                      children: ["📑 Cọc ao chưa cân: ", _fmt(countedPondDeposits), " đ"]
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
                      c.jsxs("span", { children: ["Sổ Thu - Chi", unifiedCashflowEntries.length > 0 ? " (" + unifiedCashflowEntries.length + ")" : ""] })
                    ]
                  }),
                  c.jsxs("button", {
                    type: "button",
                    onClick: () => setMainTab("BUY"),
                    className: "px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer " + (mainTab === "BUY" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-white/60"),
                    children: [
                      c.jsx("span", { children: "🦐" }),
                      c.jsxs("span", { children: ["Mua Tôm Ao", (effectiveSessions.length + unweighedDepositFarmers.length) > 0 ? " (" + (effectiveSessions.length + unweighedDepositFarmers.length) + ")" : ""] })
                    ]
                  }),
                  c.jsxs("button", {
                    type: "button",
                    onClick: () => setMainTab("SELL"),
                    className: "px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer " + (mainTab === "SELL" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-white/60"),
                    children: [
                      c.jsx("span", { children: "🛒" }),
                      c.jsxs("span", { children: ["Xuất Bán Tôm", (effectiveSales.length + pendingMarketSales.length + pendingFactorySales.length) > 0 ? " (" + (effectiveSales.length + pendingMarketSales.length + pendingFactorySales.length) + ")" : ""] })
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
                              children: [c.jsx("span", { children: "📑" }), "Bảng Kê Quyết Toán Dòng Tiền Tự Động"]
                            }),
                            c.jsx("p", { className: "text-[10px] text-slate-500 font-medium", children: "Tự động cộng mọi khoản bán, thu mua ao, đặt cọc & chi tiêu vận hành" })
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
                                c.jsx("th", { className: "p-3 hidden sm:table-cell", children: "Diễn Giải Tự Động" })
                              ]
                            })
                          }),
                          c.jsxs("tbody", {
                            className: "divide-y divide-slate-100 font-bold",
                            children: [
                              c.jsxs("tr", {
                                onClick: () => setMainTab("SELL"),
                                className: "hover:bg-slate-50/80 transition-colors cursor-pointer",
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
                                    children: ["Lẻ: ", _fmt(retailRevenue), " đ • Chợ: ", _fmt(marketRevenue), " đ • Cty: ", _fmt(factoryRevenue), " đ"]
                                  })
                                ]
                              }),

                              totalExtraIncome > 0 && c.jsxs("tr", {
                                onClick: () => setMainTab("LEDGER"),
                                className: "hover:bg-slate-50/80 transition-colors cursor-pointer",
                                children: [
                                  c.jsxs("td", {
                                    className: "p-3",
                                    children: [
                                      c.jsx("span", { className: "text-emerald-700 font-black", children: "2. Khoản thu phát sinh ngoài (+)" }),
                                      c.jsxs("span", { className: "block text-[10px] text-slate-500 font-normal", children: [extraIncomes.length, " khoản thu từ sổ Thu-Chi"] })
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

                              c.jsxs("tr", {
                                onClick: () => setMainTab("BUY"),
                                className: "hover:bg-slate-50/80 transition-colors cursor-pointer",
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
                                    children: "Tự động cộng từ phiếu cân Cân Tôm"
                                  })
                                ]
                              }),

                              countedPondDeposits > 0 && c.jsxs("tr", {
                                onClick: () => setMainTab("BUY"),
                                className: "hover:bg-slate-50/80 transition-colors cursor-pointer",
                                children: [
                                  c.jsxs("td", {
                                    className: "p-3",
                                    children: [
                                      c.jsx("span", { className: "text-amber-700 font-black", children: "4. Tiền đặt cọc ao chưa cân (-)" }),
                                      c.jsxs("span", { className: "block text-[10px] text-slate-500 font-normal", children: [unweighedDepositFarmers.length, " ao đã đặt cọc chờ ngày cân"] })
                                    ]
                                  }),
                                  c.jsxs("td", {
                                    className: "p-3 text-right font-mono font-black text-amber-700 text-sm",
                                    children: ["- ", _fmt(countedPondDeposits), " đ"]
                                  }),
                                  c.jsx("td", {
                                    className: "p-3 text-slate-500 text-[11px] hidden sm:table-cell",
                                    children: "Tự động từ Chủ Ao • Tự cấn trừ khi cân xong"
                                  })
                                ]
                              }),

                              c.jsxs("tr", {
                                onClick: () => setMainTab("LEDGER"),
                                className: "hover:bg-slate-50/80 transition-colors cursor-pointer",
                                children: [
                                  c.jsxs("td", {
                                    className: "p-3",
                                    children: [
                                      c.jsx("span", { className: "text-orange-600 font-black", children: (countedPondDeposits > 0 ? "5. " : "4. ") + "Chi phí vận hành chuyến (-)" }),
                                      c.jsxs("span", { className: "block text-[10px] text-slate-500 font-normal", children: [operatingExpenses.length, " khoản chi (xe, công kéo, đá, phà...)"] })
                                    ]
                                  }),
                                  c.jsxs("td", {
                                    className: "p-3 text-right font-mono font-black text-orange-600 text-sm",
                                    children: ["- ", _fmt(totalOperationExpenses), " đ"]
                                  }),
                                  c.jsx("td", {
                                    className: "p-3 text-slate-500 text-[11px] hidden sm:table-cell",
                                    children: "Chi phí vận hành ghi nhận từ Sổ Thu-Chi"
                                  })
                                ]
                              }),

                              c.jsxs("tr", {
                                className: "bg-slate-50 font-black text-xs border-t-2 border-slate-300",
                                children: [
                                  c.jsxs("td", {
                                    className: "p-3.5",
                                    children: [
                                      c.jsx("span", { className: "text-slate-900 uppercase tracking-wider block", children: "🏆 LỢI NHUẬN RÒNG THỰC THU (100% LÃI VỀ TÚI)" }),
                                      c.jsx("span", { className: "text-[10px] text-slate-500 font-normal", children: "Tổng Tiền Thu trừ Toàn Bộ Tiền Chi" })
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

                    // Pending Orders & Receivables Monitor inside PL
                    (pendingMarketSales.length > 0 || pendingFactorySales.length > 0 || pendingReceivableDebt > 0 || payableFarmerDebt > 0) && c.jsxs("div", {
                      className: "p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-2 text-xs",
                      children: [
                        c.jsx("div", {
                          className: "font-black uppercase text-amber-900 text-[11px] flex items-center gap-1.5",
                          children: [c.jsx("span", { children: "⏳" }), "Đơn Đang Chờ Chốt Tiền & Công Nợ (Tự Động Theo Dõi)"]
                        }),
                        c.jsxs("div", {
                          className: "grid grid-cols-1 sm:grid-cols-2 gap-2",
                          children: [
                            (pendingMarketSales.length > 0 || pendingFactorySales.length > 0) && c.jsxs("div", {
                              onClick: () => setMainTab("SELL"),
                              className: "p-2.5 bg-white rounded-xl border border-amber-200 flex items-center justify-between cursor-pointer hover:border-amber-400",
                              children: [
                                c.jsxs("div", {
                                  children: [
                                    c.jsx("span", { className: "font-black text-slate-800 block", children: (pendingMarketSales.length + pendingFactorySales.length) + " đơn chưa chốt tiền" }),
                                    c.jsx("span", { className: "text-[10px] text-slate-500", children: "Chợ đang bán: " + pendingMarketSales.length + " • Cty chờ kq: " + pendingFactorySales.length })
                                  ]
                                }),
                                c.jsx("span", { className: "px-2 py-1 bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase", children: "Chốt ngay ➔" })
                              ]
                            }),
                            pendingReceivableDebt > 0 && c.jsxs("div", {
                              onClick: () => setMainTab("SELL"),
                              className: "p-2.5 bg-white rounded-xl border border-blue-200 flex items-center justify-between cursor-pointer",
                              children: [
                                c.jsxs("div", {
                                  children: [
                                    c.jsx("span", { className: "font-black text-slate-800 block", children: "Công nợ khách phải thu" }),
                                    c.jsx("span", { className: "text-[10px] text-slate-500", children: debtSalesList.length + " đơn chưa thu đủ" })
                                  ]
                                }),
                                c.jsxs("span", { className: "font-mono font-black text-blue-700", children: [_fmt(pendingReceivableDebt), " đ"] })
                              ]
                            }),
                            payableFarmerDebt > 0 && c.jsxs("div", {
                              onClick: () => setMainTab("BUY"),
                              className: "p-2.5 bg-white rounded-xl border border-orange-200 flex items-center justify-between cursor-pointer",
                              children: [
                                c.jsxs("div", {
                                  children: [
                                    c.jsx("span", { className: "font-black text-slate-800 block", children: "Tiền ao tôm chưa trả hết" }),
                                    c.jsx("span", { className: "text-[10px] text-slate-500", children: "Đã tính 100% vào chi phí mua tôm" })
                                  ]
                                }),
                                c.jsxs("span", { className: "font-mono font-black text-orange-600", children: [_fmt(payableFarmerDebt), " đ"] })
                              ]
                            })
                          ]
                        })
                      ]
                    }),

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
            // TAB 2: SỔ THU - CHI HỢP NHẤT (TỰ ĐỘNG + GHI CHÉP TAY)
            // =====================================================================
            mainTab === "LEDGER" && c.jsxs("div", {
              className: "space-y-4",
              children: [
                c.jsxs("div", {
                  className: "grid grid-cols-2 sm:grid-cols-3 gap-2.5",
                  children: [
                    c.jsxs("div", {
                      className: "bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs",
                      children: [
                        c.jsx("span", { className: "text-[10px] font-bold text-orange-600 uppercase block", children: "Tổng Chi Vận Hành + Cọc" }),
                        c.jsxs("div", { className: "font-mono font-black text-xl text-orange-600 my-0.5", children: ["- ", _fmt(totalOperationExpenses + countedPondDeposits), " đ"] }),
                        c.jsxs("span", { className: "text-[10px] text-slate-500", children: [operatingExpenses.length, " chi vận hành", countedPondDeposits > 0 ? (" + " + unweighedDepositFarmers.length + " cọc ao") : ""] })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs",
                      children: [
                        c.jsx("span", { className: "text-[10px] font-bold text-emerald-700 uppercase block", children: "Tổng Thu Ngoài" }),
                        c.jsxs("div", { className: "font-mono font-black text-xl text-emerald-700 my-0.5", children: ["+ ", _fmt(totalExtraIncome), " đ"] }),
                        c.jsxs("span", { className: "text-[10px] text-slate-500", children: [extraIncomes.length, " khoản thu ghi thêm"] })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "col-span-2 sm:col-span-1 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs",
                      children: [
                        c.jsx("span", { className: "text-[10px] font-bold text-slate-600 uppercase block", children: "Toàn Bộ Dòng Tiền (Gồm Mua/Bán)" }),
                        c.jsxs("div", {
                          className: "font-mono font-black text-xl my-0.5 " + (isProfit ? "text-emerald-700" : "text-rose-600"),
                          children: [(isProfit ? "+ " : "- ") + _fmt(Math.abs(netProfit)), " đ"]
                        }),
                        c.jsxs("span", { className: "text-[10px] text-slate-500", children: [autoBuyEntryCount, " chi mua • ", autoSellEntryCount, " thu bán"] })
                      ]
                    })
                  ]
                }),

                // Filter & Search + Auto toggle
                c.jsxs("div", {
                  className: "bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5",
                  children: [
                    c.jsxs("div", {
                      className: "flex flex-wrap items-center justify-between gap-2",
                      children: [
                        c.jsxs("div", {
                          className: "flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-[11px] font-bold border border-slate-200 overflow-x-auto",
                          children: [
                            c.jsxs("button", {
                              type: "button",
                              onClick: () => setThuChiFilterTab("ALL"),
                              className: "px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap " + (thuChiFilterTab === "ALL" ? "bg-white text-slate-900 shadow-xs font-black" : "text-slate-600 hover:text-slate-900"),
                              children: ["Tất cả (", unifiedCashflowEntries.length, ")"]
                            }),
                            c.jsxs("button", {
                              type: "button",
                              onClick: () => setThuChiFilterTab("EXPENSE"),
                              className: "px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap " + (thuChiFilterTab === "EXPENSE" ? "bg-orange-600 text-white font-black" : "text-orange-600 hover:text-orange-700"),
                              children: ["Tiền Chi"]
                            }),
                            c.jsxs("button", {
                              type: "button",
                              onClick: () => setThuChiFilterTab("INCOME"),
                              className: "px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap " + (thuChiFilterTab === "INCOME" ? "bg-emerald-600 text-white font-black" : "text-emerald-700 hover:text-emerald-800"),
                              children: ["Tiền Thu"]
                            }),
                            c.jsxs("button", {
                              type: "button",
                              onClick: () => { setShowAutoInLedger(true); setThuChiFilterTab("BUY"); },
                              className: "px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap " + (thuChiFilterTab === "BUY" ? "bg-amber-600 text-white font-black" : "text-amber-700 hover:text-amber-800"),
                              children: ["Mua Tôm (", autoBuyEntryCount, ")"]
                            }),
                            c.jsxs("button", {
                              type: "button",
                              onClick: () => { setShowAutoInLedger(true); setThuChiFilterTab("SELL"); },
                              className: "px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap " + (thuChiFilterTab === "SELL" ? "bg-teal-600 text-white font-black" : "text-teal-700 hover:text-teal-800"),
                              children: ["Bán Tôm (", autoSellEntryCount, ")"]
                            })
                          ]
                        }),
                        c.jsxs("button", {
                          type: "button",
                          onClick: () => setShowAutoInLedger(!showAutoInLedger),
                          className: "px-2.5 py-1.5 rounded-xl text-[10px] font-black border cursor-pointer " + (showAutoInLedger ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"),
                          children: showAutoInLedger ? "✓ Đang hiện Mua & Bán tự động" : "Chỉ hiện Thu-Chi ghi tay"
                        })
                      ]
                    }),

                    c.jsxs("div", {
                      className: "flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 w-full",
                      children: [
                        c.jsx("span", { className: "text-slate-400 text-xs", children: "🔍" }),
                        c.jsx("input", {
                          type: "text",
                          value: thuChiSearchQuery,
                          onChange: e => setThuChiSearchQuery(e.target.value),
                          placeholder: "Tìm khoản chi, tên chủ ao, khách mua, người nhận...",
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

                displayedTransactions.length === 0 ? c.jsxs("div", {
                  className: "p-10 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-center space-y-3",
                  children: [
                    c.jsx("span", { className: "text-3xl block", children: "📝" }),
                    c.jsx("p", { className: "font-bold text-xs text-slate-500", children: "Chưa có giao dịch nào trong mục này." }),
                    c.jsx("p", { className: "text-[11px] text-slate-400 italic", children: "Mọi phiếu cân, đơn bán và thu-chi bấm dấu '+' ở góc dưới bên phải sẽ tự động hiển thị tại đây." })
                  ]
                }) : c.jsx("div", {
                  className: "space-y-2",
                  children: displayedTransactions.map(entry => {
                    const isIncome = entry.flow === "INCOME";
                    const isAuto = entry.sourceType !== "MANUAL";
                    const badgeLabel = entry.sourceType === "AUTO_BUY" ? "MUA TÔM" : (entry.sourceType === "AUTO_DEPOSIT" ? "CỌC AO" : (entry.sourceType === "AUTO_SELL" ? "BÁN TÔM" : (isIncome ? "THU" : "CHI")));
                    return c.jsxs("div", {
                      key: entry.id,
                      className: "p-3.5 bg-white rounded-2xl border border-slate-200/90 flex items-center justify-between gap-3 text-xs shadow-xs hover:border-slate-300 transition-all",
                      children: [
                        c.jsxs("div", {
                          className: "flex items-center gap-3 min-w-0",
                          children: [
                            c.jsx("div", {
                              className: "w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 " + (isIncome ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-orange-50 text-orange-600 border border-orange-200"),
                              children: entry.sourceType === "AUTO_BUY" ? "🦐" : (entry.sourceType === "AUTO_DEPOSIT" ? "📑" : (entry.sourceType === "AUTO_SELL" ? "🛒" : (isIncome ? "➕" : "➖")))
                            }),
                            c.jsxs("div", {
                              className: "min-w-0 space-y-0.5",
                              children: [
                                c.jsxs("div", {
                                  className: "font-black text-slate-900 flex items-center gap-1.5 flex-wrap",
                                  children: [
                                    c.jsx("span", {
                                      className: "text-[9px] font-black uppercase px-1.5 py-0.5 rounded " + (isIncome ? "bg-emerald-600 text-white" : (entry.sourceType === "AUTO_DEPOSIT" ? "bg-amber-600 text-white" : "bg-orange-600 text-white")),
                                      children: badgeLabel
                                    }),
                                    isAuto && c.jsx("span", {
                                      className: "text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200",
                                      children: "Tự động"
                                    }),
                                    c.jsx("span", { className: "truncate", children: entry.category })
                                  ]
                                }),
                                (entry.person || entry.note || entry.date) ? c.jsxs("div", {
                                  className: "text-[10px] text-slate-500 truncate flex items-center gap-1.5",
                                  children: [
                                    entry.person ? c.jsxs("span", { children: ["👤 ", entry.person] }) : null,
                                    (entry.person && entry.note) ? c.jsx("span", { children: "•" }) : null,
                                    entry.note ? c.jsxs("span", { children: ["📝 ", entry.note] }) : null,
                                    entry.date ? c.jsxs("span", { className: "font-mono opacity-80", children: ["• ", new Date(entry.date).toLocaleDateString("vi-VN")] }) : null
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
                              children: [(isIncome ? "+ " : "- ") + _fmt(entry.amount), " đ"]
                            }),
                            !isAuto ? c.jsxs(c.Fragment, {
                              children: [
                                c.jsx("button", {
                                  type: "button",
                                  onClick: () => handleOpenEditThuChi(entry.raw),
                                  className: "p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer",
                                  title: "Sửa",
                                  children: c.jsx("span", { children: "✎" })
                                }),
                                c.jsx("button", {
                                  type: "button",
                                  onClick: () => handleDeleteThuChi(entry.id),
                                  className: "p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer",
                                  title: "Xóa",
                                  children: c.jsx(xm, { size: 15 })
                                })
                              ]
                            }) : c.jsx("button", {
                              type: "button",
                              onClick: () => setMainTab(entry.flow === "INCOME" ? "SELL" : "BUY"),
                              className: "px-2 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer",
                              children: "Xem"
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
            // TAB 3: CHI PHÍ MUA TÔM BỜ AO & CỌC AO (TỰ ĐỘNG)
            // =====================================================================
            mainTab === "BUY" && c.jsxs("div", {
              className: "space-y-4",
              children: [
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
                        c.jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase block", children: "Đặt Cọc Ao Chờ Cân" }),
                        c.jsxs("div", { className: "font-mono font-black text-xl text-amber-700 my-0.5", children: [_fmt(countedPondDeposits), " đ"] }),
                        c.jsxs("span", { className: "text-[10px] text-slate-500", children: [unweighedDepositFarmers.length, " ao chưa cân"] })
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

                // Active unweighed pond deposits list
                unweighedDepositFarmers.length > 0 && c.jsxs("div", {
                  className: "bg-white rounded-3xl border border-amber-200 p-4 sm:p-5 shadow-xs space-y-3",
                  children: [
                    c.jsxs("div", {
                      className: "flex justify-between items-center border-b border-amber-100 pb-3 gap-2",
                      children: [
                        c.jsxs("div", {
                          children: [
                            c.jsx("h2", { className: "text-xs sm:text-sm font-black uppercase text-amber-900 flex items-center gap-1.5", children: [c.jsx("span", { children: "📑" }), "Tiền Đặt Cọc Ao Tôm Đang Chờ Cân"] }),
                            c.jsx("p", { className: "text-[10px] text-slate-500 font-medium", children: "Tự động lấy từ Chủ Ao • Khi cân xong sẽ tự cấn trừ vào phiếu cân, không bị tính trùng" })
                          ]
                        }),
                        c.jsx("button", {
                          type: "button",
                          onClick: () => updateActiveTrip({ includePondDeposits: !includePondDeposits }),
                          className: "px-2.5 py-1.5 rounded-xl text-[10px] font-black border cursor-pointer shrink-0 " + (includePondDeposits ? "bg-amber-600 text-white border-amber-600" : "bg-slate-100 text-slate-600 border-slate-200"),
                          children: includePondDeposits ? "✓ Đang tính vào Chi" : "Tạm ẩn"
                        })
                      ]
                    }),
                    c.jsx("div", {
                      className: "space-y-2",
                      children: unweighedDepositFarmers.map(fm => c.jsxs("div", {
                        key: fm.id,
                        className: "p-3 bg-amber-50/70 rounded-2xl border border-amber-200 flex items-center justify-between gap-3 text-xs",
                        children: [
                          c.jsxs("div", {
                            children: [
                              c.jsx("span", { className: "font-black text-slate-900 block", children: fm.name || "Chủ ao" }),
                              c.jsxs("span", { className: "text-[10px] text-slate-500", children: [fm.shrimpType || "Tôm càng xanh", fm.weighingDate ? (" • Dự kiến cân: " + fm.weighingDate) : ""] })
                            ]
                          }),
                          c.jsxs("span", { className: "font-mono font-black text-sm text-amber-700", children: [_fmt(fm.defaultDeposit), " đ"] })
                        ]
                      }))
                    })
                  ]
                }),

                // Linked Purchase Sessions
                c.jsxs("div", {
                  className: "bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3",
                  children: [
                    c.jsxs("div", {
                      className: "flex justify-between items-center border-b border-slate-100 pb-3",
                      children: [
                        c.jsxs("div", {
                          children: [
                            c.jsx("h2", { className: "text-xs sm:text-sm font-black uppercase text-slate-900 flex items-center gap-1.5", children: [c.jsx("span", { children: "🦐" }), "Danh Sách Phiếu Cân Mua Tôm Tự Động"] }),
                            c.jsx("p", { className: "text-[10px] text-slate-500 font-medium", children: "Mỗi phiếu cân mới sẽ tự động cộng vào tổng chi thu mua" })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "flex items-center gap-1.5",
                          children: [
                            c.jsx("button", {
                              type: "button",
                              onClick: () => setRoute(re.WEIGHING),
                              className: "px-2.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[11px] font-black cursor-pointer",
                              children: "+ Cân mới"
                            }),
                            c.jsx("button", {
                              type: "button",
                              onClick: () => setShowSessionsModal(true),
                              className: "px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl text-xs font-bold border border-orange-200 cursor-pointer",
                              children: "Tùy chọn ➔"
                            })
                          ]
                        })
                      ]
                    }),

                    effectiveSessions.length === 0 ? c.jsxs("div", {
                      className: "p-8 text-center text-slate-400 text-xs space-y-2",
                      children: [
                        c.jsx("span", { className: "text-2xl block", children: "⚖️" }),
                        c.jsx("p", { children: filterMode === "DATE" ? "Chưa có phiếu cân thu mua nào trong ngày đã chọn." : "Chưa có phiếu cân thu mua nào." }),
                        filterMode === "DATE" && c.jsx("button", {
                          type: "button",
                          onClick: () => {
                            setFilterMode("ALL");
                            updateActiveTrip({ filterMode: "ALL" });
                          },
                          className: "text-orange-600 hover:underline font-bold text-xs cursor-pointer",
                          children: "Chuyển sang chế độ: Tự Động Tất Cả"
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
                                  c.jsxs("div", {
                                    className: "flex items-center gap-1.5",
                                    children: [
                                      c.jsx("span", { className: "font-black text-slate-900 text-sm truncate", children: s.farmerName || "Ao tôm" }),
                                      c.jsx("span", {
                                        className: "text-[9px] font-black px-1.5 py-0.5 rounded " + (s.isPaidFull ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"),
                                        children: s.isPaidFull ? "Đã trả đủ" : "Chưa trả hết"
                                      })
                                    ]
                                  }),
                                  c.jsxs("span", { className: "text-[10px] text-slate-500 font-mono", children: [new Date(s.date || Date.now()).toLocaleDateString("vi-VN"), " • ", _fmtKg(s.totalNet || s.totalGross), " kg", Number(s.deposit || 0) > 0 ? (" • Đã trừ cọc " + _fmt(s.deposit)) : ""] })
                                ]
                              })
                            ]
                          }),
                          c.jsxs("div", {
                            className: "text-right shrink-0",
                            children: [
                              c.jsxs("span", { className: "font-mono font-black text-sm text-orange-600 block", children: [_fmt(s.totalMoney), " đ"] }),
                              c.jsxs("span", { className: "text-[10px] text-slate-500 font-mono", children: ["TB: ", _fmt(Number(s.totalNet || s.totalGross || 0) > 0 ? Math.round(Number(s.totalMoney || 0) / Number(s.totalNet || s.totalGross)) : 0), " đ/kg"] })
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
            // TAB 4: DOANH THU XUẤT BÁN TÔM & ĐƠN CHỜ CHỐT (TỰ ĐỘNG)
            // =====================================================================
            mainTab === "SELL" && c.jsxs("div", {
              className: "space-y-4",
              children: [
                c.jsxs("div", {
                  className: "grid grid-cols-2 sm:grid-cols-4 gap-2.5",
                  children: [
                    c.jsxs("div", {
                      className: "bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs",
                      children: [
                        c.jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase block", children: "Tổng Khối Lượng Xuất" }),
                        c.jsxs("div", { className: "font-mono font-black text-xl text-emerald-700 my-0.5", children: [_fmtKg(autoRevenueKg), " kg"] }),
                        c.jsxs("span", { className: "text-[10px] text-slate-500", children: [effectiveSales.length, " đơn đã tính tiền"] })
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

                !isRevenueAuto && c.jsxs("div", {
                  className: "bg-white p-4 rounded-3xl border border-emerald-200 shadow-xs space-y-2",
                  children: [
                    c.jsx("label", { className: "text-xs font-bold text-emerald-700 uppercase block", children: "Nhập doanh thu bán tôm thủ công (VNĐ):" }),
                    c.jsx("input", {
                      type: "number",
                      value: trip.revenueManualAmount || "",
                      onChange: e => updateActiveTrip({ revenueManualAmount: Number(e.target.value) || 0 }),
                      placeholder: "VD: 120000000",
                      className: "w-full p-3 bg-slate-50 border border-emerald-300 rounded-2xl font-mono font-black text-xl text-emerald-700 outline-none"
                    })
                  ]
                }),

                // Channel breakdown
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

                // Pending Market/Factory Orders (1-tap Settle right in Finance!)
                (pendingMarketSales.length > 0 || pendingFactorySales.length > 0) && c.jsxs("div", {
                  className: "bg-white rounded-3xl border border-amber-200 p-4 sm:p-5 shadow-xs space-y-3",
                  children: [
                    c.jsxs("div", {
                      className: "flex justify-between items-center border-b border-amber-100 pb-3",
                      children: [
                        c.jsxs("div", {
                          children: [
                            c.jsx("h2", { className: "text-xs sm:text-sm font-black uppercase text-amber-900 flex items-center gap-1.5", children: [c.jsx("span", { children: "⏳" }), "Đơn Đang Giao Chợ & Chờ Nghiệm Thu Công Ty"] }),
                            c.jsx("p", { className: "text-[10px] text-slate-500 font-medium", children: "Bấm 'Chốt tiền' để cập nhật số kg và tiền thực nhận — tự động cộng ngay vào Tài Chính" })
                          ]
                        })
                      ]
                    }),
                    c.jsx("div", {
                      className: "space-y-2",
                      children: [...pendingMarketSales, ...pendingFactorySales].map(ps => c.jsxs("div", {
                        key: ps.id,
                        className: "p-3 bg-amber-50/70 rounded-2xl border border-amber-200 flex items-center justify-between gap-3 text-xs",
                        children: [
                          c.jsxs("div", {
                            className: "min-w-0",
                            children: [
                              c.jsxs("span", {
                                className: "font-black text-slate-900 flex items-center gap-1.5 truncate",
                                children: [
                                  c.jsx("span", { children: ps.targetGroup === "FACTORY" ? "🏢" : "🏪" }),
                                  ps.buyerName || "Đơn chờ chốt"
                                ]
                              }),
                              c.jsxs("span", {
                                className: "text-[10px] text-slate-600 font-mono",
                                children: [
                                  ps.targetGroup === "MARKET" ? ((ps.phiCount || ps.totalBales || 0) + " phi oxy đang bán") : (_fmtKg(ps.factoryDeliveredKg || ps.totalNet) + " kg chờ nghiệm thu"),
                                  " • ", new Date(ps.date || Date.now()).toLocaleDateString("vi-VN")
                                ]
                              })
                            ]
                          }),
                          c.jsx("button", {
                            type: "button",
                            onClick: () => {
                              setQuickSettleSale(ps);
                              setQuickSettleKg(ps.totalNet ? String(ps.totalNet) : (ps.factoryDeliveredKg ? String(ps.factoryDeliveredKg) : ""));
                              setQuickSettleMoney(ps.totalMoney ? String(ps.totalMoney) : "");
                            },
                            className: "px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[11px] uppercase shrink-0 cursor-pointer shadow-xs",
                            children: ps.targetGroup === "FACTORY" ? "Nghiệm thu" : "Chốt tiền"
                          })
                        ]
                      }))
                    })
                  ]
                }),

                // Linked Sales List
                c.jsxs("div", {
                  className: "bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3",
                  children: [
                    c.jsxs("div", {
                      className: "flex justify-between items-center border-b border-slate-100 pb-3",
                      children: [
                        c.jsxs("div", {
                          children: [
                            c.jsx("h2", { className: "text-xs sm:text-sm font-black uppercase text-slate-900 flex items-center gap-1.5", children: [c.jsx("span", { children: "🛒" }), "Danh Sách Đơn Xuất Bán Đã Tính Doanh Thu"] }),
                            c.jsx("p", { className: "text-[10px] text-slate-500 font-medium", children: "Tự động cộng mọi đơn bán lẻ, chốt chợ, nghiệm thu công ty & tiền đã thu" })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "flex items-center gap-1.5",
                          children: [
                            c.jsx("button", {
                              type: "button",
                              onClick: () => setRoute(re.SALES),
                              className: "px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-black cursor-pointer",
                              children: "+ Xuất bán"
                            }),
                            c.jsx("button", {
                              type: "button",
                              onClick: () => setShowSalesModal(true),
                              className: "px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 cursor-pointer",
                              children: "Tùy chọn ➔"
                            })
                          ]
                        })
                      ]
                    }),

                    effectiveSales.length === 0 ? c.jsxs("div", {
                      className: "p-8 text-center text-slate-400 text-xs space-y-2",
                      children: [
                        c.jsx("span", { className: "text-2xl block", children: "📦" }),
                        c.jsx("p", { children: filterMode === "DATE" ? "Chưa có đơn xuất bán nào trong ngày đã chọn." : "Chưa có đơn xuất bán nào hoàn tất." }),
                        filterMode === "DATE" && c.jsx("button", {
                          type: "button",
                          onClick: () => {
                            setFilterMode("ALL");
                            updateActiveTrip({ filterMode: "ALL" });
                          },
                          className: "text-emerald-700 hover:underline font-bold text-xs cursor-pointer",
                          children: "Chuyển sang chế độ: Tự Động Tất Cả"
                        })
                      ]
                    }) : c.jsx("div", {
                      className: "space-y-2",
                      children: effectiveSales.map((sl, idx) => {
                        const bd = getFinanceSaleBreakdown_v4(sl);
                        return c.jsxs("div", {
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
                                    c.jsxs("span", { className: "text-[10px] text-slate-500 font-mono", children: [new Date(sl.date || Date.now()).toLocaleDateString("vi-VN"), " • ", _fmtKg(sl.totalNet || sl.totalGross), " kg", sl.targetGroup === "FACTORY" ? " (Công ty)" : (sl.targetGroup === "MARKET" ? " (Chợ đầu mối)" : " (Bán lẻ)"), bd.debtMoney > 0 ? (" • Còn nợ " + _fmt(bd.debtMoney) + " đ") : ""] })
                                  ]
                                })
                              ]
                            }),
                            c.jsxs("div", {
                              className: "text-right shrink-0",
                              children: [
                                c.jsxs("span", { className: "font-mono font-black text-sm text-emerald-700 block", children: [_fmt(bd.realizedMoney), " đ"] }),
                                c.jsxs("span", { className: "text-[10px] text-slate-500 font-mono", children: ["Giá: ", _fmt(Number(sl.totalNet || sl.totalGross || 0) > 0 ? Math.round(bd.realizedMoney / Number(sl.totalNet || sl.totalGross)) : 0), " đ/kg"] })
                              ]
                            })
                          ]
                        });
                      })
                    })
                  ]
                })
              ]
            }),

            // =====================================================================
            // TAB 5: ĐỐI SOÁT HAO HỤT & HIỆU QUẢ KINH DOANH
            // =====================================================================
            mainTab === "AUDIT" && c.jsxs("div", {
              className: "space-y-4",
              children: [
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
      // 3. NÚT DẤU '+' THẢ NỔI Ở GÓC DƯỚI BÊN PHẢI MÀN HÌNH
      // =========================================================================
      fabOpen && c.jsx("div", {
        className: "fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150",
        onClick: () => setFabOpen(false)
      }),

      c.jsxs("div", {
        className: "fixed bottom-6 right-5 sm:bottom-8 sm:right-8 z-50 flex flex-col items-end gap-2.5",
        children: [
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
      // MODAL 1: GHI NHẬN THU - CHI CHUYÊN NGHIỆP
      // =========================================================================
      showThuChiModal && c.jsx("div", {
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs",
        children: c.jsxs("div", {
          className: "bg-white text-slate-900 rounded-3xl w-full max-w-sm p-5 sm:p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4 max-h-[95vh] overflow-y-auto border border-slate-200",
          children: [
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

            c.jsxs("div", {
              className: "space-y-3.5",
              children: [
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
      // MODAL QUICK SETTLE TRONG TÀI CHÍNH
      // =========================================================================
      quickSettleSale && c.jsx("div", {
        className: "fixed inset-0 z-[210] bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs",
        children: c.jsxs("div", {
          className: "bg-white text-slate-900 border border-slate-200 rounded-3xl w-full max-w-sm p-5 sm:p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4",
          children: [
            c.jsxs("div", {
              children: [
                c.jsx("h3", {
                  className: "font-black text-base uppercase text-slate-900",
                  children: quickSettleSale.targetGroup === "FACTORY" ? "🏢 Nghiệm Thu Công Ty" : "🏪 Chốt Đơn Chợ Đầu Mối"
                }),
                c.jsxs("p", { className: "text-xs text-slate-500 font-bold", children: [quickSettleSale.buyerName, " • ", quickSettleSale.code] })
              ]
            }),
            c.jsxs("div", {
              className: "space-y-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-[11px] font-bold text-slate-500 mb-1 block uppercase", children: "Tổng số kg thực nhận / nghiệm thu *" }),
                    c.jsx("input", {
                      type: "number",
                      step: "any",
                      placeholder: "VD: 320.5",
                      value: quickSettleKg,
                      onChange: e => setQuickSettleKg(e.target.value),
                      className: "w-full p-3 bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 rounded-2xl font-bold text-lg font-mono outline-none"
                    })
                  ]
                }),
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-[11px] font-bold text-slate-500 mb-1 block uppercase", children: "Tổng số tiền thực nhận (VNĐ) *" }),
                    c.jsx("input", {
                      type: "number",
                      placeholder: "VD: 68500000",
                      value: quickSettleMoney,
                      onChange: e => setQuickSettleMoney(e.target.value),
                      className: "w-full p-3 bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 rounded-2xl font-bold text-lg font-mono text-emerald-700 outline-none"
                    })
                  ]
                })
              ]
            }),
            c.jsxs("div", {
              className: "flex gap-2 justify-end pt-2 border-t border-slate-100",
              children: [
                c.jsx("button", {
                  type: "button",
                  onClick: () => setQuickSettleSale(null),
                  className: "px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer",
                  children: "Hủy"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: handleSaveQuickSettleInFinance,
                  className: "px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase shadow-md cursor-pointer",
                  children: "Chốt & Cộng Vào Tài Chính"
                })
              ]
            })
          ]
        })
      }),

      // =========================================================================
      // MODAL 2: CHỌN PHIẾU CÂN MUA TÔM
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
                children: "Không có phiếu cân thu mua nào trong bộ lọc hiện tại."
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
      // MODAL 3: CHỌN ĐƠN XUẤT BÁN
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
                children: "Không có đơn bán nào trong bộ lọc hiện tại."
              }) : filteredSales.map(sl => {
                const isChecked = !Array.isArray(selectedSaleIds) || selectedSaleIds.includes(sl.id);
                const bd = getFinanceSaleBreakdown_v4(sl);
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
                    c.jsxs("span", { className: "font-mono font-black text-sm text-emerald-700", children: [_fmt(bd.realizedMoney), " đ"] })
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
      // MODAL 4: THIẾT LẬP KỲ THU MUA
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
                    c.jsxs("span", { children: ["Chế độ lọc phiếu: ", c.jsx("b", { className: "text-emerald-700", children: filterMode === "DATE" ? "Theo ngày" : "Tự động tất cả" })] }),
                    c.jsx("span", { className: "text-blue-600", children: "Đổi" })
                  ]
                }),
                c.jsxs("button", {
                  type: "button",
                  onClick: () => {
                    updateActiveTrip({ includePondDeposits: !includePondDeposits });
                  },
                  className: "w-full p-3 rounded-2xl bg-amber-50 border border-amber-200 text-left flex justify-between items-center cursor-pointer hover:bg-amber-100",
                  children: [
                    c.jsxs("span", { children: ["Tự tính tiền cọc ao chưa cân: ", c.jsx("b", { className: "text-amber-800", children: includePondDeposits ? "BẬT" : "TẮT" })] }),
                    c.jsx("span", { className: "text-amber-700", children: "Đổi" })
                  ]
                }),
                c.jsxs("button", {
                  type: "button",
                  onClick: handleResetTrip,
                  className: "w-full p-3 rounded-2xl bg-orange-50 border border-orange-200 text-orange-700 text-left flex justify-between items-center cursor-pointer hover:bg-orange-100",
                  children: [
                    c.jsx("span", { children: "🔄 Đặt lại thu chi & bật đồng bộ tự động" }),
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
                        startDate: getLocalYYYYMMDD_v4(),
                        note: "",
                        filterMode: "ALL",
                        includePondDeposits: true,
                        archivedSessionIds: trip.archivedSessionIds || [],
                        archivedSaleIds: trip.archivedSaleIds || [],
                        shrimpPurchaseAuto: true,
                        shrimpPurchaseManualAmount: 0,
                        selectedSessionIds: null,
                        expenses: [],
                        revenueAuto: true,
                        revenueManualAmount: 0,
                        selectedSaleIds: null
                      };
                      selfUpdatingRef.current = true;
                      const nextData = { ...financeData, activeTrip: newActiveTrip };
                      me.saveFinanceData(nextData);
                      setFinanceData(nextData);
                      setFilterMode("ALL");
                      setTripName(newActiveTrip.name);
                      setTripDate(newActiveTrip.startDate);
                      setTripNote("");
                      setShowTripSettingsModal(false);
                      setTimeout(() => { selfUpdatingRef.current = false; }, 0);
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
      // MODAL 5: LỊCH SỬ CÁC CHUYẾN ĐÃ LƯU
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
      // MODAL 6: XEM CHI TIẾT CHUYẾN ĐÃ LƯU
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
                c.jsxs("div", {
                  className: "p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 gap-3 font-bold",
                  children: [
                    c.jsxs("div", { children: ["Tổng chi phí: ", c.jsx("b", { className: "text-orange-600 font-mono", children: _fmt(viewingSavedTrip.totalExpenses) + " đ" })] }),
                    c.jsxs("div", { children: ["Tổng doanh thu: ", c.jsx("b", { className: "text-emerald-700 font-mono", children: _fmt(viewingSavedTrip.totalRevenue) + " đ" })] }),
                    c.jsxs("div", { className: "col-span-2 pt-2 border-t border-slate-200", children: ["Lợi nhuận ròng: ", c.jsx("b", { className: (viewingSavedTrip.isProfit ? "text-emerald-700" : "text-rose-600") + " font-mono text-sm", children: [(viewingSavedTrip.isProfit ? "+" : "") + _fmt(viewingSavedTrip.netProfit) + " đ"] })] })
                  ]
                }),
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
                    Number(viewingSavedTrip.countedPondDeposits || 0) > 0 && c.jsxs("div", {
                      className: "flex justify-between items-center text-xs font-bold",
                      children: [
                        c.jsx("span", { className: "text-slate-700", children: "Tiền đặt cọc ao:" }),
                        c.jsxs("span", { className: "font-mono text-amber-700", children: ["- ", _fmt(viewingSavedTrip.countedPondDeposits), " đ"] })
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
};
`;

code = code.slice(0, sIdx) + newFinanceScreen + code.slice(eIdx);
console.log("✔ Replaced Xm_FinanceScreen with unified auto-sync UI");

// 5. Write targetFile and check syntax
fs.writeFileSync(targetFile, code, "utf8");
execSync("node -c assets/index-v7.js", { cwd: root, stdio: "inherit" });
console.log("✔ Syntax check passed for assets/index-v7.js");

// 6. Sync all 4 bundle mirrors identically
const mirrors = [
  "public/assets/index-v7.js",
  "assets/index-Os1X4Z7e.js",
  "public/assets/index-Os1X4Z7e.js"
];
for (const m of mirrors) {
  fs.writeFileSync(path.join(root, m), code, "utf8");
  console.log("✔ Synced mirror:", m);
}

// 7. Bump cache/version across index.html, sw.js, public/sw.js
const newVer = Date.now() + "_v23_auto_finance";
const htmlPath = path.join(root, "index.html");
let html = fs.readFileSync(htmlPath, "utf8");
html = html
  .replace(/index-v7\.js\?v=[^"]+/g, "index-v7.js?v=" + newVer)
  .replace(/sw\.js\?v=[^']+/g, "sw.js?v=" + newVer)
  .replace(/tom-cang-xanh-[^']+/g, "tom-cang-xanh-v23_auto_finance");
fs.writeFileSync(htmlPath, html, "utf8");
console.log("✔ Updated index.html cache & script version to:", newVer);

for (const swRel of ["sw.js", "public/sw.js"]) {
  const swPath = path.join(root, swRel);
  if (fs.existsSync(swPath)) {
    let sw = fs.readFileSync(swPath, "utf8");
    sw = sw.replace(/tom-cang-xanh-[^']+/g, "tom-cang-xanh-v23_auto_finance");
    fs.writeFileSync(swPath, sw, "utf8");
    console.log("✔ Updated:", swRel);
  }
}
