const fs = require("fs");
const path = require("path");

const bundlePath = path.join(__dirname, "../assets/index-Os1X4Z7e.js");
let bundle = fs.readFileSync(bundlePath, "utf8");

// 1. In getDefaultTraderProfileV3: change defaultDeposit: 5000000 to defaultDeposit: 0 (or empty, no forced 5tr)
bundle = bundle.replace("defaultDeposit: 5000000,", "defaultDeposit: 0,");
console.log("1. defaultDeposit in getDefaultTraderProfileV3 updated to 0");

// 2. In Tab 4: deposit input change step to 'any'
bundle = bundle.replace('step: "500000",', 'step: "any",');
console.log("2. Tab 4 deposit input step set to any");

// 3. In Cm: Replace all old fallbacks 'Dạt tôm mềm, ốp, gãy càng...'
const oldSpec1 = 'rejectionSpec: v.rejectionSpec || "Dạt tôm mềm, ốp, gãy càng chuyển sang tính giá tôm xào",';
const newSpec1 = 'rejectionSpec: v.rejectionSpec || getStandardSpecsString(),';
bundle = bundle.replaceAll(oldSpec1, newSpec1);

const oldSpec2 = 'rejectionSpec: pond.rejectionSpec || "Dạt tôm mềm, ốp, gãy càng chuyển tính giá xào",';
const newSpec2 = 'rejectionSpec: pond.rejectionSpec || (typeof getStandardSpecsString === "function" ? getStandardSpecsString() : ""),';
bundle = bundle.replaceAll(oldSpec2, newSpec2);

const oldSpec3 = 'children: contract.rejectionSpec || "Dạt tôm mềm, ốp, gãy càng chuyển tính giá xào"';
const newSpec3 = 'children: contract.rejectionSpec || (typeof getStandardSpecsString === "function" ? getStandardSpecsString() : "")';
bundle = bundle.replaceAll(oldSpec3, newSpec3);
console.log("3. Replaced old rejectionSpec fallbacks");

// 4. In handleSavePond: reset v state after saving so next time form is opened it has fresh standard specs
const savePondEndMarker = 'p(me.getFarmers());    U("UNWEIGHED");    alert("Đã lưu thông tin chủ ao thành công!");';
const savePondEndReplacement = `p(me.getFarmers());
    _({
      name: "",
      phone: "",
      area: "",
      address: "",
      province: "Cà Mau",
      district: "",
      commune: "",
      shrimpType: (shrimpTags && shrimpTags[0]) || "Tôm càng xanh tỷ lệ sống từ 95% tăng lên",
      rejectionSpec: getStandardSpecsString(),
      estimatedYield: "",
      depositMoney: (typeof getTraderProfileV3 === "function" && getTraderProfileV3().defaultDeposit !== undefined ? String(getTraderProfileV3().defaultDeposit) : ""),
      traderPrice: "",
      weighingDate: "",
      weighingTime: "05:00",
      tareSpec: "Trừ hao ráo nước chuẩn 1kg/thùng cân",
      catchingMethod: "Kéo lưới hoặc dớn",
      oxygenRatio: "95%",
      qualityStandard: "Tôm tươi sống oxy ≥ 95% lúc cân tại bờ ao",
      compensationTerms: "Bên nào vi phạm bồi thường gấp 02 lần tiền cọc"
    });
    U("UNWEIGHED");
    alert("Đã lưu thông tin chủ ao thành công!");`;

if (bundle.includes(savePondEndMarker)) {
  bundle = bundle.replace(savePondEndMarker, savePondEndReplacement);
  console.log("4. handleSavePond form reset added");
} else {
  console.log("4. Warning: savePondEndMarker not found directly");
}

// 5. In Cm: When clicking button to switch to ADD, make sure rejectionSpec is initialized if empty
const toggleAddButton = 'onClick: () => U(D === "ADD" ? "UNWEIGHED" : "ADD"),';
const toggleAddButtonReplacement = `onClick: () => {
              if (D !== "ADD") {
                _({
                  ...v,
                  rejectionSpec: getStandardSpecsString(),
                  depositMoney: (typeof getTraderProfileV3 === "function" && getTraderProfileV3().defaultDeposit !== undefined ? String(getTraderProfileV3().defaultDeposit) : "")
                });
                U("ADD");
              } else {
                U("UNWEIGHED");
              }
            },`;

if (bundle.includes(toggleAddButton)) {
  bundle = bundle.replace(toggleAddButton, toggleAddButtonReplacement);
  console.log("5. toggleAddButton updated to re-sync rejectionSpec and depositMoney");
} else {
  console.log("5. Warning: toggleAddButton not found directly");
}

fs.writeFileSync(bundlePath, bundle, "utf8");
console.log("Bundle updated successfully!");

// ==========================================
// 6. UPDATE sw.js TO BUMP CACHE & NETWORK FIRST
// ==========================================
const swPath = path.join(__dirname, "../sw.js");
const newSwContent = `const CACHE_NAME = 'vua-tom-cang-xanh-v6';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) => cache.add(url).catch(() => {}))
      );
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network First for code & HTML to guarantee latest version
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Network First for HTML and JS/CSS assets
  if (
    event.request.mode === 'navigate' ||
    event.request.url.endsWith('.js') ||
    event.request.url.endsWith('.html') ||
    event.request.url.includes('/assets/')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            if (event.request.mode === 'navigate') return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Cache first for other assets with background update
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        event.waitUntil(
          fetch(event.request).then((response) => {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, response.clone());
            });
          }).catch(() => {})
        );
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
`;
fs.writeFileSync(swPath, newSwContent, "utf8");
console.log("sw.js updated with v6 and Network-First strategy!");

// ==========================================
// 7. UPDATE index.html WITH SCRIPT CACHE BUSTER
// ==========================================
const indexPath = path.join(__dirname, "../index.html");
let indexHtml = fs.readFileSync(indexPath, "utf8");

indexHtml = indexHtml.replace(
  /\/assets\/index-Os1X4Z7e\.js(\?v=[^"]*)?/g,
  '/assets/index-Os1X4Z7e.js?v=20260929_v6'
);

if (!indexHtml.includes('reg.update()')) {
  indexHtml = indexHtml.replace(
    "console.log('PWA Service Worker registered:', reg.scope);",
    "console.log('PWA Service Worker registered:', reg.scope); reg.update();"
  );
}

fs.writeFileSync(indexPath, indexHtml, "utf8");
console.log("index.html cache buster updated to v=20260929_v6!");
