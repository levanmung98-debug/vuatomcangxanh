const fs = require("fs");

const componentCode = `
const Xm_TraderConfig = ({ setRoute }) => {
  const [profile, setProfile] = w.useState(() => getTraderProfileV3());
  const [activeTab, setActiveTab] = w.useState(0);
  const [isSaving, setIsSaving] = w.useState(false);
  const [savedToast, setSavedToast] = w.useState(false);
  const [lastSavedTime, setLastSavedTime] = w.useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = w.useState(false);
  const [copyToast, setCopyToast] = w.useState("");

  // Modals for Shrimp Type
  const [editingType, setEditingType] = w.useState(null);
  const [showAddTypeModal, setShowAddTypeModal] = w.useState(false);
  const [newTypeName, setNewTypeName] = w.useState("");
  const [newTypePrice, setNewTypePrice] = w.useState("");
  const [newTypeDesc, setNewTypeDesc] = w.useState("");

  // New spec input
  const [newSpecText, setNewSpecText] = w.useState("");

  // Reset confirmation modal
  const [showResetConfirm, setShowResetConfirm] = w.useState(false);

  // Sync from server on mount
  w.useEffect(() => {
    let mounted = true;
    fetch("/api/trader-profile")
      .then(res => res.json())
      .then(data => {
        if (mounted && data && data.profile && typeof data.profile === "object") {
          const def = getDefaultTraderProfileV3();
          const merged = { ...def, ...data.profile };
          if (!Array.isArray(merged.shrimpTypes) || merged.shrimpTypes.length === 0) {
            merged.shrimpTypes = def.shrimpTypes;
          }
          merged.shrimpSizes = merged.shrimpTypes;
          setProfile(merged);
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const updateField = (field, val) => {
    setProfile(prev => ({ ...prev, [field]: val }));
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    setIsSaving(true);
    try {
      saveTraderProfileV3(profile);
      setHasUnsavedChanges(false);
      const now = new Date();
      const timeStr = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0") + ":" + String(now.getSeconds()).padStart(2, "0") + " - " + now.toLocaleDateString("vi-VN");
      setLastSavedTime(timeStr);
      setSavedToast(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([30, 50, 30]);
      }
      setTimeout(() => setSavedToast(false), 3500);
    } catch(err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddShrimpType = () => {
    if (!newTypeName.trim()) return;
    const priceNum = parseInt(String(newTypePrice).replace(/[^0-9]/g, ""), 10) || 0;
    const newType = {
      id: "st_" + Date.now(),
      name: newTypeName.trim(),
      price: priceNum,
      desc: newTypeDesc.trim() || "Tôm tuyển chọn tiêu chuẩn"
    };
    const updated = [...(profile.shrimpTypes || []), newType];
    setProfile(prev => ({ ...prev, shrimpTypes: updated, shrimpSizes: updated }));
    setHasUnsavedChanges(true);
    setNewTypeName("");
    setNewTypePrice("");
    setNewTypeDesc("");
    setShowAddTypeModal(false);
  };

  const handleSaveEditType = () => {
    if (!editingType || !editingType.name.trim()) return;
    const priceNum = parseInt(String(editingType.price).replace(/[^0-9]/g, ""), 10) || 0;
    const updated = (profile.shrimpTypes || []).map(t =>
      t.id === editingType.id
        ? { ...t, name: editingType.name.trim(), price: priceNum, desc: editingType.desc || "" }
        : t
    );
    setProfile(prev => ({ ...prev, shrimpTypes: updated, shrimpSizes: updated }));
    setHasUnsavedChanges(true);
    setEditingType(null);
  };

  const handleDeleteShrimpType = (id) => {
    const updated = (profile.shrimpTypes || []).filter(t => t.id !== id);
    setProfile(prev => ({ ...prev, shrimpTypes: updated, shrimpSizes: updated }));
    setHasUnsavedChanges(true);
  };

  const handleRestoreDefaultShrimpTypes = () => {
    const def = getDefaultTraderProfileV3();
    setProfile(prev => ({ ...prev, shrimpTypes: def.shrimpTypes, shrimpSizes: def.shrimpSizes }));
    setHasUnsavedChanges(true);
  };

  const handleAddSpec = () => {
    if (!newSpecText.trim()) return;
    const newSpec = {
      id: "c_" + Date.now(),
      text: newSpecText.trim(),
      defaultSelected: true
    };
    setProfile(prev => ({
      ...prev,
      catchingSpecs: [...(profile.catchingSpecs || []), newSpec]
    }));
    setHasUnsavedChanges(true);
    setNewSpecText("");
  };

  const handleDeleteSpec = (id) => {
    setProfile(prev => ({
      ...prev,
      catchingSpecs: (profile.catchingSpecs || []).filter(x => x.id !== id)
    }));
    setHasUnsavedChanges(true);
  };

  const handleExportBackup = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profile, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "cau_hinh_vua_tom_" + Date.now() + ".json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch(e) {
      console.warn("Export failed:", e);
    }
  };

  const handleImportBackup = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed && typeof parsed === "object") {
          const def = getDefaultTraderProfileV3();
          const merged = { ...def, ...parsed };
          setProfile(merged);
          setHasUnsavedChanges(true);
          setSavedToast(true);
          setTimeout(() => setSavedToast(false), 3000);
        }
      } catch(err) {
        console.warn("Import error:", err);
      }
    };
    reader.readAsText(file);
  };

  const handleResetToDefault = () => {
    const def = getDefaultTraderProfileV3();
    setProfile(def);
    setHasUnsavedChanges(true);
    setShowResetConfirm(false);
  };

  const copyToClipboard = (text, label) => {
    try {
      navigator.clipboard.writeText(text);
      setCopyToast("Đã sao chép " + label + " vào bộ nhớ tạm!");
      setTimeout(() => setCopyToast(""), 2500);
    } catch(e) {}
  };

  const tabs = [
    { id: 0, label: "Vựa & Pháp Lý", icon: "🏢" },
    { id: 1, label: "Ngân Hàng & VietQR", icon: "💳" },
    { id: 2, label: "Loại Tôm & Bảng Giá", icon: "🦐" },
    { id: 3, label: "Quy Cách & Trừ Bì", icon: "⚖️" },
    { id: 4, label: "Mẫu Hợp Đồng", icon: "📜" },
    { id: 5, label: "Sao Lưu & Cloud", icon: "💾" }
  ];

  const banksList = [
    { code: "MB", name: "MB Bank - Quân Đội" },
    { code: "VCB", name: "Vietcombank - Ngoại Thương" },
    { code: "TCB", name: "Techcombank - Kỹ Thương" },
    { code: "BIDV", name: "BIDV - Đầu Tư & Phát Triển" },
    { code: "AGR", name: "Agribank - Nông Nghiệp" },
    { code: "CTG", name: "VietinBank - Công Thương" },
    { code: "ACB", name: "ACB - Á Châu" },
    { code: "VPB", name: "VPBank - Việt Nam Thịnh Vượng" },
    { code: "TPB", name: "TPBank - Tiên Phong" },
    { code: "STB", name: "Sacombank - Sài Gòn Thương Tín" },
    { code: "HDB", name: "HDBank - Phát Triển TP.HCM" },
    { code: "VIB", name: "VIB - Quốc Tế" }
  ];

  const vietQrUrl = "https://img.vietqr.io/image/" + (profile.bankName || "MB") + "-" + (profile.bankAccountNumber || "0918123456") + "-compact2.png?amount=" + (profile.defaultDeposit || 0) + "&addInfo=DAT%20COC%20MUA%20TOM&accountName=" + encodeURIComponent(profile.bankAccountName || "LE VAN MUNG");

  return c.jsxs("div", {
    className: "flex flex-col h-full bg-[#f8f9fa] dark:bg-[#121212] font-roboto overflow-y-auto pb-32",
    children: [
      // Top Sticky Header
      c.jsxs("div", {
        className: "bg-[#1b4d1e] dark:bg-[#0f2e12] p-4 text-white flex items-center justify-between shadow-xl sticky top-0 z-40 border-b border-emerald-800/40",
        children: [
          c.jsxs("div", {
            className: "flex items-center gap-3",
            children: [
              c.jsx("button", {
                type: "button",
                onClick: () => setRoute(re.DASHBOARD),
                className: "p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-2xl transition-all shadow-sm",
                title: "Về trang chủ",
                children: c.jsx(On, { size: 22 })
              }),
              c.jsxs("div", {
                children: [
                  c.jsx("h1", {
                    className: "text-base sm:text-lg font-black uppercase tracking-tight text-yellow-300 flex items-center gap-2",
                    children: [
                      "Thiết Lập Thông Tin Vựa & Tôm Càng Xanh",
                      c.jsx("span", { className: "text-[10px] bg-emerald-500/30 text-emerald-300 font-bold px-2 py-0.5 rounded-full uppercase border border-emerald-400/30 hidden sm:inline-block", children: "4.0 Cloud" })
                    ]
                  }),
                  c.jsxs("div", {
                    className: "flex items-center gap-2 text-[11px] text-emerald-200/90 font-medium",
                    children: [
                      c.jsx("span", { className: "inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" }),
                      c.jsx("span", { children: "Đồng bộ đa thiết bị & Hợp đồng điện tử" }),
                      lastSavedTime && c.jsxs("span", { className: "opacity-80 hidden md:inline", children: ["(Lưu: ", lastSavedTime, ")"] })
                    ]
                  })
                ]
              })
            ]
          }),
          c.jsx("button", {
            type: "button",
            onClick: handleSave,
            disabled: isSaving,
            className: "bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-green-950 px-4 sm:px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm uppercase flex items-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50",
            children: [
              isSaving ? c.jsx(gm, { size: 18, className: "animate-spin" }) : c.jsx(ec, { size: 18 }),
              c.jsx("span", { children: isSaving ? "Đang lưu..." : "Lưu Cài Đặt" })
            ]
          })
        ]
      }),

      // Unsaved Changes Banner
      hasUnsavedChanges && c.jsxs("div", {
        className: "bg-amber-500 text-amber-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in",
        children: [
          c.jsxs("div", {
            className: "flex items-center gap-2",
            children: [
              c.jsx(tm, { size: 16 }),
              c.jsx("span", { children: "Có thay đổi chưa được lưu. Hãy bấm 'Lưu Cài Đặt' để đồng bộ toàn hệ thống!" })
            ]
          }),
          c.jsx("button", {
            type: "button",
            onClick: handleSave,
            className: "bg-amber-950 text-white px-3 py-1 rounded-xl text-[11px] font-black uppercase shadow-sm active:scale-95",
            children: "Lưu Ngay"
          })
        ]
      }),

      // Success Toast
      savedToast && c.jsxs("div", {
        className: "mx-4 mt-3 p-3.5 bg-emerald-600 text-white rounded-2xl flex items-center justify-between shadow-xl font-bold text-xs sm:text-sm animate-in slide-in-from-top-3 border border-emerald-400/40",
        children: [
          c.jsxs("div", {
            className: "flex items-center gap-2.5",
            children: [
              c.jsx("div", { className: "w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center", children: c.jsx(P1, { size: 18 }) }),
              c.jsx("span", { children: "Đã lưu thiết lập thông tin & đồng bộ lên máy chủ đám mây thành công!" })
            ]
          }),
          c.jsx("button", { type: "button", onClick: () => setSavedToast(false), className: "p-1 hover:bg-white/20 rounded-lg", children: c.jsx(_a, { size: 16 }) })
        ]
      }),

      // Copy Toast
      copyToast && c.jsx("div", {
        className: "mx-4 mt-2 p-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-md animate-in fade-in",
        children: copyToast
      }),

      // Tabs Header Bar
      c.jsx("div", {
        className: "bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-[73px] z-30 shadow-sm",
        children: c.jsx("div", {
          className: "max-w-4xl mx-auto flex items-center gap-1 p-2 overflow-x-auto no-scrollbar",
          children: tabs.map(tab => c.jsxs("button", {
            key: tab.id,
            type: "button",
            onClick: () => setActiveTab(tab.id),
            className: "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all " + (activeTab === tab.id ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-102" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"),
            children: [
              c.jsx("span", { className: "text-sm", children: tab.icon }),
              c.jsx("span", { children: tab.label })
            ]
          }))
        })
      }),

      // Main Content Area
      c.jsxs("div", {
        className: "p-4 max-w-4xl mx-auto w-full space-y-5",
        children: [

          // ==================== TAB 0: VỰA & PHÁP LÝ ====================
          activeTab === 0 && c.jsxs("div", {
            className: "space-y-4 animate-in fade-in",
            children: [
              c.jsxs("div", {
                className: "bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-[28px] shadow-sm border border-gray-100 dark:border-gray-800 space-y-5",
                children: [
                  c.jsxs("div", {
                    className: "flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800",
                    children: [
                      c.jsxs("div", {
                        className: "flex items-center gap-2.5",
                        children: [
                          c.jsx("div", { className: "w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg", children: "🏢" }),
                          c.jsxs("div", {
                            children: [
                              c.jsx("h3", { className: "font-black uppercase text-sm sm:text-base text-gray-800 dark:text-gray-100", children: "Thông Tin Cơ Sở & Người Đại Diện (Bên A)" }),
                              c.jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400", children: "Thông tin hiển thị trên Hợp đồng điện tử & Biên bản thu mua tôm" })
                            ]
                          })
                        ]
                      }),
                      c.jsx("span", { className: "text-[11px] font-bold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl uppercase border border-emerald-200 dark:border-emerald-800/40", children: "Bên Mua (Bên A)" })
                    ]
                  }),

                  c.jsxs("div", {
                    className: "grid grid-cols-1 sm:grid-cols-2 gap-4",
                    children: [
                      // Tên Vựa
                      c.jsxs("div", {
                        className: "sm:col-span-2",
                        children: [
                          c.jsxs("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block mb-1.5 flex items-center gap-1", children: ["Tên Thương Lái / Cơ Sở Thu Mua", c.jsx("span", { className: "text-red-500", children: "(*)" })] }),
                          c.jsx("input", {
                            type: "text",
                            value: profile.fullName || "",
                            onChange: (e) => updateField("fullName", e.target.value),
                            placeholder: "Ví dụ: Cơ Sở Thu Mua Tôm Càng Xanh Năm Căn",
                            className: "w-full p-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-gray-900 dark:text-gray-100"
                          })
                        ]
                      }),

                      // Người đại diện
                      c.jsxs("div", {
                        children: [
                          c.jsxs("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block mb-1.5 flex items-center gap-1", children: ["Họ & Tên Người Đại Diện Pháp Lý", c.jsx("span", { className: "text-red-500", children: "(*)" })] }),
                          c.jsx("input", {
                            type: "text",
                            value: profile.representative || "",
                            onChange: (e) => updateField("representative", e.target.value),
                            placeholder: "Ví dụ: Lê Văn Mừng",
                            className: "w-full p-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-gray-900 dark:text-gray-100"
                          })
                        ]
                      }),

                      // Số điện thoại chính
                      c.jsxs("div", {
                        children: [
                          c.jsxs("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block mb-1.5 flex items-center gap-1", children: ["Số Điện Thoại Chính / Zalo", c.jsx("span", { className: "text-red-500", children: "(*)" })] }),
                          c.jsx("input", {
                            type: "text",
                            value: profile.phone || "",
                            onChange: (e) => updateField("phone", e.target.value),
                            placeholder: "Ví dụ: 0918 123 456",
                            className: "w-full p-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-gray-900 dark:text-gray-100"
                          })
                        ]
                      }),

                      // Số điện thoại phụ
                      c.jsxs("div", {
                        children: [
                          c.jsx("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block mb-1.5", children: "Số Điện Thoại Phụ / Hotline Khẩn Cấp" }),
                          c.jsx("input", {
                            type: "text",
                            value: profile.secondaryPhone || "",
                            onChange: (e) => updateField("secondaryPhone", e.target.value),
                            placeholder: "Ví dụ: 0949 888 999",
                            className: "w-full p-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-gray-900 dark:text-gray-100"
                          })
                        ]
                      }),

                      // Số CCCD / CMND
                      c.jsxs("div", {
                        children: [
                          c.jsxs("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block mb-1.5 flex items-center gap-1", children: ["Số CCCD / CMND Đại Diện", c.jsx("span", { className: "text-red-500", children: "(*)" })] }),
                          c.jsx("input", {
                            type: "text",
                            value: profile.idCard || "",
                            onChange: (e) => updateField("idCard", e.target.value),
                            placeholder: "Ví dụ: 089090012345",
                            className: "w-full p-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-gray-900 dark:text-gray-100"
                          })
                        ]
                      }),

                      // Ngày cấp CCCD
                      c.jsxs("div", {
                        children: [
                          c.jsx("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block mb-1.5", children: "Ngày Cấp CCCD" }),
                          c.jsx("input", {
                            type: "text",
                            value: profile.issueDate || "",
                            onChange: (e) => updateField("issueDate", e.target.value),
                            placeholder: "Ví dụ: 15/08/2021",
                            className: "w-full p-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-gray-900 dark:text-gray-100"
                          })
                        ]
                      }),

                      // Nơi cấp CCCD
                      c.jsxs("div", {
                        children: [
                          c.jsx("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block mb-1.5", children: "Nơi Cấp CCCD" }),
                          c.jsx("input", {
                            type: "text",
                            value: profile.issuePlace || "",
                            onChange: (e) => updateField("issuePlace", e.target.value),
                            placeholder: "Ví dụ: Cục CSQLHC về TTXH",
                            className: "w-full p-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-gray-900 dark:text-gray-100"
                          })
                        ]
                      }),

                      // Địa chỉ trụ sở
                      c.jsxs("div", {
                        className: "sm:col-span-2",
                        children: [
                          c.jsxs("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block mb-1.5 flex items-center gap-1", children: ["Địa Chỉ Vựa / Kho Bãi Tập Kết", c.jsx("span", { className: "text-red-500", children: "(*)" })] }),
                          c.jsx("input", {
                            type: "text",
                            value: profile.address || "",
                            onChange: (e) => updateField("address", e.target.value),
                            placeholder: "Ví dụ: Khóm 1, TT. Năm Căn, H. Năm Căn, Tỉnh Cà Mau",
                            className: "w-full p-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-gray-900 dark:text-gray-100"
                          })
                        ]
                      }),

                      // Email nhận thông báo
                      c.jsxs("div", {
                        className: "sm:col-span-2",
                        children: [
                          c.jsx("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block mb-1.5", children: "Email Nhận Bản Sao Hợp Đồng & Ký Số Điện Tử" }),
                          c.jsx("input", {
                            type: "email",
                            value: profile.email || "",
                            onChange: (e) => updateField("email", e.target.value),
                            placeholder: "levanmung98@gmail.com",
                            className: "w-full p-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-gray-900 dark:text-gray-100"
                          })
                        ]
                      }),

                      // Ghi chú uy tín
                      c.jsxs("div", {
                        className: "sm:col-span-2",
                        children: [
                          c.jsx("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block mb-1.5", children: "Lời Giới Thiệu / Cam Kết Uy Tín" }),
                          c.jsx("textarea", {
                            rows: 2,
                            value: profile.note || "",
                            onChange: (e) => updateField("note", e.target.value),
                            placeholder: "Chuyên thu mua tôm càng xanh oxy chạy hàng, cân chuẩn, tiền liền tại ao...",
                            className: "w-full p-3 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl font-medium text-xs outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-gray-900 dark:text-gray-100"
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          // ==================== TAB 1: NGÂN HÀNG & VIETQR ====================
          activeTab === 1 && c.jsxs("div", {
            className: "space-y-4 animate-in fade-in",
            children: [
              c.jsxs("div", {
                className: "bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-[28px] shadow-sm border border-gray-100 dark:border-gray-800 space-y-5",
                children: [
                  c.jsxs("div", {
                    className: "flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800",
                    children: [
                      c.jsxs("div", {
                        className: "flex items-center gap-2.5",
                        children: [
                          c.jsx("div", { className: "w-9 h-9 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg", children: "💳" }),
                          c.jsxs("div", {
                            children: [
                              c.jsx("h3", { className: "font-black uppercase text-sm sm:text-base text-gray-800 dark:text-gray-100", children: "Tài Khoản Ngân Hàng & Thanh Toán VietQR" }),
                              c.jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400", children: "Hiển thị mã QR tự động trên hợp đồng để nông dân nhận cọc & thanh toán" })
                            ]
                          })
                        ]
                      }),
                      c.jsx("span", { className: "text-[11px] font-bold px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-xl uppercase border border-blue-200 dark:border-blue-800/40", children: "Napas 24/7" })
                    ]
                  }),

                  c.jsxs("div", {
                    className: "grid grid-cols-1 md:grid-cols-2 gap-5",
                    children: [
                      // Left: Bank inputs
                      c.jsxs("div", {
                        className: "space-y-4",
                        children: [
                          // Ngân hàng
                          c.jsxs("div", {
                            children: [
                              c.jsx("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block mb-1.5", children: "Chọn Ngân Hàng Thụ Hưởng" }),
                              c.jsx("select", {
                                value: profile.bankName || "MB",
                                onChange: (e) => updateField("bankName", e.target.value),
                                className: "w-full p-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-gray-100",
                                children: banksList.map(b => c.jsx("option", { value: b.code, children: b.name }, b.code))
                              })
                            ]
                          }),

                          // Số tài khoản
                          c.jsxs("div", {
                            children: [
                              c.jsx("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block mb-1.5", children: "Số Tài Khoản Ngân Hàng" }),
                              c.jsx("input", {
                                type: "text",
                                value: profile.bankAccountNumber || "",
                                onChange: (e) => updateField("bankAccountNumber", e.target.value.replace(/[^0-9A-Za-z]/g, "")),
                                placeholder: "Ví dụ: 0918123456",
                                className: "w-full p-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl font-black text-base tracking-wider outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-gray-100"
                              })
                            ]
                          }),

                          // Tên chủ tài khoản
                          c.jsxs("div", {
                            children: [
                              c.jsx("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block mb-1.5", children: "Tên Chủ Tài Khoản (In Hoa Không Dấu)" }),
                              c.jsx("input", {
                                type: "text",
                                value: profile.bankAccountName || "",
                                onChange: (e) => updateField("bankAccountName", e.target.value.toUpperCase()),
                                placeholder: "Ví dụ: LE VAN MUNG",
                                className: "w-full p-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl font-black text-sm uppercase outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-gray-100"
                              })
                            ]
                          }),

                          c.jsx("button", {
                            type: "button",
                            onClick: () => copyToClipboard(profile.bankAccountNumber || "", "Số tài khoản"),
                            className: "w-full py-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-xs uppercase rounded-xl border border-blue-200 dark:border-blue-800/50 flex items-center justify-center gap-2 active:scale-95 transition-all",
                            children: [c.jsx(im, { size: 16 }), "Sao Chép Số Tài Khoản"]
                          })
                        ]
                      }),

                      // Right: VietQR Live Preview
                      c.jsxs("div", {
                        className: "p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800/60 dark:to-gray-800/40 border border-blue-200 dark:border-gray-700 rounded-3xl flex flex-col items-center justify-center text-center space-y-3",
                        children: [
                          c.jsx("span", { className: "text-[11px] font-black uppercase text-blue-900 dark:text-blue-300 tracking-wider", children: "Mã VietQR Mẫu Trực Quan" }),
                          c.jsx("div", {
                            className: "bg-white p-3 rounded-2xl shadow-md border border-gray-200 inline-block",
                            children: c.jsx("img", {
                              src: vietQrUrl,
                              alt: "VietQR Code",
                              className: "w-44 h-44 object-contain mx-auto",
                              onError: (e) => { e.target.style.display = "none"; }
                            })
                          }),
                          c.jsxs("div", {
                            className: "text-xs space-y-0.5",
                            children: [
                              c.jsxs("p", { className: "font-black text-gray-800 dark:text-gray-200", children: [profile.bankName || "MB", " - ", profile.bankAccountNumber || "---"] }),
                              c.jsx("p", { className: "font-bold text-blue-700 dark:text-blue-400 uppercase text-[11px]", children: profile.bankAccountName || "---" })
                            ]
                          }),
                          c.jsx("span", { className: "text-[10px] text-gray-500 dark:text-gray-400 italic", children: "Tự động sinh mã VietQR theo chuẩn Ngân hàng Nhà nước" })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          // ==================== TAB 2: LOẠI TÔM & BẢNG GIÁ ====================
          activeTab === 2 && c.jsxs("div", {
            className: "space-y-4 animate-in fade-in",
            children: [
              c.jsxs("div", {
                className: "bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-[28px] shadow-sm border border-gray-100 dark:border-gray-800 space-y-5",
                children: [
                  c.jsxs("div", {
                    className: "flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 gap-3",
                    children: [
                      c.jsxs("div", {
                        className: "flex items-center gap-2.5",
                        children: [
                          c.jsx("div", { className: "w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg", children: "🦐" }),
                          c.jsxs("div", {
                            children: [
                              c.jsx("h3", { className: "font-black uppercase text-sm sm:text-base text-gray-800 dark:text-gray-100", children: "Danh Mục Loại Tôm & Bảng Giá Thu Mua" }),
                              c.jsxs("p", { className: "text-xs text-gray-500 dark:text-gray-400", children: ["Hiện có ", c.jsx("b", { className: "text-amber-600 dark:text-amber-400", children: (profile.shrimpTypes || []).length }), " loại tôm thu mua sẵn sàng"] })
                            ]
                          })
                        ]
                      }),
                      c.jsxs("div", {
                        className: "flex items-center gap-2",
                        children: [
                          c.jsx("button", {
                            type: "button",
                            onClick: handleRestoreDefaultShrimpTypes,
                            className: "px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl transition-all",
                            title: "Khôi phục danh mục 7 loại tôm chuẩn Miền Tây",
                            children: "Chuẩn Miền Tây"
                          }),
                          c.jsx("button", {
                            type: "button",
                            onClick: () => setShowAddTypeModal(true),
                            className: "px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all",
                            children: [c.jsx(As, { size: 16 }), "Thêm Loại Tôm"]
                          })
                        ]
                      })
                    ]
                  }),

                  c.jsx("p", {
                    className: "text-xs text-gray-500 dark:text-gray-400 font-medium",
                    children: "Khi bắt đầu mẻ cân tôm mới, người cân có thể chọn nhanh bất kỳ loại tôm nào dưới đây để tự động áp giá gợi ý tương ứng mà không cần phải gõ lại."
                  }),

                  // List of shrimp types
                  c.jsx("div", {
                    className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
                    children: (profile.shrimpTypes || []).map((t, idx) => c.jsxs("div", {
                      key: t.id || idx,
                      className: "p-4 bg-gray-50 dark:bg-gray-800/70 hover:bg-white dark:hover:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs flex flex-col justify-between gap-3 transition-all",
                      children: [
                        c.jsxs("div", {
                          className: "flex items-start justify-between gap-2",
                          children: [
                            c.jsxs("div", {
                              className: "flex items-start gap-3",
                              children: [
                                c.jsx("div", { className: "w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center font-black text-base flex-shrink-0", children: "🦐" }),
                                c.jsxs("div", {
                                  children: [
                                    c.jsx("p", { className: "font-black text-sm text-gray-900 dark:text-gray-100 uppercase tracking-tight", children: t.name }),
                                    c.jsx("p", { className: "text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1", children: t.desc || "Tiêu chuẩn loại 1" })
                                  ]
                                })
                              ]
                            }),
                            c.jsxs("div", {
                              className: "flex items-center gap-1",
                              children: [
                                c.jsx("button", {
                                  type: "button",
                                  onClick: () => setEditingType({ ...t }),
                                  className: "p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-colors",
                                  title: "Chỉnh sửa loại tôm này",
                                  children: c.jsx("span", { className: "text-sm", children: "✏️" })
                                }),
                                c.jsx("button", {
                                  type: "button",
                                  onClick: () => handleDeleteShrimpType(t.id),
                                  className: "p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors",
                                  title: "Xóa loại tôm này",
                                  children: c.jsx(Iu, { size: 16 })
                                })
                              ]
                            })
                          ]
                        }),
                        c.jsxs("div", {
                          className: "pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between",
                          children: [
                            c.jsx("span", { className: "text-[11px] font-bold text-gray-400 uppercase", children: "Giá gợi ý:" }),
                            c.jsxs("span", {
                              className: "text-base font-black text-emerald-600 dark:text-emerald-400",
                              children: [(Number(t.price) || 0).toLocaleString("vi-VN"), " đ/kg"]
                            })
                          ]
                        })
                      ]
                    }))
                  })
                ]
              })
            ]
          }),

          // ==================== TAB 3: QUY CÁCH & TRỪ BÌ ====================
          activeTab === 3 && c.jsxs("div", {
            className: "space-y-4 animate-in fade-in",
            children: [
              c.jsxs("div", {
                className: "bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-[28px] shadow-sm border border-gray-100 dark:border-gray-800 space-y-5",
                children: [
                  c.jsxs("div", {
                    className: "flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800",
                    children: [
                      c.jsxs("div", {
                        className: "flex items-center gap-2.5",
                        children: [
                          c.jsx("div", { className: "w-9 h-9 rounded-2xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-lg", children: "⚖️" }),
                          c.jsxs("div", {
                            children: [
                              c.jsx("h3", { className: "font-black uppercase text-sm sm:text-base text-gray-800 dark:text-gray-100", children: "Quy Cách Bắt Tôm & Trừ Hao Ráo Nước" }),
                              c.jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400", children: "Tiêu chuẩn trừ bì và thời gian thu hoạch tại ao" })
                            ]
                          })
                        ]
                      }),
                      c.jsx("span", { className: "text-[11px] font-bold px-2.5 py-1 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 rounded-xl uppercase border border-teal-200 dark:border-teal-800/40", children: "Quy Chuẩn Bờ Ao" })
                    ]
                  }),

                  c.jsxs("div", {
                    className: "grid grid-cols-1 sm:grid-cols-3 gap-4",
                    children: [
                      // Trừ bì kg/100kg
                      c.jsxs("div", {
                        className: "sm:col-span-1",
                        children: [
                          c.jsx("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block mb-1.5", children: "Trừ Hao Ráo Nước Mặc Định" }),
                          c.jsxs("div", {
                            className: "relative flex items-center",
                            children: [
                              c.jsx("input", {
                                type: "number",
                                step: "0.5",
                                value: profile.tarePer100Kg !== undefined ? profile.tarePer100Kg : 1,
                                onChange: (e) => updateField("tarePer100Kg", parseFloat(e.target.value) || 0),
                                className: "w-full p-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl font-black text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all text-gray-900 dark:text-gray-100 pr-20"
                              }),
                              c.jsx("span", { className: "absolute right-3.5 text-xs font-bold text-gray-400 pointer-events-none", children: "kg / 100 kg" })
                            ]
                          })
                        ]
                      }),

                      // Giờ bắt đầu
                      c.jsxs("div", {
                        children: [
                          c.jsx("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block mb-1.5", children: "Giờ Bắt Bắt Đầu Gợi Ý" }),
                          c.jsx("input", {
                            type: "time",
                            value: profile.harvestStartTime || "04:30",
                            onChange: (e) => updateField("harvestStartTime", e.target.value),
                            className: "w-full p-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all text-gray-900 dark:text-gray-100"
                          })
                        ]
                      }),

                      // Giờ kết thúc
                      c.jsxs("div", {
                        children: [
                          c.jsx("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block mb-1.5", children: "Giờ Bắt Kết Thúc Gợi Ý" }),
                          c.jsx("input", {
                            type: "time",
                            value: profile.harvestEndTime || "08:30",
                            onChange: (e) => updateField("harvestEndTime", e.target.value),
                            className: "w-full p-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all text-gray-900 dark:text-gray-100"
                          })
                        ]
                      })
                    ]
                  }),

                  // Catching specs list
                  c.jsxs("div", {
                    className: "pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3",
                    children: [
                      c.jsx("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block", children: "Danh Sách Quy Cách Thu Bắt Tiêu Chuẩn:" }),
                      c.jsx("div", {
                        className: "space-y-2",
                        children: (profile.catchingSpecs || []).map((sp, idx) => c.jsxs("div", {
                          key: sp.id || idx,
                          className: "p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200/60 dark:border-gray-700/50 flex items-center justify-between gap-3 text-xs font-semibold text-gray-800 dark:text-gray-200",
                          children: [
                            c.jsxs("div", {
                              className: "flex items-center gap-2.5",
                              children: [
                                c.jsx(P1, { size: 16, className: "text-emerald-600 flex-shrink-0" }),
                                c.jsx("span", { children: sp.text })
                              ]
                            }),
                            c.jsx("button", {
                              type: "button",
                              onClick: () => handleDeleteSpec(sp.id),
                              className: "p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors",
                              children: c.jsx(Iu, { size: 16 })
                            })
                          ]
                        }))
                      }),

                      // Add spec input
                      c.jsxs("div", {
                        className: "flex gap-2 pt-2",
                        children: [
                          c.jsx("input", {
                            type: "text",
                            placeholder: "Nhập quy cách bắt mới (vd: Tỷ lệ tôm sống oxy đạt trên 95% lúc cân...)",
                            value: newSpecText,
                            onChange: (e) => setNewSpecText(e.target.value),
                            onKeyDown: (e) => { if (e.key === "Enter") handleAddSpec(); },
                            className: "flex-1 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-teal-500"
                          }),
                          c.jsx("button", {
                            type: "button",
                            onClick: handleAddSpec,
                            className: "px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-black text-xs uppercase shadow-sm active:scale-95 transition-all flex items-center gap-1",
                            children: [c.jsx(As, { size: 16 }), "Thêm"]
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          // ==================== TAB 4: MẪU HỢP ĐỒNG & CỌC ====================
          activeTab === 4 && c.jsxs("div", {
            className: "space-y-4 animate-in fade-in",
            children: [
              c.jsxs("div", {
                className: "bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-[28px] shadow-sm border border-gray-100 dark:border-gray-800 space-y-5",
                children: [
                  c.jsxs("div", {
                    className: "flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800",
                    children: [
                      c.jsxs("div", {
                        className: "flex items-center gap-2.5",
                        children: [
                          c.jsx("div", { className: "w-9 h-9 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-lg", children: "📜" }),
                          c.jsxs("div", {
                            children: [
                              c.jsx("h3", { className: "font-black uppercase text-sm sm:text-base text-gray-800 dark:text-gray-100", children: "Điều Khoản Mẫu Hợp Đồng Điện Tử & Tiền Cọc" }),
                              c.jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400", children: "Căn cứ Bộ luật Dân sự 2015 & Luật Giao dịch điện tử 2023" })
                            ]
                          })
                        ]
                      }),
                      c.jsx("span", { className: "text-[11px] font-bold px-2.5 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-xl uppercase border border-purple-200 dark:border-purple-800/40", children: "Pháp Lý 4.0" })
                    ]
                  }),

                  // Tiền cọc gợi ý
                  c.jsxs("div", {
                    children: [
                      c.jsx("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block mb-1.5", children: "Tiền Đặt Cọc Mặc Định Khi Tạo Hợp Đồng Mới (VNĐ)" }),
                      c.jsxs("div", {
                        className: "relative flex items-center",
                        children: [
                          c.jsx("input", {
                            type: "number",
                            step: "500000",
                            value: profile.defaultDeposit || 5000000,
                            onChange: (e) => updateField("defaultDeposit", parseInt(e.target.value, 10) || 0),
                            className: "w-full p-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl font-black text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all text-gray-900 dark:text-gray-100 pr-16"
                          }),
                          c.jsx("span", { className: "absolute right-3.5 text-xs font-bold text-gray-400 pointer-events-none", children: "VNĐ" })
                        ]
                      }),
                      c.jsxs("p", { className: "text-[11px] text-gray-400 mt-1 font-semibold", children: ["Bằng chữ: ", (profile.defaultDeposit || 0).toLocaleString("vi-VN"), " đồng"] })
                    ]
                  }),

                  // Điều khoản phạt cọc
                  c.jsxs("div", {
                    children: [
                      c.jsxs("div", {
                        className: "flex items-center justify-between mb-1.5",
                        children: [
                          c.jsx("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300", children: "Điều Khoản Phạt Cọc & Bồi Hoàn Cam Kết Hai Bên:" }),
                          c.jsx("button", {
                            type: "button",
                            onClick: () => {
                              const def = getDefaultTraderProfileV3();
                              updateField("defaultTerms", def.defaultTerms);
                            },
                            className: "text-[11px] text-purple-600 dark:text-purple-400 font-bold hover:underline",
                            children: "Khôi phục mẫu chuẩn"
                          })
                        ]
                      }),
                      c.jsx("textarea", {
                        rows: 4,
                        value: profile.defaultTerms || "",
                        onChange: (e) => updateField("defaultTerms", e.target.value),
                        className: "w-full p-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl font-medium text-xs text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500 transition-all leading-relaxed"
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          // ==================== TAB 5: SAO LƯU & CLOUD ====================
          activeTab === 5 && c.jsxs("div", {
            className: "space-y-4 animate-in fade-in",
            children: [
              c.jsxs("div", {
                className: "bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-[28px] shadow-sm border border-gray-100 dark:border-gray-800 space-y-5",
                children: [
                  c.jsxs("div", {
                    className: "flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800",
                    children: [
                      c.jsxs("div", {
                        className: "flex items-center gap-2.5",
                        children: [
                          c.jsx("div", { className: "w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg", children: "💾" }),
                          c.jsxs("div", {
                            children: [
                              c.jsx("h3", { className: "font-black uppercase text-sm sm:text-base text-gray-800 dark:text-gray-100", children: "Sao Lưu Dự Phòng & Đồng Bộ Máy Chủ" }),
                              c.jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400", children: "Dữ liệu được lưu trữ an toàn trên cả bộ nhớ máy & đám mây máy chủ" })
                            ]
                          })
                        ]
                      }),
                      c.jsx("span", { className: "text-[11px] font-bold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl uppercase border border-emerald-200 dark:border-emerald-800/40", children: "An Toàn 100%" })
                    ]
                  }),

                  c.jsxs("div", {
                    className: "grid grid-cols-1 sm:grid-cols-2 gap-4",
                    children: [
                      // Export button
                      c.jsxs("div", {
                        className: "p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2",
                        children: [
                          c.jsx("h4", { className: "font-black text-xs uppercase text-gray-800 dark:text-gray-200", children: "1. Xuất Bản Sao Lưu (Backup)" }),
                          c.jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400", children: "Tải toàn bộ cài đặt thông tin vựa, danh mục loại tôm và tài khoản ngân hàng thành file JSON về máy." }),
                          c.jsx("button", {
                            type: "button",
                            onClick: handleExportBackup,
                            className: "w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all",
                            children: [c.jsx(um, { size: 16 }), "Tải File Sao Lưu (.JSON)"]
                          })
                        ]
                      }),

                      // Import button
                      c.jsxs("div", {
                        className: "p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2",
                        children: [
                          c.jsx("h4", { className: "font-black text-xs uppercase text-gray-800 dark:text-gray-200", children: "2. Khôi Phục Từ File (Restore)" }),
                          c.jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400", children: "Nạp file sao lưu đã lưu từ máy khác để khôi phục cấu hình nhanh chóng." }),
                          c.jsxs("label", {
                            className: "w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer text-center",
                            children: [
                              c.jsx("span", { className: "text-base", children: "📂" }),
                              c.jsx("span", { children: "Chọn File Khôi Phục" }),
                              c.jsx("input", {
                                type: "file",
                                accept: ".json",
                                onChange: handleImportBackup,
                                className: "hidden"
                              })
                            ]
                          })
                        ]
                      })
                    ]
                  }),

                  // Reset to default
                  c.jsxs("div", {
                    className: "pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between",
                    children: [
                      c.jsxs("div", {
                        children: [
                          c.jsx("p", { className: "font-bold text-xs text-gray-700 dark:text-gray-300", children: "Khôi phục cấu hình mẫu gốc của ứng dụng" }),
                          c.jsx("p", { className: "text-[11px] text-gray-400", children: "Đưa thông tin vựa, danh mục loại tôm và quy cách về thiết lập ban đầu" })
                        ]
                      }),
                      c.jsx("button", {
                        type: "button",
                        onClick: () => setShowResetConfirm(true),
                        className: "px-3 py-2 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-400 font-bold text-xs uppercase rounded-xl border border-red-200 dark:border-red-800/50 transition-all",
                        children: "Khôi Phục Gốc"
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          // Save All Button Bottom Sticky
          c.jsxs("div", {
            className: "pt-2",
            children: [
              c.jsx("button", {
                type: "button",
                onClick: handleSave,
                disabled: isSaving,
                className: "w-full py-4 bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white rounded-2xl font-black text-sm uppercase shadow-xl flex items-center justify-center gap-2.5 active:scale-95 transition-all disabled:opacity-50",
                children: [
                  isSaving ? c.jsx(gm, { size: 20, className: "animate-spin" }) : c.jsx(ec, { size: 20 }),
                  c.jsx("span", { children: isSaving ? "Đang lưu toàn bộ thiết lập..." : "Lưu Toàn Bộ Thiết Lập Thông Tin" })
                ]
              }),
              lastSavedTime && c.jsxs("p", {
                className: "text-center text-[11px] text-gray-400 dark:text-gray-500 mt-2 font-medium",
                children: ["Lần lưu thành công gần nhất: ", lastSavedTime]
              })
            ]
          })
        ]
      }),

      // ==================== MODAL: ADD SHRIMP TYPE ====================
      showAddTypeModal && c.jsx("div", {
        className: "fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-4",
          children: [
            c.jsxs("div", {
              className: "flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800",
              children: [
                c.jsxs("div", {
                  className: "flex items-center gap-2",
                  children: [
                    c.jsx("span", { className: "text-xl", children: "🦐" }),
                    c.jsx("h3", { className: "font-black uppercase text-sm text-gray-800 dark:text-gray-100", children: "Thêm Loại Tôm Mới" })
                  ]
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => setShowAddTypeModal(false),
                  className: "p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl",
                  children: c.jsx(_a, { size: 20 })
                })
              ]
            }),

            c.jsxs("div", {
              className: "space-y-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block mb-1", children: "Tên Loại Tôm (*)" }),
                    c.jsx("input", {
                      type: "text",
                      placeholder: "Ví dụ: Tôm càng sen, Tôm càng xào, Tôm càng đại...",
                      value: newTypeName,
                      onChange: (e) => setNewTypeName(e.target.value),
                      className: "w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-sm outline-none uppercase focus:ring-2 focus:ring-amber-500"
                    })
                  ]
                }),

                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block mb-1", children: "Giá Thu Mua Gợi Ý (VNĐ/kg)" }),
                    c.jsx("input", {
                      type: "text",
                      placeholder: "Ví dụ: 160000",
                      value: newTypePrice,
                      onChange: (e) => setNewTypePrice(e.target.value.replace(/[^0-9]/g, "")),
                      className: "w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-black text-sm outline-none text-right focus:ring-2 focus:ring-amber-500 text-emerald-600 dark:text-emerald-400"
                    }),
                    newTypePrice && c.jsxs("p", {
                      className: "text-[11px] text-right font-bold text-gray-400 mt-1",
                      children: ["= ", (parseInt(newTypePrice, 10) || 0).toLocaleString("vi-VN"), " đ/kg"]
                    })
                  ]
                }),

                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block mb-1", children: "Mô Tả / Đặc Điểm Tôm" }),
                    c.jsx("input", {
                      type: "text",
                      placeholder: "Ví dụ: Tôm sống oxy loại 1, thịt chắc, sáng vỏ",
                      value: newTypeDesc,
                      onChange: (e) => setNewTypeDesc(e.target.value),
                      className: "w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-xs outline-none focus:ring-2 focus:ring-amber-500"
                    })
                  ]
                })
              ]
            }),

            c.jsxs("div", {
              className: "flex gap-2 pt-2",
              children: [
                c.jsx("button", {
                  type: "button",
                  onClick: () => setShowAddTypeModal(false),
                  className: "flex-1 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs uppercase",
                  children: "Hủy"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: handleAddShrimpType,
                  className: "flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs uppercase shadow-md active:scale-95",
                  children: "Thêm Vào Danh Mục"
                })
              ]
            })
          ]
        })
      }),

      // ==================== MODAL: EDIT SHRIMP TYPE ====================
      editingType && c.jsx("div", {
        className: "fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-4",
          children: [
            c.jsxs("div", {
              className: "flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800",
              children: [
                c.jsxs("div", {
                  className: "flex items-center gap-2",
                  children: [
                    c.jsx("span", { className: "text-xl", children: "✏️" }),
                    c.jsx("h3", { className: "font-black uppercase text-sm text-gray-800 dark:text-gray-100", children: "Chỉnh Sửa Loại Tôm" })
                  ]
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: () => setEditingType(null),
                  className: "p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl",
                  children: c.jsx(_a, { size: 20 })
                })
              ]
            }),

            c.jsxs("div", {
              className: "space-y-3",
              children: [
                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block mb-1", children: "Tên Loại Tôm (*)" }),
                    c.jsx("input", {
                      type: "text",
                      value: editingType.name || "",
                      onChange: (e) => setEditingType({ ...editingType, name: e.target.value }),
                      className: "w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-sm outline-none uppercase focus:ring-2 focus:ring-blue-500"
                    })
                  ]
                }),

                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block mb-1", children: "Giá Thu Mua Gợi Ý (VNĐ/kg)" }),
                    c.jsx("input", {
                      type: "text",
                      value: editingType.price !== undefined ? String(editingType.price) : "",
                      onChange: (e) => setEditingType({ ...editingType, price: e.target.value.replace(/[^0-9]/g, "") }),
                      className: "w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-black text-sm outline-none text-right focus:ring-2 focus:ring-blue-500 text-emerald-600 dark:text-emerald-400"
                    }),
                    c.jsxs("p", {
                      className: "text-[11px] text-right font-bold text-gray-400 mt-1",
                      children: ["= ", (parseInt(editingType.price, 10) || 0).toLocaleString("vi-VN"), " đ/kg"]
                    })
                  ]
                }),

                c.jsxs("div", {
                  children: [
                    c.jsx("label", { className: "text-xs font-black uppercase text-gray-600 dark:text-gray-300 block mb-1", children: "Mô Tả / Đặc Điểm" }),
                    c.jsx("input", {
                      type: "text",
                      value: editingType.desc || "",
                      onChange: (e) => setEditingType({ ...editingType, desc: e.target.value }),
                      className: "w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    })
                  ]
                })
              ]
            }),

            c.jsxs("div", {
              className: "flex gap-2 pt-2",
              children: [
                c.jsx("button", {
                  type: "button",
                  onClick: () => setEditingType(null),
                  className: "flex-1 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs uppercase",
                  children: "Hủy"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: handleSaveEditType,
                  className: "flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase shadow-md active:scale-95",
                  children: "Cập Nhật"
                })
              ]
            })
          ]
        })
      }),

      // ==================== MODAL: RESET CONFIRM ====================
      showResetConfirm && c.jsx("div", {
        className: "fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in",
        children: c.jsxs("div", {
          className: "bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-4 text-center",
          children: [
            c.jsx("div", { className: "w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto text-2xl", children: "⚠️" }),
            c.jsx("h3", { className: "font-black text-base text-gray-900 dark:text-gray-100 uppercase", children: "Khôi Phục Cài Đặt Gốc?" }),
            c.jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400", children: "Tất cả thông tin thiết lập sẽ được đưa về dữ liệu chuẩn của phần mềm. Hành động này không thể hoàn tác." }),
            c.jsxs("div", {
              className: "flex gap-2 pt-2",
              children: [
                c.jsx("button", {
                  type: "button",
                  onClick: () => setShowResetConfirm(false),
                  className: "flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs uppercase",
                  children: "Đóng"
                }),
                c.jsx("button", {
                  type: "button",
                  onClick: handleResetToDefault,
                  className: "flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase shadow-md active:scale-95",
                  children: "Đồng Ý Đặt Lại"
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

fs.writeFileSync("tmp/generated_Xm_TraderConfig.txt", componentCode, "utf8");
console.log("Component successfully written to tmp/generated_Xm_TraderConfig.txt");
