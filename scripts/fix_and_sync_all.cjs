const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const mainBundlePath = path.join(rootDir, "assets/index-v7.js");
let code = fs.readFileSync(mainBundlePath, "utf8");

function replaceExact(target, replacement, label) {
  const idx = code.indexOf(target);
  if (idx === -1) {
    throw new Error("❌ ANCHOR NOT FOUND: " + label);
  }
  const secondIdx = code.indexOf(target, idx + target.length);
  if (secondIdx !== -1) {
    throw new Error("❌ AMBIGUOUS ANCHOR (matched >1 times): " + label);
  }
  code = code.slice(0, idx) + replacement + code.slice(idx + target.length);
  console.log("✅ Patched:", label);
}

// ============================================================================
// 1. SHARED LOCAL DATE & SAFE NUMERIC HELPERS
// ============================================================================
replaceExact(
  `const getDefaultTraderProfileV3 = () => ({`,
  `const getLocalYYYYMMDD_v4 = (dInput) => {
  try {
    const d = dInput instanceof Date ? dInput : (dInput ? new Date(dInput) : new Date());
    if (isNaN(d.getTime())) {
      const now = new Date();
      return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
    }
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  } catch (e) {
    const now = new Date();
    return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  }
};

const isSameLocalDate_v4 = (dateVal, targetYMD) => {
  if (!dateVal || !targetYMD) return false;
  if (typeof dateVal === "string" && /^\\d{4}-\\d{2}-\\d{2}$/.test(dateVal.trim())) {
    return dateVal.trim() === targetYMD;
  }
  return getLocalYYYYMMDD_v4(dateVal) === targetYMD;
};

const parseNumericSetting_v4 = (val, fallback) => {
  if (val === undefined || val === null || val === "") return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

const emitAppDataUpdated_v4 = (source) => {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("app-data-updated", { detail: { source: source || "app", at: Date.now() } }));
    }
  } catch (e) {}
};

const getDefaultTraderProfileV3 = () => ({`,
  "Add shared local date, numeric, and app sync helpers"
);

// ============================================================================
// 2. STORAGE Cs + SYNC + DARK MODE + FINANCE SUMMARY
// ============================================================================
replaceExact(
  `static save(b,p){try{localStorage.setItem(b,JSON.stringify(p))}catch(e){console.warn("Storage save error",e)}const f=this.getUser();f&&f.uid&&typeof Pu!=="undefined"&&Pu&&Pu.currentUser&&Pu.currentUser.uid===f.uid&&this.syncAllToCloud(f.uid)}`,
  `static save(b,p){try{localStorage.setItem(b,JSON.stringify(p));if(b===Ot.SETTINGS&&typeof document!=="undefined"){p&&p.darkMode?document.documentElement.classList.add("dark"):document.documentElement.classList.remove("dark");}}catch(e){console.warn("Storage save error",e)}emitAppDataUpdated_v4(b);const f=this.getUser();f&&f.uid&&typeof Pu!=="undefined"&&Pu&&Pu.currentUser&&Pu.currentUser.uid===f.uid&&this.syncAllToCloud(f.uid)}`,
  "Cs.save emits app-data-updated and syncs darkMode"
);

replaceExact(
  `static async performCloudSync(){const u=this.getUser();if(!u||!u.uid)return{ok:false,message:"Chưa đăng nhập tài khoản Chủ Vựa"};try{const doc=await Mn.loadFromCloud(u.uid);if(doc){this.restoreFromCloud(doc);}this.syncAllToCloud(u.uid);if(typeof window!=="undefined"){window.dispatchEvent(new CustomEvent("cloud_data_synced",{detail:{timestamp:new Date().toISOString()}}));}return{ok:true,message:"Đồng bộ đám mây thành công!"};}catch(err){return{ok:false,message:err&&err.message?err.message:"Lỗi đồng bộ"};}}`,
  `static async performCloudSync(){const u=this.getUser();if(!u||!u.uid)return{ok:false,message:"Chưa đăng nhập tài khoản Chủ Vựa"};try{const doc=await Mn.loadFromCloud(u.uid);if(doc){this.restoreFromCloud(doc);}this.syncAllToCloud(u.uid);try{const st=this.getSettings();if(typeof document!=="undefined"){st&&st.darkMode?document.documentElement.classList.add("dark"):document.documentElement.classList.remove("dark");}}catch(e){}if(typeof window!=="undefined"){window.dispatchEvent(new CustomEvent("cloud_data_synced",{detail:{timestamp:new Date().toISOString()}}));window.dispatchEvent(new CustomEvent("trader-profile-updated",{detail:typeof getTraderProfileV3==="function"?getTraderProfileV3():{}}));emitAppDataUpdated_v4("cloud_sync");}return{ok:true,message:"Đồng bộ đám mây thành công!"};}catch(err){return{ok:false,message:err&&err.message?err.message:"Lỗi đồng bộ"};}}`,
  "Cs.performCloudSync broadcasts all update events and darkMode"
);

replaceExact(
  `static getSettings(){const b=localStorage.getItem(Ot.SETTINGS),p={useVoice:!0,voiceSpeed:"vừa",defaultPrice:7e3,tareRatioValue:8,darkMode:!1,enableBluetooth:!0,currencyRounding:"none",autoDeleteDays:30};return b?{...p,...JSON.parse(b)}:p}`,
  `static getSettings(){let tpTare=1;try{const tp=JSON.parse(localStorage.getItem("tom_trader_profile")||"null");if(tp&&tp.tarePer100Kg!==undefined&&tp.tarePer100Kg!=="")tpTare=Number(tp.tarePer100Kg);}catch(e){}const b=localStorage.getItem(Ot.SETTINGS),p={useVoice:!0,voiceSpeed:"vừa",defaultPrice:7e3,tareRatioValue:8,tarePer100Kg:tpTare,darkMode:!1,enableBluetooth:!0,currencyRounding:"none",autoDeleteDays:30};return b?{...p,...JSON.parse(b)}:p}`,
  "Cs.getSettings inherits trader tarePer100Kg default"
);

replaceExact(
  `me.saveSales = function(list) {
  try {
    localStorage.setItem(Ot.SALES, JSON.stringify(list));
    if (typeof me !== "undefined" && me.syncAllToCloud) me.syncAllToCloud();
  } catch(e) {
    console.warn("Save sales error", e);
  }
};`,
  `me.saveSales = function(list) {
  try {
    localStorage.setItem(Ot.SALES, JSON.stringify(list));
    emitAppDataUpdated_v4(Ot.SALES);
    if (typeof me !== "undefined" && me.syncAllToCloud) me.syncAllToCloud();
  } catch(e) {
    console.warn("Save sales error", e);
  }
};`,
  "me.saveSales emits app-data-updated"
);

replaceExact(
  `      name: "Chuyến thu mua ngày " + new Date().toLocaleDateString("vi-VN"),
      startDate: new Date().toISOString().split("T")[0],
      ownerName: ownerName,`,
  `      name: "Chuyến thu mua ngày " + new Date().toLocaleDateString("vi-VN"),
      startDate: getLocalYYYYMMDD_v4(),
      ownerName: ownerName,`,
  "me.getFinanceData default local startDate"
);

