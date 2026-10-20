const fs = require("fs");
const path = require("path");

const bundlePath = path.resolve(__dirname, "../assets/index-v7.js");
const publicBundlePath = path.resolve(__dirname, "../public/assets/index-v7.js");

let code = fs.readFileSync(bundlePath, "utf8");
console.log("Read bundle:", bundlePath, "length:", code.length);

// 1. Update handleSelectShrimpType: do not set price from predefined list
const oldFnStart = code.indexOf("const handleSelectShrimpType =");
if (oldFnStart !== -1) {
  const oldFnEnd = code.indexOf(";", code.indexOf("}", oldFnStart)) + 1;
  const newFn = `const handleSelectShrimpType = (typeName) => {
    v(prev => ({ ...prev, riceType: typeName }));
  };`;
  code = code.substring(0, oldFnStart) + newFn + code.substring(oldFnEnd);
  console.log("Updated handleSelectShrimpType to only set riceType without modifying price.");
} else {
  console.warn("Could not find handleSelectShrimpType");
}

// 2. Update the shrimp selector UI in Om
const oldSelectorStart = code.indexOf("// Nút 2: Chọn Loại / Size Tôm");
if (oldSelectorStart !== -1) {
  const oldSelectorEnd = code.indexOf("// Big Bright Yellow Net Weight Box", oldSelectorStart);
  if (oldSelectorEnd !== -1) {
    const newSelectorCode = `// Nút 2: Chọn Loại / Size Tôm (Chỉ hiển thị tên loại tôm, không hiển thị giá)
                  c.jsxs("div", {
                    className: "space-y-1 relative",
                    children: [
                      c.jsxs("div", {
                        className: "flex justify-between items-center ml-1",
                        children: [
                          c.jsx("label", {
                            className: "text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase italic",
                            children: "Loại / Size Tôm"
                          }),
                          c.jsx("button", {
                            type: "button",
                            onClick: () => {
                              const customType = prompt("Nhập tên loại tôm mới:", A.riceType || "");
                              if (customType && customType.trim()) {
                                handleSelectShrimpType(customType.trim());
                              }
                            },
                            className: "text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase italic underline",
                            children: "Khác"
                          })
                        ]
                      }),
                      // Dropdown Trigger Button (Chỉ hiển thị tên loại tôm, không hiển thị giá)
                      c.jsxs("button", {
                        type: "button",
                        onClick: () => {
                          setShowShrimpDropdown(!showShrimpDropdown);
                          setShowFarmerDropdown(false);
                        },
                        className: \`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all active:scale-[0.98] \${
                          showShrimpDropdown
                            ? "bg-blue-50 border-blue-500 dark:bg-blue-950/40 dark:border-blue-400 shadow-md"
                            : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300"
                        }\`,
                        children: [
                          c.jsx("div", {
                            className: "truncate flex-1 pr-2",
                            children: c.jsxs("div", {
                              className: "text-base font-black text-blue-950 dark:text-blue-200 uppercase truncate flex items-center gap-2",
                              children: [
                                c.jsx("span", { className: "text-xl", children: "🦐" }),
                                c.jsx("span", { children: A.riceType || "Chọn Loại / Size Tôm..." })
                              ]
                            })
                          }),
                          c.jsx("span", {
                            className: \`text-xs font-black text-gray-500 transition-transform duration-200 \${showShrimpDropdown ? "rotate-180" : ""}\`,
                            children: "▼"
                          })
                        ]
                      }),
                      // Dropdown Menu List (Chỉ hiển thị tên loại tôm, không hiển thị giá tôm)
                      showShrimpDropdown && c.jsxs("div", {
                        className: "absolute left-0 right-0 top-full mt-1.5 z-[90] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-80 overflow-y-auto p-2 space-y-1 animate-in fade-in",
                        children: [
                          // Shrimp items (Chỉ hiển thị tên loại tôm)
                          standardShrimpList.map(item => {
                            const isSelected = (A.riceType || "").toLowerCase() === item.name.toLowerCase();
                            return c.jsxs("button", {
                              key: item.name,
                              type: "button",
                              onClick: () => {
                                v(prev => ({
                                  ...prev,
                                  riceType: item.name
                                }));
                                setShowShrimpDropdown(false);
                              },
                              className: \`w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-left border transition-colors flex items-center justify-between \${
                                isSelected
                                  ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-black"
                                  : "border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                              }\`,
                              children: [
                                c.jsxs("div", {
                                  className: "flex items-center gap-2.5",
                                  children: [
                                    c.jsx("span", { className: "text-lg", children: "🦐" }),
                                    c.jsxs("div", {
                                      children: [
                                        c.jsx("div", { className: "font-black text-sm uppercase text-gray-900 dark:text-gray-100", children: item.name }),
                                        item.desc && c.jsx("div", { className: "text-[10px] text-gray-400 italic", children: item.desc })
                                      ]
                                    })
                                  ]
                                }),
                                isSelected && c.jsx("span", { className: "text-emerald-600 dark:text-emerald-400 font-black text-sm", children: "✓" })
                              ]
                            });
                          }),
                          // Custom type button
                          c.jsx("button", {
                            type: "button",
                            onClick: () => {
                              const customName = prompt("Nhập tên loại tôm khác:", "");
                              if (customName && customName.trim()) {
                                v(prev => ({
                                  ...prev,
                                  riceType: customName.trim()
                                }));
                              }
                              setShowShrimpDropdown(false);
                            },
                            className: "w-full p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-center text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mt-1 transition-colors",
                            children: "+ Nhập Loại Tôm Khác"
                          })
                        ]
                      })
                    ]
                  })
                ]
              }),
              `;

    code = code.substring(0, oldSelectorStart) + newSelectorCode + code.substring(oldSelectorEnd);
    console.log("Updated shrimp selector UI to only show shrimp name without prices.");
  } else {
    console.warn("Could not find oldSelectorEnd");
  }
} else {
  console.warn("Could not find oldSelectorStart");
}

