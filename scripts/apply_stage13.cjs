const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../assets/index-Os1X4Z7e.js");
let content = fs.readFileSync(filePath, "utf8");

// 1. Replace the State Hook Declaration of v and shrimpType initial state
const origState = `  // New Pond Form State\n  const [v, _] = w.useState({\n    name: "",\n    phone: "",\n    area: "",\n    address: "",\n    province: "Cà Mau",\n    district: "",\n    commune: "",\n    shrimpType: "Tôm Càng Xanh Loại 1",`;

const newState = `  // New Pond Form State\n  const [shrimpTypeExtra, setShrimpTypeExtra] = w.useState("");\n  const [v, _] = w.useState({\n    name: "",\n    phone: "",\n    area: "",\n    address: "",\n    province: "Cà Mau",\n    district: "",\n    commune: "",\n    shrimpType: "Tôm càng xanh tỷ lệ sống từ 95% tăng lên",`;

if (content.includes(origState)) {
  content = content.replace(origState, newState);
  console.log("Success: Replaced state hook declaration");
} else {
  // Let us try a more relaxed search
  const idx = content.indexOf(`shrimpType: "Tôm Càng Xanh Loại 1"`);
  if (idx !== -1) {
    // Let us find the beginning of useState
    const useStart = content.lastIndexOf("const [v, _]", idx);
    if (useStart !== -1) {
      const origSnippet = content.substring(useStart, idx + `shrimpType: "Tôm Càng Xanh Loại 1",`.length);
      const newSnippet = `const [shrimpTypeExtra, setShrimpTypeExtra] = w.useState("");\n  const [v, _] = w.useState({\n    name: "",\n    phone: "",\n    area: "",\n    address: "",\n    province: "Cà Mau",\n    district: "",\n    commune: "",\n    shrimpType: "Tôm càng xanh tỷ lệ sống từ 95% tăng lên",`;
      content = content.replace(origSnippet, newSnippet);
      console.log("Success: Replaced state hook declaration via relaxed match");
    } else {
      console.log("Error: Found shrimpType initial value but not const [v, _]");
    }
  } else {
    console.log("Error: Could not find state hook declaration!");
  }
}

// 2. Replace the fallbacks of shrimpType in code
content = content.split(`shrimpType: v.shrimpType || "Tôm Càng Xanh Loại 1"`).join(`shrimpType: v.shrimpType || "Tôm càng xanh tỷ lệ sống từ 95% tăng lên"`);
content = content.split(`shrimpType: pond.shrimpType || "Tôm Càng Xanh Loại 1"`).join(`shrimpType: pond.shrimpType || "Tôm càng xanh tỷ lệ sống từ 95% tăng lên"`);
content = content.split(`v.shrimpType || "Tôm Càng Xanh Loại 1"`).join(`v.shrimpType || "Tôm càng xanh tỷ lệ sống từ 95% tăng lên"`);
console.log("Success: Updated fallback values of shrimpType");

// 3. Replace the XML structure of "Loại tôm thu mua" and "Quy cách dạt tôm thu mua"
const blockStartStr = `// Section: Loại tôm thu mua (Quick Select + Custom input)\n                  c.jsxs("div", {\n                    className: "sm:col-span-2 space-y-2 p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/50"`;
const blockEndStr = `placeholder: "Nhập quy cách dạt tôm chi tiết (Vd: Dạt tôm mềm, ốp, gãy càng tính giá xào...)",\n                        className: "w-full p-3 bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 rounded-xl font-bold text-xs outline-none"\n                      })\n                    ]\n                  }),`;

const startIndex = content.indexOf(blockStartStr);
const endIndex = content.indexOf(blockEndStr);

