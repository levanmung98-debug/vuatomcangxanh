# Vua Tôm Càng Xanh 4.0 - Phần Mềm Cân Tôm & Quản Lý Hợp Đồng Thu Mua

Ứng dụng chuyên nghiệp dành cho thương lái và nông dân nuôi Tôm Càng Xanh:
- Bảng cân tôm điện tử chính xác, tự động nhảy ô và phát âm thanh đọc số ký.
- Tạo, quản lý và chia sẻ hợp đồng kinh tế điện tử thu mua tôm trực tiếp tại bờ ao.
- Cổng xác thực danh tính khách hàng bằng tài khoản Gmail / Google trước khi xem và ký hợp đồng.
- Chuẩn Progressive Web App (PWA) cài đặt trực tiếp vào điện thoại như ứng dụng native (Android & iOS).
- Hỗ trợ lưu trữ dữ liệu offline và đồng bộ đám mây an toàn.

---

## 1. Hướng Dẫn Đẩy Code Lên GitHub

Mở terminal trong thư mục dự án và chạy các lệnh sau:

```bash
# 1. Khởi tạo kho lưu trữ git (nếu chưa có)
git init

# 2. Thêm toàn bộ mã nguồn
git add .

# 3. Tạo bản commit đầu tiên
git commit -m "feat: Vua Tom Cang Xanh 4.0 production ready"

# 4. Đổi tên nhánh chính thành main
git branch -M main

# 5. Liên kết tới kho lưu trữ GitHub của bạn
git remote add origin https://github.com/YOUR_USERNAME/vuatomcangxanh.git

# 6. Đẩy mã nguồn lên GitHub
git push -u origin main
```

---

## 2. Hướng Dẫn Triển Khai Lên Cloudflare Pages

### Cách 1: Kết nối trực tiếp qua GitHub (Khuyên dùng)
1. Đăng nhập vào [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Chọn **Workers & Pages** -> Bấm **Create application** -> Chọn tab **Pages** -> **Connect to Git**.
3. Chọn repository `vuatomcangxanh` trên GitHub vừa tạo.
4. Thiết lập cấu hình build:
   - **Framework preset**: `Vite` (hoặc `None`)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node.js version**: `18` hoặc `20`
5. Bấm **Save and Deploy**. Cloudflare Pages sẽ tự động biên dịch và cung cấp link truy cập toàn cầu với CDN siêu tốc.

### Cách 2: Triển khai qua Wrangler CLI
```bash
npm run build
npx wrangler pages deploy dist --project-name=vuatomcangxanh
```

---

## 3. Cấu Hình Tên Miền Riêng (Custom Domain: `vuatomcangxanh.com`)

1. Trên Cloudflare Pages, vào dự án `vuatomcangxanh` -> Chọn tab **Custom domains**.
2. Bấm **Set up a custom domain**, nhập tên miền của bạn (ví dụ: `vuatomcangxanh.com` hoặc `app.vuatomcangxanh.com`).
3. Cloudflare tự động cấp phát chứng chỉ SSL/TLS HTTPS miễn phí và kích hoạt đường dẫn xem hợp đồng:
   - Đường dẫn chính: `https://vuatomcangxanh.com`
   - Đường dẫn gửi cho khách xem hợp đồng: `https://vuatomcangxanh.com/hopdongthumua?contract=...`

---

## 4. Hướng Dẫn Cài Đặt Vào Điện Thoại (PWA)

### Trên Android (Google Chrome):
- Truy cập vào website trên trình duyệt Chrome.
- Bấm vào banner **"Cài đặt ứng dụng"** xuất hiện trên màn hình, hoặc bấm nút menu 3 chấm (⋮) ở góc trên bên phải -> Chọn **"Thêm vào Màn hình chính"** (hoặc **"Cài đặt ứng dụng"**).
- Biểu tượng Vua Tôm Càng Xanh sẽ xuất hiện trên màn hình chính của điện thoại, mở lên chạy full màn hình không có thanh địa chỉ web.

### Trên iPhone / iPad (Safari):
- Truy cập vào website bằng trình duyệt Safari.
- Bấm vào nút **Chia sẻ** (biểu tượng hình vuông có mũi tên hướng lên ở thanh dưới).
- Cuộn xuống chọn **"Thêm vào MH chính"** (Add to Home Screen).
- Bấm **Thêm** ở góc trên bên phải. Ứng dụng sẽ hoạt động mượt mà như app native từ App Store.

---

## 5. Lệnh Phát Triển Cục Bộ

```bash
# Cài đặt dependencies
npm install

# Khởi chạy dev server
npm run dev

# Kiểm tra cú pháp
npm run lint

# Đóng gói sản phẩm
npm run build
```
