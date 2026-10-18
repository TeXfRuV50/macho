# 📱 HƯỚNG DẪN THIẾT LẬP BOT MA SÓI TRÊN CLOUD PHONE MỚI (TỪ A - Z)

> Tài liệu này tổng hợp toàn bộ các câu lệnh cần thiết để khi bạn mua một chiếc Cloud Phone mới (Redfinger, LDCloud, UgPhone, vMOS...), bạn chỉ cần mở ra và copy-paste là Bot hoạt động ngay lập tức trong **1 - 2 phút**.

---

## 🔑 BƯỚC QUAN TRỌNG: CÁCH LẤY GITHUB TOKEN (CHO REPO PRIVATE)
Vì kho mã nguồn của bạn đang để chế độ **Private (Riêng tư)**, GitHub không cho phép dùng mật khẩu thông thường để tải về mà bắt buộc dùng **Personal Access Token (Token cá nhân)**. Bạn chỉ cần tạo **1 lần duy nhất** để dùng cho mọi Cloud Phone / VPS:

1. Mở trình duyệt, đăng nhập vào GitHub.
2. Bấm vào **Ảnh đại diện** (Avatar góc trên bên phải) ➔ Chọn **Settings** (Cài đặt).
3. Kéo thanh cuộn bên trái xuống dưới cùng ➔ Bấm vào **Developer settings**.
4. Chọn **Personal access tokens** ➔ Chọn **Tokens (classic)**.
5. Bấm vào nút **Generate new token** ➔ Chọn **Generate new token (classic)**.
6. Điền thông tin:
   - **Note:** Đặt tên gợi nhớ (ví dụ: `cloud-phone` hoặc `bot-werewolf`).
   - **Expiration:** Chọn `No expiration` (không bao giờ hết hạn) hoặc `90 days`.
   - **Select scopes:** Tích chọn vào ô vuông **`repo`** *(Full control of private repositories)*.
