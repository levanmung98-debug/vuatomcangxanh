import fs from 'fs';

const FILE = 'assets/index-Os1X4Z7e.js';
let code = fs.readFileSync(FILE, 'utf8');

const startMarker = "const Xm_ShareZaloModal";
const midMarker = "const Xm_ContractModal";
const endMarker = "const Xm_MapModal";

const startPos = code.indexOf(startMarker);
const midPos = code.indexOf(midMarker, startPos);
const endPos = code.indexOf(endMarker, midPos);

if (startPos === -1 || midPos === -1 || endPos === -1) {
  console.error("Markers not found! start:", startPos, "mid:", midPos, "end:", endPos);
  process.exit(1);
}

// ==========================================
// 1. UPGRADED Xm_ShareZaloModal
// ==========================================
const newShareModal = `const Xm_ShareZaloModal = ({ contract, onClose }) => {
  if (!contract) return null;
  const [copied, setCopied] = w.useState(false);
  const [activeTab, setActiveTab] = w.useState("MESSAGE"); // MESSAGE, QR
  const [selectedTemplate, setSelectedTemplate] = w.useState("STANDARD"); // STANDARD, QUICK, REMINDER, CONFIRMATION
  const [copyToast, setCopyToast] = w.useState("");
  const textareaRef = w.useRef(null);

  const farmerName = contract.farmer?.fullName || "Chủ ao";
  const farmerPhone = contract.farmer?.phone || "";
  const cleanPhone = farmerPhone.replace(/[^0-9]/g, "");
  const traderName = contract.trader?.fullName || "Cơ sở thu mua Tôm Càng Xanh";
  const traderPhone = contract.trader?.phone || "";
  const depositAmt = Number(contract.depositMoney ?? contract.deposit ?? 0);
  const priceVal = Number(contract.agreedPrice || 0);
  const weighingDate = contract.weighingDate || "Theo thỏa thuận";
  const weighingTime = contract.weighingTime || "06:00";
  const shrimpName = contract.shrimpType || "Tôm Càng Xanh";
  const pondAddress = contract.farmer?.address || "Tại bờ ao";
  const priceText = priceVal ? (priceVal.toLocaleString() + " đ/kg") : "Theo bảng phân loại size tôm";
  const depositText = depositAmt ? (depositAmt.toLocaleString() + " VNĐ (" + (typeof numberToWordsVN === "function" ? numberToWordsVN(depositAmt) : "") + ")") : "Không có tiền cọc";
  const rejectionSpec = contract.rejectionSpec || "Tôm mềm, ốp, gãy càng dạt sang hàng xào";
  const tareSpec = contract.tareSpec || "Trừ bì ráo nước chuẩn 1kg/thùng";

  const shareUrl = encodeContractForShare(contract);

  // 4 Mẫu nội dung gửi khách chuẩn chỉnh & tối ưu
  const templates = {
    STANDARD: "🦐 HỢP ĐỒNG THU MUA TÔM CÀNG XANH\\n" +
      "Số hiệu: #" + contract.id + "\\n" +
      "Kính gửi: Anh/Chị " + farmerName + " (Chủ ao)\\n\\n" +
      "Cơ sở " + traderName + (traderPhone ? " (SĐT: " + traderPhone + ")" : "") + " gửi bản Hợp Đồng Mua Bán Tôm điện tử đã được thiết lập:\\n" +
      "📌 THÔNG TIN THỎA THUẬN:\\n" +
      "• Chủng loại: " + shrimpName + "\\n" +
      "• Đơn giá chốt: " + priceText + "\\n" +
      "• Tiền đặt cọc: " + depositText + "\\n" +
      "• Ngày kéo cân: " + weighingDate + " (Lúc " + weighingTime + ")\\n" +
      "• Địa điểm ao: " + pondAddress + "\\n" +
      "• Quy cách dạt: " + rejectionSpec + "\\n" +
      "• Trừ bì ráo nước: " + tareSpec + "\\n\\n" +
      "👉 Quý khách vui lòng bấm vào liên kết dưới đây để xem toàn văn hợp đồng và ký xác nhận trực tuyến trên điện thoại:\\n" +
      "🔗 " + shareUrl + "\\n\\n" +
      "🤝 Cam kết cân đúng giờ, cân đủ trọng lượng và thanh toán 100% ngay tại bờ ao. Kính chúc hai bên hợp tác vui vẻ, vụ tôm đại thắng!",

    QUICK: "Cơ sở " + traderName + " gửi HĐ Mua Bán Tôm số #" + contract.id + " cho Anh/Chị " + farmerName + ":\\n" +
      "- Loại tôm: " + shrimpName + "\\n" +
      "- Giá chốt: " + priceText + "\\n" +
      "- Tiền cọc: " + (depositAmt ? depositAmt.toLocaleString() + "d" : "0d") + "\\n" +
      "- Ngày cân: " + weighingDate + " (" + weighingTime + ")\\n" +
      "Bấm vào đây để xem chi tiết và ký hợp đồng ngay:\\n" +
      shareUrl + "\\n" +
      "Liên hệ hỗ trợ: " + (traderPhone || "Cơ sở thu mua"),

    REMINDER: "⏰ THÔNG BÁO LỊCH KÉO CÂN TÔM CÀNG XANH\\n" +
      "Kính gửi: Anh/Chị " + farmerName + " (Ao: " + pondAddress + ")\\n\\n" +
      "Cơ sở " + traderName + " xin thông báo chuẩn bị kéo cân tôm theo Hợp đồng số #" + contract.id + ":\\n" +
      "📅 Thời gian: Ngày " + weighingDate + " (Dự kiến bắt đầu lúc " + weighingTime + " sáng)\\n" +
      "🚛 Đội ghe/xe thu mua và thiết bị sục khí oxy chuyên dụng sẽ có mặt đúng giờ.\\n\\n" +
      "Kính nhờ Anh/Chị:\\n" +
      "1. Giữ mực nước ao ổn định, chuẩn bị đường ghe/xe vào bờ ao thuận lợi.\\n" +
      "2. Chuẩn bị nhân lực kéo lưới/thau rổ để tôm lên nhanh, khỏe và tươi đẹp nhất.\\n" +
      "Xem lại hợp đồng tại: " + shareUrl + "\\n" +
      "Hotline liên hệ: " + (traderPhone || "Thương lái"),

    CONFIRMATION: "✅ BIÊN NHẬN ĐẶT CỌC & XÁC NHẬN HỢP ĐỒNG\\n" +
      "Kính gửi: Anh/Chị " + farmerName + ",\\n\\n" +
      "Cơ sở " + traderName + " trân trọng xác nhận:\\n" +
      "• Hợp đồng mua bán Tôm số #" + contract.id + " ĐÃ ĐƯỢC THIẾT LẬP THÀNH CÔNG.\\n" +
      "• Đã giao/nhận tiền cọc: " + depositText + ".\\n" +
      "• Lịch cân chốt: Ngày " + weighingDate + " (" + shrimpName + " - " + priceText + ").\\n\\n" +
      "🔗 Bản hợp đồng có hiệu lực pháp lý được lưu trữ bảo mật tại:\\n" +
      shareUrl + "\\n\\n" +
      "Cảm ơn Anh/Chị đã tin tưởng hợp tác cùng cơ sở!"
  };

  const [customMessage, setCustomMessage] = w.useState(templates.STANDARD);

  // Khi đổi mẫu template, cập nhật lại nội dung tin nhắn
  const handleSelectTemplate = (tKey) => {
    setSelectedTemplate(tKey);
    setCustomMessage(templates[tKey] || templates.STANDARD);
  };

  // Khôi phục mẫu ban đầu
  const handleResetToCurrentTemplate = () => {
    setCustomMessage(templates[selectedTemplate] || templates.STANDARD);
    setCopyToast("Đã khôi phục về mẫu gốc!");
    setTimeout(() => setCopyToast(""), 2000);
  };

  // Chèn nhanh thông tin vào vị trí con trỏ
  const handleInsertTag = (tagText) => {
    if (textareaRef.current) {
      const el = textareaRef.current;
      const start = el.selectionStart || 0;
      const end = el.selectionEnd || 0;
      const newVal = customMessage.substring(0, start) + tagText + customMessage.substring(end);
      setCustomMessage(newVal);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + tagText.length, start + tagText.length);
      }, 50);
    } else {
      setCustomMessage(prev => prev + " " + tagText);
    }
  };

  // Mở Zalo và tự động sao chép nội dung
  const handleOpenZalo = () => {
    try {
      navigator.clipboard.writeText(customMessage);
      setCopied(true);
      setCopyToast("✓ Đã tự động sao chép tin nhắn! Đang mở Zalo của " + farmerName + "...");
      setTimeout(() => { setCopied(false); setCopyToast(""); }, 4000);
    } catch(e) {}
    if (cleanPhone) {
      window.open("https://zalo.me/" + cleanPhone, "_blank");
    } else {
      alert("Đã sao chép nội dung tin nhắn đầy đủ! Quý khách hãy mở ứng dụng Zalo và dán (Paste) để gửi cho khách hàng.");
    }
  };

  // Gửi qua tin nhắn SMS điện thoại
  const handleSendSMS = () => {
    try {
      navigator.clipboard.writeText(customMessage);
    } catch(e) {}
    const smsBody = "HD Tom Cang Xanh #" + contract.id + " gui Anh/Chi " + farmerName + ". Ngay can: " + weighingDate + ". Gia: " + priceText + ". Coc: " + (depositAmt ? depositAmt.toLocaleString() + "d" : "0d") + ". Xem va ky tai: " + shareUrl;
    window.open("sms:" + cleanPhone + "?body=" + encodeURIComponent(smsBody), "_self");
  };

  // Sao chép chỉ riêng liên kết
  const handleCopyLinkOnly = () => {
    try {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setCopyToast("✓ Đã sao chép liên kết hợp đồng!");
      setTimeout(() => { setCopied(false); setCopyToast(""); }, 2500);
    } catch(e) {}
  };

  // Sao chép toàn bộ tin nhắn
  const handleCopyFullMessage = () => {
    try {
      navigator.clipboard.writeText(customMessage);
      setCopied(true);
      setCopyToast("✓ Đã sao chép toàn bộ nội dung tin nhắn!");
      setTimeout(() => { setCopied(false); setCopyToast(""); }, 2500);
    } catch(e) {}
  };

  // Chia sẻ hệ điều hành đa kênh
  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Hợp Đồng Mua Bán Tôm Càng Xanh - #" + contract.id,
        text: customMessage,
        url: shareUrl
      }).catch(() => {});
    } else {
      handleCopyFullMessage();
    }
  };

  // Tải ảnh mã QR về máy
  const qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=350x350&margin=12&data=" + encodeURIComponent(shareUrl);
  const handleDownloadQR = () => {
    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.target = "_blank";
    link.download = "QR-Hop-Dong-" + contract.id + ".png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return c.jsxs("div", {
    className: "fixed inset-0 z-[160] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200 overflow-y-auto",
    children: [
      c.jsx("div", { className: "fixed inset-0 bg-black/75 backdrop-blur-sm", onClick: onClose }),
      c.jsxs("div", {
        className: "relative bg-white dark:bg-slate-900 rounded-[28px] max-w-xl w-full overflow-hidden shadow-2xl border border-emerald-500/30 flex flex-col my-auto z-10 font-sans",
        children: [
          // Header
          c.jsxs("div", {
            className: "bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 text-white p-4 sm:p-5 flex items-center justify-between shadow-md",
            children: [
              c.jsxs("div", {
                className: "flex items-center gap-3",
                children: [
                  c.jsx("div", {
                    className: "w-11 h-11 bg-white/10 rounded-2xl flex items-center justify-center text-white shadow-inner",
                    children: c.jsx(ZaloIcon, { size: 26 })
                  }),
                  c.jsxs("div", {
                    children: [
                      c.jsx("h3", { className: "font-black text-sm sm:text-base uppercase tracking-tight", children: "Gửi Hợp Đồng Cho Khách Hàng" }),
                      c.jsxs("p", { className: "text-xs text-emerald-200 font-medium flex items-center gap-1 mt-0.5", children: [
                        "Khách: ", c.jsx("strong", { className: "text-white uppercase", children: farmerName }),
                        farmerPhone && c.jsxs("span", { className: "text-emerald-300 font-mono", children: [" (", farmerPhone, ")"] })
                      ] })
                    ]
                  })
                ]
              }),
              c.jsx("button", {
                type: "button",
                onClick: onClose,
                className: "p-2 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-colors cursor-pointer",
                children: c.jsx(_a, { size: 20 })
              })
            ]
          }),

          // Tab Switcher
          c.jsxs("div", {
            className: "flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-1.5 gap-1.5",
            children: [
              c.jsxs("button", {
                type: "button",
                onClick: () => setActiveTab("MESSAGE"),
                className: "flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer " + (activeTab === "MESSAGE" ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"),
                children: [c.jsx(ZaloIcon, { size: 16 }), "Gửi Tin Nhắn & Zalo / SMS"]
              }),
              c.jsxs("button", {
                type: "button",
                onClick: () => setActiveTab("QR"),
                className: "flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer " + (activeTab === "QR" ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"),
                children: [c.jsx(QrCodeIcon, { size: 16 }), "Quét Mã QR Bờ Ao"]
              })
            ]
          }),

          // Body Content
          c.jsxs("div", {
            className: "p-4 sm:p-5 space-y-4 max-h-[76vh] overflow-y-auto",
            children: [
              activeTab === "MESSAGE" ? c.jsxs("div", {
                className: "space-y-4",
                children: [
                  // Preset Template Selectors
                  c.jsxs("div", {
                    className: "space-y-1.5",
                    children: [
                      c.jsxs("div", { className: "flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300", children: [
                        c.jsx("span", { children: "Chọn mẫu tin nhắn tối ưu:" }),
                        c.jsx("span", { className: "text-[11px] text-emerald-600 font-semibold", children: "Có thể chỉnh sửa bên dưới" })
                      ]}),
                      c.jsxs("div", {
                        className: "grid grid-cols-2 sm:grid-cols-4 gap-1.5",
                        children: [
                          c.jsx("button", {
                            type: "button",
                            onClick: () => handleSelectTemplate("STANDARD"),
                            className: "px-2 py-2 rounded-xl text-[11px] font-black border transition-all text-center cursor-pointer " + (selectedTemplate === "STANDARD" ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"),
                            children: "1. Chuẩn Mực"
                          }),
                          c.jsx("button", {
                            type: "button",
                            onClick: () => handleSelectTemplate("QUICK"),
                            className: "px-2 py-2 rounded-xl text-[11px] font-black border transition-all text-center cursor-pointer " + (selectedTemplate === "QUICK" ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"),
                            children: "2. Ngắn Gọn"
                          }),
                          c.jsx("button", {
                            type: "button",
                            onClick: () => handleSelectTemplate("REMINDER"),
                            className: "px-2 py-2 rounded-xl text-[11px] font-black border transition-all text-center cursor-pointer " + (selectedTemplate === "REMINDER" ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"),
                            children: "3. Nhắc Lịch"
                          }),
                          c.jsx("button", {
                            type: "button",
                            onClick: () => handleSelectTemplate("CONFIRMATION"),
                            className: "px-2 py-2 rounded-xl text-[11px] font-black border transition-all text-center cursor-pointer " + (selectedTemplate === "CONFIRMATION" ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"),
                            children: "4. Biên Nhận"
                          })
                        ]
                      })
                    ]
                  }),

                  // Quick Tags Tool
                  c.jsxs("div", {
                    className: "flex flex-wrap items-center gap-1.5 p-2 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700",
                    children: [
                      c.jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-tight mr-1", children: "Chèn nhanh:" }),
                      c.jsx("button", { type: "button", onClick: () => handleInsertTag(farmerName), className: "px-2 py-0.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-emerald-50 rounded text-[10px] font-bold border border-slate-200 dark:border-slate-600 cursor-pointer", children: "+ Tên khách" }),
                      c.jsx("button", { type: "button", onClick: () => handleInsertTag(priceText), className: "px-2 py-0.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-emerald-50 rounded text-[10px] font-bold border border-slate-200 dark:border-slate-600 cursor-pointer", children: "+ Đơn giá" }),
                      c.jsx("button", { type: "button", onClick: () => handleInsertTag(depositAmt ? depositAmt.toLocaleString() + " VNĐ" : "0 VNĐ"), className: "px-2 py-0.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-emerald-50 rounded text-[10px] font-bold border border-slate-200 dark:border-slate-600 cursor-pointer", children: "+ Tiền cọc" }),
                      c.jsx("button", { type: "button", onClick: () => handleInsertTag(weighingDate), className: "px-2 py-0.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-emerald-50 rounded text-[10px] font-bold border border-slate-200 dark:border-slate-600 cursor-pointer", children: "+ Ngày cân" }),
                      c.jsx("button", { type: "button", onClick: () => handleInsertTag(shareUrl), className: "px-2 py-0.5 bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 rounded text-[10px] font-bold border border-slate-200 dark:border-slate-600 cursor-pointer", children: "+ Link HĐ" }),
                      c.jsx("button", { type: "button", onClick: handleResetToCurrentTemplate, className: "ml-auto px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 rounded text-[10px] font-bold border border-amber-200 dark:border-amber-800 cursor-pointer", children: "↺ Khôi phục" })
                    ]
                  }),

                  // Message Textarea (Editable!)
                  c.jsxs("div", {
                    className: "space-y-1.5",
                    children: [
                      c.jsxs("div", { className: "flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300", children: [
                        c.jsx("span", { children: "Nội dung tin nhắn sẽ gửi đi:" }),
                        c.jsxs("span", { className: "text-[11px] text-slate-400 font-mono", children: [customMessage.length, " ký tự"] })
                      ]}),
                      c.jsx("textarea", {
                        ref: textareaRef,
                        value: customMessage,
                        onChange: (e) => setCustomMessage(e.target.value),
                        rows: 8,
                        placeholder: "Nhập hoặc chỉnh sửa nội dung gửi khách...",
                        className: "w-full p-3.5 text-xs font-mono rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none leading-relaxed resize-y shadow-inner focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      })
                    ]
                  }),

                  // Primary Action: Open Zalo
                  c.jsxs("button", {
                    type: "button",
                    onClick: handleOpenZalo,
                    className: "w-full py-3.5 px-4 bg-[#0068FF] hover:bg-[#0052cc] text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 active:scale-95 transition-all cursor-pointer",
                    children: [
                      c.jsx(ZaloIcon, { size: 22 }),
                      c.jsxs("span", { children: [
                        "Mở Zalo Gửi Cho ", farmerName,
                        cleanPhone ? " (" + cleanPhone + ")" : ""
                      ] })
                    ]
                  }),

                  // Toast Notification
                  copyToast && c.jsx("div", {
                    className: "p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold text-center animate-in fade-in duration-200",
                    children: copyToast
                  }),

                  // Secondary Channels Grid
                  c.jsxs("div", {
                    className: "grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1",
                    children: [
                      cleanPhone && c.jsxs("button", {
                        type: "button",
                        onClick: handleSendSMS,
                        className: "py-2.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer",
                        children: [c.jsx(PhoneCallIcon, { size: 14 }), "Gửi SMS"]
                      }),
                      c.jsxs("button", {
                        type: "button",
                        onClick: handleCopyFullMessage,
                        className: "py-2.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer",
                        children: [c.jsx(CopyIcon, { size: 14 }), "Chép Tin Nhắn"]
                      }),
                      c.jsxs("button", {
                        type: "button",
                        onClick: handleCopyLinkOnly,
                        className: "py-2.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer",
                        children: [c.jsx(CopyIcon, { size: 14 }), "Chép Link HĐ"]
                      }),
                      c.jsxs("button", {
                        type: "button",
                        onClick: handleNativeShare,
                        className: "py-2.5 px-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer",
                        children: [c.jsx(Share2Icon, { size: 14 }), "Chia Sẻ Khác"]
                      })
                    ]
                  }),

                  // Share Link Preview
                  c.jsxs("div", {
                    className: "p-2.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 break-all flex items-center justify-between gap-2",
                    children: [
                      c.jsxs("span", { className: "truncate font-mono", children: ["🔗 ", shareUrl] }),
                      c.jsx("button", {
                        type: "button",
                        onClick: handleCopyLinkOnly,
                        className: "shrink-0 px-2.5 py-1 bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 rounded font-bold hover:underline border border-slate-200 dark:border-slate-600 cursor-pointer",
                        children: "Chép link"
                      })
                    ]
                  })
                ]
              }) : c.jsxs("div", {
                className: "text-center space-y-4 py-2",
                children: [
                  c.jsx("p", { className: "text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto", children: "Chủ ao dùng máy ảnh điện thoại hoặc Zalo quét mã bên dưới để mở hợp đồng và ký xác nhận trực tuyến ngay tại bờ ao trong 3 giây:" }),
                  c.jsxs("div", {
                    className: "p-4 bg-white rounded-3xl border-2 border-emerald-500 shadow-xl inline-block mx-auto",
                    children: [
                      c.jsx("img", {
                        src: qrCodeUrl,
                        alt: "Mã QR Hợp Đồng",
                        className: "w-64 h-64 object-contain mx-auto select-none"
                      }),
                      c.jsxs("div", {
                        className: "mt-2 pt-2 border-t border-slate-200 text-center",
                        children: [
                          c.jsxs("p", { className: "font-black text-xs text-slate-800 uppercase", children: ["HỢP ĐỒNG SỐ: ", contract.id] }),
                          c.jsxs("p", { className: "text-[11px] text-slate-500", children: ["Khách hàng: ", farmerName] })
                        ]
                      })
                    ]
                  }),
                  c.jsxs("div", {
                    className: "flex justify-center items-center gap-3 pt-2",
                    children: [
                      c.jsxs("button", {
                        type: "button",
                        onClick: handleDownloadQR,
                        className: "py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer",
                        children: [c.jsx(um, { size: 16 }), "Tải Ảnh Mã QR Về Máy"]
                      }),
                      c.jsxs("button", {
                        type: "button",
                        onClick: handleCopyLinkOnly,
                        className: "py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center gap-2 border border-slate-200 dark:border-slate-700 cursor-pointer",
                        children: [c.jsx(CopyIcon, { size: 16 }), "Chép Liên Kết"]
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
};`;

