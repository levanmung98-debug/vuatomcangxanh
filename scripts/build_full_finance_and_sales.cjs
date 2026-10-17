const fs = require("fs");
const path = require("path");

const bundlePath = path.join(__dirname, "../assets/index-v7.js");
let bundle = fs.readFileSync(bundlePath, "utf8");

console.log("Original bundle length:", bundle.length);

// =========================================================================
// 1. EXTEND STORAGE KEYS (Ot) & me OBJECT FOR FINANCE
// =========================================================================

// Ensure Ot.FINANCE exists
if (!bundle.includes('Ot.FINANCE = "annong_finance_v1"')) {
  const pOtSales = bundle.indexOf('Ot.SALES = "annong_sales_v2";');
  if (pOtSales !== -1) {
    bundle = bundle.replace(
      'Ot.SALES = "annong_sales_v2";',
      'Ot.SALES = "annong_sales_v2";Ot.FINANCE = "annong_finance_v1";'
    );
    console.log("Added Ot.FINANCE key successfully!");
  }
}

// Add me.getFinanceData and me.saveFinanceData
const financeStorageCode = `
me.getFinanceData = function() {
  try {
    const raw = localStorage.getItem(Ot.FINANCE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.activeTrip) return parsed;
    }
  } catch(e) {}
  return {
    activeTrip: {
      id: "trip_" + Date.now(),
      name: "Chuyến thu mua ngày " + new Date().toLocaleDateString("vi-VN"),
      startDate: new Date().toISOString().split("T")[0],
      investors: [
        { id: "inv_1", name: "Tôi (Chủ vựa)", amount: 100000000 },
        { id: "inv_2", name: "Anh B (Hùn vốn)", amount: 100000000 }
      ],
      shrimpPurchaseAuto: true,
      shrimpPurchaseManualAmount: 0,
      expenses: [
        { id: "exp_1", category: "Tiền thuê xe / vận chuyển", amount: 1500000, note: "Xe giao tôm", date: new Date().toISOString() },
        { id: "exp_2", category: "Tiền nước đá, oxy", amount: 600000, note: "20 cây đá + nạp oxy", date: new Date().toISOString() },
        { id: "exp_3", category: "Tiền nhân công kéo / lựa tôm", amount: 1200000, note: "4 nhân công", date: new Date().toISOString() }
      ],
      revenueAuto: true,
      revenueManualAmount: 0
    },
    savedTrips: []
  };
};
me.saveFinanceData = function(data) {
  try {
    localStorage.setItem(Ot.FINANCE, JSON.stringify(data));
  } catch(e) {
    console.warn("Save finance data error", e);
  }
};
`;

if (!bundle.includes("me.getFinanceData = function()")) {
  const pInsert = bundle.indexOf("me.getBuyers = function()");
  if (pInsert !== -1) {
    bundle = bundle.slice(0, pInsert) + financeStorageCode + "\n" + bundle.slice(pInsert);
    console.log("Added me.getFinanceData and me.saveFinanceData successfully!");
  }
}

// =========================================================================
// 2. EXTEND re ENUM AND Tm MENU
// =========================================================================

// Add S.FINANCE="FINANCE" to re enum
if (!bundle.includes('S.FINANCE="FINANCE"')) {
  bundle = bundle.replace(
    'S.CUSTOMERS="CUSTOMERS",S)(',
    'S.CUSTOMERS="CUSTOMERS",S.FINANCE="FINANCE",S)('
  );
  console.log("Added S.FINANCE to re enum!");
}

// Add Finance tab to navigation menu Tm
if (!bundle.includes('route:re.FINANCE')) {
  const oldMenuPart = '{route:re.SALES,label:"Bán ra & Xuất tôm",icon:c.jsx(F1,{size:22}),roles:["OWNER","FARMER"]},';
  const newMenuPart = '{route:re.SALES,label:"Bán ra & Xuất tôm",icon:c.jsx(F1,{size:22}),roles:["OWNER","FARMER"]},{route:re.FINANCE,label:"Tài chính",icon:c.jsx(Ds,{size:22}),roles:["OWNER","FARMER"]},';
  bundle = bundle.replace(oldMenuPart, newMenuPart);
  console.log("Added Tài chính to navigation menu Tm!");
}

// Add switch case in BmMainApp
if (!bundle.includes('case re.FINANCE:return c.jsx(Xm_FinanceScreen')) {
  const oldSwitch = 'case re.SALES:return c.jsx(Xm_SalesScreen,{..._,onViewDetail:z=>{Y(z);D(re.SALES_DETAIL);}});';
  const newSwitch = 'case re.SALES:return c.jsx(Xm_SalesScreen,{..._,onViewDetail:z=>{Y(z);D(re.SALES_DETAIL);}});case re.FINANCE:return c.jsx(Xm_FinanceScreen,{..._});';
  bundle = bundle.replace(oldSwitch, newSwitch);
  console.log("Added case re.FINANCE to BmMainApp!");
}

