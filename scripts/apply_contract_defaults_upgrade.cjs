const fs = require("fs");

console.log("Reading bundle...");
let c = fs.readFileSync("assets/index-Os1X4Z7e.js", "utf8");

// 1. Update getDefaultTraderProfileV3 to include defaultShrimpType, rejectionSpec, tareSpec
const defStart = c.indexOf("const getDefaultTraderProfileV3 = () => ({");
const defEnd = c.indexOf("const getTraderProfileV3 = () => {");
if (defStart === -1 || defEnd === -1) {
  console.error("Could not find getDefaultTraderProfileV3 boundaries!");
  process.exit(1);
}

const oldDef = c.slice(defStart, defEnd);
let updatedDef = oldDef;
if (!updatedDef.includes("defaultShrimpType")) {
  updatedDef = updatedDef.replace(
    'tareRatioValue: 1,',
    `tareRatioValue: 1,
  defaultShrimpType: "Tôm càng sen",
  rejectionSpec: "Dạt tôm mềm, ốp, gãy càng chuyển tính giá xào",
  tareSpec: "Trừ hao ráo nước chuẩn 1 kg / 100 kg",`
  );
}

c = c.slice(0, defStart) + updatedDef + c.slice(defEnd);
console.log("Updated getDefaultTraderProfileV3.");

// 2. Update Tab 3 (Quy Cách & Trừ Bì) in Xm_TraderConfig
const tab3Marker = "TAB 3: QUY CÁCH & TRỪ BÌ ====================";
const tab3Idx = c.indexOf(tab3Marker);
if (tab3Idx === -1) {
  console.error("Could not find Tab 3 in Xm_TraderConfig!");
  process.exit(1);
}

// Find the section for tarePer100Kg
const tareSectionMarker = `// Trừ bì kg/100kg`;
const tareSectionIdx = c.indexOf(tareSectionMarker, tab3Idx);

const newTab3Controls = `// Chọn loại tôm mặc định khi tạo hợp đồng
                      c.jsxs("div", {
                        className: "sm:col-span-1",
                        children: [
                          c.jsx("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block mb-1.5", children: "Loại Tôm Mặc Định Khi Tạo Hợp Đồng" }),
                          c.jsx("select", {
                            value: profile.defaultShrimpType || (profile.shrimpTypes && profile.shrimpTypes[0] ? profile.shrimpTypes[0].name : "Tôm càng sen"),
                            onChange: (e) => updateField("defaultShrimpType", e.target.value),
                            className: "w-full p-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-teal-500 transition-all text-gray-900 dark:text-gray-100",
                            children: (profile.shrimpTypes || []).map(t => c.jsxs("option", {
                              value: t.name,
                              children: [t.name, " (", (Number(t.price) || 0).toLocaleString("vi-VN"), " đ/kg)"]
                            }, t.id || t.name))
                          })
                        ]
                      }),

                      // Quy cách dạt tôm mặc định
                      c.jsxs("div", {
                        className: "sm:col-span-2 space-y-1.5",
                        children: [
                          c.jsx("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block", children: "Quy Cách Dạt Tôm Thu Mua Mặc Định (*)" }),
                          c.jsx("div", {
                            className: "flex flex-wrap gap-1 mb-1",
                            children: [
                              "Dạt tôm mềm, ốp, gãy càng chuyển tính giá xào",
                              "100 con dạt tối đa 3-5 kg dập gãy; sống khỏe 100%",
                              "Dạt tôm trứng, tôm mềm trừ 30.000 đ/kg theo thỏa thuận",
                              "Không mua tôm chết ngợp sình; dạt bỏ 100%",
                              "Theo thỏa thuận trực tiếp tại bờ ao khi kéo lưới"
                            ].map(spec => c.jsx("button", {
                              key: spec,
                              type: "button",
                              onClick: () => updateField("rejectionSpec", spec),
                              className: "px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all " + ((profile.rejectionSpec || "Dạt tôm mềm, ốp, gãy càng chuyển tính giá xào") === spec ? "bg-amber-600 text-white border-amber-700 shadow-xs" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-amber-50"),
                              children: spec
                            }))
                          }),
                          c.jsx("input", {
                            type: "text",
                            value: profile.rejectionSpec || "Dạt tôm mềm, ốp, gãy càng chuyển tính giá xào",
                            onChange: (e) => updateField("rejectionSpec", e.target.value),
                            placeholder: "Dạt tôm mềm, ốp, gãy càng chuyển tính giá xào",
                            className: "w-full p-3 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-teal-500"
                          })
                        ]
                      }),

                      // Quy cách trừ hao ráo nước mặc định
                      c.jsxs("div", {
                        className: "sm:col-span-2 space-y-1.5",
                        children: [
                          c.jsx("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block", children: "Quy Cách Trừ Hao Ráo Nước & Trừ Bì Mặc Định (*)" }),
                          c.jsx("div", {
                            className: "flex flex-wrap gap-1 mb-1",
                            children: [
                              "Trừ hao ráo nước chuẩn 1 kg / 100 kg",
                              "Trừ hao ráo nước chuẩn 2 kg / 100 kg",
                              "100 con trừ 3 kg",
                              "Trừ hao ráo nước chuẩn 1kg/thùng cân",
                              "Không trừ bì thùng"
                            ].map(tare => c.jsx("button", {
                              key: tare,
                              type: "button",
                              onClick: () => updateField("tareSpec", tare),
                              className: "px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all " + ((profile.tareSpec || "Trừ hao ráo nước chuẩn 1 kg / 100 kg") === tare ? "bg-teal-700 text-white border-teal-800 shadow-xs" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-teal-50"),
                              children: tare
                            }))
                          }),
                          c.jsx("input", {
                            type: "text",
                            value: profile.tareSpec || "Trừ hao ráo nước chuẩn 1 kg / 100 kg",
                            onChange: (e) => updateField("tareSpec", e.target.value),
                            placeholder: "Trừ hao ráo nước chuẩn 1 kg / 100 kg",
                            className: "w-full p-3 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-teal-500"
                          })
                        ]
                      }),

                      // Trừ bì kg/100kg`;

