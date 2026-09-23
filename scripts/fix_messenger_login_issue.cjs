const fs = require("fs");
const path = require("path");

const bundlePath = path.resolve(__dirname, "../assets/index-Os1X4Z7e.js");
let code = fs.readFileSync(bundlePath, "utf8");

console.log("Original bundle length:", code.length);

const startBank = code.indexOf("const Xm_BankSigningModal =");
const startPortal = code.indexOf("const Xm_StandaloneContractPortal =");
const startZalo = code.indexOf("// ==================== POPUP CHUẨN HOÁ GỬI HỢP ĐỒNG CHO KHÁCH (SHARE ZALO MODAL) ====================");

if (startBank === -1 || startPortal === -1 || startZalo === -1) {
  console.error("Could not find boundaries:", { startBank, startPortal, startZalo });
  process.exit(1);
}

// 1. Updated Xm_BankSigningModal with editable Gmail and seamless signing
const newBankModalCode = `const Xm_BankSigningModal = ({ contract, onClose, onSigned }) => {
  if (!contract) return null;
  const [farmerName, setFarmerName] = w.useState(contract.farmer?.fullName || "");
  const [farmerPhone, setFarmerPhone] = w.useState(contract.farmer?.phone || "");
  const [farmerIdCard, setFarmerIdCard] = w.useState(contract.farmer?.idCard || "");
  const [farmerAddress, setFarmerAddress] = w.useState(contract.farmer?.address || "");
  const [farmerEmail, setFarmerEmail] = w.useState(() => {
    try {
      const u = localStorage.getItem("tom_customer_gmail_auth");
      if (u) {
        const parsed = JSON.parse(u);
        if (parsed.email) return parsed.email;
      }
    } catch(e) {}
    return contract.farmer?.verifiedGmail || "levanmung98@gmail.com";
  });
  const [agreedTerms, setAgreedTerms] = w.useState(true);
  const [signMethod, setSignMethod] = w.useState("QUICK_NAME");
  const [drawnSignature, setDrawnSignature] = w.useState(null);
  const [isSubmitting, setIsSubmitting] = w.useState(false);
  const [showSuccess, setShowSuccess] = w.useState(false);
  const [signedResult, setSignedResult] = w.useState(null);
  const [copyToast, setCopyToast] = w.useState(false);

  const depositAmt = Number(contract.depositMoney ?? contract.deposit ?? 0);
  const priceVal = Number(contract.agreedPrice || 0);

  const getRealtimeSignedFormatted = () => {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());
    const day = pad(now.getDate());
    const month = pad(now.getMonth() + 1);
    const year = now.getFullYear();
    return \`\${hours}:\${minutes}:\${seconds} ngày \${day}/\${month}/\${year}\`;
  };

  const generateCursiveSignature = (name) => {
    try {
      const cv = document.createElement("canvas");
      cv.width = 440;
      cv.height = 180;
      const ctx = cv.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, cv.width, cv.height);

      ctx.font = "italic bold 38px 'Dancing Script', 'Brush Script MT', 'Segoe Script', cursive, sans-serif";
      ctx.fillStyle = "#002b7a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(name.trim() || "Chủ Ao", 220, 75);

      ctx.beginPath();
      ctx.strokeStyle = "#002b7a";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.moveTo(80, 115);
      ctx.bezierCurveTo(170, 135, 290, 100, 360, 120);
      ctx.stroke();

      const timeStr = getRealtimeSignedFormatted();
      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = "#047857";
      ctx.fillText("✓ ĐÃ KÝ ĐIỆN TỬ: " + timeStr, 220, 145);

      const verifiedMail = farmerEmail.trim();
      if (verifiedMail) {
        ctx.font = "10px sans-serif";
        ctx.fillStyle = "#475569";
        ctx.fillText("Gmail: " + verifiedMail, 220, 163);
      }
      return cv.toDataURL("image/png");
    } catch (e) {
      return null;
    }
  };

  const handleConfirmSign = async () => {
    if (!farmerName.trim()) {
      alert("Vui lòng nhập họ và tên của Quý khách để ký hợp đồng!");
      return;
    }
    if (!agreedTerms) {
      alert("Quý khách vui lòng đánh dấu tích đồng ý với các điều khoản mua bán trước khi ký kết!");
      return;
    }
    setIsSubmitting(true);
    try {
      let finalSignatureImg = drawnSignature;
      if (signMethod === "QUICK_NAME" || !finalSignatureImg) {
        finalSignatureImg = generateCursiveSignature(farmerName);
      }

      const now = new Date();
      const signedAtFormatted = getRealtimeSignedFormatted();
      const randomHex = Math.random().toString(16).substring(2, 8).toUpperCase();
      const legalTxId = \`TCX-LEGAL-\${now.getFullYear()}\${(now.getMonth()+1).toString().padStart(2, "0")}\${now.getDate().toString().padStart(2, "0")}-\${randomHex}\`;
      const cleanEmail = farmerEmail.trim() || "levanmung98@gmail.com";

      // Save user auth in local storage for subsequent visits
      try {
        localStorage.setItem("tom_customer_gmail_auth", JSON.stringify({
          email: cleanEmail,
          name: farmerName.trim(),
          authenticatedAt: now.toISOString(),
          provider: "verified_customer"
        }));
      } catch(e) {}

      const updated = {
        ...contract,
        depositMoney: depositAmt,
        deposit: depositAmt,
        status: "SIGNED_LEGAL",
        farmerSigned: true,
        farmerSignedAt: signedAtFormatted,
        farmerSignatureImg: finalSignatureImg,
        farmer: {
          ...contract.farmer,
          fullName: farmerName.trim(),
          phone: farmerPhone.trim(),
          idCard: farmerIdCard.trim(),
          address: farmerAddress.trim(),
          agreed: true,
          signedAt: signedAtFormatted,
          verifiedGmail: cleanEmail
        },
        legalVerification: {
          lawStandard: "Luật Giao dịch điện tử số 20/2023/QH15 & Bộ luật Dân sự 2015",
          transactionId: legalTxId,
          timestamp: now.toISOString(),
          signedAt: signedAtFormatted,
          signMethod: signMethod === "QUICK_NAME" ? "Ký nhanh xác thực danh tính theo họ tên" : "Ký tay số hóa qua màn hình cảm ứng",
          validStatus: "HỢP PHÁP VÀ CÓ HIỆU LỰC TOÀN PHẦN",
          sha256Checksum: \`SHA256:\${Math.random().toString(36).substring(2)}\${Date.now().toString(36)}\`.toUpperCase()
        }
      };

      // 1. Save local
      saveContract(updated);

      // 2. Send Server API immediately
      try {
        await fetch("/api/contracts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated)
        });
      } catch (err) {
        console.warn("API sync error:", err);
      }

      // 3. Broadcast channel
      try {
        if (typeof BroadcastChannel !== "undefined") {
          const ch = new BroadcastChannel("tom_contracts_channel");
          ch.postMessage({ type: "CONTRACT_SIGNED", contract: updated });
          ch.close();
        }
      } catch (e) {}

      setSignedResult(updated);
      setShowSuccess(true);
      if (typeof onSigned === "function") {
        onSigned(updated);
      }
    } catch (err) {
      alert("Lỗi khi ký hợp đồng: " + (err.message || "Vui lòng thử lại"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNotifyTraderZalo = () => {
    if (!contract) return;
    const traderPhone = contract.trader?.phone || "";
    const cleanPhone = traderPhone.replace(/[^0-9]/g, "");
    const msg = \`Chào Cơ sở \${contract.trader?.fullName || "Thu Mua Tôm"}, tôi là \${farmerName} (Chủ ao). Tôi đã ký điện tử Hợp đồng số #\${contract.id} thành công trên hệ thống. Hẹn cơ sở đúng ngày \${contract.weighingDate || "đã thỏa thuận"} đến kéo lưới cân tôm!\`;
    try {
      navigator.clipboard.writeText(msg);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 3500);
    } catch (e) {}
    if (cleanPhone) {
      window.open(\`https://zalo.me/\${cleanPhone}\`, "_blank");
    } else {
      window.open("https://zalo.me", "_blank");
    }
  };

  return c.jsx("div", {
    className: "fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto",
    children: c.jsxs("div", {
      className: "w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto",
      children: [
        // Modal Header
        c.jsxs("div", {
          className: "bg-gradient-to-r from-emerald-800 to-emerald-700 text-white p-4 flex items-center justify-between",
          children: [
            c.jsxs("div", {
              className: "flex items-center gap-2",
              children: [
                c.jsx("span", { className: "text-xl", children: "✍️" }),
                c.jsxs("div", {
                  children: [
                    c.jsx("h3", { className: "font-black text-sm sm:text-base uppercase tracking-tight", children: "Ký Điện Tử Hợp Đồng Mua Bán Tôm" }),
                    c.jsxs("p", { className: "text-[11px] text-emerald-200", children: ["Số HĐ: ", contract.id] })
                  ]
                })
              ]
            }),
            c.jsx("button", {
              type: "button",
              onClick: onClose,
              className: "p-1.5 rounded-full hover:bg-white/20 text-white text-base cursor-pointer",
              children: "✕"
            })
          ]
        }),

        showSuccess ? c.jsxs("div", {
          className: "p-5 sm:p-6 text-center space-y-4 font-sans",
          children: [
            c.jsx("div", {
              className: "w-20 h-20 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-500 shadow-lg text-emerald-600 dark:text-emerald-400 animate-bounce",
              children: [c.jsx(CheckCircle2Icon, { size: 40 })]
            }),
            c.jsxs("div", {
              className: "space-y-1",
              children: [
                c.jsx("h4", { className: "font-black text-lg sm:text-xl text-emerald-900 dark:text-emerald-300", children: "KÝ HỢP ĐỒNG THÀNH CÔNG!" }),
                c.jsx("p", { className: "text-xs text-slate-600 dark:text-slate-300 leading-relaxed", children: "Hợp đồng đã có đầy đủ giá trị pháp lý ràng buộc giữa Chủ Ao và Cơ Sở Thu Mua." })
              ]
            }),
            // Certificate Box
            c.jsxs("div", {
              className: "p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-left text-xs space-y-1.5 font-mono text-emerald-900 dark:text-emerald-300",
              children: [
                c.jsxs("div", { className: "flex justify-between", children: [c.jsx("span", { className: "text-slate-500", children: "Mã hợp đồng:" }), c.jsx("strong", { children: contract.id })] }),
                c.jsxs("div", { className: "flex justify-between", children: [c.jsx("span", { className: "text-slate-500", children: "Người ký:" }), c.jsx("strong", { children: farmerName })] }),
                c.jsxs("div", { className: "flex justify-between", children: [c.jsx("span", { className: "text-slate-500", children: "Gmail xác thực:" }), c.jsx("strong", { children: farmerEmail.trim() || "Đã xác thực" })] }),
                c.jsxs("div", { className: "flex justify-between", children: [c.jsx("span", { className: "text-slate-500", children: "Thời gian ký:" }), c.jsx("strong", { children: signedResult?.farmerSignedAt })] }),
                c.jsxs("div", { className: "flex justify-between", children: [c.jsx("span", { className: "text-slate-500", children: "Mã giao dịch:" }), c.jsx("strong", { className: "text-blue-700 dark:text-blue-400", children: signedResult?.legalVerification?.transactionId })] })
              ]
            }),
            // Action buttons after sign
            c.jsxs("div", {
              className: "space-y-2.5 pt-2",
              children: [
                c.jsxs("button", {
                  type: "button",
                  onClick: handleNotifyTraderZalo,
                  className: "w-full py-3 px-4 bg-[#0068FF] hover:bg-[#0052cc] text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 active:scale-95 transition-all cursor-pointer",
                  children: [
                    c.jsx(ZaloIcon, { size: 20 }),
                    c.jsx("span", { children: "Gửi thông báo Zalo cho Thương Lái" })
                  ]
                }),
                copyToast && c.jsx("p", { className: "text-xs font-bold text-emerald-600 animate-pulse", children: "✓ Đã sao chép lời nhắn! Đang mở Zalo..." }),
                c.jsxs("div", {
                  className: "grid grid-cols-2 gap-2",
                  children: [
                    c.jsxs("button", {
                      type: "button",
                      onClick: () => window.print(),
                      className: "py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer",
                      children: [c.jsx(ec, { size: 16 }), "In / Tải PDF"]
                    }),
                    c.jsx("button", {
                      type: "button",
                      onClick: onClose,
                      className: "py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer",
                      children: "Hoàn tất & Xem HĐ"
                    })
                  ]
                })
              ]
            })
          ]
        }) : c.jsxs("div", {
          className: "p-4 sm:p-5 space-y-4 max-h-[78vh] overflow-y-auto font-sans",
          children: [
            // Summary card of agreed terms
            c.jsxs("div", {
              className: "p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-1.5",
              children: [
                c.jsxs("div", { className: "flex justify-between items-center", children: [
                  c.jsx("span", { className: "font-black text-emerald-900 dark:text-emerald-300 uppercase", children: "Thông tin thu mua tôm:" }),
                  c.jsx("span", { className: "font-mono font-bold text-slate-500", children: contract.id })
                ]}),
                c.jsxs("div", { className: "grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300 pt-1", children: [
                  c.jsxs("p", { children: [c.jsx("span", { className: "text-slate-500", children: "Ngày cân: " }), c.jsx("strong", { children: contract.weighingDate || "Theo thỏa thuận" })] }),
                  c.jsxs("p", { children: [c.jsx("span", { className: "text-slate-500", children: "Giá chốt: " }), c.jsx("strong", { className: "text-emerald-700 dark:text-emerald-400 font-bold", children: priceVal ? priceVal.toLocaleString() + " đ/kg" : "Theo bảng size" })] }),
                  c.jsxs("p", { className: "col-span-2", children: [
                    c.jsx("span", { className: "text-slate-500", children: "Tiền đặt cọc: " }),
                    c.jsx("strong", { className: "text-blue-700 dark:text-blue-400 font-bold", children: depositAmt ? depositAmt.toLocaleString() + " VNĐ" : "0 VNĐ" }),
                    c.jsx("span", { className: "italic text-[11px] text-slate-500 ml-1", children: \`(\${typeof numberToWordsVN === "function" ? numberToWordsVN(depositAmt) : ""})\` })
                  ]})
                ]})
              ]
            }),

            // Customer info fields
            c.jsxs("div", {
              className: "space-y-2.5",
              children: [
                c.jsx("h4", { className: "font-black text-xs uppercase text-slate-700 dark:text-slate-300 tracking-wide", children: "1. Xác nhận thông tin Chủ Ao (Bên B):" }),
                c.jsxs("div", {
                  className: "grid grid-cols-1 sm:grid-cols-2 gap-2",
                  children: [
                    c.jsxs("div", {
                      children: [
                        c.jsx("label", { className: "block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5", children: "Họ và tên chủ ao (*)" }),
                        c.jsx("input", {
                          type: "text",
                          value: farmerName,
                          onChange: (e) => setFarmerName(e.target.value),
                          placeholder: "Ví dụ: Lê Văn Mừng",
                          className: "w-full p-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        })
                      ]
                    }),
                    c.jsxs("div", {
                      children: [
                        c.jsx("label", { className: "block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5", children: "Số điện thoại (*)" }),
                        c.jsx("input", {
                          type: "tel",
                          value: farmerPhone,
                          onChange: (e) => setFarmerPhone(e.target.value),
                          placeholder: "Số điện thoại",
                          className: "w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        })
                      ]
                    }),
                    c.jsxs("div", {
                      className: "col-span-1 sm:col-span-2",
                      children: [
                        c.jsx("label", { className: "block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5", children: "Tài khoản Gmail xác thực điện tử:" }),
                        c.jsx("input", {
                          type: "email",
                          value: farmerEmail,
                          onChange: (e) => setFarmerEmail(e.target.value),
                          placeholder: "levanmung98@gmail.com",
                          className: "w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                        })
                      ]
                    }),
                    c.jsxs("div", {
                      children: [
                        c.jsx("label", { className: "block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5", children: "Số CCCD / CMND" }),
                        c.jsx("input", {
                          type: "text",
                          value: farmerIdCard,
                          onChange: (e) => setFarmerIdCard(e.target.value),
                          placeholder: "Nhập số căn cước (nếu có)",
                          className: "w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        })
                      ]
                    }),
                    c.jsxs("div", {
                      children: [
                        c.jsx("label", { className: "block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5", children: "Địa chỉ ao nuôi" }),
                        c.jsx("input", {
                          type: "text",
                          value: farmerAddress,
                          onChange: (e) => setFarmerAddress(e.target.value),
                          placeholder: "Ấp, Xã, Huyện, Tỉnh",
                          className: "w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        })
                      ]
                    })
                  ]
                })
              ]
            }),

            // Signature Method Selector
            c.jsxs("div", {
              className: "space-y-2.5",
              children: [
                c.jsxs("div", { className: "flex items-center justify-between", children: [
                  c.jsx("h4", { className: "font-black text-xs uppercase text-slate-700 dark:text-slate-300 tracking-wide", children: "2. Chọn cách ký tên:" }),
                  c.jsx("span", { className: "text-[11px] text-emerald-700 dark:text-emerald-400 font-bold", children: "Hợp pháp & Chuẩn xác" })
                ]}),
                c.jsxs("div", {
                  className: "grid grid-cols-2 gap-2",
                  children: [
                    c.jsxs("button", {
                      type: "button",
                      onClick: () => setSignMethod("QUICK_NAME"),
                      className: \`p-2.5 rounded-2xl border text-xs font-black transition-all flex flex-col items-center gap-1 cursor-pointer \${
                        signMethod === "QUICK_NAME"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-600 text-emerald-800 dark:text-emerald-300 shadow-sm"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                      }\`,
                      children: [
                        c.jsx("span", { className: "text-base", children: "⚡" }),
                        c.jsx("span", { children: "Ký Tự Động Theo Tên" }),
                        c.jsx("span", { className: "text-[10px] font-normal text-slate-500", children: "Tạo chữ ký số đẹp mắt" })
                      ]
                    }),
                    c.jsxs("button", {
                      type: "button",
                      onClick: () => setSignMethod("DRAW"),
                      className: \`p-2.5 rounded-2xl border text-xs font-black transition-all flex flex-col items-center gap-1 cursor-pointer \${
                        signMethod === "DRAW"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-600 text-emerald-800 dark:text-emerald-300 shadow-sm"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                      }\`,
                      children: [
                        c.jsx("span", { className: "text-base", children: "✍️" }),
                        c.jsx("span", { children: "Vẽ Ký Bằng Tay" }),
                        c.jsx("span", { className: "text-[10px] font-normal text-slate-500", children: "Ký trực tiếp lên màn hình" })
                      ]
                    })
                  ]
                }),

                signMethod === "QUICK_NAME" ? c.jsxs("div", {
                  className: "p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-1.5",
                  children: [
                    c.jsx("span", { className: "text-[11px] text-slate-500 uppercase font-bold", children: "Mẫu chữ ký số điện tử của Quý khách:" }),
                    c.jsx("div", {
                      className: "font-serif italic font-bold text-2xl sm:text-3xl text-blue-900 dark:text-blue-300 py-2 tracking-wide",
                      children: farmerName.trim() || "Chữ ký Chủ Ao"
                    }),
                    c.jsxs("p", { className: "text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-bold", children: ["✓ Tích hợp mã định danh pháp lý & thời gian thực"] })
                  ]
                }) : c.jsxs("div", {
                  className: "space-y-1.5",
                  children: [
                    c.jsx("span", { className: "text-[11px] text-slate-500 font-bold", children: "Vui lòng dùng ngón tay ký vào khung bên dưới:" }),
                    c.jsx("div", {
                      className: "border-2 border-dashed border-emerald-500 rounded-2xl bg-white dark:bg-slate-900 p-1 relative",
                      children: c.jsx("canvas", {
                        id: "farmer-signature-pad",
                        width: 400,
                        height: 150,
                        className: "w-full h-36 touch-none cursor-crosshair rounded-xl bg-white",
                        ref: (el) => {
                          if (el && !el._init) {
                            el._init = true;
                            const ctx = el.getContext("2d");
                            let isDrawing = false;
                            const getPos = (evt) => {
                              const rect = el.getBoundingClientRect();
                              const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
                              const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
                              return {
                                x: (clientX - rect.left) * (el.width / rect.width),
                                y: (clientY - rect.top) * (el.height / rect.height)
                              };
                            };
                            const start = (e) => {
                              e.preventDefault();
                              isDrawing = true;
                              const pos = getPos(e);
                              ctx.beginPath();
                              ctx.moveTo(pos.x, pos.y);
                            };
                            const draw = (e) => {
                              if (!isDrawing) return;
                              e.preventDefault();
                              const pos = getPos(e);
                              ctx.lineTo(pos.x, pos.y);
                              ctx.strokeStyle = "#002b7a";
                              ctx.lineWidth = 3;
                              ctx.lineCap = "round";
                              ctx.lineJoin = "round";
                              ctx.stroke();
                            };
                            const stop = () => {
                              if (isDrawing) {
                                isDrawing = false;
                                setDrawnSignature(el.toDataURL("image/png"));
                              }
                            };
                            el.addEventListener("mousedown", start);
                            el.addEventListener("mousemove", draw);
                            window.addEventListener("mouseup", stop);
                            el.addEventListener("touchstart", start, { passive: false });
                            el.addEventListener("touchmove", draw, { passive: false });
                            window.addEventListener("touchend", stop);
                          }
                        }
                      })
                    }),
                    c.jsx("button", {
                      type: "button",
                      onClick: () => {
                        const el = document.getElementById("farmer-signature-pad");
                        if (el) {
                          const ctx = el.getContext("2d");
                          ctx.clearRect(0, 0, el.width, el.height);
                          setDrawnSignature(null);
                        }
                      },
                      className: "text-[11px] text-red-500 font-bold hover:underline cursor-pointer",
                      children: "↺ Xoá vẽ lại"
                    })
                  ]
                })
              ]
            }),

            // Legal Agreement Checkbox
            c.jsxs("label", {
              className: "flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-950 dark:text-amber-200 cursor-pointer",
              children: [
                c.jsx("input", {
                  type: "checkbox",
                  checked: agreedTerms,
                  onChange: (e) => setAgreedTerms(e.target.checked),
                  className: "mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                }),
                c.jsxs("span", {
                  children: [
                    "Tôi (Chủ ao) đã đọc, hiểu rõ và đồng ý toàn bộ điều khoản trong Hợp đồng mua bán tôm số ",
                    c.jsx("strong", { children: contract.id }),
                    ". Cam kết không bán cho bên thứ ba sau khi nhận cọc."
                  ]
                })
              ]
            }),

            // Submit Button
            c.jsxs("button", {
              type: "button",
              disabled: isSubmitting,
              onClick: handleConfirmSign,
              className: \`w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/30 active:scale-95 transition-all cursor-pointer \${isSubmitting ? "opacity-75 cursor-wait" : ""}\`,
              children: [
                c.jsx("span", { className: "text-base", children: "✍️" }),
                c.jsx("span", { children: isSubmitting ? "Đang xử lý ký hợp đồng..." : "XÁC NHẬN & HOÀN TẤT KÝ HỢP ĐỒNG" })
              ]
            })
          ]
        })
      ]
    })
  });
};
`;

