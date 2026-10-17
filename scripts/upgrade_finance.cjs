const fs = require("fs");
const path = require("path");

const bundlePath = path.join(__dirname, "../assets/index-v7.js");
let bundle = fs.readFileSync(bundlePath, "utf8");

const pStart = bundle.indexOf("const Xm_FinanceScreen =");
const pEnd = bundle.indexOf("const BmMainApp=");

if (pStart === -1 || pEnd === -1) {
  console.error("Boundaries not found! pStart:", pStart, "pEnd:", pEnd);
  process.exit(1);
}

const upgradedFinanceScreen = `const Xm_FinanceScreen = ({ setRoute, role }) => {
  const [activeTab, setActiveTab] = w.useState("overview");
  const [dateRange, setDateRange] = w.useState("ALL"); // ALL | TODAY | WEEK | MONTH
  const [partners, setPartners] = w.useState([]);
  const [transactions, setTransactions] = w.useState([]);
  const [sessions, setSessions] = w.useState([]);
  const [sales, setSales] = w.useState([]);

  // Modals
  const [showAddPartnerModal, setShowAddPartnerModal] = w.useState(false);
  const [editingPartner, setEditingPartner] = w.useState(null);
  const [showContributeModal, setShowContributeModal] = w.useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = w.useState(false);
  const [showProfitPayoutModal, setShowProfitPayoutModal] = w.useState(false);
  const [targetPartner, setTargetPartner] = w.useState(null);
  const [showAddExpenseModal, setShowAddExpenseModal] = w.useState(false);
  const [showCollectDebtModal, setShowCollectDebtModal] = w.useState(false);
  const [targetSaleForDebt, setTargetSaleForDebt] = w.useState(null);
  const [showPartnerDetailModal, setShowPartnerDetailModal] = w.useState(false);

  // Filters
  const [expenseFilter, setExpenseFilter] = w.useState("ALL");
  const [ledgerFilter, setLedgerFilter] = w.useState("ALL");
  const [debtFilter, setDebtFilter] = w.useState("RECEIVABLE"); // RECEIVABLE | ALL
  const [searchLedger, setSearchLedger] = w.useState("");

  // Forms
  const [partnerForm, setPartnerForm] = w.useState({
    name: "",
    phone: "",
    address: "",
    profitSharePercent: 0,
    note: ""
  });

  const [fundForm, setFundForm] = w.useState({
    amount: "",
    paymentMethod: "BANK",
    note: ""
  });

  const [profitForm, setProfitForm] = w.useState({
    amount: "",
    paymentMethod: "BANK",
    tripName: "",
    note: ""
  });

  const [expenseForm, setExpenseForm] = w.useState({
    name: "",
    category: "Đá ướp & Bảo quản",
    amount: "",
    paymentMethod: "CASH",
    payer: "Chủ vựa",
    tripName: "",
    note: ""
  });

  const [debtCollectForm, setDebtCollectForm] = w.useState({
    amount: "",
    paymentMethod: "BANK",
    note: ""
  });

  const refreshData = () => {
    try {
      if (typeof me !== "undefined") {
        setPartners(me.getFinancePartners ? me.getFinancePartners() : []);
        setTransactions(me.getFinanceTransactions ? me.getFinanceTransactions() : []);
        setSessions(me.getSessions ? me.getSessions() : []);
        setSales(me.getSales ? me.getSales() : []);
      }
    } catch(e) {
      console.warn("Refresh finance data error", e);
    }
  };

  w.useEffect(() => {
    refreshData();
  }, []);

  const _e = ($) => Number($ || 0).toLocaleString("vi-VN");
  const fmtKg = (n) => {
    if (!n || n <= 0) return "0";
    const r = Math.round(n * 100) / 100;
    return Number.isInteger(r) ? String(r) : String(r);
  };

  // Date Filter Helper
  const isWithinDateRange = (dateStr) => {
    if (dateRange === "ALL") return true;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    if (dateRange === "TODAY") {
      return d.toDateString() === now.toDateString();
    }
    if (dateRange === "WEEK") {
      const past7 = new Date();
      past7.setDate(now.getDate() - 7);
      return d >= past7;
    }
    if (dateRange === "MONTH") {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // Live Computed Metrics
  const metrics = w.useMemo(() => {
    const filteredTxs = transactions.filter(t => isWithinDateRange(t.date));
    const filteredSessions = sessions.filter(s => isWithinDateRange(s.date || s.createdAt));
    const filteredSales = sales.filter(s => isWithinDateRange(s.date || s.createdAt));

    // 1. Partners Capital
    const totalContributed = partners.reduce((acc, p) => acc + (Number(p.totalContributed) || 0), 0);
    const totalWithdrawn = partners.reduce((acc, p) => acc + (Number(p.totalWithdrawn) || 0), 0);
    const totalProfitPaid = transactions.filter(t => t.type === "PROFIT_PAYOUT").reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const activePartnerCapital = totalContributed - totalWithdrawn;

    // 2. Buying Sessions (Tiền chi mua tôm ao)
    const totalShrimpBoughtKg = filteredSessions.reduce((acc, s) => acc + (Number(s.totalNet) || Number(s.totalGross) || 0), 0);
    const totalShrimpBoughtMoney = filteredSessions.reduce((acc, s) => acc + (Number(s.finalAmount) || Number(s.grandTotal) || Number(s.totalMoney) || Number(s.depositAmount) || 0), 0);

    // 3. Sales (Tiền thu từ xuất bán tôm)
    const totalShrimpSoldKg = filteredSales.reduce((acc, s) => acc + (Number(s.totalNet) || Number(s.totalGross) || 0), 0);
    const totalShrimpSoldMoney = filteredSales.reduce((acc, s) => acc + (Number(s.totalMoney) || 0), 0);
    const totalShrimpSoldCollected = filteredSales.reduce((acc, s) => {
      const tot = Number(s.totalMoney) || 0;
      if (s.isPaidFull) return acc + tot;
      const debt = Number(s.remainingDebt) || 0;
      return acc + (tot - debt);
    }, 0);
    const totalDebtRemaining = sales.reduce((acc, s) => acc + (Number(s.remainingDebt) || 0), 0);

    // 4. Operating Expenses
    const totalExpenses = filteredTxs.filter(t => t.type === "EXPENSE_OUT").reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    // 5. Net Available Cash in Fund (Két tiền mặt vựa)
    const extraIn = transactions.filter(t => t.type === "SALE_IN" || t.type === "DEBT_IN" || t.type === "OTHER_IN").reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const extraOut = transactions.filter(t => t.type === "PURCHASE_OUT" || t.type === "OTHER_OUT").reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const availableCash = activePartnerCapital + totalShrimpSoldCollected + extraIn - totalShrimpBoughtMoney - totalExpenses - extraOut - totalProfitPaid;

    // 6. Estimated Profit
    const netProfit = totalShrimpSoldMoney - totalShrimpBoughtMoney - totalExpenses;
    const profitPerKg = totalShrimpBoughtKg > 0 ? Math.round(netProfit / totalShrimpBoughtKg) : 0;
    const expensePerKg = totalShrimpBoughtKg > 0 ? Math.round(totalExpenses / totalShrimpBoughtKg) : 0;

    return {
      totalContributed,
      totalWithdrawn,
      totalProfitPaid,
      activePartnerCapital,
      totalShrimpBoughtKg,
      totalShrimpBoughtMoney,
      totalShrimpSoldKg,
      totalShrimpSoldMoney,
      totalShrimpSoldCollected,
      totalDebtRemaining,
      totalExpenses,
      availableCash,
      netProfit,
      profitPerKg,
      expensePerKg
    };
  }, [partners, sessions, sales, transactions, dateRange]);

  // Handle Partner Save
  const handleSavePartner = (e) => {
    e && e.preventDefault();
    if (!partnerForm.name.trim()) {
      alert("Vui lòng nhập tên đối tác góp vốn!");
      return;
    }
    const currentList = [...partners];
    if (editingPartner) {
      const idx = currentList.findIndex(p => p.id === editingPartner.id);
      if (idx !== -1) {
        currentList[idx] = {
          ...currentList[idx],
          name: partnerForm.name.trim(),
          phone: partnerForm.phone.trim(),
          address: partnerForm.address.trim(),
          profitSharePercent: Number(partnerForm.profitSharePercent) || 0,
          note: partnerForm.note.trim()
        };
      }
    } else {
      const newPart = {
        id: "part_" + Date.now(),
        name: partnerForm.name.trim(),
        phone: partnerForm.phone.trim(),
        address: partnerForm.address.trim(),
        totalContributed: 0,
        totalWithdrawn: 0,
        currentCapital: 0,
        profitSharePercent: Number(partnerForm.profitSharePercent) || 0,
        note: partnerForm.note.trim(),
        createdAt: new Date().toISOString()
      };
      currentList.unshift(newPart);
    }
    me.saveFinancePartners(currentList);
    setPartners(currentList);
    setShowAddPartnerModal(false);
    setEditingPartner(null);
  };

  // Handle Capital In (Nhập Vốn)
  const handleConfirmContribute = () => {
    if (!targetPartner) return;
    const amountNum = Number(fundForm.amount);
    if (!amountNum || amountNum <= 0) {
      alert("Vui lòng nhập số tiền vốn hợp lệ!");
      return;
    }
    const updatedPartners = partners.map(p => {
      if (p.id === targetPartner.id) {
        const contributed = (p.totalContributed || 0) + amountNum;
        const current = (p.currentCapital || 0) + amountNum;
        return { ...p, totalContributed: contributed, currentCapital: current };
      }
      return p;
    });

    const newTx = {
      id: "tx_" + Date.now(),
      type: "CAPITAL_IN",
      category: "Vốn góp đối tác",
      partnerId: targetPartner.id,
      partnerName: targetPartner.name,
      amount: amountNum,
      paymentMethod: fundForm.paymentMethod || "BANK",
      date: new Date().toISOString(),
      note: fundForm.note ? fundForm.note.trim() : "Đối tác nhập vốn mua tôm",
      creator: "Chủ vựa"
    };

    const updatedTx = [newTx, ...transactions];
    me.saveFinancePartners(updatedPartners);
    me.saveFinanceTransactions(updatedTx);
    setPartners(updatedPartners);
    setTransactions(updatedTx);
    setShowContributeModal(false);
    setFundForm({ amount: "", paymentMethod: "BANK", note: "" });
    alert("Đã nhập thành công " + _e(amountNum) + " đ tiền vốn từ " + targetPartner.name + "!");
  };

  // Handle Capital Out (Rút / Hoàn Vốn)
  const handleConfirmWithdraw = () => {
    if (!targetPartner) return;
    const amountNum = Number(fundForm.amount);
    if (!amountNum || amountNum <= 0) {
      alert("Vui lòng nhập số tiền rút hợp lệ!");
      return;
    }
    const currentCap = targetPartner.currentCapital || 0;
    if (amountNum > currentCap) {
      if (!confirm("Số tiền rút (" + _e(amountNum) + " đ) lớn hơn vốn hiện có (" + _e(currentCap) + " đ) của đối tác. Bạn có chắc chắn muốn ghi nhận?")) {
        return;
      }
    }
    const updatedPartners = partners.map(p => {
      if (p.id === targetPartner.id) {
        const withdrawn = (p.totalWithdrawn || 0) + amountNum;
        const current = (p.currentCapital || 0) - amountNum;
        return { ...p, totalWithdrawn: withdrawn, currentCapital: current };
      }
      return p;
    });

    const newTx = {
      id: "tx_" + Date.now(),
      type: "CAPITAL_OUT",
      category: "Rút vốn / Hoàn vốn",
      partnerId: targetPartner.id,
      partnerName: targetPartner.name,
      amount: amountNum,
      paymentMethod: fundForm.paymentMethod || "BANK",
      date: new Date().toISOString(),
      note: fundForm.note ? fundForm.note.trim() : "Hoàn trả vốn cho đối tác",
      creator: "Chủ vựa"
    };

    const updatedTx = [newTx, ...transactions];
    me.saveFinancePartners(updatedPartners);
    me.saveFinanceTransactions(updatedTx);
    setPartners(updatedPartners);
    setTransactions(updatedTx);
    setShowWithdrawModal(false);
    setFundForm({ amount: "", paymentMethod: "BANK", note: "" });
    alert("Đã ghi nhận rút " + _e(amountNum) + " đ vốn cho " + targetPartner.name + "!");
  };

  // Handle Profit Payout (Chi Trả Lợi Nhuận / Chia Lãi)
  const handleConfirmProfitPayout = () => {
    if (!targetPartner) return;
    const amountNum = Number(profitForm.amount);
    if (!amountNum || amountNum <= 0) {
      alert("Vui lòng nhập số tiền chia lãi hợp lệ!");
      return;
    }
    const newTx = {
      id: "tx_" + Date.now(),
      type: "PROFIT_PAYOUT",
      category: "Chia lãi đối tác",
      partnerId: targetPartner.id,
      partnerName: targetPartner.name,
      amount: amountNum,
      paymentMethod: profitForm.paymentMethod || "BANK",
      date: new Date().toISOString(),
      tripName: profitForm.tripName || "",
      note: profitForm.note ? profitForm.note.trim() : ("Chi trả lợi nhuận kinh doanh tôm" + (profitForm.tripName ? " - " + profitForm.tripName : "")),
      creator: "Chủ vựa"
    };
    const updatedTx = [newTx, ...transactions];
    me.saveFinanceTransactions(updatedTx);
    setTransactions(updatedTx);
    setShowProfitPayoutModal(false);
    setProfitForm({ amount: "", paymentMethod: "BANK", tripName: "", note: "" });
    alert("Đã ghi nhận chi trả " + _e(amountNum) + " đ lợi nhuận cho " + targetPartner.name + "!");
  };

  // Handle Save Expense
  const handleSaveExpense = (e) => {
    e && e.preventDefault();
    const amountNum = Number(expenseForm.amount);
    if (!expenseForm.name.trim() || !amountNum || amountNum <= 0) {
      alert("Vui lòng nhập tên khoản chi và số tiền hợp lệ!");
      return;
    }
    const newTx = {
      id: "tx_" + Date.now(),
      type: "EXPENSE_OUT",
      category: expenseForm.category || "Khác",
      name: expenseForm.name.trim(),
      amount: amountNum,
      paymentMethod: expenseForm.paymentMethod || "CASH",
      date: new Date().toISOString(),
      payer: expenseForm.payer.trim() || "Chủ vựa",
      tripName: expenseForm.tripName ? expenseForm.tripName.trim() : "",
      note: expenseForm.note ? expenseForm.note.trim() : expenseForm.name.trim(),
      creator: "Quản lý vựa"
    };
    const updatedTx = [newTx, ...transactions];
    me.saveFinanceTransactions(updatedTx);
    setTransactions(updatedTx);
    setShowAddExpenseModal(false);
    setExpenseForm({ name: "", category: "Đá ướp & Bảo quản", amount: "", paymentMethod: "CASH", payer: "Chủ vựa", tripName: "", note: "" });
  };

  // Handle Collect Debt (Thu Nợ Khách)
  const handleConfirmCollectDebt = () => {
    if (!targetSaleForDebt) return;
    const amountNum = Number(debtCollectForm.amount);
    const remDebt = Number(targetSaleForDebt.remainingDebt) || 0;
    if (!amountNum || amountNum <= 0 || amountNum > remDebt) {
      alert("Vui lòng nhập số tiền thu nợ hợp lệ (tối đa " + _e(remDebt) + " đ)!");
      return;
    }

    const newRemainingDebt = remDebt - amountNum;
    const isPaidNow = newRemainingDebt <= 0;

    const updatedSale = me.updateSale(targetSaleForDebt.id, {
      remainingDebt: newRemainingDebt,
      isPaidFull: isPaidNow,
      paidAmount: (targetSaleForDebt.paidAmount || 0) + amountNum
    });

    const newTx = {
      id: "tx_" + Date.now(),
      type: "DEBT_IN",
      category: "Thu nợ bán tôm",
      amount: amountNum,
      paymentMethod: debtCollectForm.paymentMethod || "BANK",
      date: new Date().toISOString(),
      referenceCode: targetSaleForDebt.code,
      name: "Thu nợ: " + targetSaleForDebt.buyerName + " (Phiếu " + targetSaleForDebt.code + ")",
      note: debtCollectForm.note ? debtCollectForm.note.trim() : ("Thu nợ phiếu xuất bán " + targetSaleForDebt.code),
      creator: "Chủ vựa"
    };

    const updatedTx = [newTx, ...transactions];
    me.saveFinanceTransactions(updatedTx);
    setTransactions(updatedTx);
    refreshData();
    setShowCollectDebtModal(false);
    setDebtCollectForm({ amount: "", paymentMethod: "BANK", note: "" });
    alert("Đã thu thành công " + _e(amountNum) + " đ tiền nợ từ " + targetSaleForDebt.buyerName + "!");
  };

  // Handle Delete Transaction
  const handleDeleteTx = (id) => {
    if (!confirm("Bạn có chắc chắn muốn xóa giao dịch này khỏi sổ quỹ?")) return;
    const target = transactions.find(t => t.id === id);
    if (target && target.partnerId) {
      const updatedPartners = partners.map(p => {
        if (p.id === target.partnerId) {
          if (target.type === "CAPITAL_IN") {
            return {
              ...p,
              totalContributed: Math.max(0, (p.totalContributed || 0) - target.amount),
              currentCapital: (p.currentCapital || 0) - target.amount
            };
          } else if (target.type === "CAPITAL_OUT") {
            return {
              ...p,
              totalWithdrawn: Math.max(0, (p.totalWithdrawn || 0) - target.amount),
              currentCapital: (p.currentCapital || 0) + target.amount
            };
          }
        }
        return p;
      });
      me.saveFinancePartners(updatedPartners);
      setPartners(updatedPartners);
    }
    const updatedTx = transactions.filter(t => t.id !== id);
    me.saveFinanceTransactions(updatedTx);
    setTransactions(updatedTx);
  };

  // Share Overall Zalo Report
  const handleShareZaloReport = () => {
    let msg = "📊 [BÁO CÁO TÀI CHÍNH & QUỸ VỐN MUA TÔM]\\n";
    msg += "Kỳ báo cáo: " + (dateRange === "TODAY" ? "Hôm nay" : (dateRange === "WEEK" ? "7 ngày qua" : (dateRange === "MONTH" ? "Tháng này" : "Toàn bộ"))) + "\\n";
    msg += "Thời gian xuất: " + new Date().toLocaleString("vi-VN") + "\\n";
    msg += "--------------------------------\\n";
    msg += "💰 QUỸ TIỀN MẶT KHẢ DỤNG: " + _e(metrics.availableCash) + " VNĐ\\n";
    msg += "🤝 Tổng vốn đối tác góp: " + _e(metrics.totalContributed) + " đ (Còn trong quỹ: " + _e(metrics.activePartnerCapital) + " đ)\\n";
    msg += "🦐 Tiền chi mua tôm: " + _e(metrics.totalShrimpBoughtMoney) + " đ (" + fmtKg(metrics.totalShrimpBoughtKg) + " kg)\\n";
    msg += "🛒 Tiền xuất bán thu về: " + _e(metrics.totalShrimpSoldCollected) + " đ (" + fmtKg(metrics.totalShrimpSoldKg) + " kg)\\n";
    if (metrics.totalDebtRemaining > 0) {
      msg += "⏳ Công nợ bán tôm chưa thu: " + _e(metrics.totalDebtRemaining) + " đ\\n";
    }
    msg += "💸 Tổng chi phí vận hành: " + _e(metrics.totalExpenses) + " đ (~" + _e(metrics.expensePerKg) + " đ/kg)\\n";
    msg += "🎁 Tổng lợi nhuận đã chia đối tác: " + _e(metrics.totalProfitPaid) + " đ\\n";
    msg += "--------------------------------\\n";
    msg += "📈 LỢI NHUẬN RÒNG TẠM TÍNH: " + _e(metrics.netProfit) + " VNĐ";
    if (metrics.profitPerKg > 0) {
      msg += " (~" + _e(metrics.profitPerKg) + " đ/kg lãi ròng)\\n";
    } else {
      msg += "\\n";
    }
    msg += "\\nDanh sách đối tác góp vốn:\\n";
    partners.forEach((p, idx) => {
      msg += (idx + 1) + ". " + p.name + ": Đã góp " + _e(p.totalContributed) + " đ | Hiện có: " + _e(p.currentCapital) + " đ (Chia lãi: " + (p.profitSharePercent || 0) + "%)\\n";
    });
    try {
      navigator.clipboard.writeText(msg);
      alert("Đã sao chép báo cáo tài chính! Đang chuyển sang Zalo...");
      window.open("https://zalo.me", "_blank");
    } catch(e) {
      alert("Báo cáo tài chính:\\n\\n" + msg);
    }
  };

  // Share Individual Partner Statement
  const handleSharePartnerZalo = (part) => {
    const partTxs = transactions.filter(t => t.partnerId === part.id);
    const totalProfitReceived = partTxs.filter(t => t.type === "PROFIT_PAYOUT").reduce((acc, t) => acc + (t.amount || 0), 0);
    let msg = "🤝 [BÁO CÁO VỐN & LỢI NHUẬN ĐỐI TÁC - " + part.name.toUpperCase() + "]\\n";
    msg += "Thời gian: " + new Date().toLocaleDateString("vi-VN") + "\\n";
    msg += "Số điện thoại: " + (part.phone || "Không có") + "\\n";
    msg += "Tỷ lệ chia lợi nhuận cam kết: " + (part.profitSharePercent || 0) + "%\\n";
    msg += "--------------------------------\\n";
    msg += "🔹 Tổng vốn đã nhập: " + _e(part.totalContributed) + " VNĐ\\n";
    msg += "🔹 Tổng vốn đã rút: " + _e(part.totalWithdrawn) + " VNĐ\\n";
    msg += "👉 VỐN HIỆN CÒN TRONG QUỸ: " + _e(part.currentCapital) + " VNĐ\\n";
    msg += "🎁 Tổng lợi nhuận đã nhận: " + _e(totalProfitReceived) + " VNĐ\\n";
    msg += "--------------------------------\\n";
    msg += "Lịch sử giao dịch của đối tác:\\n";
    if (partTxs.length === 0) {
      msg += "(Chưa có phát sinh)\\n";
    } else {
      partTxs.forEach((t, i) => {
        const sign = t.type === "CAPITAL_IN" ? "+ " : (t.type === "PROFIT_PAYOUT" ? "🎁 " : "- ");
        const dateStr = new Date(t.date).toLocaleDateString("vi-VN");
        msg += (i + 1) + ". [" + dateStr + "] " + sign + _e(t.amount) + " đ (" + (t.category || "GD") + ") - " + t.note + "\\n";
      });
    }
    try {
      navigator.clipboard.writeText(msg);
      alert("Đã sao chép phiếu đối soát của " + part.name + "! Đang mở Zalo...");
      window.open("https://zalo.me", "_blank");
    } catch(e) {
      alert(msg);
    }
  };

  return c.jsxs("div", {
    className: "flex flex-col h-screen bg-gray-50 dark:bg-[#121212] overflow-hidden text-gray-900 dark:text-gray-100",
    children: [
      // Top Header
      c.jsxs("header", {
        className: "bg-[#14532d] text-white p-4 flex items-center justify-between shadow-lg sticky top-0 z-30 shrink-0 border-b border-emerald-800",
        children: [
          c.jsxs("div", {
            className: "flex items-center gap-3",
            children: [
              c.jsx("button", {
                type: "button",
                onClick: () => setRoute(re.DASHBOARD),
                className: "p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-90 cursor-pointer",
                children: c.jsx(On, { size: 20 })
              }),
              c.jsxs("div", {
                children: [
                  c.jsx("h2", {
                    className: "text-lg font-black uppercase italic tracking-tight flex items-center gap-2",
                    children: [c.jsx(zm, { size: 22 }), "Tài Chính & Quỹ Mua Tôm"]
                  }),
                  c.jsx("span", {
                    className: "text-[10px] font-bold text-emerald-200 block",
                    children: "Dòng tiền vựa • Đối tác góp vốn • Quyết toán chuyến • Công nợ"
                  })
                ]
              })
            ]
          }),
          // Header action buttons
          c.jsxs("div", {
            className: "flex items-center gap-2",
            children: [
              c.jsxs("button", {
                type: "button",
                onClick: handleShareZaloReport,
                className: "px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase inline-flex items-center gap-1 shadow-md cursor-pointer active:scale-95 transition-all",
                children: ["Zalo Báo Cáo"]
              }),
              c.jsxs("button", {
                type: "button",
                onClick: () => window.print(),
                className: "px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer",
                children: [c.jsx("span", { children: "🖨️" }), "In"]
              })
            ]
          })
        ]
      }),

      // Navigation Sub-tabs & Date Filter Bar
      c.jsxs("div", {
        className: "bg-[#0f3d21] dark:bg-[#092614] px-4 py-2 border-t border-emerald-800/60 shadow-sm shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 overflow-x-auto",
        children: [
          // Sub-tabs
          c.jsxs("div", {
            className: "flex items-center gap-1.5 min-w-max",
            children: [
              c.jsxs("button", {
                type: "button",
                onClick: () => setActiveTab("overview"),
                className: \`px-3 py-1.5 rounded-xl text-xs font-black uppercase italic transition-all flex items-center gap-1 cursor-pointer \${
                  activeTab === "overview"
                    ? "bg-yellow-400 text-emerald-950 shadow-md scale-[1.02]"
                    : "text-emerald-100 hover:bg-white/10"
                }\`,
                children: [c.jsx("span", { children: "📊" }), "Tổng Quan"]
              }),
              c.jsxs("button", {
                type: "button",
                onClick: () => setActiveTab("partners"),
                className: \`px-3 py-1.5 rounded-xl text-xs font-black uppercase italic transition-all flex items-center gap-1 cursor-pointer \${
                  activeTab === "partners"
                    ? "bg-yellow-400 text-emerald-950 shadow-md scale-[1.02]"
                    : "text-emerald-100 hover:bg-white/10"
                }\`,
                children: [c.jsx("span", { children: "🤝" }), "Đối Tác (", partners.length, ")"]
              }),
              c.jsxs("button", {
                type: "button",
                onClick: () => setActiveTab("trips"),
                className: \`px-3 py-1.5 rounded-xl text-xs font-black uppercase italic transition-all flex items-center gap-1 cursor-pointer \${
                  activeTab === "trips"
                    ? "bg-yellow-400 text-emerald-950 shadow-md scale-[1.02]"
                    : "text-emerald-100 hover:bg-white/10"
                }\`,
                children: [c.jsx("span", { children: "🚛" }), "Quyết Toán Chuyến (", sessions.length, ")"]
              }),
              c.jsxs("button", {
                type: "button",
                onClick: () => setActiveTab("debts"),
                className: \`px-3 py-1.5 rounded-xl text-xs font-black uppercase italic transition-all flex items-center gap-1 cursor-pointer \${
                  activeTab === "debts"
                    ? "bg-yellow-400 text-emerald-950 shadow-md scale-[1.02]"
                    : "text-emerald-100 hover:bg-white/10"
                }\`,
                children: [c.jsx("span", { children: "⚖️" }), "Công Nợ (", sales.filter(s => s.remainingDebt > 0).length, ")"]
              }),
              c.jsxs("button", {
                type: "button",
                onClick: () => setActiveTab("expenses"),
                className: \`px-3 py-1.5 rounded-xl text-xs font-black uppercase italic transition-all flex items-center gap-1 cursor-pointer \${
                  activeTab === "expenses"
                    ? "bg-yellow-400 text-emerald-950 shadow-md scale-[1.02]"
                    : "text-emerald-100 hover:bg-white/10"
                }\`,
                children: [c.jsx("span", { children: "💸" }), "Chi Phí"]
              }),
              c.jsxs("button", {
                type: "button",
                onClick: () => setActiveTab("ledger"),
                className: \`px-3 py-1.5 rounded-xl text-xs font-black uppercase italic transition-all flex items-center gap-1 cursor-pointer \${
                  activeTab === "ledger"
                    ? "bg-yellow-400 text-emerald-950 shadow-md scale-[1.02]"
                    : "text-emerald-100 hover:bg-white/10"
                }\`,
                children: [c.jsx("span", { children: "📜" }), "Sổ Quỹ"]
              })
            ]
          }),
          // Date Filter Pills
          c.jsxs("div", {
            className: "flex items-center gap-1 bg-black/20 p-1 rounded-xl text-[11px] self-end sm:self-auto",
            children: [
              c.jsx("button", {
                type: "button",
                onClick: () => setDateRange("ALL"),
                className: \`px-2 py-0.5 rounded-lg font-bold transition-all \${dateRange === "ALL" ? "bg-white text-emerald-950 shadow-xs" : "text-emerald-200 hover:text-white"}\`,
                children: "Tất cả"
              }),
              c.jsx("button", {
                type: "button",
                onClick: () => setDateRange("TODAY"),
                className: \`px-2 py-0.5 rounded-lg font-bold transition-all \${dateRange === "TODAY" ? "bg-white text-emerald-950 shadow-xs" : "text-emerald-200 hover:text-white"}\`,
                children: "Hôm nay"
              }),
              c.jsx("button", {
                type: "button",
                onClick: () => setDateRange("WEEK"),
                className: \`px-2 py-0.5 rounded-lg font-bold transition-all \${dateRange === "WEEK" ? "bg-white text-emerald-950 shadow-xs" : "text-emerald-200 hover:text-white"}\`,
                children: "7 ngày"
              }),
              c.jsx("button", {
                type: "button",
                onClick: () => setDateRange("MONTH"),
                className: \`px-2 py-0.5 rounded-lg font-bold transition-all \${dateRange === "MONTH" ? "bg-white text-emerald-950 shadow-xs" : "text-emerald-200 hover:text-white"}\`,
                children: "Tháng này"
              })
            ]
          })
        ]
      }),

      // Main Content Scroll Area
      c.jsxs("div", {
        className: "flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full pb-28",
        children: [

          // ==================== TAB 1: OVERVIEW ====================
          activeTab === "overview" && c.jsxs("div", {
            className: "space-y-4 animate-in fade-in duration-200",
            children: [
              // Hero Balance Card: QUỸ VỐN MUA TÔM KHẢ DỤNG
              c.jsxs("div", {
                className: "bg-gradient-to-br from-emerald-600 via-teal-700 to-green-800 text-white p-6 rounded-[32px] shadow-xl border border-white/20 relative overflow-hidden",
                children: [
                  c.jsxs("div", {
                    className: "relative z-10 space-y-2",
                    children: [
                      c.jsxs("div", {
                        className: "flex justify-between items-center",
                        children: [
                          c.jsx("span", {
                            className: "text-xs font-black uppercase tracking-wider text-emerald-200 bg-white/10 px-3 py-1 rounded-full",
                            children: "QUỸ VỐN MUA TÔM KHẢ DỤNG (KÉT TIỀN VỰA)"
                          }),
                          c.jsx("span", {
                            className: "text-[10px] font-bold text-emerald-200",
                            children: "Sẵn sàng đi cân ao"
                          })
                        ]
                      }),
                      c.jsxs("div", {
                        className: "flex items-baseline gap-2",
                        children: [
                          c.jsx("span", {
                            className: "text-4xl sm:text-5xl font-black italic tracking-tight font-mono",
                            children: _e(metrics.availableCash)
                          }),
                          c.jsx("span", {
                            className: "text-xl font-bold text-emerald-200",
                            children: "VNĐ"
                          })
                        ]
                      }),
                      typeof numberToWordsVN_v3 === "function" && c.jsx("p", {
                        className: "text-xs italic text-emerald-100/90 pt-0.5",
                        children: numberToWordsVN_v3(metrics.availableCash)
                      }),
                      // Quick Action Row inside Hero
                      c.jsxs("div", {
                        className: "pt-4 flex flex-wrap gap-2.5",
                        children: [
                          c.jsxs("button", {
                            type: "button",
                            onClick: () => {
                              if (partners.length === 0) {
                                setShowAddPartnerModal(true);
                              } else {
                                setTargetPartner(partners[0]);
                                setShowContributeModal(true);
                              }
                            },
                            className: "px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-emerald-950 font-black rounded-xl text-xs uppercase shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer",
                            children: [c.jsx(As, { size: 16 }), "Nhập Vốn Mua Tôm"]
                          }),
                          c.jsxs("button", {
                            type: "button",
                            onClick: () => setShowAddExpenseModal(true),
                            className: "px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-black rounded-xl text-xs uppercase shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer",
                            children: [c.jsx(As, { size: 16 }), "Ghi Chi Phí"]
                          }),
                          c.jsxs("button", {
                            type: "button",
                            onClick: () => setActiveTab("partners"),
                            className: "px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs uppercase active:scale-95 transition-all cursor-pointer",
                            children: "Đối Tác (" + partners.length + ")"
                          }),
                          metrics.totalDebtRemaining > 0 && c.jsxs("button", {
                            type: "button",
                            onClick: () => setActiveTab("debts"),
                            className: "px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white font-black rounded-xl text-xs uppercase shadow-xs active:scale-95 transition-all cursor-pointer",
                            children: ["Thu Nợ Khách (", _e(metrics.totalDebtRemaining), " đ)"]
                          })
                        ]
                      })
                    ]
                  }),
                  c.jsx(zm, {
                    size: 140,
                    className: "absolute -right-6 -bottom-6 text-white/10 pointer-events-none rotate-12"
                  })
                ]
              }),

              // 4 KPI Cards: Vốn đối tác - Tiền mua - Tiền bán - Chi phí
              c.jsxs("div", {
                className: "grid grid-cols-2 sm:grid-cols-4 gap-3",
                children: [
                  // KPI 1: Vốn đối tác
                  c.jsxs("div", {
                    className: "bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-1",
                    children: [
                      c.jsxs("span", {
                        className: "text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 block",
                        children: ["🤝 Vốn Đối Tác (", partners.length, ")"]
                      }),
                      c.jsxs("span", {
                        className: "text-lg font-black text-gray-900 dark:text-white font-mono block",
                        children: [_e(metrics.activePartnerCapital), " đ"]
                      }),
                      c.jsxs("span", {
                        className: "text-[10px] text-gray-400 block",
                        children: ["Đã góp: ", _e(metrics.totalContributed), " đ"]
                      })
                    ]
                  }),
                  // KPI 2: Tiền mua tôm
                  c.jsxs("div", {
                    className: "bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-1",
                    children: [
                      c.jsx("span", {
                        className: "text-[10px] font-black uppercase text-orange-600 dark:text-orange-400 block",
                        children: "🦐 Tiền Chi Mua Tôm"
                      }),
                      c.jsxs("span", {
                        className: "text-lg font-black text-gray-900 dark:text-white font-mono block",
                        children: [_e(metrics.totalShrimpBoughtMoney), " đ"]
                      }),
                      c.jsxs("span", {
                        className: "text-[10px] text-gray-400 block",
                        children: ["Tổng: ", fmtKg(metrics.totalShrimpBoughtKg), " kg"]
                      })
                    ]
                  }),
                  // KPI 3: Tiền xuất bán tôm
                  c.jsxs("div", {
                    className: "bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-1",
                    children: [
                      c.jsx("span", {
                        className: "text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 block",
                        children: "🛒 Tiền Bán Đã Thu Về"
                      }),
                      c.jsxs("span", {
                        className: "text-lg font-black text-gray-900 dark:text-white font-mono block",
                        children: [_e(metrics.totalShrimpSoldCollected), " đ"]
                      }),
                      c.jsxs("span", {
                        className: "text-[10px] text-gray-400 block",
                        children: ["Tổng xuất: ", fmtKg(metrics.totalShrimpSoldKg), " kg"]
                      })
                    ]
                  }),
                  // KPI 4: Chi phí
                  c.jsxs("div", {
                    className: "bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-1",
                    children: [
                      c.jsx("span", {
                        className: "text-[10px] font-black uppercase text-red-600 dark:text-red-400 block",
                        children: "💸 Chi Phí Vận Hành"
                      }),
                      c.jsxs("span", {
                        className: "text-lg font-black text-gray-900 dark:text-white font-mono block",
                        children: [_e(metrics.totalExpenses), " đ"]
                      }),
                      c.jsxs("span", {
                        className: "text-[10px] text-gray-400 block",
                        children: ["~", _e(metrics.expensePerKg), " đ/kg tôm"]
                      })
                    ]
                  })
                ]
              }),

              // Profit Estimation Box with Visual Ratio Bar
              c.jsxs("div", {
                className: "bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4",
                children: [
                  c.jsxs("div", {
                    className: "flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-3",
                    children: [
                      c.jsxs("div", {
                        className: "flex items-center gap-2",
                        children: [
                          c.jsx(Sm, { size: 18, className: "text-emerald-600" }),
                          c.jsx("h3", {
                            className: "font-black uppercase text-sm text-gray-800 dark:text-gray-100 tracking-tight",
                            children: "Hiệu Quả Kinh Doanh & Lợi Nhuận Tạm Tính"
                          })
                        ]
                      }),
                      c.jsxs("span", {
                        className: \`text-xs font-black px-2.5 py-1 rounded-xl \${
                          metrics.netProfit >= 0
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                        }\`,
                        children: [metrics.netProfit >= 0 ? "📈 Có Lãi" : "📉 Đang Bù Lỗ"]
                      })
                    ]
                  }),
                  c.jsxs("div", {
                    className: "grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm",
                    children: [
                      c.jsxs("div", {
                        className: "p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl space-y-0.5",
                        children: [
                          c.jsx("span", { className: "text-gray-400 text-xs", children: "Doanh thu xuất bán:" }),
                          c.jsxs("div", { className: "font-black font-mono text-emerald-600 dark:text-emerald-400", children: [_e(metrics.totalShrimpSoldMoney), " đ"] })
                        ]
                      }),
                      c.jsxs("div", {
                        className: "p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl space-y-0.5",
                        children: [
                          c.jsx("span", { className: "text-gray-400 text-xs", children: "Giá vốn mua tôm + Chi phí:" }),
                          c.jsxs("div", { className: "font-black font-mono text-red-600 dark:text-red-400", children: [_e(metrics.totalShrimpBoughtMoney + metrics.totalExpenses), " đ"] })
                        ]
                      }),
                      c.jsxs("div", {
                        className: "p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl space-y-0.5 border border-emerald-200 dark:border-emerald-800/40",
                        children: [
                          c.jsx("span", { className: "text-emerald-700 dark:text-emerald-300 text-xs font-bold", children: "Lợi nhuận ròng vựa:" }),
                          c.jsxs("div", { className: "font-black font-mono text-base text-emerald-700 dark:text-emerald-300", children: [_e(metrics.netProfit), " đ"] }),
                          metrics.profitPerKg > 0 && c.jsxs("span", { className: "text-[10px] text-emerald-600 font-bold block", children: ["(~", _e(metrics.profitPerKg), " đ/kg lãi ròng)"] })
                        ]
                      })
                    ]
                  })
                ]
              }),

              // Quick Links Grid: Trips & Debts
              c.jsxs("div", {
                className: "grid grid-cols-1 sm:grid-cols-2 gap-4",
                children: [
                  c.jsxs("div", {
                    onClick: () => setActiveTab("trips"),
                    className: "p-4 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900 flex justify-between items-center cursor-pointer hover:border-blue-400 transition-all",
                    children: [
                      c.jsxs("div", {
                        className: "space-y-1",
                        children: [
                          c.jsx("span", { className: "text-xs font-black uppercase text-blue-900 dark:text-blue-200 block", children: "🚛 Quyết Toán Từng Chuyến Cân Ao" }),
                          c.jsxs("span", { className: "text-[11px] text-gray-500", children: [sessions.length, " chuyến mua tôm • Chia lãi đối tác"] })
                        ]
                      }),
                      c.jsx("span", { className: "text-base font-bold text-blue-600", children: "➔" })
                    ]
                  }),
                  c.jsxs("div", {
                    onClick: () => setActiveTab("debts"),
                    className: "p-4 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900 flex justify-between items-center cursor-pointer hover:border-amber-400 transition-all",
                    children: [
                      c.jsxs("div", {
                        className: "space-y-1",
                        children: [
                          c.jsx("span", { className: "text-xs font-black uppercase text-amber-900 dark:text-amber-200 block", children: "⚖️ Sổ Công Nợ Bán Tôm" }),
                          c.jsxs("span", { className: "text-[11px] text-gray-500", children: ["Còn nợ lại: ", c.jsx("b", { className: "text-red-600 font-mono", children: _e(metrics.totalDebtRemaining) + " đ" })] })
                        ]
                      }),
                      c.jsx("span", { className: "text-base font-bold text-amber-600", children: "➔" })
                    ]
                  })
                ]
              }),

              // Recent Transactions Preview
              c.jsxs("div", {
                className: "bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm space-y-3",
                children: [
                  c.jsxs("div", {
                    className: "flex justify-between items-center",
                    children: [
                      c.jsx("h3", {
                        className: "font-black uppercase text-xs text-gray-700 dark:text-gray-300",
                        children: "Giao dịch sổ quỹ gần nhất"
                      }),
                      c.jsx("button", {
                        type: "button",
                        onClick: () => setActiveTab("ledger"),
                        className: "text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer",
                        children: "Xem tất cả sổ quỹ ➔"
                      })
                    ]
                  }),
                  transactions.slice(0, 5).map(tx => {
                    const isIncome = tx.type === "CAPITAL_IN" || tx.type === "SALE_IN" || tx.type === "DEBT_IN";
                    return c.jsxs("div", {
                      key: tx.id,
                      className: "p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl flex items-center justify-between border border-gray-100 dark:border-gray-800",
                      children: [
                        c.jsxs("div", {
                          className: "space-y-0.5",
                          children: [
                            c.jsxs("div", {
                              className: "flex items-center gap-2",
                              children: [
                                c.jsx("span", {
                                  className: \`text-[9px] font-black uppercase px-2 py-0.5 rounded-full \${
                                    isIncome ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                                  }\`,
                                  children: isIncome ? "Tiền Vào" : "Tiền Ra"
                                }),
                                c.jsx("span", { className: "font-bold text-xs text-gray-800 dark:text-gray-100", children: tx.partnerName ? (tx.partnerName + " (" + tx.category + ")") : (tx.name || tx.category) })
                              ]
                            }),
                            c.jsxs("span", { className: "text-[10px] text-gray-400 block", children: [new Date(tx.date).toLocaleDateString("vi-VN"), " • ", tx.paymentMethod === "BANK" ? "Chuyển khoản" : "Tiền mặt", tx.note ? (" • " + tx.note) : ""] })
                          ]
                        }),
                        c.jsxs("span", {
                          className: \`font-black font-mono text-sm \${isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}\`,
                          children: [isIncome ? "+" : "-", _e(tx.amount), " đ"]
                        })
                      ]
                    });
                  })
                ]
              })
            ]
          }),

          // ==================== TAB 2: PARTNERS (ĐỐI TÁC GÓP VỐN & CHIA LÃI) ====================
          activeTab === "partners" && c.jsxs("div", {
            className: "space-y-4 animate-in fade-in duration-200",
            children: [
              // Header of partners tab
              c.jsxs("div", {
                className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs",
                children: [
                  c.jsxs("div", {
                    children: [
                      c.jsx("h3", {
                        className: "text-base font-black uppercase italic tracking-tight text-gray-900 dark:text-white flex items-center gap-2",
                        children: ["🤝 Đối Tác Cùng Góp Vốn Mua Tôm"]
                      }),
                      c.jsxs("p", {
                        className: "text-xs text-gray-500",
                        children: ["Vốn lưu động trong quỹ: ", c.jsx("b", { className: "text-emerald-600 font-mono", children: _e(metrics.activePartnerCapital) + " đ" }), " • Đã chia lãi: ", c.jsx("b", { className: "text-blue-600 font-mono", children: _e(metrics.totalProfitPaid) + " đ" })]
                      })
                    ]
                  }),
                  c.jsxs("button", {
                    type: "button",
                    onClick: () => {
                      setEditingPartner(null);
                      setPartnerForm({ name: "", phone: "", address: "", profitSharePercent: 0, note: "" });
                      setShowAddPartnerModal(true);
                    },
                    className: "px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto",
                    children: [c.jsx(As, { size: 16 }), "Thêm Đối Tác Mới"]
                  })
                ]
              }),

              // Partners List
              partners.length === 0 ? c.jsx("div", {
                className: "p-12 text-center text-gray-400 italic bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700",
                children: "Chưa có đối tác góp vốn nào. Bấm nút phía trên để thêm đối tác."
              }) : c.jsx("div", {
                className: "grid grid-cols-1 md:grid-cols-2 gap-4",
                children: partners.map(p => {
                  const partProfit = transactions.filter(t => t.partnerId === p.id && t.type === "PROFIT_PAYOUT").reduce((acc, t) => acc + (t.amount || 0), 0);
                  return c.jsxs("div", {
                    key: p.id,
                    className: "bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4 hover:border-emerald-300 transition-all",
                    children: [
                      // Top Info
                      c.jsxs("div", {
                        className: "flex justify-between items-start border-b border-gray-100 dark:border-gray-700/60 pb-3",
                        children: [
                          c.jsxs("div", {
                            className: "space-y-1",
                            children: [
                              c.jsx("h4", { className: "font-black text-base text-gray-900 dark:text-white uppercase", children: p.name }),
                              p.phone && c.jsxs("div", { className: "text-xs text-gray-500 flex items-center gap-1", children: ["📞 ", c.jsx("a", { href: "tel:" + p.phone, className: "font-mono font-bold text-blue-600 hover:underline", children: p.phone })] }),
                              p.address && c.jsxs("div", { className: "text-xs text-gray-400", children: ["📍 ", p.address] })
                            ]
                          }),
                          c.jsxs("span", {
                            className: "px-2.5 py-1 rounded-xl text-xs font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 shrink-0",
                            children: ["Chia lãi: ", p.profitSharePercent || 0, "%"]
                          })
                        ]
                      }),

                      // Financial metrics for this partner
                      c.jsxs("div", {
                        className: "grid grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-900/60 p-3 rounded-2xl text-center text-xs",
                        children: [
                          c.jsxs("div", {
                            children: [
                              c.jsx("span", { className: "text-[9px] uppercase font-bold text-gray-400 block", children: "Đã Nhập Vốn" }),
                              c.jsxs("span", { className: "font-black font-mono text-emerald-600 dark:text-emerald-400 text-xs block", children: [_e(p.totalContributed), " đ"] })
                            ]
                          }),
                          c.jsxs("div", {
                            children: [
                              c.jsx("span", { className: "text-[9px] uppercase font-bold text-gray-400 block", children: "Vốn Hiện Có" }),
                              c.jsxs("span", { className: "font-black font-mono text-blue-600 dark:text-blue-300 text-xs block", children: [_e(p.currentCapital), " đ"] })
                            ]
                          }),
                          c.jsxs("div", {
                            className: "border-l border-gray-200 dark:border-gray-700 pl-1",
                            children: [
                              c.jsx("span", { className: "text-[9px] uppercase font-bold text-amber-600 dark:text-amber-400 block", children: "Đã Nhận Lãi" }),
                              c.jsxs("span", { className: "font-black font-mono text-amber-600 dark:text-amber-400 text-xs block", children: [_e(partProfit), " đ"] })
                            ]
                          })
                        ]
                      }),

                      p.note && c.jsxs("p", {
                        className: "text-xs italic text-gray-500 bg-yellow-50/60 dark:bg-yellow-950/20 p-2.5 rounded-xl border border-yellow-200/50 dark:border-yellow-900/40",
                        children: ["📝 ", p.note]
                      }),

                      // Actions Row: Nhập Vốn - Rút Vốn - Chia Lãi - Zalo
                      c.jsxs("div", {
                        className: "flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-gray-700/60",
                        children: [
                          c.jsxs("div", {
                            className: "flex gap-1.5 flex-wrap",
                            children: [
                              c.jsxs("button", {
                                type: "button",
                                onClick: () => {
                                  setTargetPartner(p);
                                  setFundForm({ amount: "", paymentMethod: "BANK", note: "" });
                                  setShowContributeModal(true);
                                },
                                className: "px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1 active:scale-95 transition-all shadow-xs cursor-pointer",
                                children: [c.jsx(As, { size: 14 }), "Nhập Vốn"]
                              }),
                              c.jsxs("button", {
                                type: "button",
                                onClick: () => {
                                  setTargetPartner(p);
                                  setProfitForm({ amount: "", paymentMethod: "BANK", tripName: "", note: "" });
                                  setShowProfitPayoutModal(true);
                                },
                                className: "px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1 active:scale-95 transition-all shadow-xs cursor-pointer",
                                children: ["🎁 Chia Lãi"]
                              }),
                              c.jsxs("button", {
                                type: "button",
                                onClick: () => {
                                  setTargetPartner(p);
                                  setFundForm({ amount: "", paymentMethod: "BANK", note: "" });
                                  setShowWithdrawModal(true);
                                },
                                className: "px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold uppercase active:scale-95 transition-all cursor-pointer",
                                children: ["Rút Vốn"]
                              })
                            ]
                          }),
                          c.jsxs("div", {
                            className: "flex items-center gap-1",
                            children: [
                              c.jsx("button", {
                                type: "button",
                                onClick: () => handleSharePartnerZalo(p),
                                className: "px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer",
                                children: "Zalo"
                              }),
                              c.jsx("button", {
                                type: "button",
                                onClick: () => {
                                  setEditingPartner(p);
                                  setPartnerForm({
                                    name: p.name || "",
                                    phone: p.phone || "",
                                    address: p.address || "",
                                    profitSharePercent: p.profitSharePercent || 0,
                                    note: p.note || ""
                                  });
                                  setShowAddPartnerModal(true);
                                },
                                className: "p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer",
                                children: c.jsx(tm, { size: 16 })
                              }),
                              c.jsx("button", {
                                type: "button",
                                onClick: () => {
                                  if (confirm("Bạn có chắc chắn muốn xóa đối tác này?")) {
                                    const updated = partners.filter(x => x.id !== p.id);
                                    me.saveFinancePartners(updated);
                                    setPartners(updated);
                                  }
                                },
                                className: "p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer",
                                children: c.jsx(xm, { size: 16 })
                              })
                            ]
                          })
                        ]
                      })
                    ]
                  });
                })
              })
            ]
          }),

          // ==================== TAB 3: TRIPS (QUYẾT TOÁN TỪNG CHUYẾN CÂN) ====================
          activeTab === "trips" && c.jsxs("div", {
            className: "space-y-4 animate-in fade-in duration-200",
            children: [
              c.jsxs("div", {
                className: "bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2",
                children: [
                  c.jsxs("div", {
                    children: [
                      c.jsx("h3", {
                        className: "text-base font-black uppercase italic tracking-tight text-gray-900 dark:text-white flex items-center gap-2",
                        children: ["🚛 Quyết Toán & Chia Lãi Từng Chuyến Cân Ao"]
                      }),
                      c.jsx("p", {
                        className: "text-xs text-gray-500",
                        children: "Theo dõi doanh thu, chi phí và tự động tính chia lãi chuyến cân cho đối tác"
                      })
                    ]
                  }),
                  c.jsxs("span", {
                    className: "px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded-xl text-xs font-bold",
                    children: ["Tổng: ", sessions.length, " chuyến thu mua"]
                  })
                ]
              }),

              // Trips List
              sessions.length === 0 ? c.jsx("div", {
                className: "p-12 text-center text-gray-400 italic bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700",
                children: "Chưa có chuyến cân thu mua nào được ghi nhận."
              }) : c.jsx("div", {
                className: "space-y-4",
                children: sessions.map((sess, sIdx) => {
                  const buyCost = Number(sess.finalAmount) || Number(sess.grandTotal) || Number(sess.totalMoney) || Number(sess.depositAmount) || 0;
                  const buyKg = Number(sess.totalNet) || Number(sess.totalGross) || 0;
                  const tripDateStr = sess.date ? new Date(sess.date).toLocaleDateString("vi-VN") : "";
                  const tripCode = sess.id || ("Chuyến #" + (sIdx + 1));
                  const tripName = sess.farmerName ? ("Ao " + sess.farmerName) : tripCode;

                  // Find related expenses for this trip
                  const tripExpenses = transactions.filter(t => t.type === "EXPENSE_OUT" && t.tripName && t.tripName.includes(sess.farmerName || tripCode)).reduce((acc, t) => acc + (t.amount || 0), 0);

                  return c.jsxs("div", {
                    key: sess.id || sIdx,
                    className: "bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4",
                    children: [
                      // Trip Header
                      c.jsxs("div", {
                        className: "flex justify-between items-start border-b border-gray-100 dark:border-gray-700 pb-3",
                        children: [
                          c.jsxs("div", {
                            className: "space-y-1",
                            children: [
                              c.jsxs("div", {
                                className: "flex items-center gap-2",
                                children: [
                                  c.jsx("span", { className: "font-mono font-bold text-xs text-blue-600 dark:text-blue-400", children: tripCode }),
                                  tripDateStr && c.jsxs("span", { className: "text-xs text-gray-400", children: ["📅 ", tripDateStr] })
                                ]
                              }),
                              c.jsxs("h4", { className: "font-black text-base text-gray-900 dark:text-white uppercase", children: ["Ao tôm: ", sess.farmerName || "Nông dân"] }),
                              sess.location && c.jsxs("span", { className: "text-xs text-gray-400 block", children: ["📍 ", sess.location] })
                            ]
                          }),
                          c.jsxs("div", {
                            className: "text-right",
                            children: [
                              c.jsxs("span", { className: "text-sm font-black text-blue-600 dark:text-blue-400 block font-mono", children: [fmtKg(buyKg), " kg"] }),
                              c.jsxs("span", { className: "text-xs font-bold text-gray-500", children: ["Tiền tôm: ", _e(buyCost), " đ"] })
                            ]
                          })
                        ]
                      }),

                      // Profit sharing simulation for this trip
                      c.jsxs("div", {
                        className: "bg-gray-50 dark:bg-gray-900/60 p-4 rounded-2xl space-y-2 text-xs",
                        children: [
                          c.jsxs("div", {
                            className: "flex justify-between items-center",
                            children: [
                              c.jsx("span", { className: "font-black uppercase text-gray-700 dark:text-gray-300", children: "Bảng Phân Bổ Chia Lãi Cho Đối Tác (Dự Kiến):" }),
                              c.jsx("span", { className: "text-[10px] text-emerald-600 font-bold", children: "Dựa trên % cam kết" })
                            ]
                          }),
                          c.jsx("div", {
                            className: "grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1",
                            children: partners.map(p => {
                              return c.jsxs("div", {
                                key: p.id,
                                className: "p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center",
                                children: [
                                  c.jsxs("div", {
                                    children: [
                                      c.jsx("span", { className: "font-bold text-gray-900 dark:text-white block", children: p.name }),
                                      c.jsxs("span", { className: "text-[10px] text-gray-400", children: ["Tỷ lệ: ", p.profitSharePercent || 0, "%"] })
                                    ]
                                  }),
                                  c.jsxs("button", {
                                    type: "button",
                                    onClick: () => {
                                      setTargetPartner(p);
                                      setProfitForm({
                                        amount: "",
                                        paymentMethod: "BANK",
                                        tripName: "Chuyến cân ao " + (sess.farmerName || tripCode),
                                        note: "Chia lãi chuyến ao " + (sess.farmerName || tripCode)
                                      });
                                      setShowProfitPayoutModal(true);
                                    },
                                    className: "px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black uppercase cursor-pointer active:scale-95 transition-all shadow-xs",
                                    children: ["Chia Lãi"]
                                  })
                                ]
                              });
                            })
                          })
                        ]
                      })
                    ]
                  });
                })
              })
            ]
          }),

          // ==================== TAB 4: DEBTS (SỔ CÔNG NỢ) ====================
          activeTab === "debts" && c.jsxs("div", {
            className: "space-y-4 animate-in fade-in duration-200",
            children: [
              // Header
              c.jsxs("div", {
                className: "bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                children: [
                  c.jsxs("div", {
                    children: [
                      c.jsx("h3", {
                        className: "text-base font-black uppercase italic tracking-tight text-gray-900 dark:text-white flex items-center gap-2",
                        children: ["⚖️ Sổ Theo Dõi Công Nợ Vựa Tôm"]
                      }),
                      c.jsxs("p", {
                        className: "text-xs text-gray-500",
                        children: ["Tổng nợ bán chưa thu: ", c.jsx("b", { className: "text-red-600 font-mono", children: _e(metrics.totalDebtRemaining) + " đ" })]
                      })
                    ]
                  }),
                  c.jsxs("div", {
                    className: "flex gap-2",
                    children: [
                      c.jsx("button", {
                        type: "button",
                        onClick: () => setDebtFilter("RECEIVABLE"),
                        className: \`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer \${debtFilter === "RECEIVABLE" ? "bg-red-600 text-white shadow-xs" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}\`,
                        children: "Phiếu Chưa Trả Đủ"
                      }),
                      c.jsx("button", {
                        type: "button",
                        onClick: () => setDebtFilter("ALL"),
                        className: \`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer \${debtFilter === "ALL" ? "bg-red-600 text-white shadow-xs" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}\`,
                        children: "Tất Cả Phiếu Bán"
                      })
                    ]
                  })
                ]
              }),

              // Debt Sales Tickets List
              (() => {
                const debtSales = sales.filter(s => {
                  if (debtFilter === "RECEIVABLE") {
                    return Number(s.remainingDebt) > 0;
                  }
                  return true;
                });

                if (debtSales.length === 0) {
                  return c.jsx("div", {
                    className: "p-12 text-center text-gray-400 italic bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700",
                    children: "Tuyệt vời! Hiện tại không có khoản nợ bán tôm nào tồn đọng."
                  });
                }

                return c.jsx("div", {
                  className: "space-y-3",
                  children: debtSales.map(sale => {
                    const remDebt = Number(sale.remainingDebt) || 0;
                    return c.jsxs("div", {
                      key: sale.id,
                      className: "bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                      children: [
                        c.jsxs("div", {
                          className: "space-y-1 flex-1",
                          children: [
                            c.jsxs("div", {
                              className: "flex items-center gap-2",
                              children: [
                                c.jsx("span", { className: "font-mono font-bold text-xs text-blue-600 dark:text-blue-400", children: sale.code }),
                                c.jsx("span", {
                                  className: "text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200",
                                  children: sale.targetGroup === "FACTORY" ? "Xí Nghiệp" : (sale.targetGroup === "MARKET" ? "Chợ" : "Bán Lẻ")
                                }),
                                c.jsx("span", {
                                  className: \`text-[10px] font-bold px-2 py-0.5 rounded-full \${remDebt === 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"}\`,
                                  children: remDebt === 0 ? "Đã trả hết" : ("Còn nợ: " + _e(remDebt) + " đ")
                                })
                              ]
                            }),
                            c.jsx("h4", { className: "font-black text-base text-gray-900 dark:text-white uppercase", children: sale.buyerName }),
                            c.jsxs("div", {
                              className: "text-xs text-gray-500 flex flex-wrap gap-x-3",
                              children: [
                                c.jsxs("span", { children: ["📅 ", new Date(sale.date).toLocaleDateString("vi-VN")] }),
                                c.jsxs("span", { children: ["Tổng tiền bán: ", _e(sale.totalMoney), " đ"] }),
                                sale.buyerPhone && c.jsxs("span", { children: ["📞 ", sale.buyerPhone] })
                              ]
                            })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "flex items-center gap-2",
                          children: [
                            remDebt > 0 && c.jsxs("button", {
                              type: "button",
                              onClick: () => {
                                setTargetSaleForDebt(sale);
                                setDebtCollectForm({ amount: String(remDebt), paymentMethod: "BANK", note: "Thu nợ phiếu " + sale.code });
                                setShowCollectDebtModal(true);
                              },
                              className: "px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1 active:scale-95 transition-all shadow-md cursor-pointer",
                              children: [c.jsx(As, { size: 14 }), "Thu Tiền Nợ"]
                            }),
                            c.jsx("button", {
                              type: "button",
                              onClick: () => {
                                let msg = "📞 [NHẮC CÔNG NỢ BÁN TÔM - PHIẾU " + sale.code + "]\\n";
                                msg += "Khách hàng: " + sale.buyerName + "\\n";
                                msg += "Ngày xuất bán: " + new Date(sale.date).toLocaleDateString("vi-VN") + "\\n";
                                msg += "Tổng tiền: " + _e(sale.totalMoney) + " đ\\n";
                                msg += "Số tiền còn nợ: " + _e(remDebt) + " đ\\n";
                                msg += "Vui lòng sắp xếp thanh toán giúp vựa. Xin cảm ơn!";
                                navigator.clipboard.writeText(msg);
                                alert("Đã sao chép nội dung nhắc nợ! Đang mở Zalo...");
                                window.open("https://zalo.me", "_blank");
                              },
                              className: "px-3 py-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold cursor-pointer",
                              children: "Nhắc Zalo"
                            })
                          ]
                        })
                      ]
                    });
                  })
                });
              })()
            ]
          }),

          // ==================== TAB 5: EXPENSES (QUẢN LÝ CHI PHÍ) ====================
          activeTab === "expenses" && c.jsxs("div", {
            className: "space-y-4 animate-in fade-in duration-200",
            children: [
              // Header & Add Expense
              c.jsxs("div", {
                className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs",
                children: [
                  c.jsxs("div", {
                    children: [
                      c.jsx("h3", {
                        className: "text-base font-black uppercase italic tracking-tight text-gray-900 dark:text-white",
                        children: "💸 Quản Lý Chi Phí Mua Tôm & Hậu Cần"
                      }),
                      c.jsxs("p", {
                        className: "text-xs text-gray-500",
                        children: ["Tổng chi phí: ", c.jsx("b", { className: "text-red-600 font-mono", children: _e(metrics.totalExpenses) + " đ" }), " • Trung bình: ", c.jsx("b", { className: "text-red-600 font-mono", children: _e(metrics.expensePerKg) + " đ/kg" })]
                      })
                    ]
                  }),
                  c.jsxs("button", {
                    type: "button",
                    onClick: () => setShowAddExpenseModal(true),
                    className: "px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto",
                    children: [c.jsx(As, { size: 16 }), "Ghi Chi Phí Mới"]
                  })
                ]
              }),

              // Category Filter Pills
              c.jsx("div", {
                className: "flex gap-2 overflow-x-auto pb-1 text-xs",
                children: [
                  { id: "ALL", label: "Tất cả" },
                  { id: "Đá ướp & Bảo quản", label: "🧊 Đá ướp" },
                  { id: "Túi & Bình oxy", label: "🫧 Oxy sống" },
                  { id: "Thuê nhân công / Bốc vác", label: "👷 Nhân công" },
                  { id: "Xăng dầu vận chuyển", label: "⛽ Xăng dầu xe" },
                  { id: "Thuê ghe / Xuồng", label: "🚤 Thuê ghe" },
                  { id: "Ăn uống hậu cần", label: "🍚 Ăn uống" },
                  { id: "Khác", label: "📦 Chi phí khác" }
                ].map(cat => c.jsx("button", {
                  key: cat.id,
                  type: "button",
                  onClick: () => setExpenseFilter(cat.id),
                  className: \`px-3 py-1.5 rounded-xl font-bold cursor-pointer whitespace-nowrap transition-all \${
                    expenseFilter === cat.id
                      ? "bg-red-600 text-white shadow-xs"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100"
                  }\`,
                  children: cat.label
                }))
              }),

              // Expenses List
              (() => {
                const filteredExpenses = transactions.filter(t => {
                  if (t.type !== "EXPENSE_OUT") return false;
                  if (!isWithinDateRange(t.date)) return false;
                  if (expenseFilter === "ALL") return true;
                  return t.category === expenseFilter;
                });

                if (filteredExpenses.length === 0) {
                  return c.jsx("div", {
                    className: "p-12 text-center text-gray-400 italic bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700",
                    children: "Chưa có khoản chi phí nào trong danh mục này."
                  });
                }

                return c.jsx("div", {
                  className: "space-y-2.5",
                  children: filteredExpenses.map(item => c.jsxs("div", {
                    key: item.id,
                    className: "bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                    children: [
                      c.jsxs("div", {
                        className: "space-y-1 flex-1",
                        children: [
                          c.jsxs("div", {
                            className: "flex items-center gap-2",
                            children: [
                              c.jsx("span", {
                                className: "text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300",
                                children: item.category
                              }),
                              c.jsx("span", { className: "font-black text-sm text-gray-900 dark:text-white", children: item.name || item.note || item.category })
                            ]
                          }),
                          c.jsxs("div", {
                            className: "text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-3",
                            children: [
                              c.jsxs("span", { children: ["📅 ", new Date(item.date).toLocaleDateString("vi-VN")] }),
                              item.payer && c.jsxs("span", { children: ["👤 Người chi: ", item.payer] }),
                              c.jsxs("span", { children: ["💳 ", item.paymentMethod === "BANK" ? "Chuyển khoản" : "Tiền mặt"] }),
                              item.tripName && c.jsxs("span", { className: "text-blue-600 font-bold", children: ["🚛 ", item.tripName] }),
                              item.note && item.note !== item.name && c.jsxs("span", { className: "italic", children: ["📝 ", item.note] })
                            ]
                          })
                        ]
                      }),
                      c.jsxs("div", {
                        className: "flex items-center justify-between sm:justify-end gap-3",
                        children: [
                          c.jsxs("span", { className: "font-black font-mono text-base text-red-600 dark:text-red-400", children: ["-", _e(item.amount), " đ"] }),
                          c.jsx("button", {
                            type: "button",
                            onClick: () => handleDeleteTx(item.id),
                            className: "p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer",
                            children: c.jsx(xm, { size: 16 })
                          })
                        ]
                      })
                    ]
                  }))
                });
              })()
            ]
          }),

          // ==================== TAB 6: FULL LEDGER (SỔ QUỸ THU CHI) ====================
          activeTab === "ledger" && c.jsxs("div", {
            className: "space-y-4 animate-in fade-in duration-200",
            children: [
              // Search & Filter Bar
              c.jsxs("div", {
                className: "bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-3",
                children: [
                  c.jsxs("div", {
                    className: "flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center",
                    children: [
                      c.jsx("input", {
                        type: "text",
                        placeholder: "🔍 Tìm giao dịch theo tên đối tác, nội dung, mã...",
                        value: searchLedger,
                        onChange: e => setSearchLedger(e.target.value),
                        className: "p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold outline-none flex-1"
                      }),
                      c.jsxs("div", {
                        className: "flex gap-1.5",
                        children: [
                          c.jsx("button", {
                            type: "button",
                            onClick: () => setLedgerFilter("ALL"),
                            className: \`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer \${ledgerFilter === "ALL" ? "bg-emerald-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}\`,
                            children: "Tất cả"
                          }),
                          c.jsx("button", {
                            type: "button",
                            onClick: () => setLedgerFilter("IN"),
                            className: \`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer \${ledgerFilter === "IN" ? "bg-emerald-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}\`,
                            children: "🟢 Tiền Vào"
                          }),
                          c.jsx("button", {
                            type: "button",
                            onClick: () => setLedgerFilter("OUT"),
                            className: \`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer \${ledgerFilter === "OUT" ? "bg-red-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}\`,
                            children: "🔴 Tiền Ra"
                          })
                        ]
                      })
                    ]
                  })
                ]
              }),

              // Ledger Transactions List
              (() => {
                const filtered = transactions.filter(t => {
                  if (!isWithinDateRange(t.date)) return false;
                  const isIncome = t.type === "CAPITAL_IN" || t.type === "SALE_IN" || t.type === "DEBT_IN";
                  if (ledgerFilter === "IN" && !isIncome) return false;
                  if (ledgerFilter === "OUT" && isIncome) return false;
                  if (searchLedger) {
                    const q = searchLedger.toLowerCase();
                    const text = (t.partnerName || "") + " " + (t.name || "") + " " + (t.category || "") + " " + (t.note || "");
                    return text.toLowerCase().includes(q);
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return c.jsx("div", {
                    className: "p-12 text-center text-gray-400 italic bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700",
                    children: "Không tìm thấy giao dịch nào phù hợp."
                  });
                }

                return c.jsx("div", {
                  className: "space-y-2",
                  children: filtered.map(t => {
                    const isIncome = t.type === "CAPITAL_IN" || t.type === "SALE_IN" || t.type === "DEBT_IN";
                    const isProfit = t.type === "PROFIT_PAYOUT";
                    return c.jsxs("div", {
                      key: t.id,
                      className: "bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between gap-3",
                      children: [
                        c.jsxs("div", {
                          className: "space-y-1 flex-1",
                          children: [
                            c.jsxs("div", {
                              className: "flex items-center gap-2",
                              children: [
                                c.jsx("span", {
                                  className: \`text-[9px] font-black uppercase px-2 py-0.5 rounded-full \${
                                    isIncome ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : (isProfit ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300")
                                  }\`,
                                  children: t.category || (isIncome ? "Thu vào" : (isProfit ? "Chia lãi" : "Chi ra"))
                                }),
                                c.jsx("span", { className: "font-black text-sm text-gray-900 dark:text-white", children: t.partnerName ? (t.partnerName + " (" + t.category + ")") : (t.name || t.note || "Giao dịch") })
                              ]
                            }),
                            c.jsxs("div", {
                              className: "text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-3",
                              children: [
                                c.jsxs("span", { children: ["📅 ", new Date(t.date).toLocaleDateString("vi-VN")] }),
                                c.jsxs("span", { children: ["💳 ", t.paymentMethod === "BANK" ? "Chuyển khoản" : "Tiền mặt"] }),
                                t.note && c.jsxs("span", { className: "italic", children: ["📝 ", t.note] })
                              ]
                            })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "flex items-center gap-3",
                          children: [
                            c.jsxs("span", {
                              className: \`font-black font-mono text-base \${isIncome ? "text-emerald-600 dark:text-emerald-400" : (isProfit ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400")}\`,
                              children: [isIncome ? "+" : "-", _e(t.amount), " đ"]
                            }),
                            c.jsx("button", {
                              type: "button",
                              onClick: () => handleDeleteTx(t.id),
                              className: "p-1.5 text-gray-400 hover:text-red-500 rounded-lg cursor-pointer",
                              children: c.jsx(xm, { size: 16 })
                            })
                          ]
                        })
                      ]
                    });
                  })
                });
              })()
            ]
          })
        ]
      }),

      // ==================== MODAL: ADD / EDIT PARTNER ====================
      showAddPartnerModal && c.jsx("div", {
        className: "fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4 border border-gray-200 dark:border-gray-700",
          children: [
            c.jsxs("div", {
              className: "flex justify-between items-center border-b pb-3",
              children: [
                c.jsx("h3", {
                  className: "font-black text-lg uppercase italic text-gray-900 dark:text-white",
                  children: editingPartner ? "Chỉnh Sửa Đối Tác" : "Thêm Đối Tác Góp Vốn Mới"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => setShowAddPartnerModal(false),
                  className: "p-2 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer",
                  children: c.jsx(_a, { size: 20 })
                })
              ]
            }),
            c.jsxs("form", {
              onSubmit: handleSavePartner,
              className: "space-y-3 text-xs",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "font-bold text-gray-500 uppercase block mb-1", children: "Tên đối tác / Cổ đông (*)" }),
                    c.jsx("input", {
                      type: "text",
                      required: true,
                      placeholder: "VD: Anh Bảy Cà Mau, Chị Năm Vựa Hộ Phòng...",
                      value: partnerForm.name,
                      onChange: e => setPartnerForm({ ...partnerForm, name: e.target.value }),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm outline-none focus:border-emerald-500"
                    })
                  ]
                }),
                c.jsxs("div", {
                  className: "grid grid-cols-2 gap-3",
                  children: [
                    c.jsxs("div", {
                      children: [
                        c.jsx("label", { className: "font-bold text-gray-500 uppercase block mb-1", children: "Số điện thoại" }),
                        c.jsx("input", {
                          type: "text",
                          placeholder: "0918...",
                          value: partnerForm.phone,
                          onChange: e => setPartnerForm({ ...partnerForm, phone: e.target.value }),
                          className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm outline-none focus:border-emerald-500 font-mono"
                        })
                      ]
                    }),
                    c.jsxs("div", {
                      children: [
                        c.jsx("label", { className: "font-bold text-gray-500 uppercase block mb-1", children: "Tỷ lệ chia lãi (%)" }),
                        c.jsx("input", {
                          type: "number",
                          placeholder: "VD: 30",
                          value: partnerForm.profitSharePercent || "",
                          onChange: e => setPartnerForm({ ...partnerForm, profitSharePercent: e.target.value }),
                          className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm outline-none focus:border-emerald-500 font-mono"
                        })
                      ]
                    })
                  ]
                }),
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "font-bold text-gray-500 uppercase block mb-1", children: "Địa chỉ / Khu vực" }),
                    c.jsx("input", {
                      type: "text",
                      placeholder: "VD: Đầm Dơi, Cà Mau",
                      value: partnerForm.address,
                      onChange: e => setPartnerForm({ ...partnerForm, address: e.target.value }),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm outline-none focus:border-emerald-500"
                    })
                  ]
                }),
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "font-bold text-gray-500 uppercase block mb-1", children: "Ghi chú thỏa thuận" }),
                    c.jsx("textarea", {
                      rows: 2,
                      placeholder: "VD: Góp vốn xoay vòng mua tôm ao lớn, đối soát hàng tuần...",
                      value: partnerForm.note,
                      onChange: e => setPartnerForm({ ...partnerForm, note: e.target.value }),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm outline-none focus:border-emerald-500"
                    })
                  ]
                }),
                c.jsxs("div", {
                  className: "flex justify-end gap-2 pt-3 border-t",
                  children: [
                    c.jsx("button", {
                      type: "button",
                      onClick: () => setShowAddPartnerModal(false),
                      className: "px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold rounded-xl",
                      children: "Hủy"
                    }),
                    c.jsx("button", {
                      type: "submit",
                      className: "px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md",
                      children: "Lưu Đối Tác"
                    })
                  ]
                })
              ]
            })
          ]
        })
      }),

      // ==================== MODAL: CONTRIBUTE CAPITAL (NHẬP VỐN) ====================
      showContributeModal && targetPartner && c.jsx("div", {
        className: "fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4 border border-gray-200 dark:border-gray-700",
          children: [
            c.jsxs("div", {
              className: "flex justify-between items-center border-b pb-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("h3", {
                      className: "font-black text-lg uppercase italic text-emerald-600 dark:text-emerald-400",
                      children: "💵 Nhập Vốn Mua Tôm"
                    }),
                    c.jsxs("p", {
                      className: "text-xs font-bold text-gray-500",
                      children: ["Đối tác: ", targetPartner.name]
                    })
                  ]
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => setShowContributeModal(false),
                  className: "p-2 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer",
                  children: c.jsx(_a, { size: 20 })
                })
              ]
            }),
            c.jsxs("div", {
              className: "space-y-3 text-xs",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "font-bold text-gray-500 uppercase block mb-1", children: "Số tiền đối tác nhập vào quỹ (VNĐ) (*)" }),
                    c.jsx("input", {
                      type: "number",
                      autoFocus: true,
                      placeholder: "VD: 100000000",
                      value: fundForm.amount,
                      onChange: e => setFundForm({ ...fundForm, amount: e.target.value }),
                      className: "w-full p-3 border-2 border-emerald-500 rounded-xl bg-transparent font-black text-xl outline-none font-mono text-emerald-600 dark:text-emerald-400"
                    }),
                    fundForm.amount && typeof numberToWordsVN_v3 === "function" && c.jsx("p", {
                      className: "text-[11px] text-gray-500 italic mt-1",
                      children: numberToWordsVN_v3(Number(fundForm.amount))
                    })
                  ]
                }),
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "font-bold text-gray-500 uppercase block mb-1", children: "Hình thức nhận tiền" }),
                    c.jsxs("select", {
                      value: fundForm.paymentMethod,
                      onChange: e => setFundForm({ ...fundForm, paymentMethod: e.target.value }),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm outline-none",
                      children: [
                        c.jsx("option", { value: "BANK", children: "Chuyển khoản ngân hàng" }),
                        c.jsx("option", { value: "CASH", children: "Tiền mặt trực tiếp tại vựa" })
                      ]
                    })
                  ]
                }),
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "font-bold text-gray-500 uppercase block mb-1", children: "Ghi chú chuyến mua / mục đích" }),
                    c.jsx("input", {
                      type: "text",
                      placeholder: "VD: Tiền vốn đi mua tôm vuông Đầm Dơi...",
                      value: fundForm.note,
                      onChange: e => setFundForm({ ...fundForm, note: e.target.value }),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm outline-none"
                    })
                  ]
                }),
                c.jsxs("div", {
                  className: "flex justify-end gap-2 pt-3 border-t",
                  children: [
                    c.jsx("button", {
                      type: "button",
                      onClick: () => setShowContributeModal(false),
                      className: "px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold rounded-xl",
                      children: "Hủy"
                    }),
                    c.jsx("button", {
                      type: "button",
                      onClick: handleConfirmContribute,
                      className: "px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md cursor-pointer",
                      children: "Xác Nhận Nhập Vốn"
                    })
                  ]
                })
              ]
            })
          ]
        })
      }),

      // ==================== MODAL: WITHDRAW CAPITAL (RÚT VỐN) ====================
      showWithdrawModal && targetPartner && c.jsx("div", {
        className: "fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4 border border-gray-200 dark:border-gray-700",
          children: [
            c.jsxs("div", {
              className: "flex justify-between items-center border-b pb-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("h3", {
                      className: "font-black text-lg uppercase italic text-gray-900 dark:text-white",
                      children: "↩️ Rút / Hoàn Trả Vốn"
                    }),
                    c.jsxs("p", {
                      className: "text-xs font-bold text-gray-500",
                      children: ["Đối tác: ", targetPartner.name, " (Hiện có: ", _e(targetPartner.currentCapital), " đ)"]
                    })
                  ]
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => setShowWithdrawModal(false),
                  className: "p-2 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer",
                  children: c.jsx(_a, { size: 20 })
                })
              ]
            }),
            c.jsxs("div", {
              className: "space-y-3 text-xs",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "font-bold text-gray-500 uppercase block mb-1", children: "Số tiền rút (VNĐ) (*)" }),
                    c.jsx("input", {
                      type: "number",
                      autoFocus: true,
                      placeholder: "VD: 50000000",
                      value: fundForm.amount,
                      onChange: e => setFundForm({ ...fundForm, amount: e.target.value }),
                      className: "w-full p-3 border-2 border-red-500 rounded-xl bg-transparent font-black text-xl outline-none font-mono text-red-600 dark:text-red-400"
                    })
                  ]
                }),
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "font-bold text-gray-500 uppercase block mb-1", children: "Hình thức thanh toán hoàn vốn" }),
                    c.jsxs("select", {
                      value: fundForm.paymentMethod,
                      onChange: e => setFundForm({ ...fundForm, paymentMethod: e.target.value }),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm outline-none",
                      children: [
                        c.jsx("option", { value: "BANK", children: "Chuyển khoản ngân hàng" }),
                        c.jsx("option", { value: "CASH", children: "Tiền mặt trực tiếp" })
                      ]
                    })
                  ]
                }),
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "font-bold text-gray-500 uppercase block mb-1", children: "Lý do / Ghi chú" }),
                    c.jsx("input", {
                      type: "text",
                      placeholder: "VD: Hoàn vốn chuyến mua tôm ngày 10/10...",
                      value: fundForm.note,
                      onChange: e => setFundForm({ ...fundForm, note: e.target.value }),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm outline-none"
                    })
                  ]
                }),
                c.jsxs("div", {
                  className: "flex justify-end gap-2 pt-3 border-t",
                  children: [
                    c.jsx("button", {
                      type: "button",
                      onClick: () => setShowWithdrawModal(false),
                      className: "px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold rounded-xl",
                      children: "Hủy"
                    }),
                    c.jsx("button", {
                      type: "button",
                      onClick: handleConfirmWithdraw,
                      className: "px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-md cursor-pointer",
                      children: "Xác Nhận Rút Vốn"
                    })
                  ]
                })
              ]
            })
          ]
        })
      }),

      // ==================== MODAL: PROFIT PAYOUT (CHIA LÃI ĐỐI TÁC) ====================
      showProfitPayoutModal && targetPartner && c.jsx("div", {
        className: "fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4 border border-gray-200 dark:border-gray-700",
          children: [
            c.jsxs("div", {
              className: "flex justify-between items-center border-b pb-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("h3", {
                      className: "font-black text-lg uppercase italic text-blue-600 dark:text-blue-400",
                      children: "🎁 Chi Trả Lợi Nhuận Cho Đối Tác"
                    }),
                    c.jsxs("p", {
                      className: "text-xs font-bold text-gray-500",
                      children: ["Đối tác: ", targetPartner.name, " (Tỷ lệ: ", targetPartner.profitSharePercent || 0, "%)"]
                    })
                  ]
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => setShowProfitPayoutModal(false),
                  className: "p-2 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer",
                  children: c.jsx(_a, { size: 20 })
                })
              ]
            }),
            c.jsxs("div", {
              className: "space-y-3 text-xs",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "font-bold text-gray-500 uppercase block mb-1", children: "Số tiền lợi nhuận chi trả (VNĐ) (*)" }),
                    c.jsx("input", {
                      type: "number",
                      autoFocus: true,
                      placeholder: "VD: 15000000",
                      value: profitForm.amount,
                      onChange: e => setProfitForm({ ...profitForm, amount: e.target.value }),
                      className: "w-full p-3 border-2 border-blue-500 rounded-xl bg-transparent font-black text-xl outline-none font-mono text-blue-600 dark:text-blue-400"
                    }),
                    profitForm.amount && typeof numberToWordsVN_v3 === "function" && c.jsx("p", {
                      className: "text-[11px] text-gray-500 italic mt-1",
                      children: numberToWordsVN_v3(Number(profitForm.amount))
                    })
                  ]
                }),
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "font-bold text-gray-500 uppercase block mb-1", children: "Chuyến cân liên quan" }),
                    c.jsx("input", {
                      type: "text",
                      placeholder: "VD: Chuyến ao Chú Bảy Đầm Dơi...",
                      value: profitForm.tripName,
                      onChange: e => setProfitForm({ ...profitForm, tripName: e.target.value }),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm outline-none"
                    })
                  ]
                }),
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "font-bold text-gray-500 uppercase block mb-1", children: "Hình thức chi trả" }),
                    c.jsxs("select", {
                      value: profitForm.paymentMethod,
                      onChange: e => setProfitForm({ ...profitForm, paymentMethod: e.target.value }),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm outline-none",
                      children: [
                        c.jsx("option", { value: "BANK", children: "Chuyển khoản ngân hàng" }),
                        c.jsx("option", { value: "CASH", children: "Tiền mặt trực tiếp" })
                      ]
                    })
                  ]
                }),
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "font-bold text-gray-500 uppercase block mb-1", children: "Ghi chú thêm" }),
                    c.jsx("input", {
                      type: "text",
                      placeholder: "VD: Chia lãi vụ tôm tháng 10...",
                      value: profitForm.note,
                      onChange: e => setProfitForm({ ...profitForm, note: e.target.value }),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm outline-none"
                    })
                  ]
                }),
                c.jsxs("div", {
                  className: "flex justify-end gap-2 pt-3 border-t",
                  children: [
                    c.jsx("button", {
                      type: "button",
                      onClick: () => setShowProfitPayoutModal(false),
                      className: "px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold rounded-xl",
                      children: "Hủy"
                    }),
                    c.jsx("button", {
                      type: "button",
                      onClick: handleConfirmProfitPayout,
                      className: "px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md cursor-pointer",
                      children: "Xác Nhận Chi Trả Lãi"
                    })
                  ]
                })
              ]
            })
          ]
        })
      }),

      // ==================== MODAL: ADD EXPENSE ====================
      showAddExpenseModal && c.jsx("div", {
        className: "fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4 border border-gray-200 dark:border-gray-700",
          children: [
            c.jsxs("div", {
              className: "flex justify-between items-center border-b pb-3",
              children: [
                c.jsx("h3", {
                  className: "font-black text-lg uppercase italic text-gray-900 dark:text-white",
                  children: "💸 Ghi Chi Phí Phát Sinh"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => setShowAddExpenseModal(false),
                  className: "p-2 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer",
                  children: c.jsx(_a, { size: 20 })
                })
              ]
            }),
            c.jsxs("form", {
              onSubmit: handleSaveExpense,
              className: "space-y-3 text-xs",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "font-bold text-gray-500 uppercase block mb-1", children: "Tên khoản chi (*)" }),
                    c.jsx("input", {
                      type: "text",
                      required: true,
                      placeholder: "VD: Mua 50 cây đá xay ướp tôm, Đổ dầu xe tải...",
                      value: expenseForm.name,
                      onChange: e => setExpenseForm({ ...expenseForm, name: e.target.value }),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm outline-none focus:border-red-500"
                    })
                  ]
                }),
                c.jsxs("div", {
                  className: "grid grid-cols-2 gap-3",
                  children: [
                    c.jsxs("div", {
                      children: [
                        c.jsx("label", { className: "font-bold text-gray-500 uppercase block mb-1", children: "Danh mục chi phí" }),
                        c.jsxs("select", {
                          value: expenseForm.category,
                          onChange: e => setExpenseForm({ ...expenseForm, category: e.target.value }),
                          className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm outline-none",
                          children: [
                            c.jsx("option", { value: "Đá ướp & Bảo quản", children: "🧊 Đá ướp & Bảo quản" }),
                            c.jsx("option", { value: "Túi & Bình oxy", children: "🫧 Túi & Bình oxy" }),
                            c.jsx("option", { value: "Thuê nhân công / Bốc vác", children: "👷 Nhân công / Kéo lưới" }),
                            c.jsx("option", { value: "Xăng dầu vận chuyển", children: "⛽ Xăng dầu xe tải" }),
                            c.jsx("option", { value: "Thuê ghe / Xuồng", children: "🚤 Thuê ghe / Xuồng" }),
                            c.jsx("option", { value: "Ăn uống hậu cần", children: "🍚 Ăn uống đoàn cân" }),
                            c.jsx("option", { value: "Khác", children: "📦 Ngư cụ & Khác" })
                          ]
                        })
                      ]
                    }),
                    c.jsxs("div", {
                      children: [
                        c.jsx("label", { className: "font-bold text-gray-500 uppercase block mb-1", children: "Số tiền chi (VNĐ) (*)" }),
                        c.jsx("input", {
                          type: "number",
                          required: true,
                          placeholder: "VD: 2500000",
                          value: expenseForm.amount,
                          onChange: e => setExpenseForm({ ...expenseForm, amount: e.target.value }),
                          className: "w-full p-3 border-2 border-red-500 rounded-xl bg-transparent font-black text-sm outline-none font-mono text-red-600 dark:text-red-400"
                        })
                      ]
                    })
                  ]
                }),
                c.jsxs("div", {
                  className: "grid grid-cols-2 gap-3",
                  children: [
                    c.jsxs("div", {
                      children: [
                        c.jsx("label", { className: "font-bold text-gray-500 uppercase block mb-1", children: "Hình thức chi" }),
                        c.jsxs("select", {
                          value: expenseForm.paymentMethod,
                          onChange: e => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value }),
                          className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm outline-none",
                          children: [
                            c.jsx("option", { value: "CASH", children: "Tiền mặt trực tiếp" }),
                            c.jsx("option", { value: "BANK", children: "Chuyển khoản ngân hàng" })
                          ]
                        })
                      ]
                    }),
                    c.jsxs("div", {
                      children: [
                        c.jsx("label", { className: "font-bold text-gray-500 uppercase block mb-1", children: "Người thực chi" }),
                        c.jsx("input", {
                          type: "text",
                          placeholder: "Chủ vựa / Tài xế / Trưởng đoàn",
                          value: expenseForm.payer,
                          onChange: e => setExpenseForm({ ...expenseForm, payer: e.target.value }),
                          className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm outline-none"
                        })
                      ]
                    })
                  ]
                }),
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "font-bold text-gray-500 uppercase block mb-1", children: "Thuộc chuyến cân nào (nếu có)" }),
                    c.jsx("input", {
                      type: "text",
                      placeholder: "VD: Chuyến ao Chú Mười, Chuyến tôm oxy chợ...",
                      value: expenseForm.tripName,
                      onChange: e => setExpenseForm({ ...expenseForm, tripName: e.target.value }),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm outline-none"
                    })
                  ]
                }),
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "font-bold text-gray-500 uppercase block mb-1", children: "Ghi chú thêm" }),
                    c.jsx("input", {
                      type: "text",
                      placeholder: "Ghi chú hóa đơn, tên người nhận...",
                      value: expenseForm.note,
                      onChange: e => setExpenseForm({ ...expenseForm, note: e.target.value }),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm outline-none"
                    })
                  ]
                }),
                c.jsxs("div", {
                  className: "flex justify-end gap-2 pt-3 border-t",
                  children: [
                    c.jsx("button", {
                      type: "button",
                      onClick: () => setShowAddExpenseModal(false),
                      className: "px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold rounded-xl",
                      children: "Hủy"
                    }),
                    c.jsx("button", {
                      type: "submit",
                      className: "px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-md cursor-pointer",
                      children: "Lưu Khoản Chi"
                    })
                  ]
                })
              ]
            })
          ]
        })
      }),

      // ==================== MODAL: COLLECT DEBT (THU NỢ BÁN TÔM) ====================
      showCollectDebtModal && targetSaleForDebt && c.jsx("div", {
        className: "fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200 space-y-4 border border-gray-200 dark:border-gray-700",
          children: [
            c.jsxs("div", {
              className: "flex justify-between items-center border-b pb-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("h3", {
                      className: "font-black text-lg uppercase italic text-emerald-600 dark:text-emerald-400",
                      children: "💵 Thu Nợ Bán Tôm"
                    }),
                    c.jsxs("p", {
                      className: "text-xs font-bold text-gray-500",
                      children: [targetSaleForDebt.buyerName, " (Còn nợ: ", _e(targetSaleForDebt.remainingDebt), " đ)"]
                    })
                  ]
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => setShowCollectDebtModal(false),
                  className: "p-2 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer",
                  children: c.jsx(_a, { size: 20 })
                })
              ]
            }),
            c.jsxs("div", {
              className: "space-y-3 text-xs",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "font-bold text-gray-500 uppercase block mb-1", children: "Số tiền thu nợ thực tế (VNĐ) (*)" }),
                    c.jsx("input", {
                      type: "number",
                      autoFocus: true,
                      value: debtCollectForm.amount,
                      onChange: e => setDebtCollectForm({ ...debtCollectForm, amount: e.target.value }),
                      className: "w-full p-3 border-2 border-emerald-500 rounded-xl bg-transparent font-black text-xl outline-none font-mono text-emerald-600 dark:text-emerald-400"
                    }),
                    debtCollectForm.amount && typeof numberToWordsVN_v3 === "function" && c.jsx("p", {
                      className: "text-[11px] text-gray-500 italic mt-1",
                      children: numberToWordsVN_v3(Number(debtCollectForm.amount))
                    })
                  ]
                }),
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "font-bold text-gray-500 uppercase block mb-1", children: "Hình thức thanh toán" }),
                    c.jsxs("select", {
                      value: debtCollectForm.paymentMethod,
                      onChange: e => setDebtCollectForm({ ...debtCollectForm, paymentMethod: e.target.value }),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm outline-none",
                      children: [
                        c.jsx("option", { value: "BANK", children: "Chuyển khoản ngân hàng" }),
                        c.jsx("option", { value: "CASH", children: "Tiền mặt trực tiếp" })
                      ]
                    })
                  ]
                }),
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "font-bold text-gray-500 uppercase block mb-1", children: "Ghi chú thu nợ" }),
                    c.jsx("input", {
                      type: "text",
                      placeholder: "VD: Khách trả dứt điểm phiếu...",
                      value: debtCollectForm.note,
                      onChange: e => setDebtCollectForm({ ...debtCollectForm, note: e.target.value }),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm outline-none"
                    })
                  ]
                }),
                c.jsxs("div", {
                  className: "flex justify-end gap-2 pt-3 border-t",
                  children: [
                    c.jsx("button", {
                      type: "button",
                      onClick: () => setShowCollectDebtModal(false),
                      className: "px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold rounded-xl",
                      children: "Hủy"
                    }),
                    c.jsx("button", {
                      type: "button",
                      onClick: handleConfirmCollectDebt,
                      className: "px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md cursor-pointer",
                      children: "Xác Nhận Thu Nợ"
                    })
                  ]
                })
              ]
            })
          ]
        })
      })
    ]
  });
};
`;

bundle = bundle.slice(0, pStart) + upgradedFinanceScreen + "\n\n" + bundle.slice(pEnd);

// Write to assets/index-v7.js
fs.writeFileSync(bundlePath, bundle, "utf8");

// Synchronize to public/assets/index-v7.js
const publicBundlePath = path.join(__dirname, "../public/assets/index-v7.js");
fs.writeFileSync(publicBundlePath, bundle, "utf8");

// Also synchronize to index-Os1X4Z7e.js in both locations
fs.writeFileSync(path.join(__dirname, "../assets/index-Os1X4Z7e.js"), bundle, "utf8");
fs.writeFileSync(path.join(__dirname, "../public/assets/index-Os1X4Z7e.js"), bundle, "utf8");

console.log("Successfully upgraded Xm_FinanceScreen with trips, debts, profit payouts, and visual charts!");
