import fs from 'fs';

const FILE = 'assets/index-Os1X4Z7e.js';
let code = fs.readFileSync(FILE, 'utf8');

const target = `: c.jsxs("div", {
                        className: "bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors",
                        children: [
                          c.jsx("label", {
                            className: "text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase italic mb-2 block",
                            children: "Quy Cách Trừ Bì (kg/rổ) - Hao hụt chợ"
                          }),
                          c.jsxs("div", {
                            className: "flex items-center justify-end gap-2",
                            children: [
                              c.jsx("input", {
                                type: "number",
                                step: "any",
                                value: A.tareRatio || "",
                                onChange: $ => v({ ...A, tareRatio: $.target.value }),
                                placeholder: "VD: 2.5",
                                className: "w-1/2 text-right text-3xl font-black text-emerald-600 dark:text-emerald-400 outline-none bg-transparent"
                              }),
                              c.jsx("span", { className: "text-lg font-bold text-gray-500", children: "kg/rổ" })
                            ]
                          })
                        ]
                      })`;

const replacement = `: c.jsxs("div", {
                        className: "bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors flex flex-col justify-center items-center text-center",
                        children: [
                          c.jsx("span", { className: "text-sm font-black text-amber-600 uppercase italic mb-1", children: "KHÔNG TRỪ BÌ" }),
                          c.jsx("span", { className: "text-xs font-bold text-gray-500", children: "Trừ bì & Hoa hồng quyết toán sau" })
                        ]
                      })`;

code = code.replace(target, replacement);

fs.writeFileSync(FILE, code, 'utf8');
console.log("Stage 10 (Remove tareRatio UI) applied!");
