const fs = require("fs");
const path = require("path");

const bundlePath = path.join(__dirname, "../assets/index-v7.js");
let bundle = fs.readFileSync(bundlePath, "utf8");

// =========================================================================
// 1. EXTEND STORAGE KEYS & METHODS ON 'me' AND 'Ot'
// =========================================================================
const oldOtSection = 'Ot.SALES = "annong_sales_v2";\nOt.BUYERS = "annong_buyers_v2";';
const newOtSection = `Ot.SALES = "annong_sales_v2";
Ot.BUYERS = "annong_buyers_v2";
Ot.FINANCE_PARTNERS = "annong_finance_partners_v1";
Ot.FINANCE_TRANSACTIONS = "annong_finance_transactions_v1";

// Extend me storage for Finance & Capital Management
me.getFinancePartners = function() {
  try {
    const raw = localStorage.getItem(Ot.FINANCE_PARTNERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch(e) {}
  const defaults = [
    {
      id: "part_1",
      name: "Anh Bảy Cà Mau (Vốn chính)",
      phone: "0918.234.567",
      address: "Đầm Dơi, Cà Mau",
      totalContributed: 500000000,
      totalWithdrawn: 0,
      currentCapital: 500000000,
      profitSharePercent: 40,
      note: "Góp vốn xoay vòng mua tôm ao lớn & xuất nhà máy",
      createdAt: "2026-09-01T08:00:00.000Z"
    },
    {
      id: "part_2",
      name: "Chị Năm Vựa Hộ Phòng",
      phone: "0949.888.999",
      address: "Giá Rai, Bạc Liêu",
      totalContributed: 300000000,
      totalWithdrawn: 50000000,
      currentCapital: 250000000,
      profitSharePercent: 30,
      note: "Hỗ trợ vốn gom tôm oxy chạy chợ & xí nghiệp",
      createdAt: "2026-09-10T09:30:00.000Z"
    },
    {
      id: "part_3",
      name: "Anh Hùng Bến Tre",
      phone: "0903.112.233",
      address: "Ba Tri, Bến Tre",
      totalContributed: 200000000,
      totalWithdrawn: 0,
      currentCapital: 200000000,
      profitSharePercent: 20,
      note: "Cổ đông tài trợ chuyến cân tôm vuông sinh thái",
      createdAt: "2026-09-15T14:00:00.000Z"
    }
  ];
  try {
    localStorage.setItem(Ot.FINANCE_PARTNERS, JSON.stringify(defaults));
  } catch(e) {}
  return defaults;
};

me.saveFinancePartners = function(list) {
  try {
    localStorage.setItem(Ot.FINANCE_PARTNERS, JSON.stringify(list));
  } catch(e) {}
};

me.getFinanceTransactions = function() {
  try {
    const raw = localStorage.getItem(Ot.FINANCE_TRANSACTIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch(e) {}
  const defaults = [
    {
      id: "tx_init_1",
      type: "CAPITAL_IN",
      category: "Vốn góp đối tác",
      partnerId: "part_1",
      partnerName: "Anh Bảy Cà Mau (Vốn chính)",
      amount: 500000000,
      paymentMethod: "BANK",
      date: "2026-09-01T08:30:00.000Z",
      note: "Chuyển khoản vốn đầu vụ mua tôm càng",
      creator: "Chủ vựa"
    },
    {
      id: "tx_init_2",
      type: "CAPITAL_IN",
      category: "Vốn góp đối tác",
      partnerId: "part_2",
      partnerName: "Chị Năm Vựa Hộ Phòng",
      amount: 300000000,
      paymentMethod: "BANK",
      date: "2026-09-10T10:00:00.000Z",
      note: "Góp vốn lưu động thu mua tôm oxy",
      creator: "Chủ vựa"
    },
    {
      id: "tx_init_3",
      type: "CAPITAL_IN",
      category: "Vốn góp đối tác",
      partnerId: "part_3",
      partnerName: "Anh Hùng Bến Tre",
      amount: 200000000,
      paymentMethod: "CASH",
      date: "2026-09-15T14:30:00.000Z",
      note: "Giao tiền mặt tại vựa làm vốn đi cân ao",
      creator: "Chủ vựa"
    },
    {
      id: "tx_init_4",
      type: "EXPENSE_OUT",
      category: "Đá ướp & Bảo quản",
      amount: 4500000,
      paymentMethod: "CASH",
      date: "2026-09-20T06:00:00.000Z",
      note: "Mua 90 cây đá xay ướp tôm tươi xuất nhà máy",
      creator: "Quản lý vựa"
    },
    {
      id: "tx_init_5",
      type: "EXPENSE_OUT",
      category: "Túi & Bình oxy",
      amount: 3200000,
      paymentMethod: "CASH",
      date: "2026-09-21T07:30:00.000Z",
      note: "Bơm 8 bình oxy lớn & mua bọc PE đóng tôm sống",
      creator: "Đoàn cân"
    },
    {
      id: "tx_init_6",
      type: "EXPENSE_OUT",
      category: "Xăng dầu vận chuyển",
      amount: 5800000,
      paymentMethod: "CASH",
      date: "2026-09-22T17:00:00.000Z",
      note: "Đổ dầu 2 xe tải chở tôm đi giao Camimex & Chợ",
      creator: "Tài xế"
    },
    {
      id: "tx_init_7",
      type: "EXPENSE_OUT",
      category: "Thuê nhân công / Bốc vác",
      amount: 6000000,
      paymentMethod: "CASH",
      date: "2026-09-23T18:00:00.000Z",
      note: "Trả công 6 anh em kéo lưới, lựa tôm và khiêng sọt tại ao",
      creator: "Trưởng đoàn"
    },
    {
      id: "tx_init_8",
      type: "CAPITAL_OUT",
      category: "Rút vốn / Hoàn vốn",
      partnerId: "part_2",
      partnerName: "Chị Năm Vựa Hộ Phòng",
      amount: 50000000,
      paymentMethod: "BANK",
      date: "2026-09-25T11:00:00.000Z",
      note: "Hoàn vốn đợt 1 theo yêu cầu",
      creator: "Chủ vựa"
    }
  ];
  try {
    localStorage.setItem(Ot.FINANCE_TRANSACTIONS, JSON.stringify(defaults));
  } catch(e) {}
  return defaults;
};

me.saveFinanceTransactions = function(list) {
  try {
    localStorage.setItem(Ot.FINANCE_TRANSACTIONS, JSON.stringify(list));
  } catch(e) {}
};
`;

if (bundle.includes(oldOtSection)) {
  bundle = bundle.replace(oldOtSection, newOtSection);
  console.log("Storage keys and methods extended!");
} else {
  console.log("oldOtSection not found, check syntax");
}

fs.writeFileSync(bundlePath, bundle, "utf8");
console.log("Stage 1 storage extension saved!");