// ==========================================
// 2. UPGRADED Xm_ContractModal
// ==========================================
const newContractModal = `const Xm_ContractModal = ({ contract, onClose, onUpdateContract }) => {
  if (!contract) return null;
  const [cData, setCData] = w.useState(contract);
  const [showShareModal, setShowShareModal] = w.useState(false);
  const [showSigningModal, setShowSigningModal] = w.useState(false);
  const [viewingMap, setViewingMap] = w.useState(false);
  const [justSignedNotice, setJustSignedNotice] = w.useState(false);

  // Đồng bộ khi prop contract thay đổi
  w.useEffect(() => {
    if (contract) setCData(contract);
  }, [contract]);

  // Lắng nghe cập nhật thời gian thực khi khách ký trên điện thoại
  w.useEffect(() => {
    const handleSync = (e) => {
      const up = e.detail;
      if (up && (up.id === cData.id || up.farmerId === cData.farmerId)) {
        setCData(up);
        setJustSignedNotice(true);
        if (onUpdateContract) onUpdateContract(up);
        setTimeout(() => setJustSignedNotice(false), 10000);
      }
    };
    window.addEventListener("tom_contract_signed", handleSync);
    window.addEventListener("tom_contract_updated", handleSync);

    let bc = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel("tom_contracts_channel");
        bc.onmessage = (ev) => {
          if (ev.data && (ev.data.type === "CONTRACT_SIGNED" || ev.data.type === "CONTRACT_UPDATED")) {
            const up = ev.data.contract;
            if (up && (up.id === cData.id || up.farmerId === cData.farmerId)) {
              setCData(up);
              setJustSignedNotice(true);
              if (onUpdateContract) onUpdateContract(up);
              setTimeout(() => setJustSignedNotice(false), 10000);
            }
          }
        };
      }
    } catch (e) {}

    // Polling API Server liên tục mỗi 2 giây
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/contracts/" + encodeURIComponent(cData.id));
        if (res.ok) {
          const remote = await res.json();
          if (remote && remote.farmerSigned && !cData.farmerSigned) {
            setCData(remote);
            saveContract(remote);
            setJustSignedNotice(true);
            if (onUpdateContract) onUpdateContract(remote);
            setTimeout(() => setJustSignedNotice(false), 10000);
          }
        }
      } catch (e) {}
    }, 2000);

    return () => {
      window.removeEventListener("tom_contract_signed", handleSync);
      window.removeEventListener("tom_contract_updated", handleSync);
      if (bc) bc.close();
      clearInterval(pollInterval);
    };
  }, [cData.id, cData.farmerId, cData.farmerSigned]);

  // Xử lý xoá trực tiếp hợp đồng
  const handleDeleteDirectly = () => {
    const pondName = cData.farmer?.fullName || "chủ ao";
    if (confirm("Bạn có chắc chắn muốn XOÁ VĨNH VIỄN Hợp đồng #" + cData.id + " của " + pondName + "?\\n\\nDữ liệu hợp đồng sẽ bị xoá khỏi máy và máy chủ ngay lập tức.")) {
      deleteContract(cData.id);
      if (onClose) onClose();
      alert("Đã xoá hợp đồng thành công!");
    }
  };

  const depositAmt = Number(cData.depositMoney ?? cData.deposit ?? 0);
  const priceVal = Number(cData.agreedPrice || 0);
  const isSigned = cData.status === "SIGNED_LEGAL" || !!cData.farmerSigned;
  const depositTextWords = depositAmt && typeof numberToWordsVN === "function" ? numberToWordsVN(depositAmt) : "";

  return c.jsxs("div", {
    className: "fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200 overflow-y-auto",
    children: [
      c.jsx("div", { className: "fixed inset-0 bg-black/75 backdrop-blur-sm print:hidden", onClick: onClose }),
      c.jsxs("div", {
        className: "relative bg-white dark:bg-slate-900 rounded-[28px] max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto z-10 font-sans print:border-none print:shadow-none print:max-h-none print:m-0 print:p-0",
        children: [
          // Modal Top Header (Hidden on Print)
          c.jsxs("div", {
            className: "bg-[#1b4d1e] text-white p-4 flex items-center justify-between shadow-md print:hidden",
            children: [
              c.jsxs("div", {
                className: "flex items-center gap-2.5",
                children: [
                  c.jsx("span", { className: "text-2xl", children: "🦐" }),
                  c.jsxs("div", {
                    children: [
                      c.jsx("h3", { className: "font-black text-sm sm:text-base uppercase tracking-tight", children: "Hợp Đồng Mua Bán Tôm Càng Xanh" }),
                      c.jsxs("p", { className: "text-[11px] text-emerald-200 font-medium", children: ["Số hiệu: ", c.jsx("strong", { children: cData.id })] })
                    ]
                  })
                ]
              }),
              c.jsxs("div", {
                className: "flex items-center gap-2",
                children: [
                  isSigned ? c.jsxs("span", {
                    className: "px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 rounded-full text-xs font-black flex items-center gap-1 shadow-sm",
                    children: [c.jsx(CheckCircle2Icon, { size: 14 }), "ĐÃ KÝ HỢP PHÁP"]
                  }) : c.jsx("span", {
                    className: "px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/40 rounded-full text-xs font-black",
                    children: "CHỜ KHÁCH KÝ"
                  }),
                  c.jsx("button", {
                    type: "button",
                    onClick: onClose,
                    className: "p-1.5 hover:bg-white/20 rounded-full text-white transition-colors cursor-pointer",
                    children: c.jsx(_a, { size: 20 })
                  })
                ]
              })
            ]
          }),

          // Action Toolbar (Hidden on Print)
          c.jsxs("div", {
            className: "bg-slate-50 dark:bg-slate-800/60 p-2.5 sm:px-6 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 print:hidden",
            children: [
              c.jsxs("div", {
                className: "flex items-center gap-2 flex-wrap",
                children: [
                  c.jsxs("button", {
                    type: "button",
                    onClick: () => setShowShareModal(true),
                    className: "px-4 py-2 bg-[#0068FF] hover:bg-[#0052cc] text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer",
                    children: [c.jsx(ZaloIcon, { size: 16 }), "Gửi Khách Hàng (Zalo/SMS/QR)"]
                  }),
                  !isSigned && c.jsxs("button", {
                    type: "button",
                    onClick: () => setShowSigningModal(true),
                    className: "px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer",
                    children: [c.jsx("span", { children: "✍️" }), "Ký Thay Tại Chỗ"]
                  }),
                  c.jsxs("button", {
                    type: "button",
                    onClick: handleDeleteDirectly,
                    className: "px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors border border-red-200 dark:border-red-900 cursor-pointer active:scale-95",
                    children: [c.jsx("span", { children: "🗑️" }), "Xoá HĐ"]
                  })
                ]
              }),
              c.jsxs("div", {
                className: "flex items-center gap-2",
                children: [
                  c.jsxs("button", {
                    type: "button",
                    onClick: () => window.print(),
                    className: "px-3.5 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl font-bold text-xs flex items-center gap-1.5 text-slate-800 dark:text-slate-200 hover:bg-slate-50 cursor-pointer shadow-sm",
                    children: [c.jsx(Ms, { size: 16 }), "In / Tải PDF A4"]
                  })
                ]
              })
            ]
          }),

          // Thông báo thời gian thực khi khách vừa ký
          justSignedNotice && c.jsxs("div", {
            className: "bg-emerald-600 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold animate-in fade-in duration-300 shadow-inner print:hidden",
            children: [
              c.jsxs("div", {
                className: "flex items-center gap-2",
                children: [
                  c.jsx("span", { className: "text-base", children: "🎉" }),
                  c.jsxs("span", {
                    children: [
                      "Khách hàng vừa ký hợp đồng thành công lúc: ",
                      c.jsx("strong", { className: "underline text-amber-200", children: cData.farmerSignedAt || "Vừa xong" }),
                      " • Bản hợp đồng đã kích hoạt hiệu lực pháp lý ngay lập tức!"
                    ]
                  })
                ]
              }),
              c.jsx("button", {
                type: "button",
                onClick: () => setJustSignedNotice(false),
                className: "text-white/80 hover:text-white font-bold ml-2 cursor-pointer",
                children: "✕"
              })
            ]
          }),

          // Contract Body (Printable Area)
          c.jsxs("div", {
            id: "contract-print-area",
            className: "p-4 sm:p-8 overflow-y-auto space-y-6 text-xs sm:text-sm text-slate-800 dark:text-slate-200 print:text-black print:overflow-visible print:p-6 print:m-0",
            children: [
              // Executive Summary Highlight Card (Quick View)
              c.jsxs("div", {
                className: "bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-emerald-950/40 p-3.5 sm:p-4 rounded-2xl border border-emerald-300 dark:border-emerald-800 shadow-sm print:hidden",
                children: [
                  c.jsxs("div", {
                    className: "flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800 pb-2 mb-2.5",
                    children: [
                      c.jsxs("span", { className: "text-xs font-black uppercase text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5", children: [c.jsx(Fu, { size: 16 }), "Tóm Tắt Nhanh Hợp Đồng"] }),
                      isSigned ? c.jsxs("span", { className: "text-[11px] font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1", children: [c.jsx(CheckCircle2Icon, { size: 14 }), "Đã Ký Hợp Pháp"] }) : c.jsx("span", { className: "text-[11px] font-black text-amber-600 dark:text-amber-400", children: "Chờ Khách Ký" })
                    ]
                  }),
                  c.jsxs("div", {
                    className: "grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center",
                    children: [
                      c.jsxs("div", {
                        className: "bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs",
                        children: [
                          c.jsx("div", { className: "text-[10px] text-slate-500 font-bold uppercase", children: "Chủng loại tôm" }),
                          c.jsx("div", { className: "font-black text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm mt-0.5 truncate", children: cData.shrimpType || "Tôm Càng Xanh" })
                        ]
                      }),
                      c.jsxs("div", {
                        className: "bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs",
                        children: [
                          c.jsx("div", { className: "text-[10px] text-slate-500 font-bold uppercase", children: "Đơn giá chốt" }),
                          c.jsx("div", { className: "font-black text-red-600 dark:text-red-400 text-sm sm:text-base mt-0.5", children: priceVal ? priceVal.toLocaleString() + " đ/kg" : "Theo bảng giá" })
                        ]
                      }),
                      c.jsxs("div", {
                        className: "bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs",
                        children: [
                          c.jsx("div", { className: "text-[10px] text-slate-500 font-bold uppercase", children: "Tiền đặt cọc" }),
                          c.jsx("div", { className: "font-black text-blue-700 dark:text-blue-400 text-xs sm:text-sm mt-0.5", children: depositAmt ? depositAmt.toLocaleString() + " VNĐ" : "0 VNĐ" })
                        ]
                      }),
                      c.jsxs("div", {
                        className: "bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs",
                        children: [
                          c.jsx("div", { className: "text-[10px] text-slate-500 font-bold uppercase", children: "Ngày kéo cân" }),
                          c.jsxs("div", { className: "font-black text-amber-700 dark:text-amber-400 text-xs sm:text-sm mt-0.5", children: [cData.weighingDate || "Thỏa thuận", " (", cData.weighingTime || "06:00", ")"] })
                        ]
                      })
                    ]
                  })
                ]
              }),

              // National Legal Title (Print Header)
              c.jsxs("div", {
                className: "text-center space-y-1 pb-4 border-b border-slate-200 dark:border-slate-800 print:border-black",
                children: [
                  c.jsx("h2", { className: "font-black text-xs sm:text-sm uppercase tracking-widest text-slate-800 dark:text-slate-200 print:text-black", children: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" }),
                  c.jsx("p", { className: "text-xs font-bold text-slate-600 dark:text-slate-400 print:text-black italic", children: "Độc lập - Tự do - Hạnh phúc" }),
                  c.jsx("div", { className: "w-32 h-0.5 bg-slate-400 mx-auto my-2 print:bg-black" }),
                  c.jsx("h3", { className: "font-black text-base sm:text-xl uppercase text-emerald-900 dark:text-emerald-300 print:text-black pt-2 tracking-wide", children: "HỢP ĐỒNG KINH TẾ MUA BÁN THƯƠNG MẠI" }),
                  c.jsxs("p", { className: "text-xs font-bold text-emerald-700 dark:text-emerald-400 print:text-black", children: ["(V/v Thu mua Tôm Càng Xanh thương phẩm tại bờ ao - Số: #", cData.id, ")"] })
                ]
              }),

              // Parties Information
              c.jsxs("div", {
                className: "grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2",
                children: [
                  // Party A (Trader / Purchasing Facility)
                  c.jsxs("div", {
                    className: "p-4 bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-900/60 space-y-1.5 print:bg-white print:border-black",
                    children: [
                      c.jsxs("h4", { className: "font-black uppercase text-blue-900 dark:text-blue-300 print:text-black text-xs tracking-wide flex items-center gap-1.5", children: [c.jsx(Fu, { size: 16 }), "BÊN A: BÊN THU MUA (THƯƠNG LÁI/CƠ SỞ)"] }),
                      c.jsxs("p", { children: [c.jsx("strong", { children: "Cơ sở: " }), cData.trader?.fullName || "Cơ sở thu mua Tôm Càng Xanh"] }),
                      c.jsxs("p", { children: [c.jsx("strong", { children: "Điện thoại: " }), cData.trader?.phone || "0987.654.321"] }),
                      c.jsxs("p", { children: [c.jsx("strong", { children: "CCCD/ĐKKD: " }), cData.trader?.idCard || "089090012345"] }),
                      c.jsxs("p", { children: [c.jsx("strong", { children: "Địa chỉ: " }), cData.trader?.address || "Huyện Năm Căn, Tỉnh Cà Mau"] })
                    ]
                  }),

                  // Party B (Farmer / Pond Owner)
                  c.jsxs("div", {
                    className: "p-4 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/60 space-y-1.5 print:bg-white print:border-black",
                    children: [
                      c.jsxs("h4", { className: "font-black uppercase text-amber-900 dark:text-amber-300 print:text-black text-xs tracking-wide flex items-center gap-1.5", children: [c.jsx(Os, { size: 16 }), "BÊN B: BÊN BÁN (CHỦ AO TÔM)"] }),
                      c.jsxs("p", { children: [c.jsx("strong", { children: "Họ và tên: " }), c.jsx("span", { className: "font-black uppercase text-emerald-800 dark:text-emerald-300 print:text-black", children: cData.farmer?.fullName || "Chủ ao" })] }),
                      c.jsxs("p", { children: [c.jsx("strong", { children: "Điện thoại: " }), cData.farmer?.phone || "Chưa cập nhật"] }),
                      c.jsxs("p", { children: [c.jsx("strong", { children: "CCCD: " }), cData.farmer?.idCard || "Chưa cập nhật"] }),
                      c.jsxs("p", { children: [c.jsx("strong", { children: "Địa chỉ ao: " }), cData.farmer?.address || "Chưa cập nhật"] }),
                      cData.farmer?.coordinates && c.jsxs("div", {
                        className: "pt-1 flex items-center justify-between text-xs text-blue-700 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 print:hidden",
                        children: [
                          c.jsxs("span", { children: ["Tọa độ GPS ao: ", cData.farmer.coordinates.lat.toFixed(5) + ", " + cData.farmer.coordinates.lng.toFixed(5)] }),
                          c.jsxs("button", {
                            type: "button",
                            onClick: () => setViewingMap(true),
                            className: "text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer",
                            children: [c.jsx(MapIcon, { size: 12 }), "Xem bản đồ ao"]
                          })
                        ]
                      })
                    ]
                  })
                ]
              }),

              // 6 Detailed Legal Articles
              c.jsxs("div", {
                className: "space-y-4",
                children: [
                  c.jsx("h4", { className: "font-black uppercase text-center text-sm tracking-wider text-emerald-800 dark:text-emerald-400 print:text-black border-y border-slate-200 dark:border-slate-700 print:border-black py-2", children: "CÁC ĐIỀU KHOẢN KINH TẾ & TRÁCH NHIỆM PHÁP LÝ" }),

                  // Article 1
                  c.jsxs("div", {
                    className: "space-y-1 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 print:bg-white print:border-black",
                    children: [
                      c.jsxs("p", { children: [
                        c.jsx("strong", { children: "Điều 1 (Đối tượng mua bán, Kế hoạch & Địa điểm cân): " }),
                        "Bên B đồng ý bán và Bên A đồng ý thu mua toàn bộ số lượng tôm thuộc ao nuôi nói trên với chủng loại: ",
                        c.jsx("strong", { className: "text-emerald-800 dark:text-emerald-300 print:text-black uppercase", children: cData.shrimpType || "Tôm Càng Xanh Loại 1" }),
                        ". Ngày kéo cân: ",
                        c.jsx("strong", { className: "text-emerald-700 dark:text-emerald-300 print:text-black font-bold", children: cData.weighingDate || "Theo thỏa thuận" }),
                        " (Dự kiến bắt đầu lúc: ",
                        c.jsx("span", { className: "font-bold", children: cData.weighingTime || "06:00" }),
                        "). Địa điểm cân tôm: Trực tiếp tại bờ ao của Bên B."
                      ] })
                    ]
                  }),

                  // Article 2
                  c.jsxs("div", {
                    className: "space-y-1 bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/60 dark:border-amber-800/40 print:bg-white print:border-black",
                    children: [
                      c.jsxs("p", { children: [
                        c.jsx("strong", { children: "Điều 2 (Đơn giá chốt & Tiêu chuẩn chất lượng): " }),
                        "Đơn giá chốt thu mua: ",
                        priceVal ? c.jsxs("strong", { className: "text-red-600 dark:text-red-400 print:text-black font-bold text-sm", children: [priceVal.toLocaleString(), " VNĐ/kg"] }) : "Theo phân loại kích cỡ tôm thương phẩm.",
                        " Tiêu chuẩn chất lượng: Tôm sống bơi khỏe trong bể sủi oxy đạt tỷ lệ ≥ 95%, vỏ bóng cứng, không bị dị tật hay tồn dư chất cấm."
                      ] }),
                      c.jsxs("p", { children: [
                        c.jsx("strong", { children: "• Quy cách dạt tôm: " }),
                        c.jsx("span", { className: "text-amber-900 dark:text-amber-300 print:text-black font-bold", children: cData.rejectionSpec || "Tôm mềm, ốp, đứt đầu, gãy càng dạt sang hàng xào tính giá thỏa thuận" })
                      ] }),
                      c.jsxs("p", { children: [
                        c.jsx("strong", { children: "• Quy cách trừ bì & ráo nước: " }),
                        c.jsx("span", { className: "text-slate-700 dark:text-slate-300 print:text-black", children: cData.tareSpec || "Trừ hao ráo nước chuẩn 1kg/thùng cân điện tử" })
                      ] })
                    ]
                  }),

                  // Article 3 & 4
                  c.jsxs("div", {
                    className: "space-y-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 print:bg-white print:border-black",
                    children: [
                      c.jsxs("p", { children: [
                        c.jsx("strong", { children: "Điều 3 (Phương thức cân đo & Phương tiện): " }),
                        "Cân đo bằng Cân Điện Tử chính xác đã được kiểm định, thực hiện công khai tại bờ ao có sự chứng kiến, kiểm tra và ký nhận trực tiếp từng mẻ cân của cả hai bên."
                      ] }),
                      c.jsxs("p", { children: [
                        c.jsx("strong", { children: "Điều 4 (Tiền đặt cọc & Hình thức thanh toán): " }),
                        "Bên A đã giao và Bên B đã nhận số tiền đặt cọc là: ",
                        c.jsx("strong", { className: "text-blue-700 dark:text-blue-400 print:text-black font-bold text-sm", children: depositAmt ? depositAmt.toLocaleString() + " VNĐ" : "0 VNĐ" }),
                        depositTextWords ? c.jsxs("span", { children: [" (Bằng chữ: ", c.jsx("em", { className: "font-bold", children: depositTextWords }), ")"] }) : "",
                        ". Số tiền còn lại sau khi hoàn tất cân mẻ tôm cuối cùng, Bên A có trách nhiệm thanh toán dứt điểm 100% bằng tiền mặt hoặc chuyển khoản ngân hàng ngay tại bờ ao trước khi vận chuyển tôm rời khỏi ao."
                      ] })
                    ]
                  }),

                  // Article 5: Commitment & Penalties
                  c.jsxs("div", {
                    className: "p-3.5 bg-red-50/70 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900/40 space-y-1.5 print:bg-white print:border-black",
                    children: [
                      c.jsx("p", { className: "font-black text-red-700 dark:text-red-400 print:text-black text-xs uppercase", children: "Điều 5: Cam kết cọc & Trách nhiệm bồi thường vi phạm hợp đồng" }),
                      c.jsxs("p", { className: "leading-relaxed text-slate-800 dark:text-slate-200 print:text-black", children: [
                        "1. Nếu Bên A (Bên mua) tự ý huỷ hợp đồng hoặc không đến cân đúng lịch hẹn mà không có lý do bất khả kháng: Bên A mất toàn bộ 100% số tiền đã đặt cọc cho Bên B.\\n",
                        "2. Nếu Bên B (Bên bán) tự ý huỷ hợp đồng, bán tôm cho thương lái khác, hoặc cố tình trốn tránh không kéo cân: Bên B có nghĩa vụ hoàn trả lại số tiền cọc đã nhận và bồi thường thêm một khoản tiền tương đương (tổng cộng bằng 02 lần số tiền cọc) cho Bên A trong vòng 24 giờ."
                      ] })
                    ]
                  }),

                  // Article 6
                  c.jsxs("p", {
                    className: "text-[11px] text-slate-500 dark:text-slate-400 print:text-black italic leading-normal",
                    children: [
                      "Điều 6: Hợp đồng này được lập căn cứ theo Bộ luật Dân sự 2015 và Luật Giao dịch điện tử 2023. Bản hợp đồng ký số / ký tay điện tử qua hệ thống có giá trị pháp lý ràng buộc tuyệt đối tương đương hợp đồng ký giấy trực tiếp. Hai bên cam kết thực hiện đúng mọi điều khoản đã thỏa thuận."
                    ]
                  })
                ]
              }),

              // Signatures Section
              c.jsxs("div", {
                className: "pt-6 border-t-2 border-slate-200 dark:border-slate-700 print:border-black grid grid-cols-2 gap-4 font-sans text-xs print:grid-cols-2",
                children: [
                  // Party A Signature & Seal
                  c.jsxs("div", {
                    className: "text-center space-y-2 flex flex-col items-center",
                    children: [
                      c.jsx("p", { className: "font-black uppercase text-slate-800 dark:text-slate-200 print:text-black", children: "BÊN A (BÊN MUA)" }),
                      c.jsxs("div", {
                        className: "my-2 w-28 h-28 rounded-full border-4 border-red-600 border-dashed flex flex-col items-center justify-center text-red-600 p-2 transform -rotate-6 shadow-xs select-none",
                        children: [
                          c.jsx("span", { className: "text-[8px] font-black uppercase text-center leading-tight", children: cData.trader?.fullName || "CƠ SỞ THU MUA TÔM" }),
                          c.jsx("div", { className: "w-14 h-0.5 bg-red-600 my-1" }),
                          c.jsx("span", { className: "text-[10px] font-black tracking-widest", children: "ĐÃ XÁC NHẬN" }),
                          c.jsx("span", { className: "text-[8px] font-mono opacity-80 mt-0.5", children: cData.createdAt?.substring(0, 10) || "Đã đóng dấu" })
                        ]
                      }),
                      c.jsx("p", { className: "font-black uppercase text-slate-800 dark:text-slate-200 print:text-black", children: cData.trader?.fullName || "Thương lái" })
                    ]
                  }),

                  // Party B Signature (Farmer)
                  c.jsxs("div", {
                    className: "text-center space-y-2 flex flex-col items-center",
                    children: [
                      c.jsx("p", { className: "font-black uppercase text-slate-800 dark:text-slate-200 print:text-black", children: "BÊN B (BÊN BÁN - CHỦ AO)" }),
                      isSigned ? c.jsxs("div", {
                        className: "my-2 flex flex-col items-center space-y-1",
                        children: [
                          cData.farmerSignatureImg ? c.jsx("img", {
                            src: cData.farmerSignatureImg,
                            alt: "Chữ ký chủ ao",
                            className: "h-16 max-w-[160px] object-contain border border-emerald-300 rounded-xl bg-white p-1 shadow-xs"
                          }) : c.jsx("div", {
                            className: "py-2 px-4 border border-emerald-300 bg-emerald-50 rounded-xl text-emerald-900 font-serif italic text-base font-bold",
                            children: cData.farmer?.fullName
                          }),
                          c.jsxs("div", {
                            className: "px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-full text-[10px] font-bold flex items-center gap-1",
                            children: [c.jsx(CheckCircle2Icon, { size: 11 }), "✓ ĐÃ KÝ ĐIỆN TỬ HỢP PHÁP"]
                          }),
                          c.jsxs("p", { className: "text-[10px] text-slate-400 font-mono", children: ["Thời gian ký: ", cData.farmerSignedAt || "Vừa xong"] })
                        ]
                      }) : c.jsxs("div", {
                        className: "my-3 flex flex-col items-center p-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl print:border-black",
                        children: [
                          c.jsx("span", { className: "text-xs font-bold text-slate-400 print:text-black", children: "Chờ chủ ao ký xác nhận" }),
                          c.jsx("button", {
                            type: "button",
                            onClick: () => setShowShareModal(true),
                            className: "mt-2 px-3 py-1.5 bg-[#0068FF] text-white rounded-xl text-xs font-black shadow-sm print:hidden cursor-pointer",
                            children: "Gửi Zalo cho khách ký"
                          })
                        ]
                      }),
                      c.jsx("p", { className: "font-black uppercase text-slate-800 dark:text-slate-200 print:text-black", children: cData.farmer?.fullName || "Chủ ao" })
                    ]
                  })
                ]
              })
            ]
          }),

          // Modals
          showShareModal && c.jsx(Xm_ShareZaloModal, {
            contract: cData,
            onClose: () => setShowShareModal(false)
          }),
          showSigningModal && c.jsx(Xm_BankSigningModal, {
            contract: cData,
            onClose: () => setShowSigningModal(false),
            onSigned: (up) => {
              setCData(up);
              if (onUpdateContract) onUpdateContract(up);
            }
          }),
          viewingMap && cData.farmer?.coordinates && c.jsx(Xm_MapModal, {
            coordinates: cData.farmer.coordinates,
            address: cData.farmer.address,
            pondName: cData.farmer.fullName,
            onClose: () => setViewingMap(false)
          })
        ]
      })
    ]
  });
};`;

// Replace from startPos (const Xm_ShareZaloModal) to endPos (const Xm_MapModal)
const updatedChunk = newShareModal + "\\n\\n" + newContractModal + "\\n\\n";
code = code.slice(0, startPos) + updatedChunk + code.slice(endPos);

fs.writeFileSync(FILE, code, 'utf8');
console.log("Successfully updated Xm_ShareZaloModal and Xm_ContractModal! New code length:", code.length);
