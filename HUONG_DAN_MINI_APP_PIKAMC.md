# 🎮 HƯỚNG DẪN CÀI ĐẶT BOT MA SÓI TRÊN PIKAMC (GÓI 25K / THÁNG)

> Hướng dẫn chi tiết từng bước cách đưa Bot Ma Sói lên dịch vụ **Mini-App / App Hosting** của **PikaMC (`pikamc.vn`)** với chi phí chỉ **25.000đ / tháng**, quản lý 100% qua giao diện Web Panel trực quan (có sẵn nút Bật/Tắt/Khởi động lại).

---

## ❓ GÓI 25K/THÁNG CÓ CHẠY ĐƯỢC BOT KHÔNG?

👉 **CÂU TRẢ LỜI LÀ: CHẠY CỰC KỲ DƯ DẢ VÀ SIÊU MƯỢT!**

| Thành phần | Yêu cầu của Bot Ma Sói | Cấu hình gói 25k PikaMC | Đánh giá |
| :--- | :--- | :--- | :--- |
| **RAM** | ~100MB – 150MB | **1GB – 2GB RAM** | Dư gấp **10 lần**, không bao giờ lo tràn RAM |
| **CPU** | Rất ít (~2 - 5%) | **AMD Ryzen 9 9950X** | Chip khủng đơn nhân top đầu, bot phản hồi trong mili-giây |
| **Uptime** | Treo 24/7 | **Chạy liên tục 24/7** | Panel tự động khởi động lại bot nếu có sự cố |
| **Giá cả** | Càng rẻ càng tốt | **25.000đ / tháng** | Rẻ hơn cả 1 cốc trà sữa hay tiền Cloud Phone |

---

## ⚡ TỔNG QUAN CÁC BƯỚC THỰC HIỆN

1. Đăng ký gói tại `pikamc.vn` và đăng nhập vào trang **Web Panel quản lý**.
2. Thiết lập mục **Startup** (chọn NodeJS 20/22 và chỉ định file `dist/index.js`).
3. Đưa mã nguồn Bot lên (Upload file zip hoặc Git Clone).
4. Tạo file cấu hình `.env` (điền Token Bot & Client ID).
5. Chạy `npm install` và `npm run register` rồi bấm **START**!

---

## 📖 HƯỚNG DẪN CHI TIẾT TỪNG BƯỚC

### BƯỚC 1: Đăng nhập vào Web Panel của PikaMC
Sau khi mua gói 25k, bạn sẽ nhận được đường dẫn trang quản lý Panel cùng tài khoản đăng nhập (qua email hoặc trang khách hàng). Bấm vào link và đăng nhập vào giao diện máy chủ của bạn.

---

### BƯỚC 2: Cấu hình Khởi động (Startup Settings)
1. Ở thanh menu bên trái, tìm và bấm vào mục **Startup** (hoặc *Cài đặt khởi động*).
2. Kiểm tra các mục sau:
   - **NodeJS Version:** Chọn **Node 20** hoặc **Node 22** (LTS).
   - **Main File / Entrypoint:** Điền `dist/index.js` (hoặc nếu là ô **Startup Command** thì điền `node dist/index.js`).

---

### BƯỚC 3: Tải mã nguồn Bot lên Panel

Bạn có thể chọn 1 trong 2 cách sau:

#### 👉 Cách 1: Tải qua File Zip từ máy tính (Dễ nhất & Khuyên dùng)
1. Trên máy tính của bạn, mở thư mục dự án bot (`d:\ma chó`).
2. Chọn tất cả các file và thư mục (nhớ có thư mục `dist/`), **trừ** thư mục `node_modules` và thư mục `.git` (cho nhẹ).
3. Bấm chuột phải ➔ Chọn **Compress to ZIP file** (đặt tên là `bot.zip`).
4. Trên Web Panel PikaMC, bấm vào mục **Files** (Quản lý tệp) ➔ Bấm nút **Upload** (Tải lên) ➔ Chọn file `bot.zip`.
5. Khi tải lên 100%, bấm chuột phải (hoặc dấu 3 chấm) vào file `bot.zip` ➔ Chọn **Unarchive** (Giải nén).

#### 👉 Cách 2: Tải thẳng từ GitHub qua Console (Dành cho Repo Private)
1. Trên Web Panel, bấm vào mục **Console** (Dòng lệnh).
2. Dán lệnh sau vào ô gõ lệnh bên dưới rồi nhấn **Enter** *(thay mã token GitHub của bạn vào)*:
   ```bash
   git clone https://TeXfRuV50:ghp_mã_token_ở_đây@github.com/TeXfRuV50/macho.git .
   ```
   *(⚠️ Lưu ý: Có dấu chấm ` .` ở cuối để tải thẳng nội dung vào thư mục chính).*

---

### BƯỚC 4: Tạo file `.env` trên Web Panel
1. Bấm vào mục **Files** (Quản lý tệp).
2. Bấm nút **New File** (Tạo tệp mới).
3. Dán nội dung sau vào:
   ```env
   DISCORD_TOKEN=điền_token_bot_vào_đây
   CLIENT_ID=điền_client_id_vào_đây
   DATABASE_PATH=./werewolf.db
   DEBUG=false
   ```
   *(Thay mã Bot Token và Client ID thật của bạn từ Discord Developer Portal vào).*
4. Ở ô **File Name**, gõ tên: `.env`
5. Bấm **Create File** (hoặc **Save Content**) để lưu lại.

---

### BƯỚC 5: Cài đặt thư viện & Đăng ký lệnh Slash Command
1. Bấm vào mục **Console** (Màn hình điều khiển).
2. Gõ lệnh cài đặt các thư viện cần thiết:
   ```bash
   npm install
   ```
   *(Đợi khoảng 10 - 20 giây cho hệ thống tải xong).*
3. Gõ tiếp lệnh đăng ký lệnh với Discord:
   ```bash
   npm run register
   ```
   Khi thấy dòng: `✅ Đã đăng ký slash commands thành công toàn cầu!` là hoàn tất!

---

### BƯỚC 6: Bật Bot chạy 24/7!
1. Tại tab **Console**, bạn bấm nút màu xanh **START** ở góc trên bên phải màn hình.
2. Màn hình Console sẽ chạy các dòng chữ:
   ```text
   ✅ Đã đăng nhập với bot: Tên_Bot#0000
   🚀 Bot Ma Sói đã sẵn sàng hoạt động!
   ```
3. **Thành công!** Lúc này bot đã online trong server Discord của bạn. Bạn có thể tắt trình duyệt web, tắt máy tính thì Bot vẫn luôn online 24/7 trên máy chủ PikaMC.

---

## 🔄 CÁCH CẬP NHẬT KHI CÓ CODE MỚI TRÊN GITHUB

Sau này mỗi khi bạn chỉnh sửa tính năng mới trên máy tính và đẩy lên GitHub, bạn chỉ cần:

1. Vào tab **Console** trên Web Panel PikaMC.
2. Gõ lệnh:
   ```bash
   git pull
   npm run register
   ```
3. Bấm nút **RESTART** ở góc trên màn hình Web Panel. Bot sẽ tự nạp code mới trong 2 giây!