7. Kéo xuống cuối trang, bấm nút màu xanh lá **Generate token**.
8. **Copy mã token** vừa hiện ra (có dạng: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`).
   *(⚠️ Lưu ý: Token chỉ hiển thị 1 lần duy nhất, hãy lưu lại vào ghi chú để dùng bất cứ lúc nào).*

---

## ⚡ BẢN TÓM TẮT NHANH (CHO NGƯỜI ĐÃ QUEN)

Trên chiếc Cloud Phone mới, mở **Termux** và chạy lần lượt 3 khối lệnh:

### 1️⃣ Khối lệnh 1: Cài môi trường & Tải Bot về máy (Thay mã token của bạn vào)
```bash
termux-wake-lock
pkg update -y && pkg install nodejs-lts git -y
git clone https://TeXfRuV50:ghp_mã_token_ở_đây@github.com/TeXfRuV50/macho.git
cd macho
npm install
```

### 2️⃣ Khối lệnh 2: Tạo file `.env` (Thay Token và Client ID của bạn vào)
```bash
cat << 'EOF' > .env
DISCORD_TOKEN=điền_token_bot_vào_đây
CLIENT_ID=điền_client_id_vào_đây
DATABASE_PATH=./werewolf.db
DEBUG=false
EOF
```

### 3️⃣ Khối lệnh 3: Treo Bot chạy ngầm 24/7 với PM2
```bash
npm install -g pm2
npm run register
pm2 start dist/index.js --name werewolf-bot
pm2 save
```

---

## 📖 HƯỚNG DẪN CHI TIẾT TỪNG BƯỚC

### BƯỚC 1: Chuẩn bị Termux trên Cloud Phone
1. Mở trình duyệt trên Cloud Phone, truy cập [F-Droid Termux](https://f-droid.org/packages/com.termux/) hoặc [GitHub Termux](https://github.com/termux/termux-app/releases) tải file APK và cài đặt.
2. Mở ứng dụng **Termux**, chạy lệnh giữ máy không bị hệ điều hành cho ngủ đông:
   ```bash
   termux-wake-lock
   ```

### BƯỚC 2: Cài đặt Node.js và Git
Trong Termux, chạy lệnh:
```bash
pkg update -y && pkg install nodejs-lts git -y
```
*(Nếu Termux hiện câu hỏi `[Y/n]` thì gõ `y` rồi nhấn Enter).*

### BƯỚC 3: Tải mã nguồn Bot từ GitHub (Repo Private)

#### 👉 Cách 1: Kẹp Token trực tiếp vào lệnh (Khuyên dùng - 1 phát ăn ngay)
Thay `ghp_mã_token_ở_đây` bằng token GitHub của bạn và dán vào Termux:
```bash
git clone https://TeXfRuV50:ghp_mã_token_ở_đây@github.com/TeXfRuV50/macho.git
cd macho
npm install
```
*(Với cách này, Termux sẽ tự đăng nhập và tải về ngay lập tức, không bao giờ bị hỏi Username hay Password!)*

#### 👉 Cách 2: Nhập Token thủ công khi được hỏi
Nếu bạn gõ lệnh clone bình thường:
```bash
git clone https://github.com/TeXfRuV50/macho.git
```
- Khi máy hỏi `Username for 'https://github.com':` ➔ Gõ `TeXfRuV50` rồi nhấn **Enter**.
- Khi máy hỏi `Password for 'https://...':` ➔ **Dán mã token `ghp_...`** vào rồi nhấn **Enter**. *(Lưu ý: Trên Linux/Termux, khi dán mật khẩu màn hình sẽ không hiển thị ký tự nào để bảo mật, bạn cứ dán rồi nhấn Enter là xong).*

Sau đó vào thư mục và cài thư viện:
```bash
cd macho
npm install
```

> 💡 **Lưu ý quan trọng:** Bạn **KHÔNG CẦN CHẠY `npm run build`**! Mã nguồn đã được biên dịch sẵn JavaScript trong thư mục `dist/` để tránh lỗi tràn RAM (`Out of memory`) trên Cloud Phone.

### BƯỚC 4: Tạo cấu hình `.env` (Không cần bấm phím Ctrl)
Lấy **Client ID** (Application ID) và **Token Bot** từ trang [Discord Developer Portal](https://discord.com/developers/applications).

Sau đó copy đoạn lệnh dưới, thay token thật vào rồi dán vào Termux:
```bash
cat << 'EOF' > .env
DISCORD_TOKEN=điền_token_bot_vào_đây
CLIENT_ID=điền_client_id_vào_đây
DATABASE_PATH=./werewolf.db
DEBUG=false
EOF
```

### BƯỚC 5: Đăng ký Slash Command lên Discord
Chạy lệnh đăng ký các lệnh Slash Command (`/start`, `/custom`, `/roles`, `/status`, `/vote`,...):
```bash
npm run register
```
Khi màn hình hiện: `✅ Đã đăng ký slash commands thành công toàn cầu!` là hoàn tất.

### BƯỚC 6: Khởi chạy Bot

#### 👉 Cách 1: Chạy trực tiếp để kiểm tra (Test)
```bash
npm start
```
*(Nếu muốn tắt bot đang chạy ở cách này, nhấn phím Volume Down + C hoặc Ctrl + C).*

#### 👉 Cách 2: Chạy ngầm 24/7 với PM2 (Khuyên dùng)
PM2 giúp bot tiếp tục chạy ngầm vĩnh viễn ngay cả khi bạn tắt màn hình hoặc thoát app Cloud Phone:
```bash
# Cài đặt PM2 (chỉ cần chạy 1 lần):
npm install -g pm2

# Khởi chạy bot ngầm:
pm2 start dist/index.js --name werewolf-bot

# Lưu lại tiến trình để tự bật khi Cloud Phone khởi động lại:
pm2 save
```

---

## 🛠️ CÁC LỆNH QUẢN LÝ BOT THƯỜNG DÙNG (PM2)

Khi Bot đang chạy ngầm bằng PM2, bạn có thể quản lý bot bằng các lệnh sau:

| Lệnh | Công dụng |
| :--- | :--- |
| `pm2 logs werewolf-bot` | Xem lịch sử hoạt động và nhật ký chat/sự kiện của bot |
| `pm2 status` | Xem trạng thái bot (online hay offline), dung lượng RAM và CPU |
| `pm2 restart werewolf-bot` | Khởi động lại Bot |
| `pm2 stop werewolf-bot` | Tạm dừng Bot |
| `pm2 delete werewolf-bot` | Xóa tiến trình Bot khỏi PM2 |

---

## 🔄 CÁCH CẬP NHẬT KHI CÓ CODE MỚI TRÊN GITHUB

Sau này khi bạn cập nhật code trên máy tính và đẩy lên GitHub, ở trên Cloud Phone bạn chỉ cần gõ 2 lệnh này để cập nhật:

```bash
cd macho
git pull
pm2 restart werewolf-bot
```
*(Không cần cài lại từ đầu, không mất dữ liệu cấu hình hay database).*
