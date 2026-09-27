const fs = require("fs");

console.log("Loading bundle...");
let code = fs.readFileSync("assets/index-Os1X4Z7e.js", "utf8");
console.log("Initial code length:", code.length);

// 1. Safeguard Firebase init
const fbTarget = 'eo=E1(Em),Wu=C1(eo,{localCache:k1({tabManager:U1()})}),Pu=A1(eo);';
const fbReplacement = 'eo=(()=>{try{return E1(Em)}catch(e){console.warn("FB init error",e);return null}})();Wu=(()=>{if(!eo)return null;try{return C1(eo,{localCache:k1({tabManager:U1()})})}catch(e){try{return C1(eo)}catch(e2){return null}}})();Pu=(()=>{if(!eo)return null;try{return A1(eo)}catch(e){return null}})();';

if (code.includes(fbTarget)) {
  code = code.replace(fbTarget, fbReplacement);
  console.log("1. Firebase init safeguarded successfully!");
} else {
  console.warn("1. Firebase init target not found exactly, searching substring...");
  const p = code.indexOf("eo=E1(Em)");
  if (p !== -1) {
    const pEnd = code.indexOf(";", p);
    console.log("Found fb init at", p, "to", pEnd, ":", code.slice(p, pEnd + 1));
  }
}

// 2. Safeguard Hm (Role & Auth Screen)
// Look for Hm=({onSelect:S})=>{
const hmStart = code.indexOf("Hm=({onSelect:S})=>");
if (hmStart !== -1) {
  const hmEnd = code.indexOf("Rm=({setRoute:S})=>", hmStart);
  if (hmEnd !== -1) {
    const oldHm = code.slice(hmStart, hmEnd);
    console.log("Found Hm component, length:", oldHm.length);

    const newHm = `Hm=({onSelect:S})=>{const[b,p]=w.useState(!1),f=(typeof Pu!=="undefined"&&Pu)?Pu.currentUser:null,O=async()=>{p(!0);try{if(typeof Mn!=="undefined"&&Mn.loginWithGoogle){await Mn.loginWithGoogle()}}catch(err){console.warn("Login warning",err);alert("Không thể mở cửa sổ đăng nhập Google trên trình duyệt này. Quý khách có thể chọn trực tiếp vai trò Chủ Vựa hoặc Nông Dân bên dưới để vào ứng dụng ngay!")}p(!1)};return c.jsxs("div",{className:"min-h-screen bg-[#1b4d1e] flex flex-col items-center justify-center p-6 text-white font-sans",children:[c.jsxs("div",{className:"mb-8 text-center",children:[c.jsx("div",{className:"text-6xl mb-3",children:"🦐"}),c.jsx("h1",{className:"text-3xl sm:text-4xl font-black italic tracking-tighter uppercase text-yellow-300",children:"Tôm Càng Xanh"}),c.jsx("p",{className:"text-xs font-bold text-emerald-200 uppercase mt-1 tracking-wider",children:"Nền tảng quản lý cân tôm & hợp đồng thông minh 4.0"})]}),c.jsxs("div",{className:"grid gap-4 w-full max-w-sm animate-in zoom-in-95",children:[c.jsx("p",{className:"text-center font-bold text-xs uppercase text-emerald-100 mb-1",children:"Chọn vai trò để vào bàn làm việc ngay:"}),c.jsxs("button",{type:"button",onClick:()=>S("OWNER"),className:"bg-gradient-to-r from-yellow-300 to-amber-400 p-5 rounded-3xl text-gray-900 flex items-center justify-between gap-4 shadow-2xl active:scale-95 transition-all cursor-pointer border-2 border-yellow-200",children:[c.jsxs("div",{className:"flex items-center gap-3",children:[c.jsx("div",{className:"w-12 h-12 bg-yellow-100 text-yellow-900 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner",children:"🏢"}),c.jsxs("div",{className:"text-left",children:[c.jsx("span",{className:"text-lg font-black uppercase block leading-tight",children:"Chủ Vựa / Thương Lái"}),c.jsx("span",{className:"text-[11px] font-bold text-gray-700 block",children:"Cân tôm, tạo hợp đồng & quản lý"})]})]}),c.jsx("span",{className:"text-xl font-black text-gray-800",children:"→"})]}),c.jsxs("button",{type:"button",onClick:()=>S("FARMER"),className:"bg-white p-5 rounded-3xl text-gray-900 flex items-center justify-between gap-4 shadow-2xl active:scale-95 transition-all cursor-pointer border border-emerald-100",children:[c.jsxs("div",{className:"flex items-center gap-3",children:[c.jsx("div",{className:"w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner",children:"🌾"}),c.jsxs("div",{className:"text-left",children:[c.jsx("span",{className:"text-lg font-black uppercase block leading-tight",children:"Nông Dân / Chủ Ao"}),c.jsx("span",{className:"text-[11px] font-bold text-gray-500 block",children:"Xem phiếu cân, ký hợp đồng tại ao"})]})]}),c.jsx("span",{className:"text-xl font-black text-emerald-700",children:"→"})]}),c.jsxs("div",{className:"pt-4 border-t border-emerald-800/60 mt-2 space-y-2 text-center",children:[c.jsxs("button",{type:"button",onClick:O,disabled:b,className:"w-full bg-emerald-800/80 hover:bg-emerald-800 text-emerald-100 py-3 px-4 rounded-2xl font-bold text-xs uppercase flex items-center justify-center gap-2 border border-emerald-600/40 transition-all cursor-pointer",children:[c.jsx("span",{className:"text-base",children:"🔐"}),b?"Đang kết nối...":"Đăng nhập Google (Tùy chọn đồng bộ)"]}),c.jsx("p",{className:"text-[10px] text-emerald-300/80 uppercase font-semibold",children:"Sử dụng ngoại tuyến & lưu trữ an toàn 100% trên thiết bị"})]})]}),c.jsxs("div",{className:"mt-8 flex items-center gap-2 opacity-50 font-bold text-[10px] uppercase",children:[c.jsx(Pd,{size:14})," Bảo mật & Mã hóa dữ liệu 4.0"]})]})};`;

    code = code.slice(0, hmStart) + newHm + code.slice(hmEnd);
    console.log("2. Hm component upgraded successfully!");
  }
}