replaceExact(
  `me.saveFinanceData = function(data) {
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
};`,
  `me.saveFinanceData = function(data) {
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
  "me.saveFinanceData, me.getFinanceSummary, and fixed me.getRemainingCapital"
);

replaceExact(
  `me.saveBuyers = function(list) {
  try {
    localStorage.setItem(Ot.BUYERS, JSON.stringify(list));
    if (typeof me !== "undefined" && me.syncAllToCloud) me.syncAllToCloud();
  } catch(e) {
    console.warn("Save buyers error", e);
  }
};`,
  `me.saveBuyers = function(list) {
  try {
    localStorage.setItem(Ot.BUYERS, JSON.stringify(list));
    emitAppDataUpdated_v4(Ot.BUYERS);
    if (typeof me !== "undefined" && me.syncAllToCloud) me.syncAllToCloud();
  } catch(e) {
    console.warn("Save buyers error", e);
  }
};`,
  "me.saveBuyers emits app-data-updated"
);

replaceExact(
  `  window.dispatchEvent(new CustomEvent("tom_contract_deleted", { detail: { id } }));
  window.dispatchEvent(new CustomEvent("tom_contract_updated"));
};`,
  `  window.dispatchEvent(new CustomEvent("tom_contract_deleted", { detail: { id } }));
  window.dispatchEvent(new CustomEvent("tom_contract_updated"));
  emitAppDataUpdated_v4("contracts");
};`,
  "deleteContract emits app-data-updated"
);

replaceExact(
  `  window.dispatchEvent(new CustomEvent("tom_contract_updated", { detail: c }));
  if (c.farmerSigned || c.status === "SIGNED_LEGAL") {
    window.dispatchEvent(new CustomEvent("tom_contract_signed", { detail: c }));
  }`,
  `  window.dispatchEvent(new CustomEvent("tom_contract_updated", { detail: c }));
  if (c.farmerSigned || c.status === "SIGNED_LEGAL") {
    window.dispatchEvent(new CustomEvent("tom_contract_signed", { detail: c }));
  }
  emitAppDataUpdated_v4("contracts");`,
  "saveContract emits app-data-updated"
);

// ============================================================================
// 3. DASHBOARD Kd: LIVE SYNC, LOCAL DATE & FINANCE P&L COPY
// ============================================================================
replaceExact(
  `Kd=({setRoute:S,role:b})=>{
  const [dashDate, setDashDate] = w.useState(() => new Date().toISOString().split("T")[0]);
  const dashSessions = w.useMemo(() => {
    try {
      return (me.getSessions && me.getSessions()) || [];
    } catch(e) { return []; }
  }, []);
  const dashSales = w.useMemo(() => {
    try {
      return (me.getSales && me.getSales()) || [];
    } catch(e) { return []; }
  }, []);

  // Filter today or selected date
  const todayBuySessions = dashSessions.filter(s => s.date && s.date.startsWith(dashDate));
  const activeBuySessions = todayBuySessions.length > 0 ? todayBuySessions : dashSessions.slice(0, 5);
  const totalBuyKg = activeBuySessions.reduce((acc, s) => acc + Number(s.totalNet || s.totalGross || 0), 0);
  const totalBuyMoney = activeBuySessions.reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);

  // Completed sales
  const completedSales = dashSales.filter(s => s.status === "COMPLETED" || s.status === "SETTLED" || s.isPaidFull);
  const todayCompletedSales = completedSales.filter(s => s.date && s.date.startsWith(dashDate));`,
  `Kd=({setRoute:S,role:b})=>{
  const [dashDate, setDashDate] = w.useState(() => getLocalYYYYMMDD_v4());
  const [dashSessions, setDashSessions] = w.useState(() => {
    try { return (me.getSessions && me.getSessions()) || []; } catch(e) { return []; }
  });
  const [dashSales, setDashSales] = w.useState(() => {
    try { return (me.getSales && me.getSales()) || []; } catch(e) { return []; }
  });
  const [dashFinanceSummary, setDashFinanceSummary] = w.useState(() => (me.getFinanceSummary ? me.getFinanceSummary() : { totalRevenue: 0, totalExpenses: 0, netProfit: 0, isProfit: true }));
  w.useEffect(() => {
    const syncDash = () => {
      try {
        setDashSessions((me.getSessions && me.getSessions()) || []);
        setDashSales((me.getSales && me.getSales()) || []);
        if (me.getFinanceSummary) setDashFinanceSummary(me.getFinanceSummary());
      } catch(e) {}
    };
    window.addEventListener("app-data-updated", syncDash);
    window.addEventListener("cloud_data_synced", syncDash);
    window.addEventListener("focus", syncDash);
    return () => {
      window.removeEventListener("app-data-updated", syncDash);
      window.removeEventListener("cloud_data_synced", syncDash);
      window.removeEventListener("focus", syncDash);
    };
  }, []);

  // Filter today or selected date
  const todayBuySessions = dashSessions.filter(s => s.date && isSameLocalDate_v4(s.date, dashDate));
  const activeBuySessions = todayBuySessions.length > 0 ? todayBuySessions : dashSessions.slice(0, 5);
  const totalBuyKg = activeBuySessions.reduce((acc, s) => acc + Number(s.totalNet || s.totalGross || 0), 0);
  const totalBuyMoney = activeBuySessions.reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);

  // Completed sales
  const completedSales = dashSales.filter(s => s.status === "COMPLETED" || s.status === "SETTLED" || s.isPaidFull);
  const todayCompletedSales = completedSales.filter(s => s.date && isSameLocalDate_v4(s.date, dashDate));`,
  "Dashboard Kd live sync & local dates"
);

replaceExact(
  `const[p,f]=w.useState(!1),[O,D]=w.useState(!1),U=w.useMemo(()=>me.getSessions(),[]),Y=me.isPremium(),A=U.length`,
  `const[p,f]=w.useState(!1),[O,D]=w.useState(!1),U=dashSessions,Y=me.isPremium(),A=U.length`,
  "Dashboard Kd session count uses live dashSessions"
);

replaceExact(
  `                      c.jsx("span", { className: "text-xs font-black uppercase text-indigo-950 dark:text-indigo-200 block", children: "Quyết Toán Quản Lý Tài Chính Chuyến Đi (Tự Bỏ Vốn)" }),
                      c.jsx("span", { className: "text-[10px] text-gray-500 dark:text-gray-400 font-bold", children: "Góp vốn • Hạch toán chi phí • Chia lãi theo tỷ lệ %" })`,
  `                      c.jsx("span", { className: "text-xs font-black uppercase text-indigo-950 dark:text-indigo-200 block", children: "Quản Lý Tài Chính (Tự Doanh 100%)" }),
                      c.jsx("span", { className: "text-[10px] text-gray-600 dark:text-gray-300 font-bold", children: "Doanh thu: " + _fmt(dashFinanceSummary.totalRevenue) + " đ • Chi phí: " + _fmt(dashFinanceSummary.totalExpenses) + " đ • Lời ròng: " + (dashFinanceSummary.isProfit ? "+" : "") + _fmt(dashFinanceSummary.netProfit) + " đ" })`,
  "Dashboard Kd bottom Finance CTA shows live P&L and removes Góp vốn / Chia lãi"
);

// ============================================================================
// 4. OVERVIEW TAB Xm_OverviewTab: BATCH KEYS + LOCAL DATE + LIVE SYNC
// ============================================================================
replaceExact(
  `  const [selectedDate, setSelectedDate] = w.useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [filterMode, setFilterMode] = w.useState("DATE"); // "DATE" | "ALL"
  const [sessions, setSessions] = w.useState([]);

  w.useEffect(() => {
    try {
      const list = me.getSessions();
      setSessions(Array.isArray(list) ? list : []);
    } catch (e) {}
  }, []);

  const filteredSessions = w.useMemo(() => {
    if (filterMode === "ALL") return sessions;
    return sessions.filter(s => {
      if (!s.date) return false;
      const sDate = s.date.split("T")[0];
      return sDate === selectedDate;
    });
  }, [sessions, selectedDate, filterMode]);`,
  `  const [selectedDate, setSelectedDate] = w.useState(() => getLocalYYYYMMDD_v4());
  const [filterMode, setFilterMode] = w.useState("DATE"); // "DATE" | "ALL"
  const [sessions, setSessions] = w.useState([]);

  w.useEffect(() => {
    const refreshOverview = () => {
      try {
        const list = me.getSessions();
        setSessions(Array.isArray(list) ? list : []);
      } catch (e) {}
    };
    refreshOverview();
    window.addEventListener("app-data-updated", refreshOverview);
    window.addEventListener("cloud_data_synced", refreshOverview);
    return () => {
      window.removeEventListener("app-data-updated", refreshOverview);
      window.removeEventListener("cloud_data_synced", refreshOverview);
    };
  }, []);

  const filteredSessions = w.useMemo(() => {
    if (filterMode === "ALL") return sessions;
    return sessions.filter(s => s.date && isSameLocalDate_v4(s.date, selectedDate));
  }, [sessions, selectedDate, filterMode]);`,
  "Xm_OverviewTab local date and live sync"
);

replaceExact(
  `          const bKg = Number(b.netWeight || 0);
          const bMoney = Number(b.totalMoney || (bKg * (Number(b.price) || 0)));`,
  `          const bKg = Number(b.net ?? b.netWeight ?? 0);
          const bPrice = Number(b.unitPrice ?? b.price ?? 0);
          const bMoney = Number(b.money ?? b.totalMoney ?? (bKg * bPrice));`,
  "Xm_OverviewTab batch net/unitPrice/money field mapping"
);

replaceExact(
  `  const setQuickDate = (offsetDays) => {
    setFilterMode("DATE");
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    setSelectedDate(d.toISOString().split("T")[0]);
  };`,
  `  const setQuickDate = (offsetDays) => {
    setFilterMode("DATE");
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    setSelectedDate(getLocalYYYYMMDD_v4(d));
  };`,
  "Xm_OverviewTab quickDate local format"
);

replaceExact(
  `className: \`px-2.5 py-1 rounded-lg text-xs font-black uppercase transition-all \${filterMode === "DATE" && selectedDate === new Date().toISOString().split("T")[0] ? "bg-green-600 text-white shadow-sm" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"}\`,`,
  `className: \`px-2.5 py-1 rounded-lg text-xs font-black uppercase transition-all \${filterMode === "DATE" && selectedDate === getLocalYYYYMMDD_v4() ? "bg-green-600 text-white shadow-sm" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"}\`,`,
  "Xm_OverviewTab today button local date comparison"
);

replaceExact(
  `className: \`px-2.5 py-1 rounded-lg text-xs font-black uppercase transition-all \${filterMode === "DATE" && selectedDate === new Date(Date.now() - 86400000).toISOString().split("T")[0] ? "bg-green-600 text-white shadow-sm" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"}\`,`,
  `className: \`px-2.5 py-1 rounded-lg text-xs font-black uppercase transition-all \${filterMode === "DATE" && selectedDate === getLocalYYYYMMDD_v4(new Date(Date.now() - 86400000)) ? "bg-green-600 text-white shadow-sm" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"}\`,`,
  "Xm_OverviewTab yesterday button local date comparison"
);

// ============================================================================
// 5. WEIGHING Om: TARE 0 FIX, INLINE TARE BAR, SYNC & POND MARKING
// ============================================================================
replaceExact(
  `  const p = w.useMemo(() => me.getSettings(), []);
  const f = w.useRef(null);
  const traderProfile = w.useMemo(() => getTraderProfileV3(), []);`,
  `  const [p, setSettingsState] = w.useState(() => me.getSettings());
  const f = w.useRef(null);
  const [traderProfile, setTraderProfileState] = w.useState(() => getTraderProfileV3());
  const [finLiveSummary, setFinLiveSummary] = w.useState(() => (me.getFinanceSummary ? me.getFinanceSummary() : { shrimpPurchaseMoney: 0, totalRevenue: 0, netProfit: 0, isProfit: true }));`,
  "Om live settings, traderProfile, and finance summary state"
);

replaceExact(
  `  // Tare deduction setting: 100kg shrimp tare X kg (default 3.0 kg)
  const [tarePer100Kg, setTarePer100Kg] = w.useState(() => {
    try {
      const stored = localStorage.getItem("temp_weighing_info");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.tarePer100Kg) return Number(parsed.tarePer100Kg);
      }
      const s = me.getSettings();
      return Number(s.tarePer100Kg) || 3.0;
    } catch(e) {
      return 3.0;
    }
  });`,
  `  // Tare deduction setting: 100kg shrimp tare X kg (supports 0 kg cleanly)
  const [tarePer100Kg, setTarePer100Kg] = w.useState(() => {
    try {
      const stored = localStorage.getItem("temp_weighing_info");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.tarePer100Kg !== undefined && parsed.tarePer100Kg !== null && parsed.tarePer100Kg !== "") {
          return parseNumericSetting_v4(parsed.tarePer100Kg, 1);
        }
        if (parsed && parsed.tareSpec && typeof parsed.tareSpec === "string") {
          const mTare = parsed.tareSpec.match(/(\\d+(\\.\\d+)?)\\s*kg/i);
          if (mTare && mTare[1] !== undefined) return parseNumericSetting_v4(mTare[1], 1);
        }
      }
      const s = me.getSettings();
      const prof = getTraderProfileV3();
      return parseNumericSetting_v4(s.tarePer100Kg, parseNumericSetting_v4(prof.tarePer100Kg, 1));
    } catch(e) {
      return 1;
    }
  });`,
  "Om tarePer100Kg handles 0 and trader profile default"
);

replaceExact(
  `  // Load contracts and active vehicle
  w.useEffect(() => {
    try {
      const rawC = localStorage.getItem("tom_electronic_contracts");
      if (rawC) {
        const arr = JSON.parse(rawC);
        if (Array.isArray(arr)) setContractsList(arr);
      }
    } catch(e) {}

    const vId = localStorage.getItem("active_vehicle_id");
    if (vId) {
      const foundV = me.getVehicles().find(et => et.id === vId);
      if (foundV) Y(foundV);
    }
  }, []);`,
  `  // Load contracts, vehicle, and live sync listeners
  w.useEffect(() => {
    const syncOmLists = () => {
      try {
        const rawC = localStorage.getItem("tom_electronic_contracts");
        if (rawC) {
          const arr = JSON.parse(rawC);
          if (Array.isArray(arr)) setContractsList(arr);
        }
      } catch(e) {}
      try {
        setFarmersList(me.getFarmers() || []);
        setSettingsState(me.getSettings());
        const prof = getTraderProfileV3();
        setTraderProfileState(prof);
        if (prof && Array.isArray(prof.shrimpTypes) && prof.shrimpTypes.length > 0) {
          setShrimpTypesList(prof.shrimpTypes);
        }
        if (me.getFinanceSummary) setFinLiveSummary(me.getFinanceSummary());
      } catch(e) {}
    };
    syncOmLists();

    const vId = localStorage.getItem("active_vehicle_id");
    if (vId) {
      const foundV = me.getVehicles().find(et => et.id === vId);
      if (foundV) Y(foundV);
    }
    window.addEventListener("app-data-updated", syncOmLists);
    window.addEventListener("cloud_data_synced", syncOmLists);
    window.addEventListener("trader-profile-updated", syncOmLists);
    window.addEventListener("tom_contract_updated", syncOmLists);
    return () => {
      window.removeEventListener("app-data-updated", syncOmLists);
      window.removeEventListener("cloud_data_synced", syncOmLists);
      window.removeEventListener("trader-profile-updated", syncOmLists);
      window.removeEventListener("tom_contract_updated", syncOmLists);
    };
  }, []);`,
  "Om live listeners for contracts, farmers, shrimp types, and finance"
);