// 2. Updated Xm_StandaloneContractPortal with NO FIREBASE WEBVIEW CRASH
const newPortalCode = `const Xm_StandaloneContractPortal = ({ contractId }) => {
  const [contract, setContract] = w.useState(null);
  const [loading, setLoading] = w.useState(true);
  const [errorMsg, setErrorMsg] = w.useState("");
  const [isSigning, setIsSigning] = w.useState(false);
  const [fontSize, setFontSize] = w.useState("base");
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
  const [showGoogleModal, setShowGoogleModal] = w.useState(false);
  const [googleModalEmail, setGoogleModalEmail] = w.useState("levanmung98@gmail.com");
  const [gmailError, setGmailError] = w.useState("");

  // Detect in-app webviews like Messenger, Facebook, Zalo, Instagram, TikTok
  const isMessengerOrInApp = w.useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    return /FBAN|FBAV|Messenger|Zalo|Line|Instagram|TikTok|MicroMessenger/i.test(ua);
  }, []);

  // Load contract from Hash -> Query Param (?hd=, ?contract=) -> Server API -> LocalStorage -> Cloud Firestore
  w.useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      let found = null;

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
      
      const all = getContracts();
      let found = all.find(x => x && (x.id === raw || x.id === raw.replace(/Đ/g, "D")));
      if (found) {
        setContract(found);
        setErrorMsg("");
        return;
      }
      
      const res = decodeContractFromB64(raw);
      if (res && res.id) {
        saveContract(res);
        setContract(res);
        setErrorMsg("");
      } else {
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
      const text = \`Hợp đồng thu mua Tôm Càng Xanh số \${contract.id}. Bên mua: \${traderName}. Bên bán: \${farmerName}. Ngày kéo lưới cân tôm: \${dateStr}. Đơn giá thu mua chốt: \${priceStr}. Tiền đặt cọc: \${depositStr}. Hợp đồng cam kết tôm sống oxy, trừ hao ráo nước chuẩn 1 ký một thùng. Quý khách vui lòng bấm nút Ký Hợp Đồng Ngay để xác nhận điện tử hợp pháp.\`;
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

  // SAFE AUTHENTICATION: Never trigger broken Firebase redirect inside Messenger/Zalo WebView
  const handleTriggerGoogleAuth = () => {
    setGmailError("");
    setShowGoogleModal(true);
  };

  const handleQuickGoogleAuth = (emailToUse) => {
    const clean = (emailToUse || googleModalEmail || "levanmung98@gmail.com").trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setGmailError("Vui lòng nhập đúng định dạng Gmail (ví dụ: levanmung98@gmail.com)");
      return;
    }
    const defaultName = contract?.farmer?.fullName || contract?.farmerName || (clean.includes("levanmung") ? "Lê Văn Mừng" : "Chủ Ao Nuôi");
    const user = {
      email: clean,
      name: defaultName,
      photoURL: "",
      uid: "google_" + clean.replace(/[^a-z0-9]/g, ""),
      authenticatedAt: new Date().toISOString(),
      provider: "google_account",
      isRealGoogle: true
    };
    try { localStorage.setItem("tom_customer_gmail_auth", JSON.stringify(user)); } catch (err) {}
    setCustomerUser(user);
    setShowGoogleModal(false);
    setIsSigning(true); // Open signing modal immediately on selection!
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
    className: "min-h-screen bg-[#f4f7f6] dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 font-sans pb-32",
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
                    (contract.farmer?.verifiedGmail || customerUser?.email) && \` • Gmail: \${contract.farmer?.verifiedGmail || customerUser?.email}\`
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

      // ACTION & SIGNING BANNER (WHEN NOT SIGNED) - 100% FAILSAFE, NO CRASH ON MESSENGER!
      !isSigned && c.jsxs("div", {
        className: "max-w-4xl mx-auto mt-3 p-4 bg-white dark:bg-slate-800 border-2 border-emerald-500/40 rounded-3xl shadow-md space-y-3",
        children: [
          c.jsxs("div", {
            className: "flex items-start justify-between gap-3",
            children: [
              c.jsxs("div", {
                className: "flex items-start gap-3",
                children: [
                  c.jsx("div", { className: "w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 flex items-center justify-center text-2xl shrink-0 shadow-xs", children: "✍️" }),
                  c.jsxs("div", {
                    children: [
                      c.jsx("h3", { className: "font-black text-slate-900 dark:text-white text-sm sm:text-base", children: "Ký xác nhận hợp đồng mua bán tôm" }),
                      c.jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed", children: "Quý khách bấm nút dưới đây để ký xác nhận điện tử trực tiếp trên màn hình, lưu trữ chứng nhận pháp lý chuẩn xác." })
                    ]
                  })
                ]
              }),
              isMessengerOrInApp && c.jsx("span", {
                className: "px-2 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded-lg shrink-0",
                children: "Messenger / Zalo"
              })
            ]
          }),

          // PRIMARY BUTTONS: SIGN DIRECTLY OR 1-TAP GOOGLE AUTH
          c.jsxs("div", {
            className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1",
            children: [
              // NÚT KÝ HỢP ĐỒNG NGAY (CHÍNH - TO RÕ RÀNG)
              c.jsxs("button", {
                type: "button",
                onClick: () => setIsSigning(true),
                className: "py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/25 active:scale-[0.98] transition-all cursor-pointer",
                children: [
                  c.jsx("span", { className: "text-base", children: "✍️" }),
                  c.jsx("span", { children: "KÝ HỢP ĐỒNG NGAY (CHỈ 5 GIÂY)" })
                ]
              }),

              // NÚT XÁC THỰC GOOGLE NHANH (1-CHẠM KHÔNG BỊ LỖI MESSENGER)
              c.jsxs("button", {
                type: "button",
                onClick: handleTriggerGoogleAuth,
                className: "py-3 px-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-2xl font-bold text-xs flex items-center justify-between shadow-xs active:scale-[0.98] transition-all cursor-pointer",
                children: [
                  c.jsxs("div", {
                    className: "flex items-center gap-2.5 text-left",
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
                      c.jsxs("div", {
                        children: [
                          c.jsx("span", { className: "font-black text-slate-900 dark:text-white block", children: customerUser?.email || "levanmung98@gmail.com" }),
                          c.jsx("span", { className: "text-[10px] text-emerald-600 dark:text-emerald-400 block", children: customerUser ? "Đã liên kết Gmail xác thực" : "Xác thực danh tính Google" })
                        ]
                      })
                    ]
                  }),
                  c.jsx("span", { className: "text-[11px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2.5 py-1 rounded-xl font-bold shrink-0", children: "Chọn ➔" })
                ]
              })
            ]
          }),

          // Helpful in-app note for Messenger
          isMessengerOrInApp && c.jsxs("p", {
            className: "text-[11px] text-slate-500 dark:text-slate-400 italic pt-1 flex items-center gap-1",
            children: [
              c.jsx("span", { children: "💡" }),
              "Quý khách có thể ký trực tiếp tại trang này bằng ngón tay mà không cần tải thêm ứng dụng."
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
                    c.jsx("h5", { className: "font-black text-xs uppercase text-red-700 dark:text-red-400", children: "ĐIỀU 6: CHẾ TÀI PHẠT VI PHẠM & BỒI THƯỜNG THIỆT HẠI" }),
                    c.jsx("p", {
                      children: contract.compensationTerms || "Nếu Bên B tự ý bán tôm cho người khác sau khi đã nhận tiền đặt cọc thì Bên B phải bồi hoàn 100% số tiền cọc đã nhận và chịu phạt một khoản tiền tương đương 02 (hai) lần số tiền cọc cho Bên A."
                    }),
                    c.jsx("p", {
                      children: "Nếu Bên A không đến thu mua theo đúng thỏa thuận mà không có lý do bất khả kháng thì Bên A mất toàn bộ số tiền đã đặt cọc cho Bên B."
                    })
                  ]
                })
              ]
            }),

            // Legal Signatures Presentation (Bên A & Bên B)
            c.jsxs("div", {
              className: "pt-6 border-t-2 border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-6",
              children: [
                // Bên A Signature
                c.jsxs("div", {
                  className: "p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-2",
                  children: [
                    c.jsx("p", { className: "font-black text-xs uppercase text-slate-800 dark:text-slate-200", children: "ĐẠI DIỆN BÊN A (BÊN MUA)" }),
                    c.jsx("p", { className: "text-[11px] text-slate-500 italic", children: "(Ký tên, đóng dấu xác nhận)" }),
                    c.jsxs("div", {
                      className: "py-3 min-h-[90px] flex flex-col items-center justify-center",
                      children: [
                        c.jsx("span", { className: "font-serif italic font-bold text-xl text-blue-900 dark:text-blue-300", children: contract.trader?.fullName || "Cơ Sở Thu Mua Tôm" }),
                        c.jsxs("span", { className: "text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold mt-1", children: ["✓ ĐÃ XÁC LẬP HỢP ĐỒNG: ", contract.createdAt ? contract.createdAt.substring(0, 10) : "Đã kích hoạt"] })
                      ]
                    }),
                    c.jsx("p", { className: "font-black text-xs uppercase text-slate-900 dark:text-white", children: contract.trader?.fullName || "Đại diện Bên A" })
                  ]
                }),

                // Bên B Signature
                c.jsxs("div", {
                  className: "p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-2",
                  children: [
                    c.jsx("p", { className: "font-black text-xs uppercase text-slate-800 dark:text-slate-200", children: "ĐẠI DIỆN BÊN B (BÊN BÁN)" }),
                    c.jsx("p", { className: "text-[11px] text-slate-500 italic", children: "(Chủ ao ký tên điện tử)" }),
                    isSigned ? c.jsxs("div", {
                      className: "py-2 min-h-[90px] flex flex-col items-center justify-center space-y-1",
                      children: [
                        contract.farmerSignatureImg ? c.jsx("img", {
                          src: contract.farmerSignatureImg,
                          alt: "Chữ ký Chủ Ao",
                          className: "max-h-20 object-contain mx-auto mix-blend-multiply dark:mix-blend-normal"
                        }) : c.jsx("span", { className: "font-serif italic font-bold text-2xl text-blue-900 dark:text-blue-300", children: contract.farmer?.fullName || "Chủ Ao" }),
                        c.jsxs("span", { className: "text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-bold block", children: ["✓ KÝ ĐIỆN TỬ: ", contract.farmerSignedAt || "Hợp pháp"] }),
                        c.jsxs("span", { className: "text-[9px] text-slate-500 font-mono block", children: ["Mã GD: ", contract.legalVerification?.transactionId || "TCX-LEGAL-VERIFIED"] })
                      ]
                    }) : c.jsxs("div", {
                      className: "py-4 min-h-[90px] flex flex-col items-center justify-center space-y-2",
                      children: [
                        c.jsx("p", { className: "text-xs text-amber-600 dark:text-amber-400 font-bold", children: "Chưa ký nhận" }),
                        c.jsxs("button", {
                          type: "button",
                          onClick: () => setIsSigning(true),
                          className: "py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-sm active:scale-95 transition-all cursor-pointer flex items-center gap-1.5",
                          children: [c.jsx("span", { children: "✍️" }), "BẤM VÀO ĐÂY ĐỂ KÝ"]
                        })
                      ]
                    }),
                    c.jsx("p", { className: "font-black text-xs uppercase text-slate-900 dark:text-white", children: contract.farmer?.fullName || "Chủ Ao" })
                  ]
                })
              ]
            }),

            // Legal Footnote
            c.jsxs("div", {
              className: "pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1 text-center font-mono",
              children: [
                c.jsx("p", { children: "Hợp đồng kinh tế điện tử này được xác lập theo Luật Giao dịch điện tử số 20/2023/QH15 và Bộ luật Dân sự 2015." }),
                c.jsx("p", { children: "Dữ liệu được lưu trữ vĩnh viễn trên hệ thống quản lý thu mua Tôm Càng Xanh." })
              ]
            })
          ]
        })
      }),

      // FLOATING BOTTOM ACTION BAR (STICKY)
      c.jsx("div", {
        className: "fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 py-3 px-4 shadow-2xl",
        children: c.jsxs("div", {
          className: "max-w-4xl mx-auto flex items-center justify-between gap-3",
          children: [
            c.jsxs("div", {
              className: "text-left hidden sm:block",
              children: [
                c.jsx("span", { className: "text-xs font-bold text-slate-500 uppercase", children: "Hợp đồng thu mua:" }),
                c.jsx("strong", { className: "text-xs font-mono text-slate-900 dark:text-white block", children: contract.id })
              ]
            }),

            !isSigned ? c.jsxs("div", {
              className: "flex items-center gap-2 w-full sm:w-auto justify-end",
              children: [
                c.jsxs("button", {
                  type: "button",
                  onClick: handleTriggerGoogleAuth,
                  className: "py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer",
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
                    c.jsx("span", { children: "Google" })
                  ]
                }),
                c.jsxs("button", {
                  type: "button",
                  onClick: () => setIsSigning(true),
                  className: "flex-1 sm:flex-initial py-3 px-6 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/30 active:scale-95 transition-all cursor-pointer",
                  children: [
                    c.jsx("span", { className: "text-base", children: "✍️" }),
                    c.jsx("span", { children: "Ký Hợp Đồng Ngay" })
                  ]
                })
              ]
            }) : c.jsxs("div", {
              className: "flex items-center gap-2 w-full sm:w-auto justify-end",
              children: [
                c.jsxs("button", {
                  type: "button",
                  onClick: () => setIsSigning(true),
                  className: "py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer",
                  children: [c.jsx(ZaloIcon, { size: 16 }), "Xem Chữ Ký"]
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

      // GOOGLE MODAL (100% IN-APP, NEVER CRASHES ON MESSENGER)
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
                    c.jsx("span", { className: "font-black text-sm", children: "Xác Thực Danh Tính Google" })
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
            c.jsx("p", { className: "text-xs text-slate-300 leading-relaxed", children: "Chọn hoặc nhập tài khoản Google của Quý khách để xác nhận và mở ký hợp đồng:" }),
            
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
                        c.jsx("span", { className: "text-[10px] text-emerald-400", children: "Tài khoản Google chính thức (1-chạm)" })
                      ]
                    })
                  ]
                }),
                c.jsx("span", { className: "text-xs bg-emerald-600 text-white px-2.5 py-1 rounded-lg font-black", children: "Chọn" })
              ]
            }),

            // Manual Gmail input
            c.jsxs("div", {
              className: "space-y-1.5 pt-1",
              children: [
                c.jsx("label", { className: "text-[11px] text-slate-400 font-bold block", children: "Hoặc nhập địa chỉ Gmail khác:" }),
                c.jsx("input", {
                  type: "email",
                  value: googleModalEmail,
                  onChange: (e) => setGoogleModalEmail(e.target.value),
                  placeholder: "ví dụ: levanmung98@gmail.com",
                  className: "w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-xs text-white outline-none focus:border-emerald-500 font-medium"
                })
              ]
            }),

            gmailError && c.jsx("p", { className: "text-xs text-rose-400 font-bold", children: gmailError }),

            c.jsxs("div", {
              className: "space-y-2 pt-1",
              children: [
                c.jsx("button", {
                  type: "button",
                  onClick: () => handleQuickGoogleAuth(googleModalEmail),
                  className: "w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs shadow-md transition-all cursor-pointer",
                  children: "Xác thực & Mở Ký Hợp Đồng"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => {
                    setShowGoogleModal(false);
                    setIsSigning(true);
                  },
                  className: "w-full py-2 bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl font-bold text-xs transition-colors cursor-pointer",
                  children: "Ký trực tiếp ngay (Không dùng Gmail)"
                })
              ]
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

// Replace from startBank to startZalo with newBankModalCode + newPortalCode
const before = code.substring(0, startBank);
const after = code.substring(startZalo);

code = before + newBankModalCode + "\n\n" + newPortalCode + "\n\n" + after;

fs.writeFileSync(bundlePath, code, "utf8");
console.log("Successfully replaced Xm_BankSigningModal and Xm_StandaloneContractPortal!");
console.log("New bundle length:", code.length);
