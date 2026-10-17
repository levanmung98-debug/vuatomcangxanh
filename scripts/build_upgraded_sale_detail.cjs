const fs = require("fs");
const path = require("path");

const bundlePath = path.join(__dirname, "../assets/index-v7.js");
let bundle = fs.readFileSync(bundlePath, "utf8");

const pStatus = bundle.indexOf('children: sale.status === "PENDING_SETTLEMENT" ? "⏳ CHỜ QUYẾT TOÁN" : (sale.isPaidFull ? "✓ Đã thu đủ 100%" : ("Nợ lại: " + _e(sale.remainingDebt) + " đ"))');
if (pStatus !== -1) {
  const newStatusStr = 'children: (sale.status === "SELLING" || sale.status === "PENDING_SETTLEMENT") ? "⏳ ĐANG BÁN (CHỢ ĐẦU MỐI)" : (sale.status === "AWAITING_RESULT" ? "⏳ CHỜ KẾT QUẢ (CÔNG TY)" : (sale.isPaidFull || sale.status === "COMPLETED" ? "✓ ĐÃ HOÀN TẤT DOANH THU" : ("Nợ lại: " + _e(sale.remainingDebt) + " đ")))';
  bundle = bundle.replace(
    'children: sale.status === "PENDING_SETTLEMENT" ? "⏳ CHỜ QUYẾT TOÁN" : (sale.isPaidFull ? "✓ Đã thu đủ 100%" : ("Nợ lại: " + _e(sale.remainingDebt) + " đ"))',
    newStatusStr
  );
  console.log("Updated status badge in Xm_SaleDetailScreen!");
}

// Add the action buttons for SELLING and AWAITING_RESULT
const oldButtonPart = 'sale.status === "PENDING_SETTLEMENT" && c.jsx("button", {                  onClick: () => setShowSettlement(true),                  className: "w-full py-3 mt-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-sm uppercase italic active:scale-95 transition-all shadow-md cursor-pointer",                  children: "📝 Quyết Toán Phiếu Chợ"                })';
const newButtonPart = `(sale.status === "SELLING" || sale.status === "PENDING_SETTLEMENT") && c.jsx("button", {
                  onClick: () => setShowSettlement(true),
                  className: "w-full py-3.5 mt-3 bg-green-600 hover:bg-green-700 text-white font-black rounded-2xl text-sm uppercase italic active:scale-95 transition-all shadow-lg cursor-pointer",
                  children: "📝 Chốt Đơn Chợ (Nhập Kg & Tiền Thực Nhận)"
                }),
                sale.status === "AWAITING_RESULT" && c.jsx("button", {
                  onClick: () => setShowSettlement(true),
                  className: "w-full py-3.5 mt-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-sm uppercase italic active:scale-95 transition-all shadow-lg cursor-pointer",
                  children: "📝 Nhập Kết Quả Nghiệm Thu Công Ty"
                })`;

if (bundle.includes(oldButtonPart)) {
  bundle = bundle.replace(oldButtonPart, newButtonPart);
  console.log("Updated action buttons in Xm_SaleDetailScreen!");
}

// Update the settlement modal content to support both Market and Factory
const oldSettleModalStart = 'showSettlement && c.jsx("div", {        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm",';
const pSettleStart = bundle.indexOf(oldSettleModalStart);

if (pSettleStart !== -1) {
  const pSettleEndMarker = 'children: "Lưu Quyết Toán"                })              ]            })          ]        })      })';
  const pSettleEnd = bundle.indexOf(pSettleEndMarker, pSettleStart);
  
  if (pSettleEnd !== -1) {
    const fullOldSettleModal = bundle.slice(pSettleStart, pSettleEnd + pSettleEndMarker.length);
    const newSettleModal = `showSettlement && c.jsx("div", {
        className: "fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200",
          children: [
            c.jsxs("div", {
              className: "border-b pb-3 mb-4",
              children: [
                c.jsx("h3", {
                  className: "font-black text-lg text-gray-900 dark:text-white uppercase tracking-tight",
                  children: sale.targetGroup === "FACTORY" ? "Nghiệm Thu Đơn Công Ty" : "Chốt Đơn Chợ Đầu Mối"
                }),
                c.jsxs("p", { className: "text-xs text-gray-500 font-bold", children: [sale.buyerName, " • Mã: ", sale.code] })
              ]
            }),
            c.jsxs("div", {
              className: "space-y-4 mb-6",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("label", {
                      className: "text-xs font-bold text-gray-500 mb-1 block uppercase",
                      children: sale.targetGroup === "FACTORY" ? "Số lượng (kg) được nghiệm thu *" : "Tổng số kg tôm bán được *"
                    }),
                    c.jsx("input", {
                      type: "number", step: "any",
                      placeholder: "VD: 350.5",
                      value: settleData.tare || "",
                      onChange: e => setSettleData({ ...settleData, tare: Number(e.target.value) || 0 }),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-lg font-mono outline-none focus:border-green-500"
                    })
                  ]
                }),
                c.jsxs("div", {
                  children: [
                    c.jsx("label", {
                      className: "text-xs font-bold text-gray-500 mb-1 block uppercase",
                      children: sale.targetGroup === "FACTORY" ? "Tổng số tiền công ty thanh toán (VNĐ) *" : "Tổng số tiền thực nhận (sau trừ hoa hồng) *"
                    }),
                    c.jsx("input", {
                      type: "number",
                      placeholder: "VD: 75000000",
                      value: settleData.saleMoney || "",
                      onChange: e => setSettleData({ ...settleData, saleMoney: Number(e.target.value) || 0 }),
                      className: "w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-transparent font-bold text-lg font-mono outline-none focus:border-green-500 text-green-600 dark:text-green-400"
                    })
                  ]
                })
              ]
            }),
            c.jsxs("div", {
              className: "flex gap-3 justify-end",
              children: [
                c.jsx("button", {
                  type: "button",
                  onClick: () => setShowSettlement(false),
                  className: "px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold rounded-xl text-xs",
                  children: "Hủy"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => {
                    const finalNet = Number(settleData.tare) || 0;
                    const finalMoney = Number(settleData.saleMoney) || 0;
                    if (finalNet <= 0 || finalMoney <= 0) {
                      alert("Vui lòng nhập đầy đủ số kg và số tiền thanh toán!");
                      return;
                    }
                    const updates = {
                      totalGross: finalNet,
                      totalNet: finalNet,
                      totalMoney: finalMoney,
                      status: "COMPLETED",
                      isPaidFull: true,
                      remainingDebt: 0,
                      paidAmount: finalMoney,
                      settledAt: new Date().toISOString()
                    };
                    const saved = me.updateSale(sale.id, updates);
                    if (saved) {
                      setSale(saved);
                      setShowSettlement(false);
                      alert("✅ Đã chốt đơn thành công! Trạng thái đã chuyển sang ĐÃ HOÀN TẤT.");
                    }
                  },
                  className: "px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl text-xs uppercase shadow-lg cursor-pointer",
                  children: "Lưu & Hoàn Tất"
                })
              ]
            })
          ]
        })
      })`;

    bundle = bundle.replace(fullOldSettleModal, newSettleModal);
    console.log("Updated settlement modal in Xm_SaleDetailScreen!");
  }
}

// Write to bundle
fs.writeFileSync(bundlePath, bundle, "utf8");
console.log("Xm_SaleDetailScreen updated successfully!");