c = c.slice(0, tareSectionIdx) + newTab3Controls + c.slice(tareSectionIdx + tareSectionMarker.length);
console.log("Updated Tab 3 controls in Xm_TraderConfig.");

// 3. Update Cm component:
// Replace the v declaration with getInitialPondForm and w.useEffect
const vStart = c.indexOf("// New Pond Form State");
const vEnd = c.indexOf("// Calculate days difference to today", vStart);
if (vStart === -1 || vEnd === -1) {
  console.error("Could not find v declaration in Cm!");
  process.exit(1);
}

const newVCode = `// New Pond Form State with defaults from Trader Profile
  const getInitialPondForm = () => {
    const tp = typeof getTraderProfileV3 === "function" ? getTraderProfileV3() : {};
    const firstShrimp = (tp.shrimpTypes && tp.shrimpTypes[0]) || { name: "Tôm càng sen", price: 160000 };
    const defaultType = tp.defaultShrimpType || firstShrimp.name;
    const foundShrimp = tp.shrimpTypes && tp.shrimpTypes.find(t => t.name === defaultType);
    const defaultPrice = (foundShrimp && foundShrimp.price) || firstShrimp.price || 160000;
    const defaultRejection = tp.rejectionSpec || "Dạt tôm mềm, ốp, gãy càng chuyển tính giá xào";
    const defaultTare = tp.tareSpec || (tp.tarePer100Kg ? ("Trừ hao ráo nước chuẩn " + tp.tarePer100Kg + " kg / 100 kg") : "Trừ hao ráo nước chuẩn 1 kg / 100 kg");
    return {
      name: "",
      phone: "",
      area: "",
      address: "",
      province: tp.province || "Cà Mau",
      district: tp.district || "",
      commune: "",
      shrimpType: defaultType,
      rejectionSpec: defaultRejection,
      estimatedYield: "",
      depositMoney: String(tp.defaultDeposit || 5000000),
      weighingDate: new Date().toISOString().split("T")[0],
      weighingTime: tp.harvestStartTime || "06:00",
      traderPrice: String(defaultPrice),
      catchingMethod: tp.catchingMethod || "Kéo lưới vét rạng sáng",
      oxygenRatio: tp.oxygenRatio || "95% trở lên lúc cân tại bờ ao",
      qualityStandard: tp.qualityStandard || "Tôm khỏe mạnh, đều màu, nguyên vẹn càng",
      tareSpec: defaultTare,
      compensationTerms: tp.defaultTerms || "Bồi hoàn 100% tiền cọc và phạt gấp đôi (02 lần) nếu tự ý bán cho người khác",
      lat: null,
      lng: null
    };
  };

  const [v, _] = w.useState(getInitialPondForm);

  // Auto-refresh defaults from Trader Profile when opening ADD form
  w.useEffect(() => {
    if (D === "ADD" && !v.name) {
      _(getInitialPondForm());
    }
  }, [D]);
  `;

c = c.slice(0, vStart) + newVCode + c.slice(vEnd);
console.log("Updated v declaration in Cm.");

// 4. Update the form fields in Cm (shrimpType, rejectionSpec, tareSpec sections)
const formStartMarker = "// Section: Loại tôm thu mua (Quick Select + Custom input)";
const formStartIdx = c.indexOf(formStartMarker);

const formEndMarker = `c.jsxs("div", {
                    className: "sm:col-span-2",
                    children: [
                      c.jsx("label", { className: "text-xs font-bold text-gray-500 block mb-1", children: "Địa chỉ ao tôm (*)" })`;