replaceExact(
  `  const handleUpdateTare = (val) => {
    const num = Number(val) || 3.0;
    setTarePer100Kg(num);
    v(prev => ({ ...prev, tareSpec: \`100kg tôm trừ bì \${num} kg\`, tarePer100Kg: num }));
    try {
      const s = me.getSettings();
      me.save(Ot.SETTINGS, { ...s, tarePer100Kg: num });
    } catch(e) {}
  };`,
  `  const handleUpdateTare = (val) => {
    const num = parseNumericSetting_v4(val, 1);
    setTarePer100Kg(num);
    v(prev => ({ ...prev, tareSpec: \`100kg tôm trừ bì \${num} kg\`, tarePer100Kg: num }));
    try {
      const s = me.getSettings();
      me.save(Ot.SETTINGS, { ...s, tarePer100Kg: num });
      const prof = getTraderProfileV3();
      if (prof && Number(prof.tarePer100Kg) !== num) {
        saveTraderProfileV3({ ...prof, tarePer100Kg: num, tareRatioValue: num });
      }
    } catch(e) {}
  };`,
  "Om handleUpdateTare supports 0 and syncs settings + trader profile"
);

replaceExact(
  `  const Z = w.useMemo(() => { const gross = De; const rate = Number(tarePer100Kg) || 3.0; return Math.round((gross * rate / 100) * 100) / 100; }, [De, tarePer100Kg]);`,
  `  const Z = w.useMemo(() => { const gross = De; const rate = parseNumericSetting_v4(tarePer100Kg, 1); return Math.round((gross * rate / 100) * 100) / 100; }, [De, tarePer100Kg]);`,
  "Om tare weight Z respects 0% tare"
);

replaceExact(
  `    // If connected to a contract, mark contract as "Ao đã cân"
    if (A.contractId) {
      try {
        const rawC = localStorage.getItem("tom_electronic_contracts");
        if (rawC) {
          const arr = JSON.parse(rawC);
          const updated = arr.map(c => c.id === A.contractId ? { ...c, status: "COMPLETED", completedAt: new Date().toISOString(), sessionId } : c);
          localStorage.setItem("tom_electronic_contracts", JSON.stringify(updated));
        }
      } catch(e) {}
    }

    // Auto sync with finance data
    try {
      const fin = me.getFinanceData();
      if (fin && fin.activeTrip) {
        fin.activeTrip.shrimpPurchaseAuto = true;
        fin.activeTrip.selectedSessionIds = null;
        me.saveFinanceData(fin);
      }
    } catch(e) {}

    const remCap = me.getRemainingCapital();
    alert("✅ ĐÃ LƯU PHIẾU CÂN THÀNH CÔNG!\\n\\n" +
          "💵 Tiền cân tôm: " + Number(totalMoneyFinal || 0).toLocaleString("vi-VN") + " VNĐ\\n" +
          "📉 Đã trừ tiền mua tôm vào nguồn vốn\\n" +
          "💰 SỐ VỐN CÒN LẠI: " + Number(remCap || 0).toLocaleString("vi-VN") + " VNĐ");`,
  `    // Mark matching contract AND pond in Chủ Ao as completed/weighed
    if (A.contractId) {
      try {
        const rawC = localStorage.getItem("tom_electronic_contracts");
        if (rawC) {
          const arr = JSON.parse(rawC);
          const updatedC = arr.map(ct => ct.id === A.contractId ? { ...ct, status: "COMPLETED", completedAt: new Date().toISOString(), sessionId } : ct);
          localStorage.setItem("tom_electronic_contracts", JSON.stringify(updatedC));
          const matchedContract = updatedC.find(ct => ct.id === A.contractId);
          if (matchedContract && typeof saveContract === "function") saveContract(matchedContract);
        }
      } catch(e) {}
    }
    try {
      const fList = me.getFarmers();
      if (Array.isArray(fList) && (A.pondId || A.contractId)) {
        let changed = false;
        const nextFarmers = fList.map(fm => {
          if ((A.pondId && fm.id === A.pondId) || (A.contractId && fm.contractId === A.contractId)) {
            changed = true;
            return { ...fm, weighed: true, status: "WEIGHED", weighedAt: new Date().toISOString(), sessionId };
          }
          return fm;
        });
        if (changed) me.save(Ot.FARMERS, nextFarmers);
      }
    } catch(e) {}

    // Auto sync with finance data
    try {
      const fin = me.getFinanceData();
      if (fin && fin.activeTrip) {
        fin.activeTrip.shrimpPurchaseAuto = true;
        fin.activeTrip.selectedSessionIds = null;
        me.saveFinanceData(fin);
      }
    } catch(e) {}

    const finSum = me.getFinanceSummary ? me.getFinanceSummary() : { shrimpPurchaseMoney: totalMoneyFinal, netProfit: -totalMoneyFinal, isProfit: false };
    alert("✅ ĐÃ LƯU PHIẾU CÂN & ĐỒNG BỘ TÀI CHÍNH!\\n\\n" +
          "🦐 Phiếu này: " + fmtKg(totalNetAllTypes) + " kg • " + Number(totalMoneyFinal || 0).toLocaleString("vi-VN") + " VNĐ\\n" +
          "📉 Tổng chi mua tôm kỳ này: " + Number(finSum.shrimpPurchaseMoney || 0).toLocaleString("vi-VN") + " VNĐ\\n" +
          "📊 Lợi nhuận ròng hiện tại: " + (finSum.isProfit ? "+" : "") + Number(finSum.netProfit || 0).toLocaleString("vi-VN") + " VNĐ");`,
  "Om save marks pond WEIGHED, syncs contracts/finance, and updates alert copy"
);

replaceExact(
  `              c.jsxs("div", {
                className: "text-[10px] font-black text-amber-200 uppercase bg-black/25 px-2.5 py-0.5 rounded-full mt-0.5 flex items-center gap-1 shadow-xs border border-amber-300/30",
                children: ["💰 Vốn còn lại: ", Number(me.getRemainingCapital ? me.getRemainingCapital() : 200000000).toLocaleString("vi-VN"), " đ"]
              }),`,
  `              c.jsxs("div", {
                className: "text-[10px] font-black text-emerald-200 uppercase bg-black/25 px-2.5 py-0.5 rounded-full mt-0.5 flex items-center gap-1 shadow-xs border border-emerald-300/30",
                children: ["📊 Lời ròng kỳ: ", (finLiveSummary.isProfit ? "+" : "") + Number(finLiveSummary.netProfit || 0).toLocaleString("vi-VN"), " đ"]
              }),`,
  "Om header badge shows live Finance net profit"
);

replaceExact(
  `              // Big Bright Yellow Net Weight Box: EXACT PREVIOUS STYLE`,
  `              // Quick Tare Selector Strip (100kg trừ X kg)
              c.jsxs("div", {
                className: "bg-gray-50 dark:bg-gray-800/80 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2",
                children: [
                  c.jsxs("div", {
                    className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 flex items-center gap-1.5",
                    children: [
                      c.jsx("span", { children: "⚖️" }),
                      c.jsxs("span", { children: ["Trừ bì: ", Number(tarePer100Kg), " kg / 100 kg", Z > 0 ? \` (-\${fmtKg(Z)} kg)\` : " (Không trừ)"] })
                    ]
                  }),
                  c.jsx("div", {
                    className: "flex flex-wrap gap-1.5",
                    children: [0, 1, 1.5, 2, 3].map(val => c.jsx("button", {
                      key: val,
                      type: "button",
                      onClick: () => handleUpdateTare(val),
                      className: \`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer \${Number(tarePer100Kg) === val ? "bg-blue-600 text-white shadow-sm" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"}\`,
                      children: val === 0 ? "0%" : \`\${val}kg\`
                    }))
                  })
                ]
              }),
              // Big Bright Yellow Net Weight Box: EXACT PREVIOUS STYLE`,
  "Om inline tare selector strip"
);

replaceExact(
  `                // Capital Impact Box (Vốn ban đầu - Tiền cân tôm = Vốn còn lại)
                c.jsxs("div", {
                  className: "p-3.5 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30 rounded-2xl border-2 border-amber-300 dark:border-amber-700/60 space-y-1.5 shadow-xs text-xs",
                  children: [
                    c.jsxs("div", {
                      className: "flex justify-between items-center",
                      children: [
                        c.jsx("span", { className: "text-amber-900 dark:text-amber-200 font-bold", children: "🏦 Tổng vốn lưu động chuyến:" }),
                        c.jsxs("span", { className: "font-mono font-bold text-gray-800 dark:text-gray-200", children: [Number(me.getRemainingCapital ? me.getRemainingCapital() : 200000000).toLocaleString("vi-VN"), " đ"] })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "flex justify-between items-center text-red-600 font-bold",
                      children: [
                        c.jsx("span", { children: "📉 Trừ tiền mua tôm phiếu này:" }),
                        c.jsxs("span", { className: "font-mono font-black", children: ["-", Number(totalMoneyFinal || 0).toLocaleString("vi-VN"), " đ"] })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "flex justify-between items-center pt-1.5 border-t border-amber-300/60 dark:border-amber-700/60 text-sm font-black text-amber-950 dark:text-amber-100",
                      children: [
                        c.jsx("span", { children: "👉 VỐN CÒN LẠI DỰ KIẾN:" }),
                        c.jsxs("span", { className: "font-mono font-black text-base text-emerald-700 dark:text-emerald-400", children: [Number((me.getRemainingCapital ? me.getRemainingCapital() : 200000000) - totalMoneyFinal).toLocaleString("vi-VN"), " VNĐ"] })
                      ]
                    })
                  ]
                }),`,
  `                // Finance P&L Sync Box (Tự Doanh 100%)
                c.jsxs("div", {
                  className: "p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 rounded-2xl border-2 border-emerald-300 dark:border-emerald-700/60 space-y-1.5 shadow-xs text-xs",
                  children: [
                    c.jsxs("div", {
                      className: "flex justify-between items-center",
                      children: [
                        c.jsx("span", { className: "text-emerald-900 dark:text-emerald-200 font-bold", children: "📈 Doanh thu bán kỳ hiện tại:" }),
                        c.jsxs("span", { className: "font-mono font-bold text-emerald-700 dark:text-emerald-300", children: ["+", Number(finLiveSummary.totalRevenue || 0).toLocaleString("vi-VN"), " đ"] })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "flex justify-between items-center text-red-600 font-bold",
                      children: [
                        c.jsx("span", { children: "📉 Chi mua tôm phiếu này:" }),
                        c.jsxs("span", { className: "font-mono font-black", children: ["-", Number(totalMoneyFinal || 0).toLocaleString("vi-VN"), " đ"] })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "flex justify-between items-center pt-1.5 border-t border-emerald-300/60 dark:border-emerald-700/60 text-sm font-black text-emerald-950 dark:text-emerald-100",
                      children: [
                        c.jsx("span", { children: "📊 LỢI NHUẬN RÒNG DỰ KIẾN:" }),
                        c.jsxs("span", { className: "font-mono font-black text-base " + (((finLiveSummary.netProfit || 0) - totalMoneyFinal) >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"), children: [((finLiveSummary.netProfit || 0) - totalMoneyFinal >= 0 ? "+" : "") + Number((finLiveSummary.netProfit || 0) - totalMoneyFinal).toLocaleString("vi-VN"), " VNĐ"] })
                      ]
                    })
                  ]
                }),`,
  "Om settlement modal displays live Finance P&L impact"
);

