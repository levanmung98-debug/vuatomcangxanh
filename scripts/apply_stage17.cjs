const fs = require("fs");
const path = require("path");

const bundlePath = path.join(__dirname, "../assets/index-v7.js");
let bundle = fs.readFileSync(bundlePath, "utf8");

// ========================================================
// 1. LOẠI BỎ HOÀN TOÀN TÍNH NĂNG NÂNG CẤP PREMIUM
// ========================================================

// 1.1 Quota & isPremium methods
bundle = bundle.replace(
  'static isPremium(){const b=this.getUser();return(b==null?void 0:b.subscriptionStatus)==="PREMIUM"}',
  'static isPremium(){return true;}'
);

bundle = bundle.replace(
  'static checkQuota(b){return this.isPremium()?{canAdd:!0}:b==="SESSIONS"&&this.getSessions().length>=10?{canAdd:!1,message:"Bạn đã đạt giới hạn 10 phiếu (Bản Miễn Phí). Vui lòng nâng cấp Premium để lưu trữ không giới hạn!"}:b==="VEHICLES"&&this.getVehicles().length>=2?{canAdd:!1,message:"Giới hạn 2 phương tiện cho bản Miễn Phí. Nâng cấp để quản lý đội xe lớn!"}:{canAdd:!0}}',
  'static checkQuota(b){return {canAdd:true};}'
);

// 1.2 Remove Premium banner in History component
const oldHistoryPremiumBanner = '!Y&&b==="OWNER"&&c.jsxs("div",{onClick:()=>f(!0),className:"bg-gradient-to-r from-amber-400 to-orange-500 rounded-[30px] p-5 text-white shadow-lg flex items-center justify-between cursor-pointer active:scale-95 transition-all",children:[c.jsxs("div",{className:"flex items-center gap-4",children:[c.jsx("div",{className:"bg-white/20 p-3 rounded-2xl",children:c.jsx(Fu,{size:30})}),c.jsxs("div",{children:[c.jsx("p",{className:"font-black uppercase italic leading-none",children:"Nâng cấp Premium"}),c.jsx("p",{className:"text-[10px] font-bold opacity-80 uppercase mt-1",children:"Mở khóa sức mạnh quản lý toàn diện"})]})]}),c.jsx("button",{className:"bg-white text-orange-600 p-2 rounded-xl shadow-md",children:c.jsx(F1,{size:20})})]}),';
if (bundle.includes(oldHistoryPremiumBanner)) {
  bundle = bundle.replace(oldHistoryPremiumBanner, '/* Premium banner removed */');
  console.log("1.2 Premium banner in History removed");
} else {
  console.log("1.2 Warning: Premium banner string not found directly");
}

// 1.3 Remove quota limit / 10 and status Premium / Miễn phí in History
const oldQuotaDisplay = '!Y&&b==="OWNER"&&c.jsxs("span",{className:"text-xs opacity-50",children:["/ ",v]})';
if (bundle.includes(oldQuotaDisplay)) {
  bundle = bundle.replace(oldQuotaDisplay, 'null');
  console.log("1.3 Quota display / 10 removed");
}

const oldStatusPremium = 'Y?c.jsxs(c.Fragment,{children:[c.jsx(Fu,{size:14,className:"text-yellow-400"})," Premium"]}):"Miễn phí"';
if (bundle.includes(oldStatusPremium)) {
  bundle = bundle.replace(oldStatusPremium, '"Không giới hạn"');
  console.log("1.3 Status Premium changed to Không giới hạn");
}

// 1.4 Remove quota warning banner in History
const oldQuotaWarn = '_&&c.jsxs("div",{className:"bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-4 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400",children:[c.jsx(ym,{size:20,className:"shrink-0"}),c.jsxs("p",{className:"text-xs font-bold leading-tight",children:["Bạn sắp dùng hết số lượt lưu trữ miễn phí (",A,"/",v,"). Vui lòng sao lưu dữ liệu hoặc nâng cấp Premium."]})]}),';
if (bundle.includes(oldQuotaWarn)) {
  bundle = bundle.replace(oldQuotaWarn, '/* Quota warning removed */');
  console.log("1.4 Quota warning banner removed");
}

// 1.5 Neutralize Premium modal
bundle = bundle.replace(
  'p&&c.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"',
  'false&&c.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"'
);

// 1.6 Neutralize any other Premium text
bundle = bundle.replaceAll('b==="OWNER"?"Premium":"Nông Dân"', 'b==="OWNER"?"Vựa Thu Mua":"Nông Dân"');


