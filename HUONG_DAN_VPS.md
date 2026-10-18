# 🖥️ HƯỚNG DẪN CÀI ĐẶT & CHẠY BOT MA SÓI TRÊN VPS (UBUNTU & WINDOWS)

> Tài liệu hướng dẫn chi tiết từng bước cách triển khai Bot Ma Sói Discord chạy 24/7 trên máy chủ ảo VPS (**Ubuntu / Debian Linux** và **Windows Server**).

---

## 📑 MỤC LỤC
1. [Phần 1: Cài đặt trên VPS Ubuntu / Debian Linux](#-phần-1-cài-đặt-trên-vps-ubuntu--debian-linux)
2. [Phần 2: Cài đặt trên VPS Windows Server](#-phần-2-cài-đặt-trên-vps-windows-server)
3. [Phần 3: Các lệnh quản lý & Cập nhật Bot](#-phần-3-các-lệnh-quản-lý--cập-nhật-bot)

---

## 🔑 BƯỚC QUAN TRỌNG: CÁCH LẤY GITHUB TOKEN (CHO REPO PRIVATE)
Vì kho mã nguồn của bạn đang để chế độ **Private (Riêng tư)**, GitHub không cho phép dùng mật khẩu tài khoản để tải code mà bắt buộc dùng **Personal Access Token (Token cá nhân)**. Bạn chỉ cần tạo **1 lần duy nhất**:

1. Mở trình duyệt trên máy tính/điện thoại, đăng nhập vào [GitHub](https://github.com).
2. Bấm vào **Ảnh đại diện** (Avatar góc trên bên phải) ➔ Chọn **Settings** (Cài đặt).
3. Kéo thanh cuộn bên trái xuống dưới cùng ➔ Bấm vào **Developer settings**.
4. Chọn **Personal access tokens** ➔ Chọn **Tokens (classic)**.
5. Bấm vào nút **Generate new token** ➔ Chọn **Generate new token (classic)**.
6. Điền thông tin:
   - **Note:** Đặt tên gợi nhớ (ví dụ: `vps-werewolf`).
   - **Expiration:** Chọn `No expiration` (không bao giờ hết hạn) hoặc `90 days`.
   - **Select scopes:** Tích chọn vào ô vuông **`repo`** *(Full control of private repositories)*.
7. Kéo xuống cuối trang, bấm nút màu xanh lá **Generate token**.
8. **Copy mã token** vừa hiện ra (có dạng: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`).
   *(⚠️ Lưu ý: Token chỉ hiển thị 1 lần duy nhất, hãy lưu lại vào ghi chú để dùng bất cứ lúc nào).*

---

# 🐧 PHẦN 1: CÀI ĐẶT TRÊN VPS UBUNTU / DEBIAN LINUX

### Bước 1: Đăng nhập vào VPS qua SSH
Từ máy tính của bạn, mở Terminal / PowerShell và gõ lệnh kết nối:
```bash
ssh root@<IP_VPS_CỦA_BẠN>
```
*(Nhập mật khẩu VPS khi được hỏi; khi gõ mật khẩu màn hình sẽ ẩn ký tự, bạn cứ gõ xong nhấn Enter).*

---

### Bước 2: Cài đặt Node.js LTS và Git (Chỉ 1 lần)
Chạy khối lệnh sau để cài đặt Node.js phiên bản mới nhất và Git:
```bash
# Cập nhật hệ thống
sudo apt update -y && sudo apt upgrade -y

# Cài đặt Node.js LTS (v22.x) từ kho chính thức NodeSource & Git
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git build-essential

# Kiểm tra phiên bản cài đặt thành công:
node -v
npm -v
git --version
```

---

### Bước 3: Tải mã nguồn Bot từ GitHub (Repo Private)

#### 👉 Cách 1: Kẹp Token vào lệnh (Khuyên dùng - Nhanh nhất)
Thay `ghp_mã_token_ở_đây` bằng token GitHub của bạn và chạy:
```bash
git clone https://TeXfRuV50:ghp_mã_token_ở_đây@github.com/TeXfRuV50/macho.git
cd macho
npm install
```
*(Với cách này VPS sẽ tự xác thực và tải về ngay lập tức, không bị hỏi tài khoản mật khẩu).*

#### 👉 Cách 2: Nhập Token khi được hỏi
Nếu bạn gõ lệnh `git clone https://github.com/TeXfRuV50/macho.git`:
- `Username for 'https://github.com':` ➔ Gõ `TeXfRuV50` rồi Enter.
- `Password for 'https://...':` ➔ **Dán mã token `ghp_...`** vào rồi Enter. *(Màn hình Linux ẩn ký tự mật khẩu, cứ dán rồi Enter).*

Sau đó cài đặt thư viện:
```bash
cd macho
npm install
```
> 💡 *Mã nguồn đã được biên dịch sẵn JavaScript trong thư mục `dist/`, bạn không cần chạy `npm run build`.*

---

### Bước 4: Tạo file cấu hình `.env`
Dán lệnh dưới đây *(thay Token và Client ID của bạn vào)*:
```bash
cat << 'EOF' > .env
DISCORD_TOKEN=điền_token_bot_vào_đây
CLIENT_ID=điền_client_id_vào_đây
DATABASE_PATH=./werewolf.db
DEBUG=false
EOF
```

---

### Bước 5: Đăng ký Slash Command & Treo Bot 24/7 với PM2
```bash
# 1. Cài đặt PM2 để quản lý tiến trình ngầm:
npm install -g pm2

# 2. Đăng ký các lệnh slash command với Discord:
npm run register

# 3. Khởi chạy Bot dưới dạng tiến trình ngầm 24/7:
pm2 start dist/index.js --name werewolf-bot

# 4. Thiết lập tự khởi động cùng VPS khi reboot:
pm2 startup
pm2 save
```
*(Lệnh `pm2 startup` sẽ in ra một dòng lệnh hướng dẫn cấu hình sudo nếu cần, bạn chỉ việc copy dòng đó dán vào chạy).*

🎉 **Xong!** Bây giờ bạn có thể tắt cửa sổ SSH, Bot vẫn sẽ chạy online 24/7 trên VPS Ubuntu.

---

<br>

# 🪟 PHẦN 2: CÀI ĐẶT TRÊN VPS WINDOWS SERVER

### Bước 1: Kết nối vào VPS Windows qua Remote Desktop (RDP)
1. Trên máy tính của bạn, nhấn phím **Windows + R**, gõ `mstsc` rồi nhấn **Enter** (hoặc tìm ứng dụng **Remote Desktop Connection**).
2. Nhập địa chỉ **IP VPS** -> bấm **Connect**.
3. Nhập Username (thường là `Administrator`) và **Mật khẩu VPS** để vào màn hình desktop của VPS.

---

### Bước 2: Cài đặt Node.js và Git trên VPS Windows

#### Cách nhanh (dùng PowerShell Admin):
Mở **PowerShell với quyền Administrator** trên VPS Windows và dán lệnh sau để tự tải và cài đặt:
```powershell
winget install OpenJS.NodeJS.LTS Git.Git -e --accept-source-agreements --accept-package-agreements
```

#### Cách thủ công (nếu không dùng winget):
1. Mở trình duyệt trên VPS tải và cài **Node.js LTS**: [nodejs.org](https://nodejs.org) (chọn bản LTS, bấm Next liên tục để cài).
2. Tải và cài **Git for Windows**: [git-scm.com/download/win](https://git-scm.com/download/win).
3. Khởi động lại PowerShell sau khi cài xong.

---

### Bước 3: Tải mã nguồn Bot về VPS Windows (Repo Private)
Mở **PowerShell** hoặc **Command Prompt (cmd)** và chạy:

#### 👉 Cách 1: Kẹp Token vào lệnh (Khuyên dùng - 1 click ăn ngay):
Thay `ghp_mã_token_ở_đây` bằng token GitHub của bạn:
```powershell
git clone https://TeXfRuV50:ghp_mã_token_ở_đây@github.com/TeXfRuV50/macho.git
cd macho
npm install
```

#### 👉 Cách 2: Nếu gõ lệnh `git clone https://github.com/TeXfRuV50/macho.git`:
Git trên Windows có thể bật cửa sổ pop-up yêu cầu đăng nhập:
- Chọn **Token** (hoặc Personal Access Token) và dán mã token `ghp_...` vào.
- Hoặc nếu hỏi trong PowerShell: Username điền `TeXfRuV50`, Password dán mã token `ghp_...` vào.

---

### Bước 4: Tạo file cấu hình `.env`
Trong cửa sổ PowerShell tại thư mục `macho`, chạy lệnh sau *(thay Token và Client ID của bạn vào)*:
```powershell
@"
DISCORD_TOKEN=điền_token_bot_vào_đây
CLIENT_ID=điền_client_id_vào_đây
DATABASE_PATH=./werewolf.db
DEBUG=false
"@ | Out-File -Encoding utf8 .env
```

---

### Bước 5: Đăng ký Slash Command & Khởi động Bot

#### 👉 Cách 1: Treo Bot bằng PM2 (Khuyên dùng)
```powershell
# Cài đặt PM2 toàn cục:
npm install -g pm2

# Đăng ký Slash Command lên Discord:
npm run register

# Khởi chạy bot ngầm 24/7:
pm2 start dist/index.js --name werewolf-bot
pm2 save
```

#### 👉 Cách 2: Treo Bot bằng file Shortcut tự chạy khi bật máy (Startup)
1. Trong thư mục `macho`, tạo file `run-bot.bat` với nội dung:
   ```bat
   @echo off
   cd /d "%~dp0"
   node dist/index.js
   pause
   ```
2. Nhấn tổ hợp phím **Windows + R**, gõ `shell:startup` rồi nhấn **Enter**.
3. Chuột phải vào file `run-bot.bat`, chọn **Create shortcut** (Tạo lối tắt) rồi kéo shortcut đó bỏ vào thư mục Startup vừa mở.
4. Từ nay mỗi khi bật VPS hoặc reboot máy, bot sẽ tự động chạy lên!

---

<br>

# 🛠️ PHẦN 3: CÁC LỆNH QUẢN LÝ & CẬP NHẬT BOT

Dù chạy trên Ubuntu hay Windows, khi dùng **PM2** bạn đều có thể quản lý bot bằng các lệnh tiện lợi sau:

### 1. Xem nhật ký hoạt động (Logs) của Bot
```bash
pm2 logs werewolf-bot
```
*(Xem tin nhắn người chơi, sự kiện game, lỗi nếu có theo thời gian thực).*

### 2. Xem trạng thái CPU / RAM
```bash
pm2 status
```

### 3. Khởi động lại Bot
```bash
pm2 restart werewolf-bot
```

### 4. Tạm dừng hoặc Xóa Bot
```bash
pm2 stop werewolf-bot     # Tạm dừng
pm2 delete werewolf-bot   # Xóa khỏi danh sách PM2
```

### 5. Cập nhật mã nguồn mới khi có update trên GitHub
Khi bạn sửa code trên máy tính và đẩy lên GitHub, trên VPS bạn chỉ cần chạy:
```bash
cd macho
git pull
npm run register
pm2 restart werewolf-bot
```
*(Bot sẽ tự động tải phiên bản mới và khởi động lại trong 2 giây, dữ liệu database SQLite được bảo toàn nguyên vẹn).*
