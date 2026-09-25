const fs = require("fs");

console.log("Reading bundle...");
let src = fs.readFileSync("assets/index-Os1X4Z7e.js", "utf8");

// Part 1: Replace profile storage functions
const p1_start = src.indexOf("const getDefaultTraderProfileV3 = () => ({");
const p1_end = src.indexOf("const Xm_OverviewTab = ({ setRoute, onViewDetail, role }) => {");

if (p1_start === -1 || p1_end === -1) {
  console.error("Could not find Part 1 boundaries!", { p1_start, p1_end });
  process.exit(1);
}

const newProfileStorageCode = `const getDefaultTraderProfileV3 = () => ({
  fullName: "Cơ Sở Thu Mua Tôm Càng Xanh Năm Căn",
  representative: "Lê Văn Mừng",
  phone: "0918 123 456",
  secondaryPhone: "0949 888 999",
  idCard: "089090012345",
  issueDate: "15/08/2021",
  issuePlace: "Cục CSQLHC về TTXH",
  address: "Khóm 1, TT. Năm Căn, H. Năm Căn, Tỉnh Cà Mau",
  province: "Cà Mau",
  district: "Năm Căn",
  email: "levanmung98@gmail.com",
  note: "Chuyên thu mua tôm càng xanh oxy chạy hàng, cân chuẩn, tiền mặt/chuyển khoản dứt điểm tại ao",
  bankName: "MB",
  bankAccountNumber: "0918123456",
  bankAccountName: "LE VAN MUNG",
  defaultDeposit: 5000000,
  tarePer100Kg: 1,
  tareRatioValue: 1,
  harvestStartTime: "04:30",
  harvestEndTime: "08:30",
  shrimpTypes: [
    { id: "st1", name: "Tôm càng sen", price: 160000, desc: "Tôm sống oxy loại 1, thịt chắc, sáng vỏ", isDefault: true },
    { id: "st2", name: "Tôm càng xào", price: 110000, desc: "Tôm size nhỏ vừa, thịt ngọt, tươi nguyên" },
    { id: "st3", name: "Tôm ngộp", price: 85000, desc: "Tôm vừa ngộp tươi ướp đá sạch sẽ" },
    { id: "st4", name: "Tôm lột", price: 95000, desc: "Tôm mềm vỏ / lột mới" },
    { id: "st5", name: "Tôm càng đại (loại 1)", price: 190000, desc: "Tôm cồ to đại, trọng lượng cao" },
    { id: "st6", name: "Tôm xô tuyển chọn tại ao", price: 135000, desc: "Tôm xô đồng đều, bắt sạch ao" },
    { id: "st7", name: "Tôm dạt / gãy càng", price: 75000, desc: "Tôm phân loại dạt hoặc mất càng" }
  ],
  shrimpSizes: [
    { id: "st1", name: "Tôm càng sen", price: 160000, desc: "Tôm sống oxy loại 1, thịt chắc, sáng vỏ", isDefault: true },
    { id: "st2", name: "Tôm càng xào", price: 110000, desc: "Tôm size nhỏ vừa, thịt ngọt, tươi nguyên" },
    { id: "st3", name: "Tôm ngộp", price: 85000, desc: "Tôm vừa ngộp tươi ướp đá sạch sẽ" },
    { id: "st4", name: "Tôm lột", price: 95000, desc: "Tôm mềm vỏ / lột mới" },
    { id: "st5", name: "Tôm càng đại (loại 1)", price: 190000, desc: "Tôm cồ to đại, trọng lượng cao" },
    { id: "st6", name: "Tôm xô tuyển chọn tại ao", price: 135000, desc: "Tôm xô đồng đều, bắt sạch ao" },
    { id: "st7", name: "Tôm dạt / gãy càng", price: 75000, desc: "Tôm phân loại dạt hoặc mất càng" }
  ],
  catchingSpecs: [
    { id: "c1", text: "Kéo lưới vét rạng sáng hoặc đặt dớn sạch bún bùn", defaultSelected: true },
    { id: "c2", text: "Tỷ lệ tôm sống oxy đạt từ 95% trở lên lúc cân tại bờ ao", defaultSelected: true },
    { id: "c3", text: "Tôm khỏe mạnh, đều màu, nguyên vẹn càng và vỏ cứng", defaultSelected: true },
    { id: "c4", text: "Quy cách trừ bì: Ráo nước chuẩn 1 kg / 100 kg (hoặc theo thỏa thuận tại ao)", defaultSelected: true },
    { id: "c5", text: "Thời gian bắt: Buổi sáng sớm mát trời (4h30 - 8h30)", defaultSelected: true },
    { id: "c6", text: "Thương lái tự bố trí nhân công, bình oxy và ghe/xe chuyên dụng", defaultSelected: true },
    { id: "c7", text: "Thanh toán dứt điểm 100% tiền mặt hoặc chuyển khoản ngay sau khi cân xong", defaultSelected: true }
  ],
  defaultTerms: "Hai bên cam kết thực hiện đúng thỏa thuận về số lượng, giá cả và quy cách bắt tôm theo hợp đồng điện tử đã ký kết. Nếu Bên B tự ý bán cho người khác sau khi đã nhận tiền đặt cọc thì Bên B phải hoàn trả toàn bộ số tiền cọc đã nhận và chịu phạt đền gấp đôi (02 lần) số tiền cọc cho Bên A; Nếu Bên A tự ý bỏ cọc thì mất toàn bộ số tiền cọc. Mọi tranh chấp được giải quyết theo quy định của Bộ luật Dân sự 2015 và Luật Thương mại."
});

const getTraderProfileV3 = () => {
  if (typeof window !== "undefined" && window._cachedTraderProfile) {
    return window._cachedTraderProfile;
  }
  try {
    const raw = localStorage.getItem("tom_trader_profile");
    if (raw) {
      const parsed = JSON.parse(raw);
      const def = getDefaultTraderProfileV3();
      const res = { ...def, ...parsed };
      if (!Array.isArray(res.shrimpTypes) || res.shrimpTypes.length === 0) {
        res.shrimpTypes = Array.isArray(res.shrimpSizes) && res.shrimpSizes.length > 0 ? res.shrimpSizes : def.shrimpTypes;
      }
      res.shrimpSizes = res.shrimpTypes;
      if (typeof window !== "undefined") {
        window._cachedTraderProfile = res;
      }
      return res;
    }
  } catch (e) {}
  const def = getDefaultTraderProfileV3();
  if (typeof window !== "undefined") {
    window._cachedTraderProfile = def;
  }
  return def;
};

const saveTraderProfileV3 = (p) => {
  if (!p) return;
  if (p.shrimpTypes) {
    p.shrimpSizes = p.shrimpTypes;
  }
  p._updatedAt = Date.now();
  if (typeof window !== "undefined") {
    window._cachedTraderProfile = p;
  }
  try {
    localStorage.setItem("tom_trader_profile", JSON.stringify(p));
  } catch (e) {
    console.warn("Storage warning:", e);
  }
  try {
    fetch("/api/trader-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p)
    }).catch(e => console.warn("API save warning:", e));
  } catch (e) {}
  try {
    window.dispatchEvent(new CustomEvent("trader-profile-updated", { detail: p }));
  } catch (e) {}
};

if (typeof window !== "undefined") {
  setTimeout(() => {
    try {
      fetch("/api/trader-profile")
        .then(r => r.json())
        .then(d => {
          if (d && d.profile && typeof d.profile === "object") {
            const def = getDefaultTraderProfileV3();
            const merged = { ...def, ...d.profile };
            window._cachedTraderProfile = merged;
            try { localStorage.setItem("tom_trader_profile", JSON.stringify(merged)); } catch(e) {}
            window.dispatchEvent(new CustomEvent("trader-profile-updated", { detail: merged }));
          }
        })
        .catch(() => {});
    } catch(e) {}
  }, 100);
};`;

src = src.slice(0, p1_start) + newProfileStorageCode + src.slice(p1_end);
console.log("Part 1 applied.");

// Part 2: Replace Xm_TraderConfig
const p2_start = src.indexOf("const Xm_TraderConfig = ({ setRoute }) => {");
const nextMarker = "// 3. DANH SÁCH CHỦ AO";
const p2_end = src.indexOf(nextMarker, p2_start);

if (p2_start === -1 || p2_end === -1) {
  console.error("Could not find Part 2 boundaries!", { p2_start, p2_end });
  process.exit(1);
}

const newComponentCode = fs.readFileSync("tmp/generated_Xm_TraderConfig.txt", "utf8").trim() + "\n";

src = src.slice(0, p2_start) + newComponentCode + src.slice(p2_end);
console.log("Part 2 applied.");

fs.writeFileSync("assets/index-Os1X4Z7e.js", src, "utf8");
console.log("Successfully updated assets/index-Os1X4Z7e.js!");