// ========================================================
// 2. LOẠI BỎ TAB GHE / XE VẬN CHUYỂN KHỎI MENU
// ========================================================
const oldVehicleMenu = '{route:re.VEHICLES,label:"Ghe / Xe vận chuyển",icon:c.jsx(tc,{size:22}),roles:["OWNER"]},';
if (bundle.includes(oldVehicleMenu)) {
  bundle = bundle.replace(oldVehicleMenu, '/* Vehicles menu tab removed */');
  console.log("2. Ghe / Xe vận chuyển tab removed from menu");
} else {
  console.log("2. Warning: oldVehicleMenu not found directly");
}


// ========================================================
// 3. NÂNG CẤP ĐỌC HỢP ĐỒNG (TEXT-TO-SPEECH)
// ========================================================
const oldHandleSpeakMarker = 'const handleSpeakContract = () => {    if (!contract) return;    if (isSpeaking) {      window.speechSynthesis.cancel();      setIsSpeaking(false);      return;    }';
const newHandleSpeakReplacement = `const handleSpeakContract = () => {
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
      const traderName = contract.traderName || contract.trader?.fullName || "Vựa thu mua Tôm Càng Xanh";
      const traderAddress = contract.traderAddress || contract.trader?.address || "theo địa chỉ đăng ký cơ sở thu mua";
      const farmerName = contract.farmerName || contract.farmer?.fullName || contract.farmer?.name || "Chủ ao";
      const farmerAddress = contract.farmerAddress || contract.farmer?.address || "theo địa chỉ ao nuôi";
      const shrimpType = contract.shrimpType || "Tôm càng xanh tỷ lệ sống từ 95% tăng lên";
      const dateStr = contract.weighingDate || "theo thỏa thuận hai bên";
      const timeStr = contract.weighingTime || "05 giờ sáng";
      const estimatedYield = contract.estimatedYield ? (contract.estimatedYield + " ký") : "theo sản lượng thực tế tại ao";
      const priceStr = priceVal ? (priceVal.toLocaleString() + " đồng một ký") : "theo phân loại kích cỡ tôm chi tiết";
      const depositStr = depositAmt ? (depositAmt.toLocaleString() + " đồng, bằng chữ: " + (typeof numberToWordsVN_v3 === "function" ? numberToWordsVN_v3(depositAmt) : "")) : "0 đồng";
      const rejectionSpec = contract.rejectionSpec || (typeof getStandardSpecsString === "function" ? getStandardSpecsString() : "Dạt tôm mềm, ốp, gãy càng chuyển sang tính giá tôm xào");
      const tareSpec = contract.tareSpec || "Trừ hao ráo nước chuẩn 1 ký trên một thùng cân";
      const qualityStandard = contract.qualityStandard || "Tôm tươi sống nguyên vẹn bơi khỏe, tỷ lệ sống sục oxy từ 95% trở lên lúc cân tại bờ ao";
      const compensationTerms = contract.compensationTerms || "Bên nào vi phạm bồi thường gấp 02 lần tiền cọc. Nếu bên bán tự ý bán tôm cho người khác sau khi đã nhận tiền đặt cọc thì bên bán phải bồi hoàn 100% số tiền cọc đã nhận và chịu phạt một khoản tiền tương đương 2 lần tiền cọc cho bên mua. Nếu bên mua không đến thu mua theo đúng thời gian cam kết mà không có lý do chính đáng thì bị mất toàn bộ số tiền đã đặt cọc.";

      const textChunks = [
        "Hợp đồng mua bán thu mua Tôm Càng Xanh.",
        "Số hợp đồng: " + contract.id + ".",
        "Bên mua là: " + traderName + ", địa chỉ: " + traderAddress + ".",
        "Bên bán là: " + farmerName + ", địa chỉ: " + farmerAddress + ".",
        "Loại tôm cần mua: " + shrimpType + ". Thời gian mua và thời gian cân tôm: ngày " + dateStr + ", lúc " + timeStr + ". Sản lượng dự kiến: " + estimatedYield + ".",
        "Sau đây là toàn bộ Điều 2: Tiêu chuẩn phẩm chất, quy cách và đơn giá thu mua.",
        "Mục 2.1: Đơn giá chốt thu mua là " + priceStr + ".",
        "Tiêu chuẩn dạt tôm: " + rejectionSpec + ".",
        "Quy định trừ hao ráo nước: " + tareSpec + ".",
        "Tiêu chuẩn tôm sống oxy: " + qualityStandard + ".",
        "Mục 2.2: Tiêu chuẩn phẩm chất: Tôm tươi sống nguyên vẹn bơi khỏe, màu sắc tự nhiên, vỏ sạch bùn, không lẫn tạp chất tăng trọng hay hóa chất cấm.",
        "Về tiền đặt cọc và hình thức thanh toán:",
        "Bên mua đã đặt cọc số tiền: " + depositStr + ".",
        "Hình thức thanh toán: Bên mua thanh toán dứt điểm 100% bằng tiền mặt hoặc chuyển khoản ngân hàng ngay sau khi hoàn thành việc cân và ký biên bản giao nhận tại bờ ao. Tiền đặt cọc được cấn trừ toàn bộ vào đợt thanh toán dứt điểm khi kết thúc đợt cân tôm cuối cùng trong ngày.",
        "Về cam kết cọc và trách nhiệm bồi thường vi phạm hợp đồng:",
        compensationTerms,
        "Kính mời quý khách kiểm tra kỹ các điều khoản và bấm nút Ký Hợp Đồng Ngay để xác nhận điện tử hợp pháp."
      ];

      let chunkIdx = 0;
      const speakNext = () => {
        if (chunkIdx >= textChunks.length) {
          setIsSpeaking(false);
          return;
        }
        const currentText = textChunks[chunkIdx];
        chunkIdx++;
        const utt = new SpeechSynthesisUtterance(currentText);
        utt.lang = "vi-VN";
        utt.rate = 0.95;
        utt.onend = () => speakNext();
        utt.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utt);
      };

      setIsSpeaking(true);
      speakNext();
      return;
    } catch(e) {
      console.warn("TTS error", e);
      setIsSpeaking(false);
    }
  };`;