if (startIndex !== -1 && endIndex !== -1) {
  const targetBlock = content.substring(startIndex, endIndex + blockEndStr.length);
  
  const replacementBlock = `// Section: Loại tôm thu mua (Quick Select + Custom input)
                  c.jsxs("div", {
                    className: "sm:col-span-2 space-y-2 p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/50",
                    children: [
                      c.jsxs("div", {
                        className: "flex items-center justify-between",
                        children: [
                          c.jsxs("label", { className: "text-xs font-black text-emerald-900 dark:text-emerald-300 uppercase flex items-center gap-1.5", children: [c.jsx("span", { children: "🦐" }), "Loại tôm thu mua (*)"] }),
                          c.jsx("span", { className: "text-[10px] text-emerald-700 dark:text-emerald-400 font-bold", children: "Thẻ mặc định duy nhất & Nhập thêm" })
                        ]
                      }),
                      c.jsxs("div", {
                        className: "flex flex-col sm:flex-row items-stretch sm:items-center gap-2",
                        children: [
                          c.jsx("button", {
                            type: "button",
                            onClick: () => {
                              const base = "Tôm càng xanh tỷ lệ sống từ 95% tăng lên";
                              _({ ...v, shrimpType: base + (shrimpTypeExtra ? " " + shrimpTypeExtra : "") });
                            },
                            className: \`px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex-1 text-center \${
                              v.shrimpType.startsWith("Tôm càng xanh tỷ lệ sống từ 95% tăng lên")
                                ? "bg-emerald-700 text-white border-emerald-800 shadow-sm"
                                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                            }\`,
                            children: "Tôm càng xanh tỷ lệ sống từ 95% tăng lên"
                          }),
                          c.jsx("input", {
                            type: "text",
                            value: shrimpTypeExtra,
                            onChange: (e) => {
                              const extra = e.target.value;
                              setShrimpTypeExtra(extra);
                              const base = "Tôm càng xanh tỷ lệ sống từ 95% tăng lên";
                              _({ ...v, shrimpType: base + (extra ? " " + extra : "") });
                            },
                            placeholder: "Nhập thêm nội dung (Vd: size 5-8 con/kg...)",
                            className: "flex-[1.5] p-2.5 bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-700 rounded-xl font-bold text-xs outline-none"
                          })
                        ]
                      }),
                      c.jsx("input", {
                        type: "text",
                        value: v.shrimpType,
                        onChange: (e) => _({ ...v, shrimpType: e.target.value }),
                        placeholder: "Vd: Tôm càng xanh tỷ lệ sống từ 95% tăng lên...",
                        className: "w-full p-3 bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-700 rounded-xl font-bold text-xs outline-none"
                      })
                    ]
                  }),
                  // Section: Quy cách dạt tôm thu mua (Quick Select + Custom input)
                  c.jsxs("div", {
                    className: "sm:col-span-2 space-y-2 p-3.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/80 dark:border-amber-800/50",
                    children: [
                      c.jsxs("div", {
                        className: "flex items-center justify-between",
                        children: [
                          c.jsxs("label", { className: "text-xs font-black text-amber-950 dark:text-amber-300 uppercase flex items-center gap-1.5", children: [c.jsx("span", { children: "⚖️" }), "Quy cách dạt tôm thu mua (*)"] }),
                          c.jsx("span", { className: "text-[10px] text-amber-700 dark:text-amber-400 font-bold", children: "Tiêu chuẩn từ Thiết lập thông tin:" })
                        ]
                      }),
                      (() => {
                        const traderProf = typeof getTraderProfileV3 === "function" ? getTraderProfileV3() : {};
                        const dynamicSpecs = [
                          ...(Array.isArray(traderProf.catchingSpecs) ? traderProf.catchingSpecs.map(sp => sp && sp.text).filter(Boolean) : []),
                          traderProf.harvestStartTime && traderProf.harvestEndTime ? \`Thời gian bắt & cân: từ \${traderProf.harvestStartTime} đến \${traderProf.harvestEndTime}\` : "Thời gian bắt: Buổi sáng sớm mát trời (4h30 - 8h30)",
                          \`Quy cách trừ hao: 100kg tôm trừ bì \${traderProf.tarePer100Kg !== undefined ? traderProf.tarePer100Kg : 1} kg\`
                        ];
                        return c.jsx("div", {
                          className: "flex flex-wrap gap-1.5",
                          children: dynamicSpecs.map(spec => {
                            const isActive = v.rejectionSpec && v.rejectionSpec.includes(spec);
                            return c.jsx("button", {
                              key: spec,
                              type: "button",
                              onClick: () => {
                                const current = v.rejectionSpec || "";
                                let updated = "";
                                if (isActive) {
                                  updated = current.split(/;\\s*/).filter(item => item !== spec).join("; ");
                                } else {
                                  updated = current ? (current + "; " + spec) : spec;
                                }
                                _({ ...v, rejectionSpec: updated });
                              },
                              className: \`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all border cursor-pointer text-left \${
                                isActive
                                  ? "bg-amber-700 text-white border-amber-800 shadow-sm"
                                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                              }\`,
                              children: spec
                            });
                          })
                        });
                      })(),
                      c.jsx("input", {
                        type: "text",
                        value: v.rejectionSpec || "",
                        onChange: (e) => _({ ...v, rejectionSpec: e.target.value }),
                        placeholder: "Nhập quy cách dạt tôm chi tiết (Vd: Dạt tôm mềm, ốp, gãy càng tính giá xào...)",
                        className: "w-full p-3 bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 rounded-xl font-bold text-xs outline-none"
                      })
                    ]
                  }),`;

  content = content.substring(0, startIndex) + replacementBlock + content.substring(endIndex + blockEndStr.length);
  fs.writeFileSync(filePath, content, "utf8");
  console.log("Success: Replaced Loại tôm and Quy cách dạt XML structure blocks!");
} else {
  console.log("Error: Could not find target XML blocks in file!", "StartIndex:", startIndex, "EndIndex:", endIndex);
}
