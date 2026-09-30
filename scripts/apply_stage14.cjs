const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../assets/index-Os1X4Z7e.js");
let content = fs.readFileSync(filePath, "utf8");

// 1. In safeUser: default role should be "OWNER"
content = content.replace('role:b.role||"FARMER"', 'role:b.role||"OWNER"');
console.log("1. safeUser updated to default OWNER");

// 2. In Sidebar: Change "Đổi vai trò" to "Đăng xuất"
content = content.replace('children:[c.jsx(rm,{size:22})," Đổi vai trò"]', 'children:[c.jsx(rm,{size:22})," Đăng xuất"]');
console.log("2. Sidebar button changed to Đăng xuất");

// 3. Replace Hm component (remove role selection screen, auto select OWNER)
const oldHmStart = `Hm=({onSelect:S})=>{const[b,p]=w.useState(!1),f=Pu.currentUser,O=async()=>{p(!0);try{await Mn.loginWithGoogle()}catch{alert("Đăng nhập thất bại. Vui lòng thử lại!")}p(!1)};`;
const oldHmEnd = `children:"Đồng bộ dữ liệu an toàn đa thiết bị"})]})]})};`;

const hmStartIdx = content.indexOf(oldHmStart);
const hmEndIdx = content.indexOf(oldHmEnd, hmStartIdx);

if (hmStartIdx !== -1 && hmEndIdx !== -1) {
  const newHm = `Hm=({onSelect:S})=>{const[b,p]=w.useState(!1),f=Pu.currentUser,O=async()=>{p(!0);try{await Mn.loginWithGoogle();S("OWNER");}catch{alert("Đăng nhập thất bại. Vui lòng thử lại!")}p(!1)};w.useEffect(()=>{if(f){S("OWNER");}},[f]);return c.jsxs("div",{className:"min-h-screen bg-[#2e7d32] flex flex-col items-center justify-center p-6 text-white",children:[c.jsxs("div",{className:"mb-10 text-center",children:[c.jsx("img",{src:"https://iili.io/nue4riJ.png",alt:"Tôm Càng Xanh Logo",className:"w-24 h-24 mx-auto mb-4 object-contain rounded-3xl shadow-xl bg-white/10 p-1.5"}),c.jsx("h1",{className:"text-4xl font-black italic tracking-tighter uppercase",children:"Tôm Càng Xanh"}),c.jsx("p",{className:"text-xs font-bold opacity-60 uppercase mt-2",children:"Nền tảng quản lý thông minh Tôm Càng Xanh"})]}),f?c.jsxs("div",{className:"flex flex-col items-center gap-3 animate-in zoom-in-95",children:[c.jsx("div",{className:"w-10 h-10 border-4 border-yellow-300 border-t-transparent rounded-full animate-spin mb-2"}),c.jsxs("p",{className:"font-black uppercase tracking-wider text-yellow-300 text-sm",children:["Đang vào vai trò Chủ Vựa: ",f.displayName||""]})]}):c.jsxs("div",{className:"w-full max-w-sm space-y-4",children:[c.jsxs("button",{onClick:O,disabled:b,className:"w-full bg-white text-gray-800 p-6 rounded-[30px] font-black uppercase flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all hover:bg-yellow-50",children:[c.jsx(fm,{size:24,className:"text-red-500"}),b?"Đang kết nối...":"Đăng nhập với Google"]}),c.jsx("p",{className:"text-center text-[10px] opacity-50 px-6 uppercase tracking-wider font-bold",children:"Mặc định tài khoản Chủ Vựa & Đồng bộ dữ liệu an toàn"})]})]})};`;
  
  content = content.substring(0, hmStartIdx) + newHm + content.substring(hmEndIdx + oldHmEnd.length);
  console.log("3. Hm component replaced to remove role chooser");
} else {
  console.log("3. Warning: Could not locate Hm component exactly, hmStartIdx:", hmStartIdx, "hmEndIdx:", hmEndIdx);
}

// 4. Update BmMainApp to always set role to OWNER and skip AUTH when logged in
const oldBmStart = `const BmMainApp=()=>{const[S,b]=w.useState(me.getUser()),[p,f]=w.useState(!0),[O,D]=w.useState(re.AUTH),[U,Y]=w.useState(null);w.useEffect(()=>{const _=D1(Pu,async z=>{var L,te;if(z){const Q=await Mn.loadFromCloud(z.uid),se=(Q==null?void 0:Q.user)||{uid:z.uid,phoneNumber:z.phoneNumber||"",displayName:z.displayName||"Người dùng",photoURL:z.photoURL||"",role:((L=Q==null?void 0:Q.user)==null?void 0:L.role)||"FARMER",subscriptionStatus:((te=Q==null?void 0:Q.user)==null?void 0:te.subscriptionStatus)||"FREE",createdAt:new Date().toISOString()};me.setUser(se),b(se),se.role==="FARMER"&&se.phoneNumber&&(await Mn.loadFarmerInbox(se.phoneNumber)).length>0&&me.getSessions(),O===re.AUTH&&D(re.DASHBOARD)}else me.setUser(null),b(null),D(re.AUTH);f(!1)});return()=>_()},[]);const A=_=>{if(S){const z={...S,role:_};me.setUser(z),b(z),D(re.DASHBOARD)}};`;

const newBmStart = `const BmMainApp=()=>{const[S,b]=w.useState(()=>{const u=me.getUser();if(u)u.role="OWNER";return u;}),[p,f]=w.useState(!0),[O,D]=w.useState(()=>me.getUser()?re.DASHBOARD:re.AUTH),[U,Y]=w.useState(null);w.useEffect(()=>{const _=D1(Pu,async z=>{var L,te;if(z){const Q=await Mn.loadFromCloud(z.uid),se=(Q==null?void 0:Q.user)||{uid:z.uid,phoneNumber:z.phoneNumber||"",displayName:z.displayName||"Người dùng",photoURL:z.photoURL||"",role:"OWNER",subscriptionStatus:((te=Q==null?void 0:Q.user)==null?void 0:te.subscriptionStatus)||"FREE",createdAt:new Date().toISOString()};se.role="OWNER";me.setUser(se),b(se),D(re.DASHBOARD)}else me.setUser(null),b(null),D(re.AUTH);f(!1)});return()=>_()},[]);const A=_=>{if(S){const z={...S,role:"OWNER"};me.setUser(z),b(z),D(re.DASHBOARD)}};`;

if (content.includes(oldBmStart)) {
  content = content.replace(oldBmStart, newBmStart);
  console.log("4. BmMainApp updated to force default role OWNER");
} else {
  console.log("4. Warning: Could not locate oldBmStart in BmMainApp");
}

// 5. In Cm: Update initial state for rejectionSpec so it doesn't contain old hardcoded string
content = content.replace(
  'rejectionSpec: "Dạt tôm mềm, ốp, gãy càng chuyển tính giá xào",',
  'rejectionSpec: (typeof getTraderProfileV3 === "function" && getTraderProfileV3().catchingSpecs && getTraderProfileV3().catchingSpecs[0] ? getTraderProfileV3().catchingSpecs[0].text : "Quy cách trừ hao ráo nước chuẩn 1 kg / 100 kg"),'
);
console.log("5. Updated initial rejectionSpec in Cm");

fs.writeFileSync(filePath, content, "utf8");
console.log("Done applying Stage 14 modifications!");