// Replace from oldHandleSpeakMarker up to the end of that function
const oldSpeakEnd = 'window.speechSynthesis.speak(utterance);    } catch(e) {      console.warn("TTS error", e);    }  };';
const fullOldSpeak = bundle.slice(bundle.indexOf(oldHandleSpeakMarker), bundle.indexOf(oldSpeakEnd) + oldSpeakEnd.length);
if (bundle.includes(fullOldSpeak)) {
  bundle = bundle.replace(fullOldSpeak, newHandleSpeakReplacement);
  console.log("3. Enhanced TTS handleSpeakContract replaced successfully");
} else {
  console.log("3. Warning: fullOldSpeak not matched exactly");
}


// ========================================================
// 4. KHI KHÁCH KÝ: KHÔNG HIỂN THỊ THÔNG BÁO NHẤP NHÁY
//    CHUYỂN "CHỜ KHÁCH KÝ" SANG "KHÁCH HÀNG ĐÃ KÝ"
// ========================================================

// 4.1 Remove blinking justSignedNotice banner in trader modal
const oldJustSignedBanner = `justSignedNotice && c.jsxs("div", {
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
          }),`;

if (bundle.includes(oldJustSignedBanner)) {
  bundle = bundle.replace(oldJustSignedBanner, '/* Flashing notification banner removed */');
  console.log("4.1 Flashing justSignedNotice banner removed from trader modal");
} else {
  console.log("4.1 Warning: oldJustSignedBanner not found directly");
}

// 4.2 In trader modal header: update badge to "KHÁCH HÀNG ĐÃ KÝ"
const oldTraderModalHeaderBadge = `isSigned ? c.jsxs("span", {
                    className: "px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 rounded-full text-xs font-black flex items-center gap-1 shadow-sm",
                    children: [c.jsx(CheckCircle2Icon, { size: 14 }), "ĐÃ KÝ HỢP PHÁP"]
                  }) : c.jsx("span", {
                    className: "px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/40 rounded-full text-xs font-black",
                    children: "CHỜ KHÁCH KÝ"
                  })`;

const newTraderModalHeaderBadge = `isSigned ? c.jsxs("span", {
                    className: "px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-black flex items-center gap-1 shadow-sm",
                    children: [c.jsx(CheckCircle2Icon, { size: 14 }), "KHÁCH HÀNG ĐÃ KÝ"]
                  }) : c.jsx("span", {
                    className: "px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/40 rounded-full text-xs font-black",
                    children: "CHỜ KHÁCH KÝ"
                  })`;

if (bundle.includes(oldTraderModalHeaderBadge)) {
  bundle = bundle.replace(oldTraderModalHeaderBadge, newTraderModalHeaderBadge);
  console.log("4.2 Trader modal header badge changed to KHÁCH HÀNG ĐÃ KÝ");
} else {
  console.log("4.2 Warning: oldTraderModalHeaderBadge not found directly");
}

