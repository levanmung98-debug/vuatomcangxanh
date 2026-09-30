const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../assets/index-Os1X4Z7e.js");
let content = fs.readFileSync(filePath, "utf8");

const hmStart = content.indexOf("Hm=({onSelect:S})=>{");
const hmEnd = content.indexOf(",Rm=({setRoute:S})=>{", hmStart);

console.log("hmStart:", hmStart, "hmEnd:", hmEnd);

if (hmStart !== -1 && hmEnd !== -1) {
  const newHm = `Hm=({onSelect:S})=>{const[b,p]=w.useState(!1),f=Pu.currentUser,O=async()=>{p(!0);try{await Mn.loginWithGoogle();S("OWNER");}catch{alert("Đăng nhập thất bại. Vui lòng thử lại!")}p(!1)};w.useEffect(()=>{if(f){S("OWNER");}},[f]);return c.jsxs("div",{className:"min-h-screen bg-[#2e7d32] flex flex-col items-center justify-center p-6 text-white",children:[c.jsxs("div",{className:"mb-10 text-center",children:[c.jsx("img",{src:"https://iili.io/nue4riJ.png",alt:"Tôm Càng Xanh Logo",className:"w-24 h-24 mx-auto mb-4 object-contain rounded-3xl shadow-xl bg-white/10 p-1.5"}),c.jsx("h1",{className:"text-4xl font-black italic tracking-tighter uppercase",children:"Tôm Càng Xanh"}),c.jsx("p",{className:"text-xs font-bold opacity-60 uppercase mt-2",children:"Nền tảng quản lý thông minh Tôm Càng Xanh"})]}),f?c.jsxs("div",{className:"flex flex-col items-center gap-3 animate-in zoom-in-95",children:[c.jsx("div",{className:"w-10 h-10 border-4 border-yellow-300 border-t-transparent rounded-full animate-spin mb-2"}),c.jsxs("p",{className:"font-black uppercase tracking-wider text-yellow-300 text-sm",children:["Đang vào vai trò Chủ Vựa: ",f.displayName||""]})]}):c.jsxs("div",{className:"w-full max-w-sm space-y-4",children:[c.jsxs("button",{onClick:O,disabled:b,className:"w-full bg-white text-gray-800 p-6 rounded-[30px] font-black uppercase flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all hover:bg-yellow-50 cursor-pointer",children:[c.jsx(fm,{size:24,className:"text-red-500"}),b?"Đang kết nối...":"Đăng nhập với Google"]}),c.jsx("p",{className:"text-center text-[10px] opacity-50 px-6 uppercase font-bold",children:"Mặc định tài khoản Chủ Vựa & Dữ liệu đồng bộ an toàn"})]}),c.jsxs("div",{className:"mt-12 flex items-center gap-2 opacity-40 font-bold text-[10px] uppercase",children:[c.jsx(Pd,{size:14})," Bảo mật bởi Firebase Google"]})]})}`;

  content = content.substring(0, hmStart) + newHm + content.substring(hmEnd);
  fs.writeFileSync(filePath, content, "utf8");
  console.log("Successfully replaced Hm component!");
} else {
  console.log("Failed to find boundaries for Hm!");
}