// =========================================================================
// 3. UPGRADE DASHBOARD (Kd) - YÊU CẦU 3 (Bảng tổng quan cân đối tôm hôm nay)
// =========================================================================

const dashboardUpgradeMarker = "/* DASHBOARD_SHRIMP_BALANCE_BLOCK */";
if (!bundle.includes(dashboardUpgradeMarker)) {
  const oldKdStart = 'const Kd=({setRoute:S,role:b})=>{';
  const newKdStart = `const Kd=({setRoute:S,role:b})=>{
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
  const todayCompletedSales = completedSales.filter(s => s.date && s.date.startsWith(dashDate));
  const activeCompletedSales = todayCompletedSales.length > 0 ? todayCompletedSales : completedSales.slice(0, 8);
  const totalSoldKg = activeCompletedSales.reduce((acc, s) => acc + Number(s.totalNet || s.totalGross || 0), 0);
  const totalSoldMoney = activeCompletedSales.reduce((acc, s) => acc + Number(s.totalMoney || 0), 0);

  // In-progress market (Chợ) and awaiting factory (Công ty)
  const sellingMarketSales = dashSales.filter(s => s.targetGroup === "MARKET" && (s.status === "SELLING" || s.status === "PENDING_SETTLEMENT"));
  const totalSellingPhi = sellingMarketSales.reduce((acc, s) => acc + Number(s.phiCount || s.totalBales || 0), 0);

  const awaitingFactorySales = dashSales.filter(s => s.targetGroup === "FACTORY" && s.status === "AWAITING_RESULT");
  const awaitingFactoryCount = awaitingFactorySales.length;

  // Shrimp difference & loss rate
  const diffKg = totalBuyKg > 0 && totalSoldKg > 0 ? (totalBuyKg - totalSoldKg) : 0;
  const lossRate = totalBuyKg > 0 && totalSoldKg > 0 ? ((diffKg / totalBuyKg) * 100) : 0;
  const _fmt = (n) => Number(n || 0).toLocaleString("vi-VN");
  const _fmtKg = (n) => {
    if (!n || n <= 0) return "0";
    const r = Math.round(n * 10) / 10;
    return Number.isInteger(r) ? String(r) : String(r);
  };
`;

  bundle = bundle.replace(oldKdStart, newKdStart);

  // Now inject the Daily Shrimp Reconciliation Card right below the top banner
  const oldCardBannerEnd = 'c.jsx(Sm,{size:140,className:"absolute -right-8 -bottom-8 opacity-10"})]})]}),';
  const newReconciliationCard = `c.jsx(Sm,{size:140,className:"absolute -right-8 -bottom-8 opacity-10"})]})]}),
      // ${dashboardUpgradeMarker}
      c.jsxs("div", {
        className: "bg-white dark:bg-gray-900 rounded-[35px] p-5 border border-gray-200 dark:border-gray-800 shadow-lg space-y-4",
        children: [
          c.jsxs("div", {
            className: "flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3",
            children: [
              c.jsxs("div", {
                className: "flex items-center gap-2",
                children: [
                  c.jsx("span", { className: "text-xl", children: "📊" }),
                  c.jsxs("div", {
                    children: [
                      c.jsx("h3", { className: "text-base font-black uppercase italic tracking-tight text-gray-900 dark:text-white", children: "Cân Đối Thu Mua & Xuất Tôm" }),
                      c.jsxs("p", { className: "text-[10px] font-bold text-gray-500", children: ["Ngày: ", dashDate, " • ", activeBuySessions.length, " phiếu mua • ", activeCompletedSales.length, " đơn bán"] })
                    ]
                  })
                ]
              }),
              c.jsxs("button", {
                type: "button",
                onClick: () => S(re.FINANCE),
                className: "px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-tight flex items-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer",
                children: [
                  c.jsx("span", { children: "💰" }),
                  "Tài Chính"
                ]
              })
            ]
          }),
          // 4 Grid Columns: Mua Vào | Đã Bán | Đang Xuất Bán | Hao Hụt
          c.jsxs("div", {
            className: "grid grid-cols-2 sm:grid-cols-4 gap-2.5",
            children: [
              // Col 1: Mua Vào
              c.jsxs("div", {
                className: "bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-1",
                children: [
                  c.jsxs("div", {
                    className: "flex items-center justify-between",
                    children: [
                      c.jsx("span", { className: "text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300", children: "📥 Mua Vào" }),
                      c.jsx("span", { className: "text-xs", children: "⚖️" })
                    ]
                  }),
                  c.jsxs("div", { className: "font-mono font-black text-lg text-emerald-900 dark:text-emerald-100 leading-none", children: [_fmtKg(totalBuyKg), " ", c.jsx("span", { className: "text-xs font-sans", children: "kg" })] }),
                  c.jsxs("div", { className: "text-[11px] font-bold text-emerald-700 dark:text-emerald-400 font-mono truncate", children: [_fmt(totalBuyMoney), " đ"] })
                ]
              }),
              // Col 2: Đã Bán Hoàn Tất
              c.jsxs("div", {
                className: "bg-blue-50 dark:bg-blue-950/40 p-3 rounded-2xl border border-blue-200 dark:border-blue-800 space-y-1",
                children: [
                  c.jsxs("div", {
                    className: "flex items-center justify-between",
                    children: [
                      c.jsx("span", { className: "text-[10px] font-black uppercase text-blue-800 dark:text-blue-300", children: "📤 Bán Ra (Xong)" }),
                      c.jsx("span", { className: "text-xs", children: "💵" })
                    ]
                  }),
                  c.jsxs("div", { className: "font-mono font-black text-lg text-blue-900 dark:text-blue-100 leading-none", children: [_fmtKg(totalSoldKg), " ", c.jsx("span", { className: "text-xs font-sans", children: "kg" })] }),
                  c.jsxs("div", { className: "text-[11px] font-bold text-blue-700 dark:text-blue-400 font-mono truncate", children: [_fmt(totalSoldMoney), " đ"] })
                ]
              }),
              // Col 3: Đang Bán / Chờ Kết Quả
              c.jsxs("div", {
                className: "bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-1",
                children: [
                  c.jsxs("div", {
                    className: "flex items-center justify-between",
                    children: [
                      c.jsx("span", { className: "text-[10px] font-black uppercase text-amber-800 dark:text-amber-300", children: "⏳ Đang Bán" }),
                      c.jsx("span", { className: "text-xs", children: "🚛" })
                    ]
                  }),
                  c.jsxs("div", { className: "font-mono font-black text-lg text-amber-900 dark:text-amber-100 leading-none", children: [totalSellingPhi, " ", c.jsx("span", { className: "text-xs font-sans", children: "phi chợ" })] }),
                  c.jsxs("div", { className: "text-[11px] font-bold text-amber-700 dark:text-amber-400 truncate", children: [awaitingFactoryCount, " đơn cty chờ kq"] })
                ]
              }),
              // Col 4: Hao Hụt & Chênh Lệch
              c.jsxs("div", {
                className: "bg-purple-50 dark:bg-purple-950/40 p-3 rounded-2xl border border-purple-200 dark:border-purple-800 space-y-1",
                children: [
                  c.jsxs("div", {
                    className: "flex items-center justify-between",
                    children: [
                      c.jsx("span", { className: "text-[10px] font-black uppercase text-purple-800 dark:text-purple-300", children: "📉 Hao Hụt" }),
                      c.jsx("span", { className: "text-xs", children: "🦐" })
                    ]
                  }),
                  c.jsxs("div", { className: "font-mono font-black text-lg text-purple-900 dark:text-purple-100 leading-none", children: [diffKg > 0 ? "-" + _fmtKg(diffKg) : _fmtKg(diffKg), " ", c.jsx("span", { className: "text-xs font-sans", children: "kg" })] }),
                  c.jsxs("div", {
                    className: "text-[11px] font-bold " + (lossRate > 5 ? "text-red-600 dark:text-red-400" : "text-purple-700 dark:text-purple-400") + " font-mono",
                    children: [lossRate > 0 ? ("Hao " + lossRate.toFixed(1) + "%") : "Cân đối"]
                  })
                ]
              })
            ]
          }),
          // Shortcut CTA to Finance tab
          c.jsxs("div", {
            onClick: () => S(re.FINANCE),
            className: "p-3 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-950/40 dark:to-purple-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between cursor-pointer hover:border-indigo-400 transition-all",
            children: [
              c.jsxs("div", {
                className: "flex items-center gap-2.5",
                children: [
                  c.jsx("div", { className: "w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm", children: "💰" }),
                  c.jsxs("div", {
                    children: [
                      c.jsx("span", { className: "text-xs font-black uppercase text-indigo-950 dark:text-indigo-200 block", children: "Quyết Toán Tài Chính & Chia Lời Lỗ Hùn Vốn" }),
                      c.jsx("span", { className: "text-[10px] text-gray-500 dark:text-gray-400 font-bold", children: "Góp vốn • Hạch toán chi phí • Chia lãi theo tỷ lệ %" })
                    ]
                  })
                ]
              }),
              c.jsx("span", { className: "text-indigo-600 dark:text-indigo-400 text-sm font-black", children: "➔" })
            ]
          })
        ]
      }),`;

  bundle = bundle.replace(oldCardBannerEnd, newReconciliationCard);
  console.log("Upgraded Dashboard Kd with Daily Shrimp Reconciliation!");
}

// Write to bundle
fs.writeFileSync(bundlePath, bundle, "utf8");
console.log("Part 1 executed successfully!");