const formEndIdx = c.indexOf(formEndMarker, formStartIdx);

if (formStartIdx === -1 || formEndIdx === -1) {
  console.error("Could not find form sections in Cm!", { formStartIdx, formEndIdx });
  process.exit(1);
}

const newFormSections = `// Section: Loại tôm thu mua (Dynamic from Settings + Auto price update)
                  c.jsxs("div", {
                    className: "sm:col-span-2 space-y-2 p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/50",
                    children: [
                      c.jsxs("div", {
                        className: "flex items-center justify-between",
                        children: [
                          c.jsxs("label", { className: "text-xs font-black text-emerald-900 dark:text-emerald-300 uppercase flex items-center gap-1.5", children: [c.jsx("span", { children: "🦐" }), "Loại tôm thu mua (*)"] }),
                          c.jsx("span", { className: "text-[10px] text-emerald-700 dark:text-emerald-400 font-bold", children: "Lấy theo danh mục Thiết lập thông tin (Bấm là tự điền giá):" })
                        ]
                      }),
                      c.jsx("div", {
                        className: "flex flex-wrap gap-1.5",
                        children: (() => {
                          const tp = typeof getTraderProfileV3 === "function" ? getTraderProfileV3() : {};
                          const list = (tp.shrimpTypes && tp.shrimpTypes.length > 0) ? tp.shrimpTypes : [
                            { name: "Tôm càng sen", price: 160000 },
                            { name: "Tôm càng xào", price: 110000 },
                            { name: "Tôm càng đại (loại 1)", price: 190000 },
                            { name: "Tôm ngộp", price: 85000 },
                            { name: "Tôm lột", price: 95000 },
                            { name: "Tôm xô tuyển chọn tại ao", price: 135000 },
                            { name: "Tôm dạt / gãy càng", price: 75000 }
                          ];
                          return list.map(t => c.jsxs("button", {
                            key: t.id || t.name,
                            type: "button",
                            onClick: () => _({ ...v, shrimpType: t.name, traderPrice: String(t.price || v.traderPrice) }),
                            className: "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 " + (v.shrimpType === t.name ? "bg-emerald-700 text-white border-emerald-800 shadow-sm scale-102" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"),
                            children: [
                              c.jsx("span", { children: t.name }),
                              t.price && c.jsxs("span", { className: "text-[10px] opacity-80 font-black", children: ["(", Number(t.price).toLocaleString("vi-VN"), " đ)"] })
                            ]
                          }));
                        })()
                      }),
                      c.jsx("input", {
                        type: "text",
                        value: v.shrimpType,
                        onChange: (e) => _({ ...v, shrimpType: e.target.value }),
                        placeholder: "Vd: Tôm càng sen (size 5-8 con/kg)...",
                        className: "w-full p-3 bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-700 rounded-xl font-bold text-xs outline-none"
                      })
                    ]
                  }),

                  // Section: Quy cách dạt tôm thu mua (Mặc định theo Thiết lập thông tin)
                  c.jsxs("div", {
                    className: "sm:col-span-2 space-y-2 p-3.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/80 dark:border-amber-800/50",
                    children: [
                      c.jsxs("div", {
                        className: "flex items-center justify-between",
                        children: [
                          c.jsxs("label", { className: "text-xs font-black text-amber-950 dark:text-amber-300 uppercase flex items-center gap-1.5", children: [c.jsx("span", { children: "⚖️" }), "Quy cách dạt tôm thu mua (*)"] }),
                          c.jsx("span", { className: "text-[10px] text-amber-700 dark:text-amber-400 font-bold", children: "Mặc định theo Quy cách bắt tôm vựa thiết lập:" })
                        ]
                      }),
                      c.jsx("div", {
                        className: "flex flex-wrap gap-1.5",
                        children: (() => {
                          const tp = typeof getTraderProfileV3 === "function" ? getTraderProfileV3() : {};
                          const configuredRejection = tp.rejectionSpec || "Dạt tôm mềm, ốp, gãy càng chuyển tính giá xào";
                          const opts = Array.from(new Set([
                            configuredRejection,
                            "Dạt tôm mềm, ốp, gãy càng chuyển tính giá xào",
                            "100 con dạt tối đa 3-5 kg dập gãy; sống khỏe 100%",
                            "Dạt tôm trứng, tôm mềm trừ 30.000 đ/kg theo thỏa thuận",
                            "Không mua tôm chết ngợp sình; dạt bỏ 100%",
                            "Theo thỏa thuận trực tiếp tại bờ ao khi kéo lưới"
                          ].filter(Boolean)));
                          return opts.map(spec => c.jsxs("button", {
                            key: spec,
                            type: "button",
                            onClick: () => _({ ...v, rejectionSpec: spec }),
                            className: "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer text-left flex items-center gap-1 " + (v.rejectionSpec === spec ? "bg-amber-700 text-white border-amber-800 shadow-sm" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-amber-50 dark:hover:bg-amber-900/30"),
                            children: [
                              spec === configuredRejection && c.jsx("span", { className: "text-[10px] bg-yellow-400 text-amber-950 px-1 py-0.2 rounded font-black", children: "Mặc định vựa" }),
                              c.jsx("span", { children: spec })
                            ]
                          }));
                        })()
                      }),
                      c.jsx("input", {
                        type: "text",
                        value: v.rejectionSpec || "",
                        onChange: (e) => _({ ...v, rejectionSpec: e.target.value }),
                        placeholder: "Nhập quy cách dạt tôm chi tiết (Vd: Dạt tôm mềm, ốp, gãy càng tính giá xào...)",
                        className: "w-full p-3 bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 rounded-xl font-bold text-xs outline-none"
                      })
                    ]
                  }),

                  // Price & Deposit inputs
                  c.jsxs("div", {
                    children: [
                      c.jsx("label", { className: "text-xs font-bold text-gray-500 block mb-1", children: "Giá thương lái mua (VNĐ/kg) (*)" }),
                      c.jsx("input", {
                        type: "number",
                        value: v.traderPrice,
                        onChange: (e) => _({ ...v, traderPrice: e.target.value }),
                        placeholder: "160000",
                        className: "w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-xs outline-none"
                      })
                    ]
                  }),
                  c.jsxs("div", {
                    children: [
                      c.jsx("label", { className: "text-xs font-bold text-gray-500 block mb-1", children: "Tiền đặt cọc trước (VNĐ) (*)" }),
                      c.jsx("input", {
                        type: "number",
                        value: v.depositMoney,
                        onChange: (e) => _({ ...v, depositMoney: e.target.value }),
                        placeholder: "5000000",
                        className: "w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-xs outline-none"
                      })
                    ]
                  }),

                  // Section: Quy cách trừ hao ráo nước & trừ bì (Mặc định theo Thiết lập thông tin)
                  c.jsxs("div", {
                    className: "sm:col-span-2 space-y-1.5",
                    children: [
                      c.jsxs("div", {
                        className: "flex items-center justify-between",
                        children: [
                          c.jsx("label", { className: "text-xs font-bold text-gray-500 block", children: "Quy cách trừ bì & ráo nước (*)" }),
                          c.jsx("span", { className: "text-[10px] text-teal-700 dark:text-teal-400 font-bold", children: "Mặc định theo Trừ hao ráo nước thiết lập:" })
                        ]
                      }),
                      c.jsx("div", {
                        className: "flex flex-wrap gap-1.5 mb-1",
                        children: (() => {
                          const tp = typeof getTraderProfileV3 === "function" ? getTraderProfileV3() : {};
                          const configuredTare = tp.tareSpec || (tp.tarePer100Kg ? ("Trừ hao ráo nước chuẩn " + tp.tarePer100Kg + " kg / 100 kg") : "Trừ hao ráo nước chuẩn 1 kg / 100 kg");
                          const tares = Array.from(new Set([
                            configuredTare,
                            "Trừ hao ráo nước chuẩn 1 kg / 100 kg",
                            "Trừ hao ráo nước chuẩn 2 kg / 100 kg",
                            "Trừ hao ráo nước chuẩn 1kg/thùng cân",
                            "100 con trừ 3 kg",
                            "Không trừ bì thùng"
                          ].filter(Boolean)));
                          return tares.map(tare => c.jsxs("button", {
                            key: tare,
                            type: "button",
                            onClick: () => _({ ...v, tareSpec: tare }),
                            className: "px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer flex items-center gap-1 " + (v.tareSpec === tare ? "bg-slate-700 text-white border-slate-800" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200"),
                            children: [
                              tare === configuredTare && c.jsx("span", { className: "text-[9px] bg-teal-400 text-teal-950 px-1 py-0.2 rounded font-black", children: "Mặc định vựa" }),
                              c.jsx("span", { children: tare })
                            ]
                          }));
                        })()
                      }),
                      c.jsx("input", {
                        type: "text",
                        value: v.tareSpec,
                        onChange: (e) => _({ ...v, tareSpec: e.target.value }),
                        placeholder: "Trừ hao ráo nước chuẩn 1kg/thùng cân",
                        className: "w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-xs outline-none"
                      })
                    ]
                  }),
                  `;

c = c.slice(0, formStartIdx) + newFormSections + c.slice(formEndIdx);
console.log("Updated form sections in Cm.");

// Write back to file
fs.writeFileSync("assets/index-Os1X4Z7e.js", c, "utf8");
console.log("Updated assets/index-Os1X4Z7e.js successfully!");