// 3. Update the label and placeholder of the price card in Om
const oldPriceInputStart = code.indexOf("// Giá (kg)");
if (oldPriceInputStart !== -1) {
  const oldPriceInputEnd = code.indexOf("// Cọc (VNĐ)", oldPriceInputStart);
  if (oldPriceInputEnd !== -1) {
    const newPriceCard = `// Giá (kg)
                      c.jsxs("div", {
                        className: "bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors",
                        children: [
                          c.jsx("label", {
                            className: "text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase italic mb-2 block",
                            children: "Đơn Giá Bán/Mua (đ/kg)"
                          }),
                          c.jsx("input", {
                            type: "number",
                            value: A.price,
                            onChange: $ => v({ ...A, price: $.target.value }),
                            placeholder: "Tự nhập giá...",
                            className: "w-full text-right text-2xl font-black text-[#1a237e] dark:text-blue-300 outline-none bg-transparent"
                          })
                        ]
                      }),
                      `;
    code = code.substring(0, oldPriceInputStart) + newPriceCard + code.substring(oldPriceInputEnd);
    console.log("Updated price input card label and placeholder.");
  }
}

// 4. Update the active weighing badge
const oldActiveBadge = `["Đang cân: ", A.riceType, " (", Number(A.price).toLocaleString(), " đ/kg)"]`;
const newActiveBadge = `["Đang cân: ", A.riceType, Number(A.price) > 0 ? (" (" + Number(A.price).toLocaleString() + " đ/kg)") : " (Chưa nhập giá)"]`;
if (code.includes(oldActiveBadge)) {
  code = code.replace(oldActiveBadge, newActiveBadge);
  console.log("Updated active weighing badge text.");
}

// Save bundle
fs.writeFileSync(bundlePath, code, "utf8");
console.log("Saved bundle to:", bundlePath, "length:", code.length);

if (fs.existsSync(path.dirname(publicBundlePath))) {
  fs.writeFileSync(publicBundlePath, code, "utf8");
  console.log("Synced to:", publicBundlePath);
}