// ============================================================================
// 6. PURCHASE HISTORY _m: LIVE SYNC
// ============================================================================
replaceExact(
  `const _m = ({ setRoute: S, onViewDetail: b }) => {
  const [p, f] = w.useState([]);
  const [O, D] = w.useState("");

  w.useEffect(() => {
    try {
      const list = me.getSessions();
      f(Array.isArray(list) ? list : []);
    } catch(e) {
      f([]);
    }
  }, []);`,
  `const _m = ({ setRoute: S, onViewDetail: b }) => {
  const [p, f] = w.useState([]);
  const [O, D] = w.useState("");

  w.useEffect(() => {
    const refreshSessions = () => {
      try {
        const list = me.getSessions();
        f(Array.isArray(list) ? list : []);
      } catch(e) {
        f([]);
      }
    };
    refreshSessions();
    window.addEventListener("app-data-updated", refreshSessions);
    window.addEventListener("cloud_data_synced", refreshSessions);
    return () => {
      window.removeEventListener("app-data-updated", refreshSessions);
      window.removeEventListener("cloud_data_synced", refreshSessions);
    };
  }, []);`,
  "_m live sync listeners"
);

// ============================================================================
// 7. TRADER CONFIG Xm_TraderConfig: TARE SYNC, BACKUP COMPLETENESS & CLOUD SYNC
// ============================================================================
replaceExact(
  `      .catch(() => {});
    return () => { mounted = false; };
  }, []);`,
  `      .catch(() => {});
    const onCloudOrUpdate = () => {
      if (!mounted) return;
      try {
        setProfile(getTraderProfileV3());
      } catch(e) {}
    };
    window.addEventListener("cloud_data_synced", onCloudOrUpdate);
    return () => {
      mounted = false;
      window.removeEventListener("cloud_data_synced", onCloudOrUpdate);
    };
  }, []);`,
  "Xm_TraderConfig reloads profile on cloud sync"
);

replaceExact(
  `  const handleSave = () => {
    setIsSaving(true);
    try {
      saveTraderProfileV3(profile);`,
  `  const handleSave = () => {
    setIsSaving(true);
    try {
      saveTraderProfileV3(profile);
      try {
        const s = me.getSettings();
        const nextTare = parseNumericSetting_v4(profile.tarePer100Kg, 1);
        me.save(Ot.SETTINGS, { ...s, tarePer100Kg: nextTare });
      } catch(e) {}
      if (typeof me !== "undefined" && me.syncAllToCloud) me.syncAllToCloud();`,
  "Xm_TraderConfig handleSave syncs tare to Ot.SETTINGS and triggers cloud sync"
);

replaceExact(
  `                                value: profile.tarePer100Kg !== undefined ? profile.tarePer100Kg : 1,
                                onChange: (e) => updateField("tarePer100Kg", parseFloat(e.target.value) || 0),`,
  `                                value: profile.tarePer100Kg !== undefined ? profile.tarePer100Kg : 1,
                                onChange: (e) => updateField("tarePer100Kg", e.target.value === "" ? 0 : (parseFloat(e.target.value) || 0)),`,
  "Xm_TraderConfig tarePer100Kg input change safe"
);

replaceExact(
  `      const fullBackup = {
        app: "CAN_LUA_AN_NONG",
        version: "3.5",
        exportDate: new Date().toISOString(),
        profile: profile,
        farmers: typeof me !== "undefined" && typeof me.getFarmers === "function" ? me.getFarmers() : [],
        contracts: typeof getContracts === "function" ? getContracts() : [],
        sessions: typeof me !== "undefined" && typeof me.getSessions === "function" ? me.getSessions() : [],
        settings: typeof me !== "undefined" && typeof me.getSettings === "function" ? me.getSettings() : {},
        sales: typeof me !== "undefined" && typeof me.getSales === "function" ? me.getSales() : [],
        buyers: typeof me !== "undefined" && typeof me.getBuyers === "function" ? me.getBuyers() : []
      };
      const jsonStr = JSON.stringify(fullBackup, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sao_luu_an_nong_" + new Date().toISOString().split("T")[0] + "_" + Date.now() + ".json";`,
  `      const fullBackup = {
        app: "VUA_TOM_CANG_XANH",
        version: "4.0",
        exportDate: new Date().toISOString(),
        profile: profile,
        farmers: typeof me !== "undefined" && typeof me.getFarmers === "function" ? me.getFarmers() : [],
        contracts: typeof getContracts === "function" ? getContracts() : [],
        sessions: typeof me !== "undefined" && typeof me.getSessions === "function" ? me.getSessions() : [],
        settings: typeof me !== "undefined" && typeof me.getSettings === "function" ? me.getSettings() : {},
        sales: typeof me !== "undefined" && typeof me.getSales === "function" ? me.getSales() : [],
        buyers: typeof me !== "undefined" && typeof me.getBuyers === "function" ? me.getBuyers() : [],
        finance: typeof me !== "undefined" && typeof me.getFinanceData === "function" ? me.getFinanceData() : null,
        vehicles: typeof me !== "undefined" && typeof me.getVehicles === "function" ? me.getVehicles() : []
      };
      const jsonStr = JSON.stringify(fullBackup, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sao_luu_tom_cang_xanh_" + getLocalYYYYMMDD_v4() + "_" + Date.now() + ".json";`,
  "Xm_TraderConfig export includes finance + vehicles and proper branding/local date"
);

replaceExact(
  `        // 6. Restore Sales & Buyers
        if (Array.isArray(parsed.sales) && typeof me !== "undefined" && typeof me.save === "function") {
          me.save(Ot.SALES, parsed.sales);
        }
        if (Array.isArray(parsed.buyers) && typeof me !== "undefined" && typeof me.save === "function") {
          me.save(Ot.BUYERS, parsed.buyers);
        }`,
  `        // 6. Restore Sales, Buyers, Vehicles & Finance
        if (Array.isArray(parsed.sales) && typeof me !== "undefined" && typeof me.save === "function") {
          me.save(Ot.SALES, parsed.sales);
        }
        if (Array.isArray(parsed.buyers) && typeof me !== "undefined" && typeof me.save === "function") {
          me.save(Ot.BUYERS, parsed.buyers);
        }
        if (Array.isArray(parsed.vehicles) && typeof me !== "undefined" && typeof me.save === "function") {
          me.save(Ot.VEHICLES, parsed.vehicles);
        }
        if (parsed.finance && typeof parsed.finance === "object" && typeof me !== "undefined" && typeof me.saveFinanceData === "function") {
          me.saveFinanceData(parsed.finance);
        }
        if (parsed.settings && typeof document !== "undefined") {
          parsed.settings.darkMode ? document.documentElement.classList.add("dark") : document.documentElement.classList.remove("dark");
        }
        emitAppDataUpdated_v4("backup_import");
        if (typeof me !== "undefined" && me.syncAllToCloud) me.syncAllToCloud();`,
  "Xm_TraderConfig import restores finance + vehicles, applies darkMode, and notifies app"
);

// ============================================================================
// 8. FARMERS / PONDS Cm: PHONE PASSTHROUGH, me.save, LOCAL DATES, LIVE SYNC
// ============================================================================
replaceExact(
  `    window.addEventListener("tom_contract_signed", onSync);
    window.addEventListener("tom_contract_updated", onSync);
    window.addEventListener("tom_contract_deleted", onSync);`,
  `    const onFarmersSync = () => {
      try {
        p(me.getFarmers());
        const prof = typeof getTraderProfileV3 === "function" ? getTraderProfileV3() : null;
        if (prof && Array.isArray(prof.shrimpTypes) && prof.shrimpTypes.length > 0) {
          setShrimpTags(prof.shrimpTypes.map(st => st.name));
        }
      } catch(e) {}
    };
    window.addEventListener("tom_contract_signed", onSync);
    window.addEventListener("tom_contract_updated", onSync);
    window.addEventListener("tom_contract_deleted", onSync);
    window.addEventListener("app-data-updated", onFarmersSync);
    window.addEventListener("cloud_data_synced", onFarmersSync);
    window.addEventListener("trader-profile-updated", onFarmersSync);`,
  "Cm listens for app/cloud/profile updates"
);

replaceExact(
  `      if (bc) bc.close();
      clearInterval(pollId);
    };
  }, []);`,
  `      window.removeEventListener("app-data-updated", onFarmersSync);
      window.removeEventListener("cloud_data_synced", onFarmersSync);
      window.removeEventListener("trader-profile-updated", onFarmersSync);
      if (bc) bc.close();
      clearInterval(pollId);
    };
  }, []);`,
  "Cm cleans up listeners on unmount"
);

replaceExact(
  `    weighingDate: new Date().toISOString().split("T")[0],`,
  `    weighingDate: getLocalYYYYMMDD_v4(),`,
  "Cm initial weighingDate local"
);

replaceExact(
  `  const handleStartWeighingThisPond = (pond) => {
    const weighingData = {
      farmerName: pond.name,
      riceType: pond.shrimpType || "Tôm càng sen",
      price: pond.traderPrice || pond.defaultPrice || 160000,
      deposit: pond.depositMoney || pond.defaultDeposit || 0,
      pondId: pond.id,
      contractId: pond.contractId || null,
      tareSpec: pond.tareSpec || "100 con trừ 3 kg"
    };
    localStorage.setItem("temp_weighing_info", JSON.stringify(weighingData));
    S(re.WEIGHING);
  };

  // Action: Mark Pond as Weighed / Unweighed
  const handleToggleWeighedStatus = (pondId, currentStatus) => {
    const updated = b.map(x => {
      if (x.id === pondId) {
        const next = !currentStatus;
        return { ...x, weighed: next, status: next ? "WEIGHED" : "CONTRACTED" };
      }
      return x;
    });
    p(updated);
    localStorage.setItem("annong_farmers", JSON.stringify(updated));
  };`,
  `  const handleStartWeighingThisPond = (pond) => {
    const profTare = typeof getTraderProfileV3 === "function" ? parseNumericSetting_v4(getTraderProfileV3().tarePer100Kg, 1) : 1;
    let parsedTare = profTare;
    if (pond.tareSpec && typeof pond.tareSpec === "string") {
      const m = pond.tareSpec.match(/(\\d+(\\.\\d+)?)\\s*kg/i);
      if (m && m[1] !== undefined) parsedTare = parseNumericSetting_v4(m[1], profTare);
    }
    const weighingData = {
      farmerName: pond.name,
      farmerPhone: pond.phone || "",
      riceType: pond.shrimpType || "Tôm càng sen",
      price: pond.traderPrice || pond.defaultPrice || 160000,
      deposit: pond.depositMoney || pond.defaultDeposit || 0,
      pondId: pond.id,
      contractId: pond.contractId || null,
      tareSpec: pond.tareSpec || \`100kg tôm trừ bì \${parsedTare} kg\`,
      tarePer100Kg: parsedTare
    };
    localStorage.setItem("temp_weighing_info", JSON.stringify(weighingData));
    S(re.WEIGHING);
  };

  // Action: Mark Pond as Weighed / Unweighed
  const handleToggleWeighedStatus = (pondId, currentStatus) => {
    const updated = b.map(x => {
      if (x.id === pondId) {
        const next = !currentStatus;
        return { ...x, weighed: next, status: next ? "WEIGHED" : "CONTRACTED" };
      }
      return x;
    });
    p(updated);
    me.save(Ot.FARMERS, updated);
  };`,
  "Cm passes farmerPhone + tarePer100Kg and uses me.save on toggle"
);

