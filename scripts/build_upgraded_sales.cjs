const fs = require("fs");
const path = require("path");

const bundlePath = path.join(__dirname, "../assets/index-v7.js");
let bundle = fs.readFileSync(bundlePath, "utf8");

const pStart = bundle.indexOf("const Xm_SalesScreen =");
const pMid = bundle.indexOf("const Xm_SaleDetailScreen =");
const pEnd = bundle.indexOf("const Xm_FinanceScreen =");

if (pStart === -1 || pMid === -1 || pEnd === -1) {
  console.error("Boundaries not found:", { pStart, pMid, pEnd });
  process.exit(1);
}

// Upgraded Xm_SalesScreen and Xm_SaleDetailScreen
const upgradedSalesCode = `
const Xm_SalesScreen = ({ setRoute, onViewDetail, role }) => {
  const fmtKg = (n) => {
    if (!n || n <= 0) return "0";
    const r = Math.round(n * 10) / 10;
    return Number.isInteger(r) ? String(r) : String(r);
  };
  const _e = ($) => Number($ || 0).toLocaleString("vi-VN");
  const p = w.useMemo(() => me.getSettings(), []);

  // Target channel: RETAIL (Bán lẻ) | MARKET (Chợ) | FACTORY (Công ty)
  const [targetGroup, setTargetGroup] = w.useState(() => {
    try {
      return localStorage.getItem("last_sale_target_group") || "RETAIL";
    } catch(e) {
      return "RETAIL";
    }
  });

  const [salesList, setSalesList] = w.useState([]);
  const [buyersList, setBuyersList] = w.useState([]);
  const refreshData = () => {
    try {
      setSalesList(me.getSales());
      setBuyersList(me.getBuyers());
    } catch(e) {}
  };
  w.useEffect(() => {
    refreshData();
  }, []);

  // Modal states
  const [showHistoryModal, setShowHistoryModal] = w.useState(false);
  const [historyFilter, setHistoryFilter] = w.useState("ALL");
  const [settlingSaleObj, setSettlingSaleObj] = w.useState(null); // For market or factory quick settle
  const [settleKg, setSettleKg] = w.useState("");
  const [settleMoney, setSettleMoney] = w.useState("");
  const [showWeighGridModal, setShowWeighGridModal] = w.useState(false);

  // Common Form States
  // 1. RETAIL STATES
  const retailTypes = [
    "Tôm càng sen Loại 1 (10-15 con)",
    "Tôm càng sen Loại 2 (16-25 con)",
    "Tôm càng xô tươi",
    "Tôm trứng / tôm ôm trứng",
    "Tôm oxy tươi sống",
    "Tôm lột cấp đông"
  ];
  const [retailBuyerName, setRetailBuyerName] = w.useState("Khách Lẻ Mua Tại Vựa");
  const [retailType, setRetailType] = w.useState(retailTypes[0]);
  const [retailPrice, setRetailPrice] = w.useState(""); // Direct input, not fixed!
  const [retailKg, setRetailKg] = w.useState("");

  const retailMoney = (Number(retailPrice) || 0) * (Number(retailKg) || 0);

  const handleSaveRetail = () => {
    const kg = Number(retailKg) || 0;
    const price = Number(retailPrice) || 0;
    if (kg <= 0) {
      alert("Vui lòng nhập số kg tôm bán lẻ!");
      return;
    }
    if (price <= 0) {
      alert("Vui lòng nhập đơn giá bán lẻ tại thời điểm này!");
      return;
    }
    const newSale = {
      id: "sale_" + Date.now(),
      code: "BL-" + String(Date.now()).slice(-4),
      date: new Date().toISOString(),
      targetGroup: "RETAIL",
      status: "COMPLETED",
      isPaidFull: true,
      buyerName: retailBuyerName.trim() || "Khách Lẻ Tại Vựa",
      buyerPhone: "",
      buyerAddress: "Tại vựa Tôm Càng Xanh",
      riceType: retailType,
      unitPrice: price,
      totalNet: kg,
      totalGross: kg,
      totalBales: 1,
      totalMoney: kg * price,
      batches: [{
        typeName: retailType,
        unitPrice: price,
        net: kg,
        gross: kg,
        bales: 1,
        money: kg * price
      }],
      notes: "Bán lẻ thanh toán ngay - giá tại thời điểm bán"
    };

    me.addSale(newSale);
    refreshData();
    setRetailKg("");
    alert("✅ Đã lưu thành công đơn bán lẻ: " + _e(newSale.totalMoney) + " đ (" + fmtKg(newSale.totalNet) + " kg)");
  };

  // 2. MARKET (CHỢ ĐẦU MỐI) STATES
  const [marketBuyerName, setMarketBuyerName] = w.useState("Vựa Chợ Đầu Mối Bình Điền");
  const [marketPhiCount, setMarketPhiCount] = w.useState(""); // Số lượng phi oxy giao đi
  const [marketVehiclePlate, setMarketVehiclePlate] = w.useState("69C-123.45");
  const [marketDriver, setMarketDriver] = w.useState("");
  const [marketTime, setMarketTime] = w.useState(() => {
    const now = new Date();
    return now.getHours() + ":" + String(now.getMinutes()).padStart(2, "0");
  });

  const handleSaveMarketStep1 = () => {
    const phi = Number(marketPhiCount) || 0;
    if (phi <= 0) {
      alert("Vui lòng nhập số lượng phi (thùng/phi oxy) giao đi chợ!");
      return;
    }
    const newSale = {
      id: "sale_" + Date.now(),
      code: "CHO-" + String(Date.now()).slice(-4),
      date: new Date().toISOString(),
      targetGroup: "MARKET",
      status: "SELLING", // ĐANG BÁN
      isPaidFull: false,
      buyerName: marketBuyerName.trim() || "Chợ Đầu Mối",
      phiCount: phi,
      vehiclePlate: marketVehiclePlate.trim(),
      driverName: marketDriver.trim(),
      marketDeliveryTime: marketTime,
      totalNet: 0,
      totalGross: 0,
      totalBales: phi,
      totalMoney: 0,
      notes: "Đơn giao chợ đầu mối đang bán - chờ chốt kg và tiền thực nhận"
    };

    me.addSale(newSale);
    refreshData();
    setMarketPhiCount("");
    alert("🚚 Đã lưu đơn giao chợ: " + phi + " phi oxy (" + newSale.buyerName + "). Trạng thái: ĐANG BÁN");
  };

  // 3. FACTORY (CÔNG TY / NHÀ MÁY) STATES
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
      riceType: factoryShrimpType,
      factoryDeliveredKg: kg,
      totalNet: kg,
      totalGross: kg,
      totalMoney: 0,
      exportTime: timeFullStr,
      notes: "Xuất giao công ty lúc " + timeFullStr + " - đang chờ kết quả nghiệm thu"
    };

    me.addSale(newSale);
    refreshData();
    setFactoryDeliveredKg("");
    alert("🏭 Đã xuất giao công ty " + newSale.buyerName + ". Trạng thái: CHỜ KẾT QUẢ");
  };

  // Quick Settle Action (For Market or Factory)
  const handleSaveQuickSettle = () => {
    if (!settlingSaleObj) return;
    const kg = Number(settleKg) || 0;
    const money = Number(settleMoney) || 0;
    if (kg <= 0 || money <= 0) {
      alert("Vui lòng nhập đầy đủ số kg và tổng tiền thực nhận!");
      return;
    }

    const updates = {
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
    alert("✅ Đã chốt đơn thành công! Doanh thu đã được cộng dồn vào hệ thống.");
  };

  // Filtered lists for in-progress items
  const activeSellingMarketSales = salesList.filter(s => s.targetGroup === "MARKET" && (s.status === "SELLING" || s.status === "PENDING_SETTLEMENT"));
  const activeAwaitingFactorySales = salesList.filter(s => s.targetGroup === "FACTORY" && s.status === "AWAITING_RESULT");

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
                    className: "text-lg font-black uppercase italic tracking-tight flex items-center gap-1.5 leading-none",
                    children: [
                      c.jsx("span", { children: "🦐" }),
                      "Bán Ra & Xuất Tôm"
                    ]
                  }),
                  c.jsx("span", {
                    className: "text-[10px] font-bold opacity-80 uppercase tracking-widest block mt-0.5",
                    children: "Bán lẻ • Chợ đầu mối • Nhà máy công ty"
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
                onClick: () => setShowHistoryModal(true),
                className: "px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase flex items-center gap-1 active:scale-95 transition-all cursor-pointer",
                children: [c.jsx(Fd, { size: 14 }), "Lịch Sử"]
              }),
              c.jsxs("button", {
                type: "button",
                onClick: () => setRoute(re.FINANCE),
                className: "px-3 py-1.5 bg-yellow-400 text-blue-950 font-black rounded-xl text-xs uppercase flex items-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer",
                children: [c.jsx("span", { children: "💰" }), "Tài Chính"]
              })
            ]
          })
        ]
      }),

      // Channel Selector Pills (3 Distinct Methods)
      c.jsx("div", {
        className: "bg-[#0f172a] p-2.5 shrink-0 border-b border-white/10 shadow-sm",
        children: c.jsxs("div", {
          className: "grid grid-cols-3 gap-2 max-w-xl mx-auto",
          children: [
            c.jsxs("button", {
              type: "button",
              onClick: () => {
                setTargetGroup("RETAIL");
                try { localStorage.setItem("last_sale_target_group", "RETAIL"); } catch(e) {}
              },
              className: \`py-2.5 px-2 rounded-2xl text-xs font-black uppercase italic transition-all flex flex-col items-center gap-0.5 cursor-pointer \${
                targetGroup === "RETAIL"
                  ? "bg-emerald-500 text-white shadow-lg scale-[1.02]"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }\`,
              children: [
                c.jsx("span", { className: "text-base leading-none", children: "🛒" }),
                c.jsx("span", { children: "1. Bán Lẻ" }),
                c.jsx("span", { className: "text-[9px] font-normal opacity-80", children: "Đơn giá nhập tay" })
              ]
            }),
            c.jsxs("button", {
              type: "button",
              onClick: () => {
                setTargetGroup("MARKET");
                try { localStorage.setItem("last_sale_target_group", "MARKET"); } catch(e) {}
              },
              className: \`py-2.5 px-2 rounded-2xl text-xs font-black uppercase italic transition-all flex flex-col items-center gap-0.5 cursor-pointer \${
                targetGroup === "MARKET"
                  ? "bg-amber-500 text-blue-950 shadow-lg scale-[1.02]"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }\`,
              children: [
                c.jsx("span", { className: "text-base leading-none", children: "🏪" }),
                c.jsx("span", { children: "2. Chợ Đầu Mối" }),
                c.jsx("span", { className: "text-[9px] font-normal opacity-80", children: "Giao phi ➔ Chốt tiền" })
              ]
            }),
            c.jsxs("button", {
              type: "button",
              onClick: () => {
                setTargetGroup("FACTORY");
                try { localStorage.setItem("last_sale_target_group", "FACTORY"); } catch(e) {}
              },
              className: \`py-2.5 px-2 rounded-2xl text-xs font-black uppercase italic transition-all flex flex-col items-center gap-0.5 cursor-pointer \${
                targetGroup === "FACTORY"
                  ? "bg-blue-600 text-white shadow-lg scale-[1.02]"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }\`,
              children: [
                c.jsx("span", { className: "text-base leading-none", children: "🏢" }),
                c.jsx("span", { children: "3. Công Ty" }),
                c.jsx("span", { className: "text-[9px] font-normal opacity-80", children: "Giao ➔ Nghiệm thu" })
              ]
            })
          ]
        })
      }),

      // Main Form Area
      c.jsx("div", {
        className: "flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl mx-auto w-full pb-28",
        children: c.jsxs("div", {
          className: "space-y-4",
          children: [
            // =========================================================================
            // 1. PHƯƠNG THỨC 1: BÁN LẺ
            // =========================================================================
            targetGroup === "RETAIL" && c.jsxs("div", {
              className: "bg-white dark:bg-gray-900 rounded-[32px] p-5 border border-emerald-200 dark:border-emerald-800 shadow-lg space-y-4 animate-in fade-in duration-200",
              children: [
                c.jsxs("div", {
                  className: "border-b border-gray-100 dark:border-gray-800 pb-3",
                  children: [
                    c.jsxs("div", {
                      className: "flex items-center gap-2",
                      children: [
                        c.jsx("span", { className: "px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-black text-xs uppercase", children: "🛒 Kênh Bán Lẻ" }),
                        c.jsx("span", { className: "text-xs font-bold text-gray-500", children: "Không áp giá cố định • Nhập giá trực tiếp" })
                      ]
                    }),
                    c.jsx("h3", { className: "text-base font-black uppercase text-gray-900 dark:text-white mt-1", children: "Tạo Đơn Bán Lẻ Nhanh" })
                  ]
                }),

                // Khách hàng
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
                }),

                // Danh mục các loại tôm (Loại 1, Loại 2, Tôm trứng, Tôm xô...)
                c.jsxs("div", {
                  className: "space-y-1.5",
                  children: [
                    c.jsx("label", { className: "text-[10px] font-black uppercase text-gray-400 block", children: "Danh Mục Loại Tôm Bán Lẻ (Bấm Chọn Nhanh)" }),
                    c.jsx("div", {
                      className: "grid grid-cols-2 gap-1.5",
                      children: retailTypes.map(t => c.jsxs("button", {
                        key: t,
                        type: "button",
                        onClick: () => setRetailType(t),
                        className: \`p-2.5 rounded-xl text-left text-xs font-bold transition-all border \${
                          retailType === t
                            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-xs"
                            : "bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                        }\`,
                        children: [
                          c.jsx("span", { className: "block truncate", children: t }),
                          retailType === t && c.jsx("span", { className: "text-[9px] font-black text-emerald-600 block mt-0.5", children: "✓ Đang chọn" })
                        ]
                      }))
                    })
                  ]
                }),

                // 2 Ô nhập: Đơn Giá (nhập tay trực tiếp) & Số Kg
                c.jsxs("div", {
                  className: "grid grid-cols-2 gap-3",
                  children: [
                    c.jsxs("div", {
                      className: "space-y-1",
                      children: [
                        c.jsx("label", { className: "text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 block", children: "Đơn Giá Bán (đ/kg) *" }),
                        c.jsx("input", {
                          type: "number",
                          placeholder: "VD: 220000",
                          value: retailPrice,
                          onChange: e => setRetailPrice(e.target.value),
                          className: "w-full p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border-2 border-emerald-400 font-mono font-black text-xl text-emerald-900 dark:text-emerald-100 outline-none"
                        }),
                        c.jsx("span", { className: "text-[9px] text-gray-400 block", children: "Nhập giá tại thời điểm bán" })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "space-y-1",
                      children: [
                        c.jsx("label", { className: "text-[10px] font-black uppercase text-blue-700 dark:text-blue-400 block", children: "Số Lượng (Kg) *" }),
                        c.jsx("input", {
                          type: "number",
                          step: "any",
                          placeholder: "VD: 15.5",
                          value: retailKg,
                          onChange: e => setRetailKg(e.target.value),
                          className: "w-full p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border-2 border-blue-400 font-mono font-black text-xl text-blue-900 dark:text-blue-100 outline-none"
                        }),
                        c.jsx("span", { className: "text-[9px] text-gray-400 block", children: "Khối lượng thực tế" })
                      ]
                    })
                  ]
                }),

                // Big Total Money Card
                c.jsxs("div", {
                  className: "p-4 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl text-white flex justify-between items-center shadow-lg",
                  children: [
                    c.jsxs("div", {
                      children: [
                        c.jsx("span", { className: "text-[11px] font-black uppercase tracking-wider block opacity-90", children: "Thành Tiền Bán Lẻ" }),
                        c.jsxs("div", {
                          className: "text-3xl font-black font-mono tracking-tight",
                          children: [_e(retailMoney), " ", c.jsx("span", { className: "text-base font-sans font-bold", children: "VNĐ" })]
                        })
                      ]
                    }),
                    c.jsx("div", { className: "text-3xl opacity-30", children: "💵" })
                  ]
                }),

                // Complete Button
                c.jsxs("button", {
                  type: "button",
                  onClick: handleSaveRetail,
                  className: "w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-base uppercase italic shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer",
                  children: [
                    c.jsx(ec, { size: 22 }),
                    "Lưu & Hoàn Tất Đơn Bán Lẻ"
                  ]
                })
              ]
            }),

            // =========================================================================
            // 2. PHƯƠNG THỨC 2: BÁN CHỢ ĐẦU MỐI (2 BƯỚC)
            // =========================================================================
            targetGroup === "MARKET" && c.jsxs("div", {
              className: "space-y-4 animate-in fade-in duration-200",
              children: [
                // STEP 1 CARD
                c.jsxs("div", {
                  className: "bg-white dark:bg-gray-900 rounded-[32px] p-5 border border-amber-200 dark:border-amber-800 shadow-lg space-y-4",
                  children: [
                    c.jsxs("div", {
                      className: "border-b border-gray-100 dark:border-gray-800 pb-3",
                      children: [
                        c.jsxs("div", {
                          className: "flex items-center gap-2",
                          children: [
                            c.jsx("span", { className: "px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-black text-xs uppercase", children: "Bước 1: Giao Hàng Đi Chợ" }),
                            c.jsx("span", { className: "text-xs font-bold text-amber-600", children: "Trạng thái: Đang bán" })
                          ]
                        }),
                        c.jsx("h3", { className: "text-base font-black uppercase text-gray-900 dark:text-white mt-1", children: "Xuất Xe Giao Chợ / Vựa Đầu Mối" })
                      ]
                    }),

                    // Tên chợ
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
                    }),

                    // SỐ LƯỢNG PHI (THÙNG/PHI OXY) GIAO ĐI
                    c.jsxs("div", {
                      className: "p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border-2 border-amber-400 space-y-1.5",
                      children: [
                        c.jsx("label", { className: "text-xs font-black uppercase text-amber-900 dark:text-amber-200 block", children: "SỐ LƯỢNG PHI (THÙNG / PHI OXY) GIAO ĐI *" }),
                        c.jsxs("div", {
                          className: "flex items-center gap-3",
                          children: [
                            c.jsx("input", {
                              type: "number",
                              placeholder: "VD: 10",
                              value: marketPhiCount,
                              onChange: e => setMarketPhiCount(e.target.value),
                              className: "w-full p-3 rounded-xl bg-white dark:bg-gray-800 border border-amber-300 font-mono font-black text-2xl text-amber-950 dark:text-amber-100 outline-none text-center"
                            }),
                            c.jsx("span", { className: "font-black text-sm uppercase text-amber-800 dark:text-amber-300 shrink-0", children: "PHI OXY" })
                          ]
                        }),
                        c.jsx("span", { className: "text-[10px] text-gray-500 block italic", children: "Lưu số lượng phi giao xe, kg và tiền thực nhận sẽ chốt ở Bước 2 khi vựa bán xong." })
                      ]
                    }),

                    // Xe và tài xế & giờ
                    c.jsxs("div", {
                      className: "grid grid-cols-2 gap-3",
                      children: [
                        c.jsxs("div", {
                          children: [
                            c.jsx("label", { className: "text-[10px] font-black uppercase text-gray-400 block mb-1", children: "Biển Số Xe" }),
                            c.jsx("input", {
                              type: "text",
                              value: marketVehiclePlate,
                              onChange: e => setMarketVehiclePlate(e.target.value),
                              className: "w-full p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold text-xs outline-none"
                            })
                          ]
                        }),
                        c.jsxs("div", {
                          children: [
                            c.jsx("label", { className: "text-[10px] font-black uppercase text-gray-400 block mb-1", children: "Giờ Xuất Bến" }),
                            c.jsx("input", {
                              type: "text",
                              value: marketTime,
                              onChange: e => setMarketTime(e.target.value),
                              className: "w-full p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold text-xs outline-none"
                            })
                          ]
                        })
                      ]
                    }),

                    // Submit button Step 1
                    c.jsxs("button", {
                      type: "button",
                      onClick: handleSaveMarketStep1,
                      className: "w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-blue-950 font-black rounded-2xl text-base uppercase italic shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer",
                      children: [
                        c.jsx("span", { children: "🚚" }),
                        "Giao Hàng Đi Chợ (Lưu 'Đang Bán')"
                      ]
                    })
                  ]
                }),

                // STEP 2: ACTIVE SELLING MARKET ORDERS
                c.jsxs("div", {
                  className: "bg-white dark:bg-gray-900 rounded-[32px] p-5 border border-gray-200 dark:border-gray-800 shadow-sm space-y-3",
                  children: [
                    c.jsxs("div", {
                      className: "flex justify-between items-center",
                      children: [
                        c.jsxs("h3", {
                          className: "text-xs font-black uppercase text-gray-700 dark:text-gray-300 flex items-center gap-1.5",
                          children: [
                            c.jsx("span", { children: "⏳" }),
                            "Đơn Chợ Đang Bán (Chờ Chốt Tiền): ",
                            c.jsx("span", { className: "text-amber-600", children: activeSellingMarketSales.length })
                          ]
                        }),
                        c.jsx("span", { className: "text-[10px] text-gray-400 font-bold", children: "Bước 2: Chốt tiền" })
                      ]
                    }),
                    activeSellingMarketSales.length === 0 ? c.jsx("p", {
                      className: "text-xs text-gray-400 italic py-4 text-center",
                      children: "Không có đơn chợ nào đang chờ chốt."
                    }) : activeSellingMarketSales.map(sale => c.jsxs("div", {
                      key: sale.id,
                      className: "p-3.5 bg-amber-50/60 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3",
                      children: [
                        c.jsxs("div", {
                          className: "space-y-0.5",
                          children: [
                            c.jsxs("div", {
                              className: "flex items-center gap-2",
                              children: [
                                c.jsx("span", { className: "font-black text-sm text-gray-900 dark:text-white", children: sale.buyerName }),
                                c.jsxs("span", { className: "px-2 py-0.5 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-black text-[10px] rounded-full", children: [sale.phiCount || 0, " phi oxy"] })
                              ]
                            }),
                            c.jsxs("div", {
                              className: "text-[11px] text-gray-500 flex gap-3",
                              children: [
                                c.jsxs("span", { children: ["📅 ", new Date(sale.date).toLocaleDateString("vi-VN")] }),
                                sale.vehiclePlate && c.jsxs("span", { children: ["Xe: ", sale.vehiclePlate] })
                              ]
                            })
                          ]
                        }),
                        c.jsxs("button", {
                          type: "button",
                          onClick: () => {
                            setSettlingSaleObj(sale);
                            setSettleKg(sale.totalNet ? String(sale.totalNet) : "");
                            setSettleMoney(sale.totalMoney ? String(sale.totalMoney) : "");
                          },
                          className: "w-full sm:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer",
                          children: [
                            c.jsx("span", { children: "📝" }),
                            "Chốt Đơn Chợ"
                          ]
                        })
                      ]
                    }))
                  ]
                })
              ]
            }),

            // =========================================================================
            // 3. PHƯƠNG THỨC 3: BÁN CHO CÔNG TY / NHÀ MÁY (2 BƯỚC)
            // =========================================================================
            targetGroup === "FACTORY" && c.jsxs("div", {
              className: "space-y-4 animate-in fade-in duration-200",
              children: [
                // STEP 1 CARD
                c.jsxs("div", {
                  className: "bg-white dark:bg-gray-900 rounded-[32px] p-5 border border-blue-200 dark:border-blue-800 shadow-lg space-y-4",
                  children: [
                    c.jsxs("div", {
                      className: "border-b border-gray-100 dark:border-gray-800 pb-3",
                      children: [
                        c.jsxs("div", {
                          className: "flex items-center gap-2",
                          children: [
                            c.jsx("span", { className: "px-2.5 py-1 rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-black text-xs uppercase", children: "Bước 1: Giao Hàng Cho Công Ty" }),
                            c.jsx("span", { className: "text-xs font-bold text-blue-600", children: "Trạng thái: Chờ kết quả" })
                          ]
                        }),
                        c.jsx("h3", { className: "text-base font-black uppercase text-gray-900 dark:text-white mt-1", children: "Xuất Tôm Cho Nhà Máy / Doanh Nghiệp" })
                      ]
                    }),

                    // Chọn công ty từ danh mục
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
                    }),

                    // Số lượng giao đi sơ bộ
                    c.jsxs("div", {
                      children: [
                        c.jsx("label", { className: "text-[10px] font-black uppercase text-gray-400 block mb-1", children: "Số Lượng Xuất Giao (Kg) Ước Tính / Cân Vựa" }),
                        c.jsx("input", {
                          type: "number",
                          step: "any",
                          placeholder: "VD: 850.5",
                          value: factoryDeliveredKg,
                          onChange: e => setFactoryDeliveredKg(e.target.value),
                          className: "w-full p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border-2 border-blue-400 font-mono font-black text-xl text-blue-900 dark:text-blue-100 outline-none"
                        })
                      ]
                    }),

                    // Submit button Step 1
                    c.jsxs("button", {
                      type: "button",
                      onClick: handleSaveFactoryStep1,
                      className: "w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black rounded-2xl text-base uppercase italic shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer",
                      children: [
                        c.jsx("span", { children: "🏭" }),
                        "Giao Hàng Cho Công Ty (Lưu 'Chờ Kết Quả')"
                      ]
                    })
                  ]
                }),

                // STEP 2: ACTIVE AWAITING FACTORY ORDERS
                c.jsxs("div", {
                  className: "bg-white dark:bg-gray-900 rounded-[32px] p-5 border border-gray-200 dark:border-gray-800 shadow-sm space-y-3",
                  children: [
                    c.jsxs("div", {
                      className: "flex justify-between items-center",
                      children: [
                        c.jsxs("h3", {
                          className: "text-xs font-black uppercase text-gray-700 dark:text-gray-300 flex items-center gap-1.5",
                          children: [
                            c.jsx("span", { children: "⏳" }),
                            "Đơn Công Ty Chờ Nghiệm Thu: ",
                            c.jsx("span", { className: "text-blue-600", children: activeAwaitingFactorySales.length })
                          ]
                        }),
                        c.jsx("span", { className: "text-[10px] text-gray-400 font-bold", children: "Bước 2: Nghiệm thu" })
                      ]
                    }),
                    activeAwaitingFactorySales.length === 0 ? c.jsx("p", {
                      className: "text-xs text-gray-400 italic py-4 text-center",
                      children: "Không có đơn công ty nào đang chờ nghiệm thu."
                    }) : activeAwaitingFactorySales.map(sale => c.jsxs("div", {
                      key: sale.id,
                      className: "p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3",
                      children: [
                        c.jsxs("div", {
                          className: "space-y-0.5",
                          children: [
                            c.jsx("div", { className: "font-black text-sm text-gray-900 dark:text-white", children: sale.buyerName }),
                            c.jsxs("div", {
                              className: "text-[11px] text-gray-500 flex gap-3",
                              children: [
                                c.jsxs("span", { children: ["📅 Xuất: ", sale.exportTime || new Date(sale.date).toLocaleDateString("vi-VN")] }),
                                sale.factoryDeliveredKg > 0 && c.jsxs("span", { children: ["Giao: ", fmtKg(sale.factoryDeliveredKg), " kg"] })
                              ]
                            })
                          ]
                        }),
                        c.jsxs("button", {
                          type: "button",
                          onClick: () => {
                            setSettlingSaleObj(sale);
                            setSettleKg(sale.totalNet ? String(sale.totalNet) : "");
                            setSettleMoney(sale.totalMoney ? String(sale.totalMoney) : "");
                          },
                          className: "w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer",
                          children: [
                            c.jsx("span", { children: "📝" }),
                            "Nhập Nghiệm Thu"
                          ]
                        })
                      ]
                    }))
                  ]
                })
              ]
            })
          ]
        })
      }),

      // MODAL: CHỐT ĐƠN / NGHIỆM THU NHANH
      settlingSaleObj && c.jsx("div", {
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4",
          children: [
            c.jsxs("div", {
              children: [
                c.jsx("h3", {
                  className: "font-black text-base uppercase text-gray-900 dark:text-white",
                  children: settlingSaleObj.targetGroup === "MARKET" ? "Chốt Đơn Chợ Đầu Mối" : "Nghiệm Thu Đơn Công Ty"
                }),
                c.jsxs("p", { className: "text-xs text-gray-500 font-bold", children: [settlingSaleObj.buyerName, " • Mã: ", settlingSaleObj.code] })
              ]
            }),
            c.jsxs("div", {
              className: "space-y-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-xs font-bold text-gray-500 mb-1 block uppercase", children: "Tổng số kg tôm bán được / nghiệm thu *" }),
                    c.jsx("input", {
                      type: "number",
                      step: "any",
                      placeholder: "VD: 320.5",
                      value: settleKg,
                      onChange: e => setSettleKg(e.target.value),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-lg font-mono outline-none focus:border-green-500"
                    })
                  ]
                }),
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-xs font-bold text-gray-500 mb-1 block uppercase", children: "Tổng số tiền thực nhận (VNĐ) *" }),
                    c.jsx("input", {
                      type: "number",
                      placeholder: "VD: 68500000",
                      value: settleMoney,
                      onChange: e => setSettleMoney(e.target.value),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-lg font-mono outline-none focus:border-green-500 text-green-600 dark:text-green-400"
                    }),
                    settlingSaleObj.targetGroup === "MARKET" && c.jsx("span", {
                      className: "text-[10px] text-gray-400 block mt-1",
                      children: "Số tiền thực nhận sau khi đã trừ hoa hồng và chi phí của chợ"
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
                  onClick: () => setSettlingSaleObj(null),
                  className: "px-4 py-2.5 bg-gray-200 dark:bg-gray-700 rounded-xl font-bold text-xs",
                  children: "Hủy"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: handleSaveQuickSettle,
                  className: "px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black text-xs uppercase shadow-md",
                  children: "Lưu & Hoàn Tất"
                })
              ]
            })
          ]
        })
      }),

      // MODAL: LỊCH SỬ XUẤT BÁN
      showHistoryModal && c.jsx("div", {
        className: "fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[35px] p-6 shadow-2xl space-y-4 border border-gray-200 dark:border-gray-800 max-h-[90vh] flex flex-col",
          children: [
            c.jsxs("div", {
              className: "flex justify-between items-center border-b pb-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("h3", {
                      className: "text-xl font-black uppercase italic tracking-tight text-gray-900 dark:text-white",
                      children: "Lịch Sử Xuất Bán Tôm"
                    }),
                    c.jsxs("p", {
                      className: "text-xs text-gray-500 font-bold",
                      children: ["Tổng số: ", salesList.length, " đơn hàng"]
                    })
                  ]
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => setShowHistoryModal(false),
                  className: "p-2 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer",
                  children: c.jsx(_a, { size: 20 })
                })
              ]
            }),
            // Quick Filter Tabs
            c.jsxs("div", {
              className: "flex gap-1.5 flex-wrap",
              children: [
                c.jsx("button", {
                  type: "button",
                  onClick: () => setHistoryFilter("ALL"),
                  className: \`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer \${historyFilter === "ALL" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}\`,
                  children: "Tất cả"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => setHistoryFilter("RETAIL"),
                  className: \`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer \${historyFilter === "RETAIL" ? "bg-emerald-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}\`,
                  children: "🛒 Bán Lẻ"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => setHistoryFilter("MARKET"),
                  className: \`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer \${historyFilter === "MARKET" ? "bg-amber-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}\`,
                  children: "🏪 Chợ Đầu Mối"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => setHistoryFilter("FACTORY"),
                  className: \`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer \${historyFilter === "FACTORY" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}\`,
                  children: "🏢 Công Ty"
                })
              ]
            }),
            // Sales tickets list
            c.jsx("div", {
              className: "overflow-y-auto flex-1 space-y-3 pr-1",
              children: (() => {
                const filteredSales = salesList.filter(s => {
                  if (historyFilter === "ALL") return true;
                  return s.targetGroup === historyFilter;
                });

                if (filteredSales.length === 0) {
                  return c.jsx("p", {
                    className: "text-center text-gray-400 py-12 italic font-bold",
                    children: "Chưa có đơn hàng nào."
                  });
                }

                return filteredSales.map(sale => c.jsxs("div", {
                  key: sale.id,
                  className: "p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
                  children: [
                    c.jsxs("div", {
                      className: "space-y-1 flex-1",
                      children: [
                        c.jsxs("div", {
                          className: "flex items-center gap-2",
                          children: [
                            c.jsx("span", { className: "font-mono font-bold text-xs text-blue-600 dark:text-blue-400", children: sale.code }),
                            c.jsx("span", {
                              className: "text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200",
                              children: sale.targetGroup === "FACTORY" ? "🏢 Công Ty" : (sale.targetGroup === "MARKET" ? "🏪 Chợ" : "🛒 Bán Lẻ")
                            }),
                            // Status Badge
                            c.jsx("span", {
                              className: \`text-[10px] font-black px-2 py-0.5 rounded-full \${
                                sale.status === "COMPLETED" || sale.isPaidFull
                                  ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                                  : (sale.status === "SELLING"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300")
                              }\`,
                              children: sale.status === "COMPLETED" || sale.isPaidFull
                                ? "✓ Đã Hoàn Tất"
                                : (sale.status === "SELLING" ? "⏳ Đang Bán" : "⏳ Chờ Kết Quả")
                            })
                          ]
                        }),
                        c.jsx("h4", { className: "font-black text-base text-gray-900 dark:text-white uppercase", children: sale.buyerName }),
                        c.jsxs("div", {
                          className: "text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-3",
                          children: [
                            c.jsxs("span", { children: ["📅 ", new Date(sale.date).toLocaleDateString("vi-VN")] }),
                            sale.totalNet > 0 && c.jsxs("span", { className: "font-bold text-gray-700 dark:text-gray-300", children: ["⚖️ ", fmtKg(sale.totalNet), " kg"] }),
                            sale.totalMoney > 0 && c.jsxs("span", { className: "font-black text-emerald-600 dark:text-emerald-400", children: ["💰 ", _e(sale.totalMoney), " đ"] }),
                            sale.phiCount > 0 && c.jsxs("span", { className: "font-bold text-amber-600", children: [sale.phiCount, " phi oxy"] })
                          ]
                        })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "flex items-center gap-2 w-full sm:w-auto justify-end",
                      children: [
                        (sale.status === "SELLING" || sale.status === "AWAITING_RESULT") && c.jsx("button", {
                          type: "button",
                          onClick: () => {
                            setShowHistoryModal(false);
                            setSettlingSaleObj(sale);
                            setSettleKg(sale.totalNet ? String(sale.totalNet) : "");
                            setSettleMoney(sale.totalMoney ? String(sale.totalMoney) : "");
                          },
                          className: "px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase cursor-pointer",
                          children: sale.targetGroup === "MARKET" ? "Chốt Chợ" : "Nghiệm Thu"
                        }),
                        c.jsx("button", {
                          type: "button",
                          onClick: () => {
                            setShowHistoryModal(false);
                            if (onViewDetail) onViewDetail(sale);
                          },
                          className: "px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase cursor-pointer",
                          children: "Chi Tiết"
                        }),
                        c.jsx("button", {
                          type: "button",
                          onClick: () => {
                            if (confirm("Bạn có chắc chắn muốn xóa đơn xuất bán này?")) {
                              me.deleteSale(sale.id);
                              refreshData();
                            }
                          },
                          className: "p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer",
                          children: c.jsx(xm, { size: 16 })
                        })
                      ]
                    })
                  ]
                }, sale.id));
              })()
            })
          ]
        })
      })
    ]
  });
};
`;

// Replace Xm_SalesScreen slice
bundle = bundle.slice(0, pStart) + upgradedSalesCode + "\n\n" + bundle.slice(pMid);

// Write to bundle
fs.writeFileSync(bundlePath, bundle, "utf8");
console.log("Xm_SalesScreen replaced with 3 distinct channels successfully!");
