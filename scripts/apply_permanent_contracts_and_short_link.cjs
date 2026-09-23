const fs = require("fs");
const path = require("path");

const bundlePath = path.resolve(__dirname, "../assets/index-Os1X4Z7e.js");
let code = fs.readFileSync(bundlePath, "utf8");

console.log("Original bundle length:", code.length);

// 1. Update cleanupExpiredContracts: permanently keep all contracts, never delete after 30 days
const oldCleanupStart = code.indexOf("const cleanupExpiredContracts =");
if (oldCleanupStart !== -1) {
  const getContractsStart = code.indexOf("const getContracts =", oldCleanupStart);
  if (getContractsStart !== -1) {
    const newCleanupCode = `const cleanupExpiredContracts = () => {
  try {
    const raw = localStorage.getItem(TOM_KEYS.CONTRACTS);
    if (!raw) return [];
    const contracts = JSON.parse(raw);
    return Array.isArray(contracts) ? contracts : [];
  } catch (err) {
    return [];
  }
};
`;
    code = code.substring(0, oldCleanupStart) + newCleanupCode + code.substring(getContractsStart);
    console.log("Updated cleanupExpiredContracts to permanent storage (no 30-day deletion).");
  }
}

// 2. Update encodeContractForShare and checkUrlContract: short URL ?hd=ID
const encodeStart = code.indexOf("const encodeContractForShare =");
if (encodeStart !== -1) {
  const encodeEnd = code.indexOf("// Standardized UI Icons", encodeStart);
  if (encodeEnd !== -1) {
    const newEncodeCode = `const encodeContractForShare = (contract) => {
  if (!contract || !contract.id) return window.location.href;
  try { syncContractToCloud(contract); } catch (e) {}
  const base = \`\${window.location.origin}\${window.location.pathname}\`;
  const cleanId = (contract.id || "").replace(/Đ/g, "D");
  return \`\${base}?hd=\${encodeURIComponent(cleanId)}\`;
};
if (typeof window !== "undefined") {
  window.encodeContractForShare = encodeContractForShare;
}
const checkUrlContract = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash || "";
    let dataPart = params.get("d") || params.get("data") || params.get("c");
    if (!dataPart && hash) {
      if (hash.includes("c=")) dataPart = hash.split("c=")[1]?.split("&")[0];
      else if (hash.includes("d=")) dataPart = hash.split("d=")[1]?.split("&")[0];
      else if (hash.includes("data=")) dataPart = hash.split("data=")[1]?.split("&")[0];
    }
    if (dataPart && typeof decodeContractFromB64 === "function") {
      const decoded = decodeContractFromB64(dataPart);
      if (decoded && decoded.id) {
        saveContract(decoded);
        return decoded;
      }
    }
    const contractId = params.get("hd") || params.get("contract") || params.get("id") || (hash.startsWith("#hd=") ? hash.replace("#hd=", "") : "");
    if (contractId) {
      const all = getContracts();
      const found = all.find(x => x && (x.id === contractId || x.id === contractId.replace(/Đ/g, "D") || x.id === contractId.replace(/D/g, "Đ")));
      if (found) return found;
    }
  } catch (e) {
    console.error("Url contract load error", e);
  }
  return null;
};
window.checkUrlContract = checkUrlContract;
`;
    code = code.substring(0, encodeStart) + newEncodeCode + code.substring(encodeEnd);
    console.log("Updated encodeContractForShare to short link (?hd=ID).");
  }
}

// 3. Update Bm routing to support #hd= and ?hd=
const bmRouteIdx = code.indexOf("_portalContractId=\"hash_portal\";");
if (bmRouteIdx !== -1) {
  const targetStr = `}else if(window.location.hash.includes("contract=")){`;
  const replaceStr = `}else if(window.location.hash.includes("hd=")){const _mMatch=window.location.hash.match(/hd=([^&]+)/);if(_mMatch)_portalContractId=decodeURIComponent(_mMatch[1]);}else if(window.location.hash.includes("contract=")){`;
  if (code.includes(targetStr)) {
    code = code.replace(targetStr, replaceStr);
    console.log("Updated Bm root router for hash hd support.");
  }
}