// 4.3 In customer view header: change "ĐÃ KÝ HỢP PHÁP" to "KHÁCH HÀNG ĐÃ KÝ"
const oldCustomerHeaderBadge = `isSigned ? c.jsxs("span", {
                      className: "px-2 py-0.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black flex items-center gap-1",
                      children: [c.jsx(CheckCircle2Icon, { size: 12 }), "ĐÃ KÝ HỢP PHÁP"]
                    }) : c.jsx("span", {
                      className: "px-2 py-0.5 bg-amber-500 text-white rounded-lg text-[10px] font-black",
                      children: "CHỜ KHÁCH KÝ"
                    })`;

const newCustomerHeaderBadge = `isSigned ? c.jsxs("span", {
                      className: "px-2 py-0.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black flex items-center gap-1",
                      children: [c.jsx(CheckCircle2Icon, { size: 12 }), "KHÁCH HÀNG ĐÃ KÝ"]
                    }) : c.jsx("span", {
                      className: "px-2 py-0.5 bg-amber-500 text-white rounded-lg text-[10px] font-black",
                      children: "CHỜ KHÁCH KÝ"
                    })`;

if (bundle.includes(oldCustomerHeaderBadge)) {
  bundle = bundle.replace(oldCustomerHeaderBadge, newCustomerHeaderBadge);
  console.log("4.3 Customer header badge changed to KHÁCH HÀNG ĐÃ KÝ");
} else {
  console.log("4.3 Warning: oldCustomerHeaderBadge not found directly");
}

// 4.4 In Farmer / Pond card: Show "CHỜ KHÁCH KÝ" when contract pending, and "KHÁCH HÀNG ĐÃ KÝ" when signed
const oldPondCardBadge = `const isC = foundC?.status === "SIGNED_LEGAL" || !!foundC?.farmerSigned;
                                if (!isC) return null;
                                return c.jsxs("span", {
                                  className: "px-2.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-full text-[10px] font-black flex items-center gap-1 shadow-xs animate-in fade-in",
                                  children: [
                                    c.jsx("span", { children: "✓" }),
                                    "ĐÃ KÝ ĐIỆN TỬ",
                                    foundC.farmerSignedAt && c.jsxs("span", { className: "font-medium opacity-75 hidden sm:inline", children: [" (", foundC.farmerSignedAt, ")"] })
                                  ]
                                });`;

const newPondCardBadge = `if (!foundC) return null;
                                const isC = foundC?.status === "SIGNED_LEGAL" || !!foundC?.farmerSigned;
                                return isC ? c.jsxs("span", {
                                  className: "px-2.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-full text-[10px] font-black flex items-center gap-1 shadow-xs",
                                  children: [
                                    c.jsx("span", { children: "✓" }),
                                    "KHÁCH HÀNG ĐÃ KÝ",
                                    foundC.farmerSignedAt && c.jsxs("span", { className: "font-medium opacity-75 hidden sm:inline", children: [" (", foundC.farmerSignedAt, ")"] })
                                  ]
                                }) : c.jsxs("span", {
                                  className: "px-2.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-full text-[10px] font-black flex items-center gap-1 shadow-xs",
                                  children: [
                                    c.jsx("span", { children: "⏳" }),
                                    "CHỜ KHÁCH KÝ"
                                  ]
                                });`;

if (bundle.includes(oldPondCardBadge)) {
  bundle = bundle.replace(oldPondCardBadge, newPondCardBadge);
  console.log("4.4 Pond card badge updated for both CHỜ KHÁCH KÝ and KHÁCH HÀNG ĐÃ KÝ");
} else {
  console.log("4.4 Warning: oldPondCardBadge not found directly");
}

// Save to assets/index-v7.js
fs.writeFileSync(bundlePath, bundle, "utf8");

// Also synchronize to public/assets/index-v7.js
const publicBundlePath = path.join(__dirname, "../public/assets/index-v7.js");
fs.writeFileSync(publicBundlePath, bundle, "utf8");

// Also synchronize to old names just in case
fs.writeFileSync(path.join(__dirname, "../assets/index-Os1X4Z7e.js"), bundle, "utf8");
fs.writeFileSync(path.join(__dirname, "../public/assets/index-Os1X4Z7e.js"), bundle, "utf8");

console.log("All bundles updated and synchronized successfully!");