// 3. Safeguard BmMainApp
const bmMStart = code.indexOf("const BmMainApp=()=>{");
const bmMNext = code.indexOf("const Bm=()=>{", bmMStart);
if (bmMStart !== -1 && bmMNext !== -1) {
  const oldBmM = code.slice(bmMStart, bmMNext);
  console.log("Found BmMainApp, length:", oldBmM.length);

  const newBmM = `const BmMainApp=()=>{
  const[S,b]=w.useState(()=>{
    try{
      const u=me.getUser();
      if(u&&u.role) return u;
      const def={uid:"local_owner",displayName:"Chủ Vựa",role:"OWNER",subscriptionStatus:"PREMIUM"};
      me.setUser(def);
      return def;
    }catch(e){
      return{uid:"local_owner",displayName:"Chủ Vựa",role:"OWNER",subscriptionStatus:"PREMIUM"};
    }
  });
  const[p,f]=w.useState(false);
  const[O,D]=w.useState(re.DASHBOARD);
  const[U,Y]=w.useState(null);

  w.useEffect(()=>{
    let unsub=null;
    let isDone=false;
    const timer=setTimeout(()=>{
      if(!isDone){isDone=true;f(false);}
    },1500);

    try{
      if(typeof Pu!=="undefined"&&Pu&&typeof D1==="function"){
        unsub=D1(Pu,async z=>{
          try{
            if(z){
              const Q=await Mn.loadFromCloud(z.uid);
              const se=(Q==null?void 0:Q.user)||{
                uid:z.uid,
                phoneNumber:z.phoneNumber||"",
                displayName:z.displayName||"Người dùng",
                photoURL:z.photoURL||"",
                role:(S&&S.role)?S.role:"OWNER",
                subscriptionStatus:"PREMIUM",
                createdAt:new Date().toISOString()
              };
              me.setUser(se);
              b(se);
              if(se.role==="FARMER"&&se.phoneNumber){
                try{
                  const inbox=await Mn.loadFarmerInbox(se.phoneNumber);
                  if(inbox&&inbox.length>0) me.getSessions();
                }catch(e){}
              }
            }
          }catch(err){
            console.warn("Cloud auth sync note:",err);
          }finally{
            if(!isDone){isDone=true;clearTimeout(timer);f(false);}
          }
        });
      }else{
        f(false);
      }
    }catch(e){
      console.warn("Auth listener skipped:",e);
      f(false);
    }
    return ()=>{
      clearTimeout(timer);
      if(typeof unsub==="function"){try{unsub();}catch(e){}}
    };
  },[]);

  const A=_=>{
    const cur=S||{uid:"local_"+_.toLowerCase(),displayName:_==="OWNER"?"Chủ Vựa":"Nông Dân"};
    const z={...cur,role:_};
    me.setUser(z);
    b(z);
    D(re.DASHBOARD);
  };

  if(p) return c.jsxs("div",{className:"min-h-screen bg-[#1b4d1e] flex flex-col items-center justify-center text-white font-sans",children:[c.jsx("div",{className:"w-14 h-14 border-4 border-yellow-300 border-t-transparent rounded-full animate-spin mb-4"}),c.jsx("p",{className:"font-black uppercase tracking-wider text-xs text-yellow-300",children:"Đang vào bàn làm việc..."})]});

  if(!S||O===re.AUTH) return c.jsx(Hm,{onSelect:A});

  const v=()=>{
    const _={setRoute:D,role:S.role};
    switch(O){
      case re.DASHBOARD:return c.jsx(Kd,{..._});
      case re.OVERVIEW:return c.jsx(Xm_OverviewTab,{..._,onViewDetail:z=>{Y(z);D(re.SESSION_DETAIL);}});
      case re.WEIGHING:return c.jsx(Om,{..._});
      case re.HISTORY:return c.jsx(_m,{..._,onViewDetail:z=>{Y(z);D(re.SESSION_DETAIL);}});
      case re.SESSION_DETAIL:return c.jsx(Dm,{..._,sessionId:U||""});
      case re.SALES:return c.jsx(Xm_SalesScreen,{..._,onViewDetail:z=>{Y(z);D(re.SALES_DETAIL);}});
      case re.CUSTOMERS:return c.jsx(Xm_CustomersScreen,{..._,onSelectForSale:z=>{D(re.SALES);}});
      case re.SALES_DETAIL:return c.jsx(Xm_SaleDetailScreen,{..._,sale:(typeof U==="object"?U:(me.getSales().find(s=>s.id===(typeof U==="string"?U:U?.id))||null)),onBack:()=>D(re.SALES)});
      case re.FARMERS:return c.jsx(Cm,{..._});
      case re.VEHICLES:return c.jsx(km,{..._});
      case re.INFO_CONFIG:return c.jsx(Xm_TraderConfig,{..._});
      case re.SETTINGS:return c.jsx(Um,{..._});
      case re.BLUETOOTH:return c.jsx(Rm,{..._});
      default:return c.jsx(Kd,{..._});
    }
  };

  return c.jsx(Tm,{activeRoute:O,setRoute:D,title:"Tôm Càng Xanh",role:S.role,onLogout:async()=>{try{await Mn.logout();}catch(e){} me.setUser(null);b(null);D(re.AUTH);},children:v()});
};
`;

  code = code.slice(0, bmMStart) + newBmM + code.slice(bmMNext);
  console.log("3. BmMainApp upgraded successfully!");
}

