import fs from 'fs';
const FILE = 'assets/index-Os1X4Z7e.js';
let code = fs.readFileSync(FILE, 'utf8');

const targetBtn = `c.jsx("button", {
                      type: "button",
                      onClick: () => handleDeleteShrimpType(t.id),
                      className: "p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors",
                      title: "Xóa loại tôm này",
                      children: c.jsx(Iu, { size: 18 })
                    })`;
                    
const replaceBtn = `c.jsxs("div", {
                      className: "flex items-center gap-1",
                      children: [
                        c.jsx("button", {
                          type: "button",
                          onClick: () => handleEditShrimpType(t),
                          className: "p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-colors",
                          title: "Chỉnh sửa loại tôm này",
                          children: c.jsx("span", { className: "text-base", children: "✏️" })
                        }),
                        c.jsx("button", {
                          type: "button",
                          onClick: () => handleDeleteShrimpType(t.id),
                          className: "p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors",
                          title: "Xóa loại tôm này",
                          children: c.jsx(Iu, { size: 18 })
                        })
                      ]
                    })`;

if (code.includes(targetBtn)) {
    code = code.replace(targetBtn, replaceBtn);
    fs.writeFileSync(FILE, code, 'utf8');
    console.log("Button added");
} else {
    console.log("Target not found");
}