replaceExact(
  `      weighingDate: "",`,
  `      weighingDate: getLocalYYYYMMDD_v4(),`,
  "Cm reset form uses local date"
);

replaceExact(
  `                                  weighingDate: pond.weighingDate || new Date().toISOString().split("T")[0],`,
  `                                  weighingDate: pond.weighingDate || getLocalYYYYMMDD_v4(),`,
  "Cm fallback contract creation uses local date"
);

replaceExact(
  `        onSaveLocation: (lat, lng) => {
          const updated = b.map(x => x.id === locationPickerPond.id ? { ...x, lat, lng } : x);
          p(updated);
          localStorage.setItem("annong_farmers", JSON.stringify(updated));
          setLocationPickerPond(null);
        }`,
  `        onSaveLocation: (lat, lng) => {
          const updated = b.map(x => x.id === locationPickerPond.id ? { ...x, lat, lng } : x);
          p(updated);
          me.save(Ot.FARMERS, updated);
          setLocationPickerPond(null);
        }`,
  "Cm GPS location save uses me.save(Ot.FARMERS, updated)"
);

// ============================================================================
// 9. SETTINGS Um: TYPO, TARE 0..4 SYNCED WITH TRADER PROFILE, LIVE SYNC
// ============================================================================
replaceExact(
  `Um=({setRoute:S,role:b})=>{const[p,f]=w.useState(me.getSettings()),[O,D]=w.useState(!1),U=_=>{f(_),me.save(Ot.SETTINGS,_),_.darkMode?document.documentElement.classList.add("dark"):document.documentElement.classList.remove("dark"),D(!0),setTimeout(()=>D(!1),2e3)}`,
  `Um=({setRoute:S,role:b})=>{const[p,f]=w.useState(me.getSettings()),[O,D]=w.useState(!1),U=_=>{f(_),me.save(Ot.SETTINGS,_);try{const prof=getTraderProfileV3();if(_&&_.tarePer100Kg!==undefined&&Number(prof.tarePer100Kg)!==Number(_.tarePer100Kg)){saveTraderProfileV3({...prof,tarePer100Kg:Number(_.tarePer100Kg),tareRatioValue:Number(_.tarePer100Kg)})}}catch(e){}_.darkMode?document.documentElement.classList.add("dark"):document.documentElement.classList.remove("dark"),D(!0),setTimeout(()=>D(!1),2e3)};w.useEffect(()=>{const s=()=>f(me.getSettings());window.addEventListener("app-data-updated",s);window.addEventListener("cloud_data_synced",s);return()=>{window.removeEventListener("app-data-updated",s);window.removeEventListener("cloud_data_synced",s)};},[])`,
  "Um syncs tarePer100Kg with trader profile and listens for updates"
);

replaceExact(
  `title:"Thiết Thiết Bị Bluetooth"`,
  `title:"Thiết Bị Bluetooth"`,
  "Um fix typo Thiết Thiết Bị Bluetooth"
);

replaceExact(
  `c.jsx(v,{label:"Quy cách trừ bì tôm mặc định",options:[{label:"100kg - 2kg (2%)",val:2},{label:"100kg - 2.5kg (2.5%)",val:2.5},{label:"100kg - 3kg (3% Chuẩn)",val:3},{label:"100kg - 3.5kg (3.5%)",val:3.5},{label:"100kg - 4kg (4%)",val:4}],value:Number(p.tarePer100Kg)||3,onSelect:_=>U({...p,tarePer100Kg:Number(_)})})`,
  `c.jsx(v,{label:"Quy cách trừ bì tôm mặc định",options:[{label:"Không trừ bì (0%)",val:0},{label:"100kg - 1kg (1% Chuẩn)",val:1},{label:"100kg - 1.5kg (1.5%)",val:1.5},{label:"100kg - 2kg (2%)",val:2},{label:"100kg - 3kg (3%)",val:3},{label:"100kg - 4kg (4%)",val:4}],value:parseNumericSetting_v4(p.tarePer100Kg,1),onSelect:_=>U({...p,tarePer100Kg:Number(_)})})`,
  "Um tarePer100Kg supports 0, 1, 1.5, 2, 3, 4"
);

// ============================================================================
// 10. CUSTOMERS Xm_CustomersScreen: LIVE SYNC
// ============================================================================
replaceExact(
  `  w.useEffect(() => {
    refreshList();
  }, []);`,
  `  w.useEffect(() => {
    refreshList();
    window.addEventListener("app-data-updated", refreshList);
    window.addEventListener("cloud_data_synced", refreshList);
    return () => {
      window.removeEventListener("app-data-updated", refreshList);
      window.removeEventListener("cloud_data_synced", refreshList);
    };
  }, []);`,
  "Xm_CustomersScreen live buyer list sync"
);

// ============================================================================
// 11. SALES Xm_SalesScreen: WIRE CUSTOMERS, DYNAMIC SHRIMP TYPES, FINANCE ALERTS
// ============================================================================
replaceExact(
  `  const [salesList, setSalesList] = w.useState([]);
  const [buyersList, setBuyersList] = w.useState([]);
  const refreshData = () => {
    try {
      setSalesList(me.getSales());
      setBuyersList(me.getBuyers());
    } catch(e) {}
  };
  w.useEffect(() => {
    refreshData();
  }, []);`,
  `  const [salesList, setSalesList] = w.useState([]);
  const [buyersList, setBuyersList] = w.useState([]);
  const [profileTypes, setProfileTypes] = w.useState(() => {
    try {
      const tp = getTraderProfileV3();
      return Array.isArray(tp.shrimpTypes) ? tp.shrimpTypes.map(st => st.name).filter(Boolean) : [];
    } catch(e) { return []; }
  });
  const [selectedBuyerMeta, setSelectedBuyerMeta] = w.useState(null);
  const refreshData = () => {
    try {
      setSalesList(me.getSales());
      setBuyersList(me.getBuyers());
      const tp = getTraderProfileV3();
      if (tp && Array.isArray(tp.shrimpTypes)) {
        setProfileTypes(tp.shrimpTypes.map(st => st.name).filter(Boolean));
      }
    } catch(e) {}
  };
  w.useEffect(() => {
    refreshData();
    try {
      const preRaw = localStorage.getItem("preselected_buyer_for_sale");
      if (preRaw) {
        localStorage.removeItem("preselected_buyer_for_sale");
        const buyer = JSON.parse(preRaw);
        if (buyer && buyer.name) {
          const grp = buyer.targetGroup || "FACTORY";
          setTargetGroup(grp);
          try { localStorage.setItem("last_sale_target_group", grp); } catch(e) {}
          setSelectedBuyerMeta(buyer);
          if (grp === "RETAIL") {
            setRetailBuyerName(buyer.name);
          } else if (grp === "MARKET") {
            setMarketBuyerName(buyer.name);
            if (buyer.defaultVehiclePlate) setMarketVehiclePlate(buyer.defaultVehiclePlate);
            if (buyer.defaultDriverName) setMarketDriver(buyer.defaultDriverName);
            if (buyer.marketDeliveryTime) setMarketTime(buyer.marketDeliveryTime);
          } else {
            setFactoryBuyerName(buyer.name);
            if (Array.isArray(buyer.shrimpPrices) && buyer.shrimpPrices.length > 0 && buyer.shrimpPrices[0].typeName) {
              setFactoryShrimpType(buyer.shrimpPrices[0].typeName);
            }
          }
        }
      }
    } catch(e) {}
    window.addEventListener("app-data-updated", refreshData);
    window.addEventListener("cloud_data_synced", refreshData);
    window.addEventListener("trader-profile-updated", refreshData);
    return () => {
      window.removeEventListener("app-data-updated", refreshData);
      window.removeEventListener("cloud_data_synced", refreshData);
      window.removeEventListener("trader-profile-updated", refreshData);
    };
  }, []);`,
  "Xm_SalesScreen reads preselected_buyer_for_sale, buyersList, and listens for sync"
);

replaceExact(
  `  // Common Form States
  // 1. RETAIL STATES
  const retailTypes = [
    "Tôm càng sen Loại 1 (10-15 con)",
    "Tôm càng sen Loại 2 (16-25 con)",
    "Tôm càng xô tươi",
    "Tôm trứng / tôm ôm trứng",
    "Tôm oxy tươi sống",
    "Tôm lột cấp đông"
  ];`,
  `  // Common Form States
  // 1. RETAIL STATES (merged with Trader Profile shrimpTypes)
  const retailTypes = w.useMemo(() => {
    const base = [
      "Tôm càng sen Loại 1 (10-15 con)",
      "Tôm càng sen Loại 2 (16-25 con)",
      "Tôm càng xô tươi",
      "Tôm trứng / tôm ôm trứng",
      "Tôm oxy tươi sống",
      "Tôm lột cấp đông"
    ];
    const merged = [...base];
    (profileTypes || []).forEach(n => {
      if (n && !merged.some(x => x.toLowerCase() === n.toLowerCase())) merged.push(n);
    });
    return merged;
  }, [profileTypes]);
  const retailDirectoryBuyers = w.useMemo(() => buyersList.filter(b => b.targetGroup === "RETAIL"), [buyersList]);
  const marketDirectoryBuyers = w.useMemo(() => buyersList.filter(b => b.targetGroup === "MARKET"), [buyersList]);
  const factoryDirectoryBuyers = w.useMemo(() => buyersList.filter(b => b.targetGroup === "FACTORY"), [buyersList]);`,
  "Xm_SalesScreen dynamic buyer groups & shrimp types"
);

replaceExact(
  `      buyerName: retailBuyerName.trim() || "Khách Lẻ Tại Vựa",
      buyerPhone: "",
      buyerAddress: "Tại vựa Tôm Càng Xanh",`,
  `      buyerId: (selectedBuyerMeta && selectedBuyerMeta.name === retailBuyerName.trim()) ? selectedBuyerMeta.id : "",
      buyerName: retailBuyerName.trim() || "Khách Lẻ Tại Vựa",
      buyerPhone: (selectedBuyerMeta && selectedBuyerMeta.name === retailBuyerName.trim() && selectedBuyerMeta.phone) ? selectedBuyerMeta.phone : "",
      buyerAddress: (selectedBuyerMeta && selectedBuyerMeta.name === retailBuyerName.trim() && selectedBuyerMeta.address) ? selectedBuyerMeta.address : "Tại vựa Tôm Càng Xanh",
      buyerLatitude: (selectedBuyerMeta && selectedBuyerMeta.name === retailBuyerName.trim()) ? (selectedBuyerMeta.latitude || null) : null,
      buyerLongitude: (selectedBuyerMeta && selectedBuyerMeta.name === retailBuyerName.trim()) ? (selectedBuyerMeta.longitude || null) : null,`,
  "Xm_SalesScreen retail order attaches buyer metadata"
);