// 4. Safeguard Bm router
const bmStart = code.indexOf("const Bm=()=>{");
const errBoundStart = code.indexOf("class Xm_ErrorBoundary", bmStart);
if (bmStart !== -1 && errBoundStart !== -1) {
  const oldBm = code.slice(bmStart, errBoundStart);
  console.log("Found Bm router, length:", oldBm.length);

  const newBm = `const Bm=()=>{
  const _urlParams=new URLSearchParams(window.location.search);
  let _portalContractId=_urlParams.get("contract")||_urlParams.get("hd")||_urlParams.get("d")||_urlParams.get("c")||_urlParams.get("data");
  if(!_portalContractId&&_urlParams.get("id")){
    const testId=_urlParams.get("id");
    if(testId&&(testId.startsWith("HD")||testId.includes("-")||testId.length>8)){
      _portalContractId=testId;
    }
  }
  const _path=window.location.pathname||"";
  if(!_portalContractId&&_path.includes("hopdong")){
    const _m=_path.match(/\\/hopdongthumua\\/([^\\/?#]+)/);
    _portalContractId=_m?decodeURIComponent(_m[1]):"portal";
  }
  if(!_portalContractId&&window.location.hash){
    if(window.location.hash.includes("c=")||window.location.hash.includes("d=")){
      _portalContractId="hash_portal";
    }else if(window.location.hash.includes("hd=")){
      const _mMatch=window.location.hash.match(/hd=([^&]+)/);
      if(_mMatch)_portalContractId=decodeURIComponent(_mMatch[1]);
    }else if(window.location.hash.includes("contract=")){
      const _mMatch=window.location.hash.match(/contract=([^&]+)/);
      if(_mMatch)_portalContractId=decodeURIComponent(_mMatch[1]);
    }
  }
  if(_portalContractId){
    return c.jsx(Xm_StandaloneContractPortal,{contractId:_portalContractId});
  }
  return c.jsx(BmMainApp,{});
};
`;

  code = code.slice(0, bmStart) + newBm + code.slice(errBoundStart);
  console.log("4. Bm router upgraded successfully!");
}

