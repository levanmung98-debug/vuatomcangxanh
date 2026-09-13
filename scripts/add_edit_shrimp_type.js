import fs from 'fs';
const FILE = 'assets/index-Os1X4Z7e.js';
let code = fs.readFileSync(FILE, 'utf8');

const targetMethod = `const handleDeleteShrimpType = (id) => {
    const updated = (profile.shrimpTypes || []).filter(x => x.id !== id);
    setProfile({ ...profile, shrimpTypes: updated, shrimpSizes: updated });
  };`;
  
const editMethod = `const handleEditShrimpType = (t) => {
    const newName = window.prompt("Nhập tên loại tôm mới:", t.name);
    if (newName === null) return;
    const newPrice = window.prompt("Nhập giá thu mua gợi ý mới (VNĐ/kg):", String(t.price));
    if (newPrice === null) return;
    const p = parseFloat(newPrice.replace(/[^0-9]/g, "")) || 0;
    const updated = (profile.shrimpTypes || []).map(x => x.id === t.id ? { ...x, name: newName.trim(), price: p } : x);
    setProfile({ ...profile, shrimpTypes: updated, shrimpSizes: updated });
  };
`;

code = code.replace(targetMethod, editMethod + targetMethod);
fs.writeFileSync(FILE, code, 'utf8');
console.log("Method added");