replaceExact(
  `    me.addSale(newSale);
    refreshData();
    setRetailKg("");
    const remRetail = me.getRemainingCapital();
    alert("✅ ĐÃ LƯU ĐƠN BÁN LẺ THÀNH CÔNG!\\n\\n" +
          "💵 Tiền bán tôm: +" + _e(newSale.totalMoney) + " đ (" + fmtKg(newSale.totalNet) + " kg)\\n" +
          "📈 Tiền bán đã được cộng dồn vào quỹ vốn\\n" +
          "💰 SỐ VỐN HIỆN TẠI: " + _e(remRetail) + " VNĐ");`,
  `    me.addSale(newSale);
    refreshData();
    setRetailKg("");
    const finRetail = me.getFinanceSummary ? me.getFinanceSummary() : { totalRevenue: newSale.totalMoney, netProfit: newSale.totalMoney, isProfit: true };
    alert("✅ ĐÃ LƯU ĐƠN BÁN LẺ & ĐỒNG BỘ TÀI CHÍNH!\\n\\n" +
          "💵 Đơn này: +" + _e(newSale.totalMoney) + " đ (" + fmtKg(newSale.totalNet) + " kg)\\n" +
          "📈 Tổng doanh thu kỳ này: " + _e(finRetail.totalRevenue) + " VNĐ\\n" +
          "📊 Lợi nhuận ròng hiện tại: " + (finRetail.isProfit ? "+" : "") + _e(finRetail.netProfit) + " VNĐ");`,
  "Xm_SalesScreen retail alert shows synced Finance P&L"
);

replaceExact(
  `      isPaidFull: false,
      buyerName: marketBuyerName.trim() || "Chợ Đầu Mối",
      phiCount: phi,`,
  `      isPaidFull: false,
      buyerId: (selectedBuyerMeta && selectedBuyerMeta.name === marketBuyerName.trim()) ? selectedBuyerMeta.id : "",
      buyerName: marketBuyerName.trim() || "Chợ Đầu Mối",
      buyerPhone: (selectedBuyerMeta && selectedBuyerMeta.name === marketBuyerName.trim() && selectedBuyerMeta.phone) ? selectedBuyerMeta.phone : "",
      buyerAddress: (selectedBuyerMeta && selectedBuyerMeta.name === marketBuyerName.trim() && selectedBuyerMeta.address) ? selectedBuyerMeta.address : "",
      buyerLatitude: (selectedBuyerMeta && selectedBuyerMeta.name === marketBuyerName.trim()) ? (selectedBuyerMeta.latitude || null) : null,
      buyerLongitude: (selectedBuyerMeta && selectedBuyerMeta.name === marketBuyerName.trim()) ? (selectedBuyerMeta.longitude || null) : null,
      phiCount: phi,`,
  "Xm_SalesScreen market order attaches buyer metadata"
);

replaceExact(
  `  // 3. FACTORY (CÔNG TY / NHÀ MÁY) STATES
  const factoryBuyers = [
    "Công ty CP Thủy sản Camimex",
    "Tập đoàn Thủy hải sản Minh Phú",
    "Công ty CP Chế biến Thủy sản Quốc Việt",
    "Công ty Thủy sản Cases Cà Mau"
  ];
  const [factoryBuyerName, setFactoryBuyerName] = w.useState(factoryBuyers[0]);
  const [factoryShrimpType, setFactoryShrimpType] = w.useState("Tôm càng sen size lớn (10-15 c/kg)");
  const [factoryDeliveredKg, setFactoryDeliveredKg] = w.useState("");

  const handleSaveFactoryStep1 = () => {
    const kg = Number(factoryDeliveredKg) || 0;
    const now = new Date();
    const timeFullStr = now.toLocaleDateString("vi-VN") + " " + now.getHours() + ":" + String(now.getMinutes()).padStart(2, "0");

    const newSale = {
      id: "sale_" + Date.now(),
      code: "CTY-" + String(Date.now()).slice(-4),
      date: new Date().toISOString(),
      targetGroup: "FACTORY",
      status: "AWAITING_RESULT", // CHỜ KẾT QUẢ
      isPaidFull: false,
      buyerName: factoryBuyerName.trim(),
      riceType: factoryShrimpType,`,
  `  // 3. FACTORY (CÔNG TY / NHÀ MÁY) STATES
  const factoryBuyers = w.useMemo(() => {
    const dirNames = factoryDirectoryBuyers.map(b => b.name).filter(Boolean);
    const defaults = [
      "Công ty CP Thủy sản Camimex",
      "Nhà máy Chế biến Thủy sản Minh Phú",
      "Công ty CP Chế biến Thủy sản Quốc Việt",
      "Công ty Thủy sản Cases Cà Mau"
    ];
    const list = dirNames.length > 0 ? [...dirNames] : [...defaults];
    if (factoryBuyerName && !list.includes(factoryBuyerName)) list.unshift(factoryBuyerName);
    return list;
  }, [factoryDirectoryBuyers]);
  const [factoryBuyerName, setFactoryBuyerName] = w.useState(() => {
    try {
      const f = (me.getBuyers && me.getBuyers() || []).find(b => b.targetGroup === "FACTORY");
      if (f && f.name) return f.name;
    } catch(e) {}
    return "Công ty CP Thủy sản Camimex";
  });
  const [factoryShrimpType, setFactoryShrimpType] = w.useState("Tôm càng sen size lớn (10-15 c/kg)");
  const [factoryDeliveredKg, setFactoryDeliveredKg] = w.useState("");

  const handleSaveFactoryStep1 = () => {
    const kg = Number(factoryDeliveredKg) || 0;
    const now = new Date();
    const timeFullStr = now.toLocaleDateString("vi-VN") + " " + now.getHours() + ":" + String(now.getMinutes()).padStart(2, "0");
    const matchedFactory = factoryDirectoryBuyers.find(b => b.name === factoryBuyerName.trim()) || selectedBuyerMeta || {};

    const newSale = {
      id: "sale_" + Date.now(),
      code: "CTY-" + String(Date.now()).slice(-4),
      date: new Date().toISOString(),
      targetGroup: "FACTORY",
      status: "AWAITING_RESULT", // CHỜ KẾT QUẢ
      isPaidFull: false,
      buyerId: matchedFactory.id || "",
      buyerName: factoryBuyerName.trim(),
      buyerPhone: matchedFactory.phone || "",
      buyerAddress: matchedFactory.address || "",
      buyerRepresentative: matchedFactory.representative || "",
      buyerLatitude: matchedFactory.latitude || null,
      buyerLongitude: matchedFactory.longitude || null,
      riceType: factoryShrimpType,`,
  "Xm_SalesScreen factory buyers pulled from customer directory"
);

replaceExact(
  `    const updates = {
      status: "COMPLETED",
      isPaidFull: true,
      totalNet: kg,
      totalGross: kg,
      totalMoney: money,
      settledAt: new Date().toISOString(),
      notes: settlingSaleObj.targetGroup === "MARKET"
        ? "Đã chốt đơn chợ: " + fmtKg(kg) + " kg - thực nhận " + _e(money) + " đ (sau trừ hoa hồng)"
        : "Đã nghiệm thu công ty: " + fmtKg(kg) + " kg - thanh toán " + _e(money) + " đ"
    };

    me.updateSale(settlingSaleObj.id, updates);
    refreshData();
    setSettlingSaleObj(null);
    setSettleKg("");
    setSettleMoney("");
    const remSettle = me.getRemainingCapital();
    alert("✅ ĐÃ CHỐT ĐƠN THÀNH CÔNG!\\n\\n" +
          "💵 Tiền bán thực nhận: +" + _e(money) + " đ (" + fmtKg(kg) + " kg)\\n" +
          "📈 Tiền bán đã được cộng dồn vào quỹ vốn\\n" +
          "💰 SỐ VỐN HIỆN TẠI: " + _e(remSettle) + " VNĐ");`,
  `    const updates = {
      status: "COMPLETED",
      isPaidFull: true,
      totalNet: kg,
      totalGross: kg,
      unitPrice: kg > 0 ? Math.round(money / kg) : 0,
      totalMoney: money,
      settledAt: new Date().toISOString(),
      notes: settlingSaleObj.targetGroup === "MARKET"
        ? "Đã chốt đơn chợ: " + fmtKg(kg) + " kg - thực nhận " + _e(money) + " đ (sau trừ hoa hồng)"
        : "Đã nghiệm thu công ty: " + fmtKg(kg) + " kg - thanh toán " + _e(money) + " đ"
    };

    me.updateSale(settlingSaleObj.id, updates);
    refreshData();
    setSettlingSaleObj(null);
    setSettleKg("");
    setSettleMoney("");
    const finSettle = me.getFinanceSummary ? me.getFinanceSummary() : { totalRevenue: money, netProfit: money, isProfit: true };
    alert("✅ ĐÃ CHỐT ĐƠN & ĐỒNG BỘ TÀI CHÍNH!\\n\\n" +
          "💵 Thực nhận đơn này: +" + _e(money) + " đ (" + fmtKg(kg) + " kg)\\n" +
          "📈 Tổng doanh thu kỳ này: " + _e(finSettle.totalRevenue) + " VNĐ\\n" +
          "📊 Lợi nhuận ròng hiện tại: " + (finSettle.isProfit ? "+" : "") + _e(finSettle.netProfit) + " VNĐ");`,
  "Xm_SalesScreen quick settle calculates unitPrice and displays Finance P&L"
);

// Inject customer quick-pickers into RETAIL, MARKET, and FACTORY forms
replaceExact(
  `                // Khách hàng
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-[10px] font-black uppercase text-gray-400 block mb-1", children: "Tên Khách Mua Lẻ" }),
                    c.jsx("input", {
                      type: "text",
                      value: retailBuyerName,
                      onChange: e => setRetailBuyerName(e.target.value),
                      className: "w-full p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold text-sm outline-none"
                    })
                  ]
                }),`,
  `                // Khách hàng (Chọn nhanh từ Danh bạ hoặc nhập tên)
                c.jsxs("div", {
                  className: "space-y-1.5",
                  children: [
                    c.jsx("label", { className: "text-[10px] font-black uppercase text-gray-400 block", children: "Tên Khách Mua Lẻ" }),
                    retailDirectoryBuyers.length > 0 && c.jsx("div", {
                      className: "flex flex-wrap gap-1.5",
                      children: [
                        { id: "_walkin", name: "Khách Lẻ Mua Tại Vựa" },
                        ...retailDirectoryBuyers
                      ].map(b => c.jsx("button", {
                        key: b.id,
                        type: "button",
                        onClick: () => {
                          setRetailBuyerName(b.name);
                          setSelectedBuyerMeta(b.id === "_walkin" ? null : b);
                        },
                        className: \`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer \${retailBuyerName === b.name ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"}\`,
                        children: b.name
                      }))
                    }),
                    c.jsx("input", {
                      type: "text",
                      value: retailBuyerName,
                      onChange: e => setRetailBuyerName(e.target.value),
                      className: "w-full p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold text-sm outline-none"
                    })
                  ]
                }),`,
  "Xm_SalesScreen retail buyer picker from Customers directory"
);