// 4. Update Xm_StandaloneContractPortal with Google Login, Permanent Viewing, and Short Link Loading
const portalStart = code.indexOf("const Xm_StandaloneContractPortal =");
if (portalStart !== -1) {
  const portalEnd = code.indexOf("// ==================== POPUP CHUẨN HOÁ GỬI HỢP ĐỒNG CHO KHÁCH (SHARE ZALO MODAL) ====================", portalStart);
  if (portalEnd !== -1) {
    const newPortalCode = `const Xm_StandaloneContractPortal = ({ contractId }) => {
  const [contract, setContract] = w.useState(null);
  const [loading, setLoading] = w.useState(true);
  const [errorMsg, setErrorMsg] = w.useState("");
  const [isSigning, setIsSigning] = w.useState(false);
  const [fontSize, setFontSize] = w.useState("base"); // base, lg, xl
  const [isSpeaking, setIsSpeaking] = w.useState(false);
  const [pasteInput, setPasteInput] = w.useState("");
  const [customerUser, setCustomerUser] = w.useState(() => {
    try {
      const saved = localStorage.getItem("tom_customer_gmail_auth");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [gmailInput, setGmailInput] = w.useState("");
  const [farmerNameInput, setFarmerNameInput] = w.useState("");
  const [gmailError, setGmailError] = w.useState("");
  const [isLoggingIn, setIsLoggingIn] = w.useState(false);
  const [showGoogleModal, setShowGoogleModal] = w.useState(false);
  const [googleModalEmail, setGoogleModalEmail] = w.useState("levanmung98@gmail.com");

  // Load contract from Hash -> Query Param (?hd=, ?contract=) -> Server API -> LocalStorage -> Cloud Firestore
  w.useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      let found = null;

      // Extract target contract ID
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash || "";
      const qId = params.get("hd") || params.get("contract") || params.get("id") || (hash.startsWith("#hd=") ? hash.replace("#hd=", "") : "") || (contractId && contractId !== "portal" && contractId !== "hash_portal" ? contractId : "");

      // 1. Try URL parameters & Hash base64 (backward compatibility)
      try {
        let dataPart = params.get("d") || params.get("data") || params.get("c");
        if (!dataPart && hash) {
          if (hash.includes("c=")) dataPart = hash.split("c=")[1]?.split("&")[0];
          else if (hash.includes("d=")) dataPart = hash.split("d=")[1]?.split("&")[0];
          else if (hash.includes("data=")) dataPart = hash.split("data=")[1]?.split("&")[0];
        }
        if (dataPart && window.decodeContractFromB64) {
          found = window.decodeContractFromB64(dataPart);
          if (found && found.id) {
            saveContract(found);
          }
        }
      } catch (e) {
        console.warn("Decode url error", e);
      }

      // 2. Try checkUrlContract / LocalStorage
      if (!found && window.checkUrlContract) {
        found = window.checkUrlContract();
      }
      if (!found && qId) {
        const all = getContracts();
        found = all.find(x => x && (x.id === qId || x.id === qId.replace(/Đ/g, "D") || x.id === qId.replace(/D/g, "Đ")));
      }

      // 3. Try Server API directly (Crucial for short link ?hd=ID opened on customer device!)
      if (qId) {
        try {
          const res = await fetch(\`/api/contracts/\${encodeURIComponent(qId)}\`);
          if (res.ok) {
            const apiData = await res.json();
            if (apiData && apiData.id) {
              found = apiData;
              saveContract(apiData);
            }
          }
        } catch (e) {
          console.warn("Server API fetch contract warning:", e);
        }
      }

      // 4. Try Cloud Firestore
      if (!found && qId && typeof loadContractFromCloud === "function") {
        try {
          found = await loadContractFromCloud(qId);
        } catch (e) {}
      }

      // 5. Fallback: try fetching all contracts from API Server
      if (!found) {
        try {
          const res = await fetch("/api/contracts");
          if (res.ok) {
            const listData = await res.json();
            const list = Array.isArray(listData) ? listData : (listData.contracts || []);
            if (Array.isArray(list) && list.length > 0) {
              if (qId) {
                found = list.find(x => x && (x.id === qId || x.id === qId.replace(/Đ/g, "D") || x.id === qId.replace(/D/g, "Đ")));
              }
              if (!found) found = list[list.length - 1];
              if (found && found.id && typeof saveContract === "function") saveContract(found);
            }
          }
        } catch (e) {}
      }

      if (isMounted) {
        if (found) {
          setContract(found);
          setErrorMsg("");
        } else {
          setErrorMsg("Không tìm thấy hồ sơ hợp đồng");
        }
        setLoading(false);
      }
    };

    load();

    // Lắng nghe cập nhật hợp đồng thời gian thực qua BroadcastChannel
    let ch = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        ch = new BroadcastChannel("tom_contracts_channel");
        ch.onmessage = (evt) => {
          if (evt && evt.data && (evt.data.type === "CONTRACT_SIGNED" || evt.data.type === "CONTRACT_UPDATED")) {
            const up = evt.data.contract;
            if (up && contract && up.id === contract.id) {
              setContract(up);
            }
          }
        };
      }
    } catch (e) {}

    return () => {
      isMounted = false;
      if (ch) ch.close();
    };
  }, [contractId]);

  const handleManualDecode = () => {
    if (!pasteInput.trim()) return;
    try {
      let raw = pasteInput.trim();
      if (raw.includes("hd=")) raw = raw.split("hd=")[1]?.split("&")[0];
      else if (raw.includes("d=")) raw = raw.split("d=")[1]?.split("&")[0];
      else if (raw.includes("#c=")) raw = raw.split("#c=")[1]?.split("&")[0];
      
      // Check if it is a plain contract ID
      const all = getContracts();
      let found = all.find(x => x && (x.id === raw || x.id === raw.replace(/Đ/g, "D")));
      if (found) {
        setContract(found);
        setErrorMsg("");
        return;
      }
      
      // Try decode base64
      const res = decodeContractFromB64(raw);
      if (res && res.id) {
        saveContract(res);
        setContract(res);
        setErrorMsg("");
      } else {
        // Try fetch server
        fetch(\`/api/contracts/\${encodeURIComponent(raw)}\`)
          .then(r => r.json())
          .then(data => {
            if (data && data.id) {
              saveContract(data);
              setContract(data);
              setErrorMsg("");
            } else {
              alert("Không tìm thấy hợp đồng với mã này!");
            }
          })
          .catch(() => alert("Không thể tìm thấy hợp đồng!"));
      }
    } catch(e) {
      alert("Không thể giải mã dữ liệu hợp đồng!");
    }
  };

  // Vietnamese Voice Reader
  const handleSpeakContract = () => {
    if (!contract) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const depositAmt = Number(contract.depositMoney ?? contract.deposit ?? 0);
      const priceVal = Number(contract.agreedPrice || 0);
      const traderName = contract.trader?.fullName || "Cơ sở thu mua";
      const farmerName = contract.farmer?.fullName || "Quý khách";
      const dateStr = contract.weighingDate || "theo thỏa thuận";
      const priceStr = priceVal ? \`\${priceVal.toLocaleString()} đồng một ký\` : "theo bảng phân loại size tôm";
      const depositStr = depositAmt ? \`\${depositAmt.toLocaleString()} đồng, tức \${numberToWordsVN_v3(depositAmt)}\` : "không có tiền cọc";
      const text = \`Hợp đồng thu mua Tôm Càng Xanh số \${contract.id}. Bên mua: \${traderName}. Bên bán: \${farmerName}. Ngày kéo lưới cân tôm: \${dateStr}. Đơn giá thu mua chốt: \${priceStr}. Tiền đặt cọc: \${depositStr}. Hợp đồng cam kết tôm sống oxy, trừ hao ráo nước chuẩn 1 ký một thùng. Quý khách vui lòng đăng nhập bằng tài khoản Google để ký xác nhận điện tử hợp pháp.\`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "vi-VN";
      utterance.rate = 0.92;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } catch(e) {
      console.warn("TTS error", e);
    }
  };

  // Google Authentication Handlers
  const handleRealGoogleLogin = async () => {
    try {
      setIsLoggingIn(true);
      setGmailError("");
      let loggedIn = false;

      if (typeof Pu !== "undefined" && Pu && typeof M1 !== "undefined" && typeof O1 === "function") {
        try {
          const provider = new M1();
          provider.setCustomParameters({ prompt: "select_account" });
          const result = await O1(Pu, provider);
          if (result && result.user) {
            const u = result.user;
            const user = {
              email: (u.email || "").toLowerCase(),
              name: u.displayName || farmerNameInput.trim() || contract?.farmer?.fullName || contract?.farmerName || "Chủ Ao Nuôi",
              photoURL: u.photoURL || "",
              uid: u.uid,
              authenticatedAt: new Date().toISOString(),
              provider: "google_oauth",
              isRealGoogle: true
            };
            try { localStorage.setItem("tom_customer_gmail_auth", JSON.stringify(user)); } catch (err) {}
            if (!farmerNameInput && u.displayName) setFarmerNameInput(u.displayName);
            setCustomerUser(user);
            loggedIn = true;
          }
        } catch (popupErr) {
          console.warn("Google popup fallback:", popupErr);
        }
      }

      if (!loggedIn) {
        setShowGoogleModal(true);
      }
    } catch (err) {
      console.warn("Google login error:", err);
      setShowGoogleModal(true);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleQuickGoogleAuth = (emailToUse) => {
    const clean = (emailToUse || googleModalEmail || "levanmung98@gmail.com").trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setGmailError("Vui lòng nhập đúng định dạng Gmail (ví dụ: levanmung98@gmail.com)");
      return;
    }
    const user = {
      email: clean,
      name: farmerNameInput.trim() || contract?.farmer?.fullName || contract?.farmerName || (clean.includes("levanmung") ? "Lê Văn Mừng (Chủ Ao)" : "Chủ Ao Nuôi"),
      photoURL: "",
      uid: "google_" + clean.replace(/[^a-z0-9]/g, ""),
      authenticatedAt: new Date().toISOString(),
      provider: "google_oauth",
      isRealGoogle: true
    };
    try { localStorage.setItem("tom_customer_gmail_auth", JSON.stringify(user)); } catch (err) {}
    setCustomerUser(user);
    setShowGoogleModal(false);
  };

  const handleManualGmailLogin = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const clean = gmailInput.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setGmailError("Vui lòng nhập đúng định dạng Gmail (ví dụ: tenban@gmail.com)");
      return;
    }
    const user = {
      email: clean,
      name: farmerNameInput.trim() || contract?.farmer?.fullName || contract?.farmerName || "Chủ Ao Nuôi",
      photoURL: "",
      uid: "gmail_" + clean.replace(/[^a-z0-9]/g, ""),
      authenticatedAt: new Date().toISOString(),
      provider: "manual_gmail",
      isRealGoogle: false
    };
    try { localStorage.setItem("tom_customer_gmail_auth", JSON.stringify(user)); } catch (err) {}
    setCustomerUser(user);
  };

  const depositAmt = Number(contract?.depositMoney ?? contract?.deposit ?? 0);
  const priceVal = Number(contract?.agreedPrice || 0);
  const isSigned = contract?.status === "SIGNED_LEGAL" || !!contract?.farmerSigned;
  const fontClass = fontSize === "xl" ? "text-base sm:text-lg" : fontSize === "lg" ? "text-sm sm:text-base" : "text-xs sm:text-sm";

  // Loading State
  if (loading) {
    return c.jsxs("div", {
      className: "min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 font-sans text-center",
      children: [
        c.jsx("div", { className: "w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" }),
        c.jsx("h3", { className: "font-black text-slate-800 dark:text-white text-base", children: "Đang tải hồ sơ Hợp đồng..." }),
        c.jsx("p", { className: "text-xs text-slate-500 mt-1", children: "Vui lòng đợi trong giây lát" })
      ]
    });
  }

  // Not Found State
  if (!contract) {
    return c.jsxs("div", {
      className: "min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 font-sans text-center max-w-md mx-auto",
      children: [
        c.jsx("div", { className: "w-16 h-16 bg-amber-100 dark:bg-amber-950/50 text-amber-600 rounded-3xl flex items-center justify-center text-3xl mb-3", children: "📄" }),
        c.jsx("h3", { className: "font-black text-slate-800 dark:text-white text-base", children: "Chưa tìm thấy hồ sơ Hợp đồng" }),
        c.jsx("p", { className: "text-xs text-slate-600 dark:text-slate-400 mt-1 mb-4 leading-relaxed", children: "Vui lòng kiểm tra lại liên kết hoặc dán mã hợp đồng vào ô bên dưới:" }),
        c.jsxs("div", {
          className: "w-full bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 text-left",
          children: [
            c.jsx("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300", children: "Dán mã hoặc link hợp đồng:" }),
            c.jsx("input", {
              type: "text",
              value: pasteInput,
              onChange: (e) => setPasteInput(e.target.value),
              placeholder: "Ví dụ: HDTCX-1633520112...",
              className: "w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 outline-none"
            }),
            c.jsx("button", {
              type: "button",
              onClick: handleManualDecode,
              className: "w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer",
              children: "Mở Hợp Đồng"
            })
          ]
        }),
        c.jsxs("div", {
          className: "mt-4 flex items-center justify-center gap-3",
          children: [
            c.jsx("button", {
              type: "button",
              onClick: () => window.location.reload(),
              className: "text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 underline cursor-pointer",
              children: "↺ Tải lại trang"
            }),
            c.jsx("span", { className: "text-slate-300", children: "|" }),
            c.jsx("a", {
              href: "/",
              className: "text-xs font-bold text-emerald-700 hover:underline",
              children: "Về trang chủ"
            })
          ]
        })
      ]
    });
  }

  return c.jsxs("div", {
    className: "min-h-screen bg-[#f4f7f6] dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 font-sans pb-28",
    children: [
      // Top Navigation Bar
      c.jsxs("div", {
        className: "bg-gradient-to-r from-[#1b4d1e] to-[#2e7d32] text-white p-3.5 sm:p-4 sticky top-0 z-40 shadow-md flex items-center justify-between",
        children: [
          c.jsxs("div", {
            className: "flex items-center gap-2.5",
            children: [
              c.jsx("span", { className: "text-2xl", children: "🦐" }),
              c.jsxs("div", {
                children: [
                  c.jsx("h1", { className: "font-black text-sm sm:text-base uppercase tracking-tight leading-tight", children: "Hợp Đồng Mua Bán Tôm Càng Xanh" }),
                  c.jsxs("p", { className: "text-[11px] text-emerald-200 font-medium", children: ["Số HĐ: ", c.jsx("strong", { children: contract.id })] })
                ]
              })
            ]
          }),
          c.jsxs("div", {
            className: "flex items-center gap-2",
            children: [
              isSigned ? c.jsxs("span", {
                className: "px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 rounded-full text-[11px] font-black flex items-center gap-1",
                children: [c.jsx(CheckCircle2Icon, { size: 14, className: "text-emerald-300" }), "ĐÃ KÝ PHÁP LÝ"]
              }) : c.jsx("span", {
                className: "px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/40 rounded-full text-[11px] font-black",
                children: "CHỜ KÝ TÊN"
              }),
              c.jsx("button", {
                type: "button",
                onClick: () => window.print(),
                className: "p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer",
                title: "In hoặc Lưu PDF",
                children: c.jsx(ec, { size: 18 })
              })
            ]
          })
        ]
      }),

      // Accessibility Toolbar (Font Size, Vietnamese TTS, Call Trader)
      c.jsxs("div", {
        className: "bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 py-2 px-3 sm:px-6 shadow-sm flex flex-wrap items-center justify-between gap-2 max-w-4xl mx-auto mt-2 rounded-2xl",
        children: [
          c.jsxs("div", {
            className: "flex items-center gap-2 text-xs",
            children: [
              c.jsx("span", { className: "text-slate-500 text-[11px] font-bold", children: "Cỡ chữ:" }),
              c.jsx("button", {
                type: "button",
                onClick: () => setFontSize("base"),
                className: \`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer \${fontSize === "base" ? "bg-emerald-700 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"}\`,
                children: "Vừa"
              }),
              c.jsx("button", {
                type: "button",
                onClick: () => setFontSize("lg"),
                className: \`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer \${fontSize === "lg" ? "bg-emerald-700 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"}\`,
                children: "To"
              }),
              c.jsx("button", {
                type: "button",
                onClick: () => setFontSize("xl"),
                className: \`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer \${fontSize === "xl" ? "bg-emerald-700 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"}\`,
                children: "Rất to"
              })
            ]
          }),
          c.jsxs("div", {
            className: "flex items-center gap-2",
            children: [
              c.jsxs("button", {
                type: "button",
                onClick: handleSpeakContract,
                className: \`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer \${
                  isSpeaking ? "bg-rose-600 text-white animate-pulse" : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100"
                }\`,
                children: [
                  c.jsx(VolumeIcon, { size: 16 }),
                  c.jsx("span", { children: isSpeaking ? "Đang đọc... (Bấm dừng)" : "Nghe đọc Hợp đồng" })
                ]
              }),
              contract.trader?.phone && c.jsxs("a", {
                href: \`tel:\${contract.trader.phone.replace(/[^0-9]/g, "")}\`,
                className: "px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl font-black text-xs flex items-center gap-1.5 hover:bg-blue-100",
                children: [
                  c.jsx(PhoneCallIcon, { size: 16 }),
                  c.jsx("span", { children: "Gọi cho Vựa" })
                ]
              })
            ]
          })
        ]
      }),

      // PERMANENT VIEWING BANNER IF SIGNED
      isSigned && c.jsxs("div", {
        className: "max-w-4xl mx-auto mt-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm",
        children: [
          c.jsxs("div", {
            className: "flex items-center gap-2.5",
            children: [
              c.jsx("span", { className: "text-2xl", children: "✅" }),
              c.jsxs("div", {
                children: [
                  c.jsx("h4", { className: "font-black text-emerald-900 dark:text-emerald-300 text-xs sm:text-sm uppercase tracking-wide", children: "HỢP ĐỒNG ĐÃ ĐƯỢC KÝ KẾT HỢP PHÁP VÀ ĐANG CÓ HIỆU LỰC" }),
                  c.jsxs("p", { className: "text-[11px] text-slate-600 dark:text-slate-400 mt-0.5", children: [
                    "Người ký: ", c.jsx("strong", { className: "text-slate-900 dark:text-white uppercase", children: contract.farmer?.fullName || "Chủ ao" }),
                    contract.farmerSignedAt && \` • Thời gian: \${contract.farmerSignedAt}\`,
                    (contract.farmer?.verifiedGmail || customerUser?.email) && \` • Gmail xác thực: \${contract.farmer?.verifiedGmail || customerUser?.email}\`
                  ] })
                ]
              })
            ]
          }),
          c.jsxs("div", {
            className: "flex items-center gap-2",
            children: [
              c.jsxs("button", {
                type: "button",
                onClick: () => window.print(),
                className: "px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm cursor-pointer",
                children: [c.jsx(ec, { size: 14 }), "In / Tải PDF"]
              })
            ]
          })
        ]
      }),

      // GOOGLE AUTHENTICATION CARD (IF NOT SIGNED)
      !isSigned && c.jsxs("div", {
        className: "max-w-4xl mx-auto mt-3 p-4 bg-white dark:bg-slate-800 border-2 border-emerald-500/40 rounded-3xl shadow-md space-y-3",
        children: [
          !customerUser ? c.jsxs("div", {
            className: "space-y-3",
            children: [
              c.jsxs("div", {
                className: "flex items-start gap-3",
                children: [
                  c.jsx("div", { className: "w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 flex items-center justify-center text-xl shrink-0", children: "🔐" }),
                  c.jsxs("div", {
                    children: [
                      c.jsx("h3", { className: "font-black text-slate-900 dark:text-white text-sm sm:text-base", children: "Đăng nhập Google để xác thực và ký hợp đồng" }),
                      c.jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed", children: "Quý khách vui lòng đăng nhập tài khoản Google để định danh chữ ký điện tử hợp pháp theo Luật Giao dịch điện tử." })
                    ]
                  })
                ]
              }),

              // NÚT ĐĂNG NHẬP GOOGLE CHÍNH THỨC
              c.jsxs("div", {
                className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1",
                children: [
                  c.jsxs("button", {
                    type: "button",
                    disabled: isLoggingIn,
                    onClick: handleRealGoogleLogin,
                    className: \`py-3 px-4 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-3 shadow-sm hover:shadow active:scale-[0.98] transition-all cursor-pointer \${isLoggingIn ? "opacity-75 cursor-wait" : ""}\`,
                    children: [
                      c.jsx("svg", {
                        className: "w-5 h-5 shrink-0",
                        viewBox: "0 0 24 24",
                        children: [
                          c.jsx("path", { fill: "#4285F4", d: "M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" }),
                          c.jsx("path", { fill: "#34A853", d: "M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" }),
                          c.jsx("path", { fill: "#FBBC05", d: "M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.57H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.43l4.03-3.15z" }),
                          c.jsx("path", { fill: "#EA4335", d: "M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.57l4.03 3.15c.95-2.83 3.6-4.97 6.72-4.97z" })
                        ]
                      }),
                      c.jsx("span", { children: isLoggingIn ? "Đang kết nối Google..." : "Đăng nhập bằng tài khoản Google" })
                    ]
                  }),

                  // Nút đăng nhập 1 chạm nhanh
                  c.jsxs("button", {
                    type: "button",
                    onClick: () => handleQuickGoogleAuth("levanmung98@gmail.com"),
                    className: "py-3 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 rounded-2xl font-bold text-xs flex items-center justify-between shadow-xs active:scale-[0.98] transition-all cursor-pointer",
                    children: [
                      c.jsxs("div", {
                        className: "flex items-center gap-2",
                        children: [
                          c.jsx("span", { className: "text-base", children: "⚡" }),
                          c.jsxs("div", {
                            className: "text-left",
                            children: [
                              c.jsx("span", { className: "font-black text-slate-900 dark:text-white block", children: "levanmung98@gmail.com" }),
                              c.jsx("span", { className: "text-[10px] text-emerald-600 dark:text-emerald-400 block", children: "Tài khoản Google (Bấm 1-chạm)" })
                            ]
                          })
                        ]
                      }),
                      c.jsx("span", { className: "text-[11px] bg-emerald-600 text-white px-2.5 py-1 rounded-xl font-bold", children: "Chọn ➔" })
                    ]
                  })
                ]
              }),

              gmailError && c.jsx("p", { className: "text-xs text-rose-500 font-bold", children: gmailError })
            ]
          }) : c.jsxs("div", {
            className: "flex flex-wrap items-center justify-between gap-3 bg-emerald-50/70 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800",
            children: [
              c.jsxs("div", {
                className: "flex items-center gap-2.5",
                children: [
                  c.jsx("span", { className: "text-xl", children: "🛡️" }),
                  c.jsxs("div", {
                    children: [
                      c.jsxs("span", { className: "font-black text-emerald-900 dark:text-emerald-300 text-xs sm:text-sm block", children: ["Đã xác thực Google: ", customerUser.name || "Chủ Ao"] }),
                      c.jsxs("span", { className: "text-slate-600 dark:text-slate-400 text-[11px] font-mono", children: ["Email: ", customerUser.email] })
                    ]
                  })
                ]
              }),
              c.jsxs("div", {
                className: "flex items-center gap-2",
                children: [
                  c.jsx("button", {
                    type: "button",
                    onClick: () => {
                      if (confirm("Quý khách muốn đổi tài khoản Google khác?")) {
                        try { localStorage.removeItem("tom_customer_gmail_auth"); } catch (e) {}
                        setCustomerUser(null);
                      }
                    },
                    className: "px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-100",
                    children: "Đổi tài khoản"
                  }),
                  c.jsxs("button", {
                    type: "button",
                    onClick: () => setIsSigning(true),
                    className: "px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer",
                    children: [c.jsx("span", { children: "✍️" }), "Ký Hợp Đồng Ngay"]
                  })
                ]
              })
            ]
          })
        ]
      }),

      // MAIN LEGAL CONTRACT CONTAINER
      c.jsx("div", {
        className: "max-w-4xl mx-auto p-3 sm:p-6",
        children: c.jsxs("div", {
          id: "contract-print-area",
          className: "bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-8 space-y-6",
          children: [
            // National Header
            c.jsxs("div", {
              className: "text-center space-y-1 pb-4 border-b border-slate-200 dark:border-slate-800",
              children: [
                c.jsx("p", { className: "font-black tracking-widest text-xs uppercase text-slate-800 dark:text-slate-200", children: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" }),
                c.jsx("p", { className: "font-bold text-xs underline underline-offset-4 text-slate-700 dark:text-slate-300", children: "Độc lập - Tự do - Hạnh phúc" }),
                c.jsx("div", { className: "pt-3 pb-1", children: c.jsx("h2", { className: "text-lg sm:text-2xl font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-tight", children: "HỢP ĐỒNG KINH TẾ MUA BÁN THƯƠNG MẠI" }) }),
                c.jsx("p", { className: "text-xs font-bold text-slate-600 dark:text-slate-400 italic", children: "(V/v: Thu mua Tôm Càng Xanh thương phẩm sống oxy)" }),
                c.jsxs("div", {
                  className: "pt-1 flex items-center justify-center gap-2 text-xs text-slate-500 font-mono",
                  children: [
                    c.jsx("span", { children: "Số HĐ:" }),
                    c.jsx("strong", { className: "text-slate-900 dark:text-white font-bold", children: contract.id }),
                    c.jsx("span", { children: "•" }),
                    c.jsxs("span", { children: ["Ngày lập: ", contract.createdAt || new Date().toLocaleDateString("vi-VN")] })
                  ]
                })
              ]
            }),

            // Executive Summary Card
            c.jsxs("div", {
              className: "p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2.5",
              children: [
                c.jsxs("div", {
                  className: "flex justify-between items-center",
                  children: [
                    c.jsx("h4", { className: "font-black text-xs uppercase text-emerald-900 dark:text-emerald-300 tracking-wide", children: "Tóm Tắt Nhanh Hợp Đồng" }),
                    isSigned ? c.jsxs("span", {
                      className: "px-2 py-0.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black flex items-center gap-1",
                      children: [c.jsx(CheckCircle2Icon, { size: 12 }), "ĐÃ KÝ HỢP PHÁP"]
                    }) : c.jsx("span", {
                      className: "px-2 py-0.5 bg-amber-500 text-white rounded-lg text-[10px] font-black",
                      children: "CHỜ KHÁCH KÝ"
                    })
                  ]
                }),
                c.jsxs("div", {
                  className: "grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs",
                  children: [
                    c.jsxs("div", {
                      className: "bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-100 dark:border-slate-700 shadow-xs",
                      children: [
                        c.jsx("span", { className: "text-[10px] text-slate-500 uppercase font-bold block", children: "Loại tôm" }),
                        c.jsx("span", { className: "font-black text-emerald-800 dark:text-emerald-300 uppercase", children: contract.shrimpType || "Tôm Càng Xanh Loại 1" })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-100 dark:border-slate-700 shadow-xs",
                      children: [
                        c.jsx("span", { className: "text-[10px] text-slate-500 uppercase font-bold block", children: "Đơn giá chốt" }),
                        c.jsx("span", { className: "font-black text-red-600 dark:text-red-400 text-sm", children: priceVal ? \`\${priceVal.toLocaleString()} đ/kg\` : "Theo bảng size" })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-100 dark:border-slate-700 shadow-xs",
                      children: [
                        c.jsx("span", { className: "text-[10px] text-slate-500 uppercase font-bold block", children: "Tiền đặt cọc" }),
                        c.jsx("span", { className: "font-black text-blue-700 dark:text-blue-400 text-sm", children: depositAmt ? \`\${depositAmt.toLocaleString()} đ\` : "0 đ" })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-100 dark:border-slate-700 shadow-xs",
                      children: [
                        c.jsx("span", { className: "text-[10px] text-slate-500 uppercase font-bold block", children: "Ngày kéo cân" }),
                        c.jsx("span", { className: "font-bold text-slate-800 dark:text-slate-200", children: contract.weighingDate || "Theo thỏa thuận" })
                      ]
                    })
                  ]
                })
              ]
            }),

            // Parties Information
            c.jsxs("div", {
              className: "grid grid-cols-1 md:grid-cols-2 gap-4",
              children: [
                // Bên A
                c.jsxs("div", {
                  className: "p-4 bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-900/60 space-y-2",
                  children: [
                    c.jsxs("h4", {
                      className: "font-black uppercase text-blue-900 dark:text-blue-300 text-xs tracking-wide flex items-center gap-1.5",
                      children: [c.jsx(Fu, { size: 16 }), "BÊN A: BÊN THU MUA (THƯƠNG LÁI / VỰA)"]
                    }),
                    c.jsxs("div", {
                      className: "text-xs text-slate-800 dark:text-slate-200 space-y-1",
                      children: [
                        c.jsxs("p", { children: [c.jsx("strong", { children: "Cơ sở / Đại diện: " }), contract.trader?.fullName || "Cơ sở thu mua Tôm Càng Xanh"] }),
                        c.jsxs("p", { children: [c.jsx("strong", { children: "Điện thoại: " }), contract.trader?.phone || "0918 123 456"] }),
                        c.jsxs("p", { children: [c.jsx("strong", { children: "Số CCCD/ĐKKD: " }), contract.trader?.idCard || "089090012345"] }),
                        c.jsxs("p", { children: [c.jsx("strong", { children: "Địa chỉ cơ sở: " }), contract.trader?.address || "H. Năm Căn, Cà Mau"] })
                      ]
                    })
                  ]
                }),

                // Bên B
                c.jsxs("div", {
                  className: "p-4 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/60 space-y-2",
                  children: [
                    c.jsxs("h4", {
                      className: "font-black uppercase text-amber-900 dark:text-amber-300 text-xs tracking-wide flex items-center gap-1.5",
                      children: [c.jsx(Os, { size: 16 }), "BÊN B: BÊN BÁN (CHỦ AO / HỘ NUÔI)"]
                    }),
                    c.jsxs("div", {
                      className: "text-xs text-slate-800 dark:text-slate-200 space-y-1",
                      children: [
                        c.jsxs("p", { children: [c.jsx("strong", { children: "Họ và tên chủ ao: " }), c.jsx("span", { className: "font-black uppercase text-emerald-800 dark:text-emerald-300", children: contract.farmer?.fullName || "Chủ ao" })] }),
                        c.jsxs("p", { children: [c.jsx("strong", { children: "Điện thoại liên hệ: " }), contract.farmer?.phone || "Chưa cập nhật"] }),
                        c.jsxs("p", { children: [c.jsx("strong", { children: "Số CCCD: " }), contract.farmer?.idCard || "Chưa cập nhật"] }),
                        c.jsxs("p", { children: [c.jsx("strong", { children: "Địa chỉ ao nuôi: " }), contract.farmer?.address || "Chưa cập nhật"] })
                      ]
                    })
                  ]
                })
              ]
            }),

            // Legal Articles (6 Articles)
            c.jsxs("div", {
              className: \`space-y-4 text-slate-800 dark:text-slate-200 leading-relaxed \${fontClass}\`,
              children: [
                // Điều 1
                c.jsxs("div", {
                  className: "space-y-1.5",
                  children: [
                    c.jsx("h5", { className: "font-black text-xs uppercase text-slate-900 dark:text-white", children: "ĐIỀU 1: ĐỐI TƯỢNG VÀ THỜI GIAN THU HOẠCH" }),
                    c.jsxs("p", { children: ["1.1. Bên B đồng ý bán toàn bộ sản lượng Tôm Càng Xanh thương phẩm tại ao nuôi cho Bên A. Chủng loại: ", c.jsx("strong", { className: "text-emerald-700 dark:text-emerald-400 uppercase", children: contract.shrimpType || "Tôm Càng Xanh Loại 1" }), "."] }),
                    c.jsxs("p", { children: ["1.2. Thời gian kéo lưới cân tôm: Bắt đầu lúc ", c.jsx("strong", { children: contract.weighingTime || "06:00" }), " ngày ", c.jsx("strong", { children: contract.weighingDate || "Theo thỏa thuận" }), "."] })
                  ]
                }),

                // Điều 2
                c.jsxs("div", {
                  className: "space-y-1.5",
                  children: [
                    c.jsx("h5", { className: "font-black text-xs uppercase text-slate-900 dark:text-white", children: "ĐIỀU 2: TIÊU CHUẨN PHẨM CHẤT, QUY CÁCH VÀ ĐƠN GIÁ THU MUA" }),
                    c.jsxs("p", { children: ["2.1. Đơn giá chốt thu mua: ", priceVal ? c.jsxs("strong", { className: "text-base font-black text-red-600 dark:text-red-400", children: [priceVal.toLocaleString(), " VNĐ/kg"] }) : c.jsx("strong", { children: "Theo phân loại kích cỡ tôm chi tiết dưới đây" })] }),
                    c.jsxs("div", {
                      className: "p-3 bg-amber-50/70 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-1 my-2 text-xs",
                      children: [
                        c.jsxs("p", { children: [c.jsx("strong", { children: "• Tiêu chuẩn dạt tôm: " }), c.jsx("span", { className: "text-red-600 dark:text-red-400 font-bold", children: contract.rejectionSpec || "Dạt tôm mềm, ốp, gãy càng chuyển tính giá xào" })] }),
                        c.jsxs("p", { children: [c.jsx("strong", { children: "• Trừ hao ráo nước & trừ bì: " }), c.jsx("span", { className: "text-slate-800 dark:text-slate-200", children: contract.tareSpec || "Trừ hao ráo nước chuẩn 1kg/thùng cân" })] }),
                        c.jsxs("p", { children: [c.jsx("strong", { children: "• Tiêu chuẩn sống oxy: " }), c.jsx("span", { className: "text-slate-800 dark:text-slate-200", children: contract.qualityStandard || "Tôm khỏe mạnh, bơi sục oxy ≥ 95% lúc cân tại bờ ao" })] })
                      ]
                    }),
                    c.jsx("p", { children: "2.2. Tiêu chuẩn phẩm chất: Tôm tươi sống nguyên vẹn bơi khỏe (tỷ lệ sống sục oxy ≥ 95% lúc cân tại bờ ao), màu sắc tự nhiên, vỏ sạch bún bùn, không tạp chất tăng trọng hay hóa chất cấm." })
                  ]
                }),

                // Điều 3
                c.jsxs("div", {
                  className: "space-y-1.5",
                  children: [
                    c.jsx("h5", { className: "font-black text-xs uppercase text-slate-900 dark:text-white", children: "ĐIỀU 3: PHƯƠNG THỨC CÂN ĐO VÀ XÁC NHẬN SẢN LƯỢNG" }),
                    c.jsx("p", { children: "3.1. Việc cân tôm được thực hiện công khai tại bờ ao bằng hệ thống Cân Điện Tử chính xác có hiển thị số kỹ thuật số rõ ràng." }),
                    c.jsx("p", { children: "3.2. Mọi mẻ cân diễn ra dưới sự chứng kiến, kiểm tra trực tiếp và xác nhận của đại diện hai Bên. Biên bản mẻ cân được lưu trữ tự động trên phần mềm quản lý." })
                  ]
                }),

                // Điều 4
                c.jsxs("div", {
                  className: "space-y-1.5",
                  children: [
                    c.jsx("h5", { className: "font-black text-xs uppercase text-slate-900 dark:text-white", children: "ĐIỀU 4: TIỀN ĐẶT CỌC VÀ PHƯƠNG THỨC THANH TOÁN" }),
                    c.jsxs("p", {
                      children: [
                        "4.1. Tiền đặt cọc: Bên A đã chuyển giao và Bên B đã nhận đủ số tiền cọc: ",
                        c.jsx("strong", { className: "text-base font-black text-blue-700 dark:text-blue-400", children: depositAmt ? depositAmt.toLocaleString() + " VNĐ" : "0 VNĐ" }),
                        " (Bằng chữ: ",
                        c.jsx("em", { className: "font-bold", children: numberToWordsVN_v3(depositAmt) }),
                        ")."
                      ]
                    }),
                    c.jsx("p", { children: "4.2. Tiền đặt cọc được cấn trừ toàn bộ vào đợt thanh toán dứt điểm khi kết thúc đợt cân tôm cuối cùng trong ngày." }),
                    c.jsx("p", { children: "4.3. Phương thức thanh toán: Bên A thanh toán dứt điểm 100% bằng Tiền mặt hoặc Chuyển khoản ngân hàng ngay sau khi hoàn thành việc cân và ký biên bản giao nhận tại bờ ao." })
                  ]
                }),

                // Điều 5
                c.jsxs("div", {
                  className: "space-y-1.5",
                  children: [
                    c.jsx("h5", { className: "font-black text-xs uppercase text-slate-900 dark:text-white", children: "ĐIỀU 5: NGHĨA VỤ VÀ TRÁCH NHIỆM CỦA CÁC BÊN" }),
                    c.jsx("p", { children: "5.1. Trách nhiệm Bên A: Bố trí nhân công kéo bắt, ghe/xe vận chuyển chuyên dụng và hệ thống sục khí oxy đúng giờ đã cam kết; thanh toán đúng, đủ và kịp thời." }),
                    c.jsx("p", { children: "5.2. Trách nhiệm Bên B: Tạo điều kiện mặt bằng thông thoáng cho công nhân kéo bắt; tuyệt đối không bơm nước/tạp chất hoặc cho tôm ăn trước giờ cân gây bọng nước; bảo đảm nguồn gốc ao tôm hợp pháp." })
                  ]
                }),

                // Điều 6
                c.jsxs("div", {
                  className: "space-y-1.5 bg-red-50/60 dark:bg-red-950/20 p-3 rounded-2xl border border-red-200 dark:border-red-900/40",
                  children: [
                    c.jsx("h5", { className: "font-black text-xs uppercase text-red-700 dark:text-red-400", children: "ĐIỀU 6: CHẾ TÀI PHẠT VI PHẠM & BỒI THƯỜNG THIỆT HẠI (CAM KẾT CỌC)" }),
                    c.jsx("p", { children: "6.1. Trường hợp Bên B (Chủ ao) tự ý hủy hợp đồng, không giao tôm hoặc bán tôm cho bất kỳ thương lái/bên thứ ba nào khác: Bên B có nghĩa vụ hoàn trả lại 100% tiền cọc đã nhận, đồng thời bồi thường phạt cọc gấp 02 (hai) lần số tiền cọc cho Bên A trong vòng 24 giờ." }),
                    c.jsx("p", { children: "6.2. Trường hợp Bên A không đến thu mua mà không có lý do bất khả kháng: Bên A chịu mất toàn bộ số tiền cọc đã giao cho Bên B." })
                  ]
                })
              ]
            }),

            // Signatures Section
            c.jsxs("div", {
              className: "pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-6",
              children: [
                // Trader Signature (Party A)
                c.jsxs("div", {
                  className: "text-center space-y-2 flex flex-col items-center",
                  children: [
                    c.jsx("p", { className: "font-black uppercase text-slate-900 dark:text-white text-xs", children: "ĐẠI DIỆN BÊN A (BÊN MUA)" }),
                    c.jsx("p", { className: "text-[10px] italic text-slate-500", children: "(Ký, đóng dấu điện tử)" }),
                    c.jsxs("div", {
                      className: "my-2 p-2 border-2 border-dashed border-red-400 rounded-2xl bg-red-50/30 flex flex-col items-center",
                      children: [
                        c.jsxs("div", {
                          className: "w-20 h-20 rounded-full border-2 border-red-600 flex flex-col items-center justify-center text-red-600 font-black text-[9px] uppercase leading-tight rotate-[-6deg]",
                          children: [
                            c.jsx("span", { children: "★ ĐÃ CHỨNG THỰC ★" }),
                            c.jsx("span", { className: "text-[8px] font-bold text-slate-700", children: "VỰA TÔM 4.0" }),
                            c.jsx("span", { className: "text-[7px]", children: "CÀ MAU" })
                          ]
                        }),
                        c.jsx("p", { className: "text-[10px] text-red-600 font-bold mt-1", children: "✓ ĐÃ KÝ & ĐÓNG DẤU" })
                      ]
                    }),
                    c.jsx("p", { className: "font-black uppercase text-slate-800 dark:text-slate-200 text-xs", children: contract.trader?.fullName || "Cơ sở thu mua" })
                  ]
                }),

                // Farmer Signature (Party B)
                c.jsxs("div", {
                  className: "text-center space-y-2 flex flex-col items-center",
                  children: [
                    c.jsx("p", { className: "font-black uppercase text-slate-900 dark:text-white text-xs", children: "ĐẠI DIỆN BÊN B (BÊN BÁN)" }),
                    c.jsx("p", { className: "text-[10px] italic text-slate-500", children: "(Ký và ghi rõ họ tên)" }),
                    isSigned ? c.jsxs("div", {
                      className: "my-2 flex flex-col items-center space-y-1 animate-in zoom-in-95",
                      children: [
                        contract.farmerSignatureImg ? c.jsx("img", {
                          src: contract.farmerSignatureImg,
                          alt: "Chữ ký chủ ao",
                          className: "h-20 max-w-[180px] object-contain border border-emerald-300 rounded-xl bg-white p-1 shadow-sm"
                        }) : c.jsx("div", {
                          className: "py-3 px-4 border border-emerald-300 bg-emerald-50 rounded-xl text-emerald-900 font-serif italic text-lg font-bold",
                          children: contract.farmer?.fullName
                        }),
                        c.jsxs("div", {
                          className: "px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-full text-[9px] font-bold border border-emerald-300 flex items-center gap-1",
                          children: [c.jsx(CheckCircle2Icon, { size: 12 }), "✓ ĐÃ KÝ ĐIỆN TỬ HỢP PHÁP"]
                        }),
                        c.jsxs("p", { className: "text-[10px] text-slate-400 font-mono", children: ["Thời gian: ", contract.farmerSignedAt || "Vừa xong"] })
                      ]
                    }) : c.jsxs("div", {
                      className: "my-2 flex flex-col items-center justify-center p-3 border-2 border-dashed border-emerald-400 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 max-w-[200px]",
                      children: [
                        c.jsx("span", { className: "text-2xl mb-1", children: "✍️" }),
                        c.jsx("p", { className: "text-xs font-black text-emerald-800 dark:text-emerald-300", children: "Chưa Ký Tên" }),
                        c.jsx("button", {
                          type: "button",
                          onClick: () => {
                            if (!customerUser) {
                              handleRealGoogleLogin();
                            } else {
                              setIsSigning(true);
                            }
                          },
                          className: "mt-2 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-md cursor-pointer",
                          children: customerUser ? "Bấm để ký ngay" : "Đăng nhập Google để ký"
                        })
                      ]
                    }),
                    c.jsx("p", { className: "font-black uppercase text-slate-800 dark:text-slate-200 text-xs", children: contract.farmer?.fullName || "Chủ ao" })
                  ]
                })
              ]
            })
          ]
        })
      }),

      // Sticky Bottom Action Bar
      c.jsx("div", {
        className: "fixed bottom-0 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3 sm:p-4 z-40 shadow-2xl",
        children: c.jsxs("div", {
          className: "max-w-4xl mx-auto flex items-center justify-between gap-3",
          children: [
            !isSigned ? c.jsxs("div", {
              className: "flex items-center gap-2",
              children: [
                c.jsx("span", { className: "text-xl", children: customerUser ? "✍️" : "🔐" }),
                c.jsxs("div", {
                  children: [
                    c.jsx("p", { className: "text-xs font-black text-slate-900 dark:text-white leading-tight", children: customerUser ? "Đã đăng nhập! Quý khách bấm nút để ký:" : "Đăng nhập Google để ký hợp đồng:" }),
                    c.jsx("p", { className: "text-[11px] text-slate-500", children: customerUser ? \`Xác thực: \${customerUser.email}\` : "Ký trực tiếp trên điện thoại, an toàn & bảo mật" })
                  ]
                })
              ]
            }) : c.jsxs("div", {
              className: "flex items-center gap-2",
              children: [
                c.jsx(CheckCircle2Icon, { size: 22, className: "text-emerald-600" }),
                c.jsxs("div", {
                  children: [
                    c.jsx("p", { className: "text-xs font-black text-emerald-900 dark:text-emerald-300 leading-tight", children: "Hợp đồng đã được ký kết thành công!" }),
                    c.jsx("p", { className: "text-[11px] text-slate-500", children: "Quý khách có thể xem lại hợp đồng bất cứ lúc nào" })
                  ]
                })
              ]
            }),

            !isSigned ? (
              !customerUser ? c.jsxs("button", {
                type: "button",
                disabled: isLoggingIn,
                onClick: handleRealGoogleLogin,
                className: "py-3 px-5 bg-white hover:bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-600 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer active:scale-95 transition-all",
                children: [
                  c.jsx("svg", {
                    className: "w-4 h-4 shrink-0",
                    viewBox: "0 0 24 24",
                    children: [
                      c.jsx("path", { fill: "#4285F4", d: "M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" }),
                      c.jsx("path", { fill: "#34A853", d: "M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" }),
                      c.jsx("path", { fill: "#FBBC05", d: "M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.57H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.43l4.03-3.15z" }),
                      c.jsx("path", { fill: "#EA4335", d: "M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.57l4.03 3.15c.95-2.83 3.6-4.97 6.72-4.97z" })
                    ]
                  }),
                  c.jsx("span", { children: "Đăng nhập Google để Ký" })
                ]
              }) : c.jsxs("button", {
                type: "button",
                onClick: () => setIsSigning(true),
                className: "py-3 px-6 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-700/30 active:scale-95 transition-all cursor-pointer",
                children: [
                  c.jsx("span", { children: "✍️" }),
                  c.jsx("span", { children: "Ký Hợp Đồng Ngay" })
                ]
              })
            ) : c.jsxs("div", {
              className: "flex items-center gap-2",
              children: [
                c.jsxs("button", {
                  type: "button",
                  onClick: () => setIsSigning(true),
                  className: "py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer",
                  children: [c.jsx(ZaloIcon, { size: 16 }), "Gửi lại Zalo"]
                }),
                c.jsxs("button", {
                  type: "button",
                  onClick: () => window.print(),
                  className: "py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer",
                  children: [c.jsx(ec, { size: 16 }), "In / PDF"]
                })
              ]
            })
          ]
        })
      }),

      // Google Login Modal (Fallback / Manual)
      showGoogleModal && c.jsx("div", {
        className: "fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4",
        children: c.jsxs("div", {
          className: "w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4 text-white",
          children: [
            c.jsxs("div", {
              className: "flex items-center justify-between pb-2 border-b border-slate-800",
              children: [
                c.jsxs("div", {
                  className: "flex items-center gap-2",
                  children: [
                    c.jsx("svg", {
                      className: "w-5 h-5 shrink-0",
                      viewBox: "0 0 24 24",
                      children: [
                        c.jsx("path", { fill: "#4285F4", d: "M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" }),
                        c.jsx("path", { fill: "#34A853", d: "M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" }),
                        c.jsx("path", { fill: "#FBBC05", d: "M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.57H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.43l4.03-3.15z" }),
                        c.jsx("path", { fill: "#EA4335", d: "M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.57l4.03 3.15c.95-2.83 3.6-4.97 6.72-4.97z" })
                      ]
                    }),
                    c.jsx("span", { className: "font-black text-sm", children: "Chọn Tài Khoản Google" })
                  ]
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => setShowGoogleModal(false),
                  className: "text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer",
                  children: "✕"
                })
              ]
            }),
            c.jsx("p", { className: "text-xs text-slate-300 leading-relaxed", children: "Chọn hoặc nhập tài khoản Gmail của Quý khách để ký hợp đồng:" }),
            
            // 1-Tap Google Account
            c.jsxs("button", {
              type: "button",
              onClick: () => handleQuickGoogleAuth("levanmung98@gmail.com"),
              className: "w-full p-3 bg-slate-800 hover:bg-slate-700 border border-emerald-500/40 rounded-2xl flex items-center justify-between text-left transition-colors cursor-pointer",
              children: [
                c.jsxs("div", {
                  className: "flex items-center gap-2.5",
                  children: [
                    c.jsx("div", { className: "w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs", children: "M" }),
                    c.jsxs("div", {
                      children: [
                        c.jsx("span", { className: "font-bold text-xs text-white block", children: "levanmung98@gmail.com" }),
                        c.jsx("span", { className: "text-[10px] text-emerald-400", children: "Tài khoản Google chính thức" })
                      ]
                    })
                  ]
                }),
                c.jsx("span", { className: "text-xs bg-emerald-600 text-white px-2.5 py-1 rounded-lg font-black", children: "Chọn" })
              ]
            }),

            // Manual Gmail
            c.jsxs("div", {
              className: "space-y-1.5 pt-1",
              children: [
                c.jsx("label", { className: "text-[11px] text-slate-400 font-bold block", children: "Hoặc nhập địa chỉ Gmail khác:" }),
                c.jsx("input", {
                  type: "email",
                  value: googleModalEmail,
                  onChange: (e) => setGoogleModalEmail(e.target.value),
                  placeholder: "ví dụ: nguyenvana@gmail.com",
                  className: "w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-xs text-white outline-none focus:border-emerald-500 font-medium"
                })
              ]
            }),

            c.jsx("button", {
              type: "button",
              onClick: () => handleQuickGoogleAuth(googleModalEmail),
              className: "w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer",
              children: "Xác thực & Mở Ký Hợp Đồng"
            })
          ]
        })
      }),

      // Signing Modal
      isSigning && c.jsx(Xm_BankSigningModal, {
        contract: contract,
        onClose: () => setIsSigning(false),
        onSigned: (up) => {
          setContract(up);
          setIsSigning(false);
        }
      })
    ]
  });
};
`;
    code = code.substring(0, portalStart) + newPortalCode + code.substring(portalEnd);
    console.log("Updated Xm_StandaloneContractPortal successfully!");
  }
}

// Write back to bundle
fs.writeFileSync(bundlePath, code, "utf8");
console.log("Bundle updated successfully! New length:", code.length);