// 5. Upgrade mounting & ErrorBoundary at end of file
const mountIdx = code.lastIndexOf('document.getElementById("root")');
if (mountIdx !== -1) {
  console.log("Found mount statement near end, updating...");
  const newMount = `const to=document.getElementById("root");
if(to){
  try{
    const wm=Z1.createRoot(to);
    wm.render(c.jsx(w1.StrictMode,{children:c.jsx(Xm_ErrorBoundary,{children:c.jsx(Bm,{})})}));
  }catch(mountErr){
    console.error("Mount error fallback:",mountErr);
    to.innerHTML='<div style="min-height:100vh;background:#1b4d1e;color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:sans-serif;">'+
      '<div style="font-size:48px;margin-bottom:12px;">🦐</div>'+
      '<h2 style="font-size:20px;font-weight:900;text-transform:uppercase;color:#fde047;margin-bottom:8px;">Vua Tôm Càng Xanh</h2>'+
      '<p style="font-size:13px;color:#d1fae5;max-width:360px;margin-bottom:20px;line-height:1.5;">Hệ thống đang chuẩn bị bàn làm việc cho bạn.</p>'+
      '<button type="button" onclick="localStorage.removeItem(\\'annong_sessions_cache\\');location.reload();" style="padding:12px 24px;background:#eab308;color:#0f2e12;font-weight:900;border:none;border-radius:16px;font-size:14px;text-transform:uppercase;cursor:pointer;box-shadow:0 10px 25px rgba(0,0,0,0.3);">Vào Bàn Làm Việc</button>'+
      '</div>';
  }
}`;
  code = code.slice(0, mountIdx - 9) + newMount;
  console.log("5. Mounting guarded successfully!");
}

fs.writeFileSync("assets/index-Os1X4Z7e.js", code, "utf8");
console.log("All white screen fixes applied! Final length:", code.length);