replaceExact(
  `                    // Tên chợ
                    c.jsxs("div", {
                      children: [
                        c.jsx("label", { className: "text-[10px] font-black uppercase text-gray-400 block mb-1", children: "Tên Chợ / Vựa Tiếp Nhận" }),
                        c.jsx("input", {
                          type: "text",
                          value: marketBuyerName,
                          onChange: e => setMarketBuyerName(e.target.value),
                          className: "w-full p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold text-sm outline-none"
                        })
                      ]
                    }),`,
  `                    // Tên chợ (Chọn từ Danh bạ Chợ Đầu Mối để tự điền Xe/Giờ hoặc nhập tên)
                    c.jsxs("div", {
                      className: "space-y-1.5",
                      children: [
                        c.jsx("label", { className: "text-[10px] font-black uppercase text-gray-400 block", children: "Tên Chợ / Vựa Tiếp Nhận" }),
                        marketDirectoryBuyers.length > 0 && c.jsx("div", {
                          className: "flex flex-wrap gap-1.5",
                          children: marketDirectoryBuyers.map(mb => c.jsx("button", {
                            key: mb.id,
                            type: "button",
                            onClick: () => {
                              setSelectedBuyerMeta(mb);
                              setMarketBuyerName(mb.name || "");
                              if (mb.defaultVehiclePlate) setMarketVehiclePlate(mb.defaultVehiclePlate);
                              if (mb.defaultDriverName) setMarketDriver(mb.defaultDriverName);
                              if (mb.marketDeliveryTime) setMarketTime(mb.marketDeliveryTime);
                            },
                            className: \`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer \${marketBuyerName === mb.name ? "bg-amber-500 text-blue-950 border-amber-500 shadow-xs" : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"}\`,
                            children: mb.name
                          }))
                        }),
                        c.jsx("input", {
                          type: "text",
                          value: marketBuyerName,
                          onChange: e => setMarketBuyerName(e.target.value),
                          className: "w-full p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold text-sm outline-none"
                        })
                      ]
                    }),`,
  "Xm_SalesScreen market buyer picker auto-fills vehicle, driver & delivery time"
);

replaceExact(
  `                    // Chọn công ty từ danh mục
                    c.jsxs("div", {
                      children: [
                        c.jsx("label", { className: "text-[10px] font-black uppercase text-gray-400 block mb-1", children: "Tên Công Ty / Nhà Máy Thu Mua" }),
                        c.jsx("select", {
                          value: factoryBuyerName,
                          onChange: e => setFactoryBuyerName(e.target.value),
                          className: "w-full p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold text-sm outline-none text-gray-900 dark:text-white",
                          children: factoryBuyers.map(fb => c.jsx("option", { value: fb, children: fb }, fb))
                        })
                      ]
                    }),

                    // Loại tôm
                    c.jsxs("div", {
                      children: [
                        c.jsx("label", { className: "text-[10px] font-black uppercase text-gray-400 block mb-1", children: "Loại Tôm Hợp Đồng Xuất Giao" }),
                        c.jsx("input", {
                          type: "text",
                          value: factoryShrimpType,
                          onChange: e => setFactoryShrimpType(e.target.value),
                          className: "w-full p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold text-xs outline-none"
                        })
                      ]
                    }),`,
  `                    // Chọn công ty từ danh mục khách hàng
                    c.jsxs("div", {
                      children: [
                        c.jsx("label", { className: "text-[10px] font-black uppercase text-gray-400 block mb-1", children: "Tên Công Ty / Nhà Máy Thu Mua" }),
                        c.jsx("select", {
                          value: factoryBuyerName,
                          onChange: e => {
                            const nextName = e.target.value;
                            setFactoryBuyerName(nextName);
                            const matched = factoryDirectoryBuyers.find(b => b.name === nextName);
                            if (matched) {
                              setSelectedBuyerMeta(matched);
                              if (Array.isArray(matched.shrimpPrices) && matched.shrimpPrices.length > 0 && matched.shrimpPrices[0].typeName) {
                                setFactoryShrimpType(matched.shrimpPrices[0].typeName);
                              }
                            }
                          },
                          className: "w-full p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold text-sm outline-none text-gray-900 dark:text-white",
                          children: factoryBuyers.map(fb => c.jsx("option", { value: fb, children: fb }, fb))
                        })
                      ]
                    }),

                    // Loại tôm (hiện gợi ý từ bảng giá công ty & profile)
                    c.jsxs("div", {
                      className: "space-y-1.5",
                      children: [
                        c.jsx("label", { className: "text-[10px] font-black uppercase text-gray-400 block", children: "Loại Tôm Hợp Đồng Xuất Giao" }),
                        (() => {
                          const matchedF = factoryDirectoryBuyers.find(b => b.name === factoryBuyerName);
                          const fTypes = (matchedF && Array.isArray(matchedF.shrimpPrices) ? matchedF.shrimpPrices.map(sp => sp.typeName) : []).concat(profileTypes || []);
                          const uniqueTypes = Array.from(new Set(fTypes.filter(Boolean))).slice(0, 6);
                          return uniqueTypes.length > 0 && c.jsx("div", {
                            className: "flex flex-wrap gap-1.5",
                            children: uniqueTypes.map(tn => c.jsx("button", {
                              key: tn,
                              type: "button",
                              onClick: () => setFactoryShrimpType(tn),
                              className: \`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer \${factoryShrimpType === tn ? "bg-blue-600 text-white border-blue-600" : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"}\`,
                              children: tn
                            }))
                          });
                        })(),
                        c.jsx("input", {
                          type: "text",
                          value: factoryShrimpType,
                          onChange: e => setFactoryShrimpType(e.target.value),
                          className: "w-full p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold text-xs outline-none"
                        })
                      ]
                    }),`,
  "Xm_SalesScreen factory shrimp types quick chips"
);

// ============================================================================
// 12. SALE DETAIL Xm_SaleDetailScreen: SYNC + ALL UNSETTLED ORDERS
// ============================================================================
replaceExact(
  `const Xm_SaleDetailScreen = ({ setRoute, sale: initialSale, onBack }) => {
  const [sale, setSale] = w.useState(initialSale);
  const [showSettlement, setShowSettlement] = w.useState(false);
  const [settleData, setSettleData] = w.useState({ tare: 0, saleMoney: 0, commission: 0 });
  const [showPayDebtModal, setShowPayDebtModal] = w.useState(false);
  const [selectedBatchIdx, setSelectedBatchIdx] = w.useState(0);`,
  `const Xm_SaleDetailScreen = ({ setRoute, sale: initialSale, onBack }) => {
  const [sale, setSale] = w.useState(initialSale);
  const [showSettlement, setShowSettlement] = w.useState(false);
  const [settleData, setSettleData] = w.useState({ actualKg: (initialSale && (initialSale.totalNet || initialSale.totalGross || initialSale.factoryDeliveredKg)) || 0, tare: 0, saleMoney: 0, commission: 0 });
  const [showPayDebtModal, setShowPayDebtModal] = w.useState(false);
  const [selectedBatchIdx, setSelectedBatchIdx] = w.useState(0);

  w.useEffect(() => {
    setSale(initialSale);
    if (initialSale) {
      setSettleData({
        actualKg: initialSale.totalNet || initialSale.totalGross || initialSale.factoryDeliveredKg || 0,
        tare: initialSale.totalTare || 0,
        saleMoney: initialSale.marketSaleMoney || initialSale.totalMoney || 0,
        commission: initialSale.marketCommission || 0
      });
    }
  }, [initialSale]);

  w.useEffect(() => {
    const syncSale = () => {
      if (!sale || !sale.id || !me.getSales) return;
      const latest = me.getSales().find(s => s.id === sale.id);
      if (latest) setSale(latest);
    };
    window.addEventListener("app-data-updated", syncSale);
    window.addEventListener("cloud_data_synced", syncSale);
    return () => {
      window.removeEventListener("app-data-updated", syncSale);
      window.removeEventListener("cloud_data_synced", syncSale);
    };
  }, [sale && sale.id]);`,
  "Xm_SaleDetailScreen syncs initialSale & app updates"
);

replaceExact(
  `                sale.status === "PENDING_SETTLEMENT" && c.jsx("button", {
                  onClick: () => setShowSettlement(true),
                  className: "w-full py-3 mt-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-sm uppercase italic active:scale-95 transition-all shadow-md cursor-pointer",
                  children: "📝 Quyết Toán Phiếu Chợ"
                })`,
  `                (sale.status === "PENDING_SETTLEMENT" || sale.status === "SELLING" || sale.status === "AWAITING_RESULT") && c.jsx("button", {
                  onClick: () => {
                    setSettleData({
                      actualKg: sale.totalNet || sale.totalGross || sale.factoryDeliveredKg || 0,
                      tare: sale.totalTare || 0,
                      saleMoney: sale.marketSaleMoney || sale.totalMoney || 0,
                      commission: sale.marketCommission || 0
                    });
                    setShowSettlement(true);
                  },
                  className: "w-full py-3 mt-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-sm uppercase italic active:scale-95 transition-all shadow-md cursor-pointer",
                  children: sale.targetGroup === "FACTORY" ? "📝 Nhập Kết Quả Nghiệm Thu Công Ty" : "📝 Quyết Toán Chốt Tiền Đơn Chợ"
                })`,
  "Xm_SaleDetailScreen settle button enabled for SELLING, PENDING_SETTLEMENT, AWAITING_RESULT"
);

replaceExact(
  `            c.jsx("h3", {
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
                  },`,
  `            c.jsx("h3", {
              className: "font-black text-lg mb-4 text-gray-900 dark:text-white uppercase tracking-tight",
              children: sale.targetGroup === "FACTORY" ? "Nghiệm Thu Công Ty" : "Quyết Toán Đơn Chợ"
            }),
            c.jsxs("div", {
              className: "space-y-4 mb-6",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-xs font-bold text-gray-500 mb-1 block uppercase", children: "Tổng số kg thực cân / nghiệm thu (kg) *" }),
                    c.jsx("input", {
                      type: "number", step: "any",
                      value: settleData.actualKg || "",
                      onChange: e => setSettleData({ ...settleData, actualKg: Number(e.target.value) || 0 }),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-lg outline-none focus:border-blue-500"
                    })
                  ]
                }),
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-xs font-bold text-gray-500 mb-1 block uppercase", children: "Tổng trừ bì / Hao hụt thêm (kg)" }),
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
                    c.jsx("label", { className: "text-xs font-bold text-gray-500 mb-1 block uppercase", children: "Tổng tiền thu được thực tế (VNĐ) *" }),
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
                    const grossKg = Number(settleData.actualKg || sale.totalGross || sale.totalNet || 0);
                    const finalNet = Math.max(0, grossKg - Number(settleData.tare || 0));
                    const finalMoney = Math.max(0, Number(settleData.saleMoney || 0) - Number(settleData.commission || 0));
                    if (finalNet <= 0 || finalMoney <= 0) {
                      alert("Vui lòng nhập đầy đủ số kg thực tế và số tiền thu được!");
                      return;
                    }
                    const updates = {
                      totalTare: Number(settleData.tare || 0),
                      totalGross: grossKg,
                      totalNet: finalNet,
                      unitPrice: finalNet > 0 ? Math.round(finalMoney / finalNet) : 0,
                      marketSaleMoney: Number(settleData.saleMoney || 0),
                      marketCommission: Number(settleData.commission || 0),
                      totalMoney: finalMoney,
                      status: "COMPLETED",
                      isPaidFull: true,
                      remainingDebt: 0,
                      paidAmount: finalMoney,
                      settledAt: new Date().toISOString()
                    };
                    const saved = me.updateSale(sale.id, updates);
                    if (saved) {
                      setSale(saved);
                      setShowSettlement(false);
                    }
                  },`,
  "Xm_SaleDetailScreen settlement handles actualKg cleanly with zero negative weight bug"
);

// ============================================================================
// 13. FINANCE Xm_FinanceScreen: LOCAL DATE, LIVE SYNC, SAFE DIVISIONS, CLEAN TRIP
// ============================================================================
replaceExact(
  `  // Data sources
  const [financeData, setFinanceData] = w.useState(() => me.getFinanceData());
  const [sessions, setSessions] = w.useState(() => {
    try { return (me.getSessions && me.getSessions()) || []; } catch(e) { return []; }
  });
  const [sales, setSales] = w.useState(() => {
    try { return (me.getSales && me.getSales()) || []; } catch(e) { return []; }
  });`,
  `  // Data sources
  const [financeData, setFinanceData] = w.useState(() => me.getFinanceData());
  const [sessions, setSessions] = w.useState(() => {
    try { return (me.getSessions && me.getSessions()) || []; } catch(e) { return []; }
  });
  const [sales, setSales] = w.useState(() => {
    try { return (me.getSales && me.getSales()) || []; } catch(e) { return []; }
  });

  w.useEffect(() => {
    const syncFinanceListeners = (ev) => {
      try {
        setSessions((me.getSessions && me.getSessions()) || []);
        setSales((me.getSales && me.getSales()) || []);
        if (!ev || ev.type === "cloud_data_synced" || (ev.detail && ev.detail.source === "backup_import")) {
          const freshFin = me.getFinanceData();
          setFinanceData(freshFin);
          if (freshFin && freshFin.activeTrip) {
            setTripName(freshFin.activeTrip.name || "Chuyến thu mua tôm");
            setTripDate(freshFin.activeTrip.startDate || getLocalYYYYMMDD_v4());
            setTripNote(freshFin.activeTrip.note || "");
            setFilterMode(freshFin.activeTrip.filterMode || "DATE");
          }
        }
      } catch(e) {}
    };
    window.addEventListener("app-data-updated", syncFinanceListeners);
    window.addEventListener("cloud_data_synced", syncFinanceListeners);
    return () => {
      window.removeEventListener("app-data-updated", syncFinanceListeners);
      window.removeEventListener("cloud_data_synced", syncFinanceListeners);
    };
  }, []);`,
  "Xm_FinanceScreen live sync listeners on sessions, sales, cloud, backup"
);

replaceExact(
  `  const [tripDate, setTripDate] = w.useState(trip.startDate || new Date().toISOString().split("T")[0]);`,
  `  const [tripDate, setTripDate] = w.useState(trip.startDate || getLocalYYYYMMDD_v4());`,
  "Xm_FinanceScreen tripDate uses local YYYY-MM-DD"
);

replaceExact(
  `  const filteredSessions = sessions.filter(s => {
    if (filterMode === "ALL") return true;
    return s.date && s.date.startsWith(tripDate);
  });`,
  `  const filteredSessions = sessions.filter(s => {
    if (filterMode === "ALL") return true;
    return s.date && isSameLocalDate_v4(s.date, tripDate);
  });`,
  "Xm_FinanceScreen filteredSessions local date match"
);

replaceExact(
  `  const filteredSales = completedSales.filter(s => {
    if (filterMode === "ALL") return true;
    return s.date && s.date.startsWith(tripDate);
  });`,
  `  const filteredSales = completedSales.filter(s => {
    if (filterMode === "ALL") return true;
    return s.date && isSameLocalDate_v4(s.date, tripDate);
  });`,
  "Xm_FinanceScreen filteredSales local date match"
);

replaceExact(
  `    const newActiveTrip = {
      id: "trip_" + Date.now(),
      name: "Chuyến thu mua ngày " + new Date().toLocaleDateString("vi-VN"),
      startDate: new Date().toISOString().split("T")[0],
      note: "",`,
  `    const newActiveTrip = {
      id: "trip_" + Date.now(),
      name: "Chuyến thu mua ngày " + new Date().toLocaleDateString("vi-VN"),
      startDate: getLocalYYYYMMDD_v4(),
      note: "",`,
  "Xm_FinanceScreen handleSettleAndArchiveTrip new trip uses local date"
);

replaceExact(
  `c.jsxs("span", { className: "text-[10px] text-slate-500 font-mono", children: ["TB: ", _fmt(Math.round(Number(s.totalMoney || 0) / (Number(s.totalNet || s.totalGross || 1)))), " đ/kg"] })`,
  `c.jsxs("span", { className: "text-[10px] text-slate-500 font-mono", children: ["TB: ", _fmt(Number(s.totalNet || s.totalGross || 0) > 0 ? Math.round(Number(s.totalMoney || 0) / Number(s.totalNet || s.totalGross)) : 0), " đ/kg"] })`,
  "Xm_FinanceScreen BUY tab safe unit price division"
);

replaceExact(
  `c.jsxs("span", { className: "text-[10px] text-slate-500 font-mono", children: ["Giá: ", _fmt(Math.round(Number(sl.totalMoney || 0) / (Number(sl.totalNet || sl.totalGross || 1)))), " đ/kg"] })`,
  `c.jsxs("span", { className: "text-[10px] text-slate-500 font-mono", children: ["Giá: ", _fmt(Number(sl.totalNet || sl.totalGross || 0) > 0 ? Math.round(Number(sl.totalMoney || 0) / Number(sl.totalNet || sl.totalGross)) : 0), " đ/kg"] })`,
  "Xm_FinanceScreen SELL tab safe unit price division"
);

replaceExact(
  `                      const newActiveTrip = {
                        id: "trip_" + Date.now(),
                        name: "Chuyến thu mua ngày " + new Date().toLocaleDateString("vi-VN"),
                        startDate: new Date().toISOString().split("T")[0],
                        note: "",
                        shrimpPurchaseAuto: true,
                        shrimpPurchaseManualAmount: 0,
                        expenses: [],
                        revenueAuto: true,
                        revenueManualAmount: 0
                      };`,
  `                      const newActiveTrip = {
                        id: "trip_" + Date.now(),
                        name: "Chuyến thu mua ngày " + new Date().toLocaleDateString("vi-VN"),
                        startDate: getLocalYYYYMMDD_v4(),
                        note: "",
                        filterMode: "DATE",
                        shrimpPurchaseAuto: true,
                        shrimpPurchaseManualAmount: 0,
                        selectedSessionIds: null,
                        expenses: [],
                        revenueAuto: true,
                        revenueManualAmount: 0,
                        selectedSaleIds: null
                      };
                      setFilterMode("DATE");`,
  "Xm_FinanceScreen clean new trip uses local date & resets selection/filter"
);

// ============================================================================
// 14. BmMainApp: APPLY DARK MODE ON MOUNT & AFTER CLOUD RESTORE
// ============================================================================
replaceExact(
  `const BmMainApp=()=>{const[S,b]=w.useState(()=>{const u=me.getUser();if(u)u.role="OWNER";return u;}),[p,f]=w.useState(!0),[O,D]=w.useState(()=>me.getUser()?re.DASHBOARD:re.AUTH),[U,Y]=w.useState(null);w.useEffect(()=>{const _=D1(Pu,async z=>{var L,te;if(z){const Q=await Mn.loadFromCloud(z.uid);if(Q){me.restoreFromCloud(Q);}const se=(Q==null?void 0:Q.user)||{uid:z.uid,phoneNumber:z.phoneNumber||"",displayName:z.displayName||"Người dùng",photoURL:z.photoURL||"",role:"OWNER",subscriptionStatus:((te=Q==null?void 0:Q.user)==null?void 0:te.subscriptionStatus)||"FREE",createdAt:new Date().toISOString()};se.role="OWNER";me.setUser(se);me.syncAllToCloud(z.uid);b(se);D(re.DASHBOARD)}else me.setUser(null),b(null),D(re.AUTH);f(!1)});return()=>_()},[]);`,
  `const BmMainApp=()=>{const[S,b]=w.useState(()=>{const u=me.getUser();if(u)u.role="OWNER";return u;}),[p,f]=w.useState(!0),[O,D]=w.useState(()=>me.getUser()?re.DASHBOARD:re.AUTH),[U,Y]=w.useState(null);w.useEffect(()=>{const applyTheme=()=>{try{const st=me.getSettings();st&&st.darkMode?document.documentElement.classList.add("dark"):document.documentElement.classList.remove("dark");}catch(e){}};applyTheme();window.addEventListener("app-data-updated",applyTheme);window.addEventListener("cloud_data_synced",applyTheme);const _=D1(Pu,async z=>{var L,te;if(z){const Q=await Mn.loadFromCloud(z.uid);if(Q){me.restoreFromCloud(Q);applyTheme();if(typeof window!=="undefined"){window.dispatchEvent(new CustomEvent("cloud_data_synced",{detail:{timestamp:new Date().toISOString()}}));window.dispatchEvent(new CustomEvent("trader-profile-updated",{detail:typeof getTraderProfileV3==="function"?getTraderProfileV3():{}}));emitAppDataUpdated_v4("login_cloud_restore");}}const se=(Q==null?void 0:Q.user)||{uid:z.uid,phoneNumber:z.phoneNumber||"",displayName:z.displayName||"Người dùng",photoURL:z.photoURL||"",role:"OWNER",subscriptionStatus:((te=Q==null?void 0:Q.user)==null?void 0:te.subscriptionStatus)||"FREE",createdAt:new Date().toISOString()};se.role="OWNER";me.setUser(se);me.syncAllToCloud(z.uid);b(se);D(re.DASHBOARD)}else me.setUser(null),b(null),D(re.AUTH);f(!1)});return()=>{_();window.removeEventListener("app-data-updated",applyTheme);window.removeEventListener("cloud_data_synced",applyTheme);}},[]);`,
  "BmMainApp applies darkMode on load and emits cloud sync events after login restore"
);

// ============================================================================
// WRITE ALL 4 MIRRORS + UPDATE index.html & sw.js
// ============================================================================
const bundleTargets = [
  "assets/index-v7.js",
  "public/assets/index-v7.js",
  "assets/index-Os1X4Z7e.js",
  "public/assets/index-Os1X4Z7e.js"
];

for (const rel of bundleTargets) {
  fs.writeFileSync(path.join(rootDir, rel), code, "utf8");
  console.log("📦 Synced bundle ->", rel);
}

const versionTag = Date.now() + "_v21_full_sync";
const cacheName = "tom-cang-xanh-v21_full_sync";

// Update index.html
const indexPath = path.join(rootDir, "index.html");
let indexHtml = fs.readFileSync(indexPath, "utf8");
indexHtml = indexHtml.replace(
  /\/assets\/index-v7\.js(\?v=[^"']*)?/g,
  `/assets/index-v7.js?v=${versionTag}`
);
indexHtml = indexHtml.replace(
  /if \(name !== '[^']*'\)/g,
  `if (name !== '${cacheName}')`
);
indexHtml = indexHtml.replace(
  /\/sw\.js(\?v=[^"']*)?/g,
  `/sw.js?v=${versionTag}`
);
fs.writeFileSync(indexPath, indexHtml, "utf8");
console.log("📄 Updated index.html ->", versionTag);

// Update sw.js & public/sw.js
for (const swRel of ["sw.js", "public/sw.js"]) {
  const swPath = path.join(rootDir, swRel);
  let swCode = fs.readFileSync(swPath, "utf8");
  swCode = swCode.replace(
    /const CACHE_NAME = '[^']*';/,
    `const CACHE_NAME = '${cacheName}';`
  );
  fs.writeFileSync(swPath, swCode, "utf8");
  console.log("📄 Updated", swRel, "->", cacheName);
}

console.log("\n🎉 ALL FIXES APPLIED & SYNCED SUCCESSFULLY!");
