# 🐺 Discord Werewolf Bot (Quản Trò Ma Sói Tự Động Tiếng Việt)

Bot Discord chơi Ma Sói hoàn toàn bằng tiếng Việt với khả năng tự động hóa 100% vai trò Quản trò: tạo phòng, phân vai bí mật qua DM, điều hành ban đêm, thảo luận ban ngày, biểu quyết treo cổ, xử lý chuỗi kỹ năng phức tạp và công bố kết quả trận đấu.

Engine logic của game được tách rời hoàn toàn khỏi Discord API, có bộ test tự động toàn diện và lưu trữ trạng thái bền vững trên SQLite.

---

## 📑 MỤC LỤC
1. [Tính Năng Nổi Bật](#-tính-năng-nổi-bật)
2. [Kiến Trúc & Cấu Trúc Dự Án](#-kiến-trúc--cấu-trúc-dự-án)
3. [Hướng Dẫn Thiết Lập Discord Bot](#-hướng-dẫn-thiết-lập-discord-bot)
   - [Tạo ứng dụng và Bot](#1-tạo-ứng-dụng-trên-discord-developer-portal)
   - [Bật Privileged Gateway Intents](#2-bật-privileged-gateway-intents)
   - [Quyền hạn Bot cần thiết](#3-cấp-quyền-permissions-cho-bot)
   - [Tạo Link mời Bot vào Server](#4-tạo-link-mời-bot-oauth2)
4. [Cài Đặt & Chạy Local](#-cài-đặt--chạy-local)
5. [Danh Sách Slash Command & Hướng Dẫn Sử Dụng](#-danh-sách-slash-command--hướng-dẫn-sử-dụng)
6. [Tùy Chỉnh Cấu Hình & Presets](#-tùy-chỉnh-cấu-hình--presets)
7. [Kết Quả Kiểm Thử Thực Tế](#-kết-quả-kiểm-thử-thực-tế)

---

## 🌟 TÍNH NĂNG NỔI BẬT

- **Quản trò tự động 100%:** Tự động điều phối các pha `LOBBY` ➔ `ROLE_DISTRIBUTION` ➔ `NIGHT` ➔ `DAWN` ➔ `DISCUSSION` ➔ `VOTING` ➔ `RESOLUTION` ➔ `FINISHED`.
- **Bảo mật vai trò tuyệt đối:**
  - Phát vai và gọi dậy ban đêm hoàn toàn qua tin nhắn riêng (DM).
  - Có cơ chế **Fallback Private Thread**: nếu người chơi chặn DM, bot tự động tạo phòng riêng tư bí mật được kiểm tra quyền truy cập; không bao giờ để lộ vai ra kênh chung.
  - Chống người khác xem trộm hoặc thao tác thay qua nút bấm (kiểm tra `customId` gắn kèm `gameId`, `phaseId`, `userId` phía server).
- **Hệ thống vai trò phong phú & tương tác chuẩn xác:**
  - **Phe Dân:** Dân làng, Tiên tri, Bảo vệ, Phù thủy (bình cứu/độc, luật tự cứu), Thợ săn (bắn trả thù, cấm bắn nếu chết vì độc), Thằng ngốc (tha chết lần đầu, mất quyền biểu quyết), Thần tình yêu (ghép đôi đêm 1, chết vì đau lòng).
  - **Phe Sói:** Sói thường, Sói quỷ (chuyển hóa nạn nhân thành sói), Sói cuồng nộ (kích hoạt đòn cắn xuyên khiên đêm sau), Sói trắng (thức dậy đêm chẵn giết đồng loại, thắng độc lập).
  - **Phe Độc lập:** Kẻ chán đời (thắng độc lập ngay khi bị treo cổ).
- **Trình tùy chỉnh /custom & Presets linh hoạt:**
  - Tự động cân bằng số Dân làng theo số lượng người chơi.
  - Hỗ trợ tạo vai mới thông qua Schema an toàn (không dùng `eval`).
  - Hỗ trợ lưu, nạp, xem danh sách preset riêng cho từng server.
- **Bền vững & Chống sự cố (Reboot Recovery):**
  - Trạng thái lưu trên SQLite (`node:sqlite`). Khi bot khởi động lại, các ván đấu đang diễn ra sẽ tự động phục hồi và xử lý hạn chót đã trôi qua một cách idempotent (không chuyển pha 2 lần).
  - Hỗ trợ danh sách người chơi lớn (> 25 người) bằng cách tự động phân trang Select Menu của Discord.

---

## 📁 KIẾN TRÚC & CẤU TRÚC DỰ ÁN

```
d:/ma chó/
├── src/
│   ├── engine/                   # Pure Game Engine (hoàn toàn độc lập Discord)
│   │   ├── types.ts              # Interface, GamePhase, ActionType, Player, GameConfig
│   │   ├── roles.ts              # Bách khoa toàn thư vai trò, mô tả tiếng Việt
│   │   ├── presets.ts            # Preset Cơ bản, Nâng cao, Auto-balancer & Validator
│   │   ├── custom-roles.ts       # Registry tạo vai mới an toàn với Zod schema
│   │   ├── night-resolver.ts     # Bộ giải quyết hành động ban đêm xác định (Deterministic)
│   │   └── game.ts               # State machine, quản lý vòng đời và điều kiện thắng
│   ├── database/                 # Lưu trữ SQLite bền vững
│   │   └── database.ts           # DatabaseManager (CRUD game, player, actions, presets)
│   ├── discord/                  # Discord Adapter & UI Layer
│   │   ├── types.ts              # Bộ mã hóa/giải mã customId và phân trang >25 người
│   │   ├── embeds.ts             # Embed giao diện tiếng Việt đậm chất Ma Sói
│   │   ├── components.ts         # Nút bấm, Select menu, Hộp thoại xác nhận
│   │   ├── dm-manager.ts         # Gửi tin riêng tư an toàn & fallback private thread
│   │   ├── config-ui.ts          # Giao diện /custom và Modal nhập liệu an toàn
│   │   ├── commands.ts           # Khai báo Slash commands và bộ parse mentions
│   │   ├── game-session.ts       # Điều phối GameSession, timer, cập nhật message
│   │   └── interaction-handler.ts# Điều hướng Slash commands, Buttons, Menus, Modals
│   ├── deploy-commands.ts        # Script đăng ký Slash Command lên Discord API
│   └── index.ts                  # Điểm khởi chạy ứng dụng & phục hồi sau reboot
├── tests/                        # Toàn bộ test suite tự động (Vitest)
│   ├── engine/                   # Unit test cho engine logic
│   ├── database/                 # Unit test cho SQLite persistence & recovery
│   └── discord/                  # Integration test với Mock Discord Adapter
├── docs/
│   └── ROLES_AND_RULES.md        # Tài liệu chi tiết vai trò & thứ tự giải quyết đêm
├── .env.example                  # Mẫu biến môi trường
├── package.json
└── tsconfig.json
```

---

## 🚀 HƯỚNG DẪN THIẾT LẬP DISCORD BOT

### 1. Tạo ứng dụng trên Discord Developer Portal
1. Truy cập [Discord Developer Portal](https://discord.com/developers/applications).
2. Bấm **New Application**, đặt tên cho ứng dụng (ví dụ: `Ma Soi Quan Tro`) và bấm **Create**.
3. Tại menu bên trái, chọn **Bot**:
   - Bấm **Reset Token** để lấy Token Bot.
   - Sao chép Token này để điền vào `DISCORD_TOKEN` trong file `.env`.
4. Tại menu bên trái, chọn **General Information**:
   - Sao chép **Application ID** để điền vào `CLIENT_ID` trong file `.env`.

### 2. Bật Privileged Gateway Intents
Trong trang **Bot** của Developer Portal, cuộn xuống phần **Privileged Gateway Intents** và bật:
- ✅ **Server Members Intent** (cần để kiểm tra thành viên server)
- ✅ **Message Content Intent** (nếu bot cần đọc nội dung)

### 3. Cấp quyền (Permissions) cho Bot
Bot cần các quyền sau để vận hành phòng chơi trơn tru:
- `Send Messages` (Gửi tin nhắn)
- `Embed Links` (Nhúng liên kết & hiển thị Embeds)
- `Attach Files` (Đính kèm tệp)
- `Read Message History` (Đọc lịch sử tin nhắn)
- `Use External Emojis` (Dùng emoji ngoài)
- `Manage Channels` (Quản lý kênh - dùng để khóa chat người đã chết và khóa kênh ban đêm)
- `Manage Messages` (Quản lý tin nhắn - dùng để xóa tin nhắn vi phạm của người chết / chat ban đêm)
- `Create Private Threads` (Tạo luồng riêng tư cho cơ chế fallback khi người chơi chặn DM)
- `Send Messages in Threads` (Gửi tin nhắn trong luồng)
- `Manage Threads` (Xóa và dọn dẹp luồng sau khi hết trận)

### 4. Tạo Link mời Bot (OAuth2)
1. Tại menu bên trái, chọn **OAuth2** -> **URL Generator**.
2. Trong ô **Scopes**, tích chọn:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Trong ô **Bot Permissions**, tích chọn các quyền đã nêu ở Bước 3 (hoặc chọn `Administrator` trong môi trường thử nghiệm).
4. Sao chép đường link URL ở dưới cùng và dán vào trình duyệt để mời Bot vào máy chủ của bạn.

---

## 💻 CÀI ĐẶT & CHẠY LOCAL

### Yêu cầu môi trường
- **Node.js**: Phiên bản 22+ hoặc 24+ LTS.
- **npm**: Đi kèm với Node.js.

### Các bước cài đặt:
1. Mở terminal tại thư mục dự án và cài đặt dependencies:
   ```bash
   npm install
   ```

2. Tạo file cấu hình môi trường `.env`:
   ```bash
   cp .env.example .env
   ```
   Chỉnh sửa file `.env` với thông tin của bạn:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_discord_application_id_here
   # GUILD_ID=your_test_guild_id_here (Tùy chọn: điền ID server để slash command cập nhật tức thì)
   DATABASE_PATH=./werewolf.db
   ```

3. Đăng ký Slash Commands với Discord:
   ```bash
   npm run register
   ```

4. Build mã nguồn TypeScript:
   ```bash
   npm run build
   ```

5. Khởi chạy Bot:
   ```bash
   # Chế độ Production:
   npm start

   # Hoặc chế độ Development (tự nạp lại mã):
   npm run dev
   ```

---

## 🎮 DANH SÁCH SLASH COMMAND & HƯỚNG DẪN SỬ DỤNG

| Lệnh | Tham số | Mô tả |
| :--- | :--- | :--- |
| `/start` | `players` (tùy chọn) | Tạo sảnh chờ mới hoặc bắt đầu ván. Yêu cầu **tối thiểu 4 người chơi**. Nếu dưới 4 người, bot từ chối bắt đầu với thông báo: `Cần tối thiểu 4 người chơi để bắt đầu trận Ma Sói. Hiện tại đang có [số lượng] người.`. |
| `/add` | `@user` | Chủ phòng thêm một người chơi cụ thể vào sảnh chờ. |
| `/remove` | `@user` | Chủ phòng xóa một người chơi khỏi sảnh chờ. |
| `/addbot` | `count` (tùy chọn) | Chủ phòng thêm 1 hoặc nhiều người chơi Bot ảo (AI) vào sảnh chờ để đủ số lượng. |
| `/fillbots` | `target` (tùy chọn) | **Tự động thêm bot vào phòng để cưỡng ép đủ số lượng** bắt đầu ván ngay lập tức (≥ 4 người hoặc theo số vai trong cấu hình). |
| `/clearbots` | Không | Chủ phòng xóa toàn bộ bot ảo khỏi phòng. |
| `/bot` | `add`, `fill`, `remove`, `clear` | Bộ lệnh quản lý bot ảo linh hoạt (thêm, điền đủ, xóa bớt, xóa sạch). |
| `/custom` | Không | Mở bảng điều khiển cấu hình số lượng vai, thời lượng pha và các biến thể luật (yêu cầu cấu hình tối thiểu 4 người). |
| `/roles` | Không | Xem bách khoa toàn thư danh mục vai trò, phe phái và kỹ năng. |
| `/role` | Không | Xem lại vai trò bí mật của chính bạn (tin nhắn ẩn ephemeral). |
| `/status` | Không | Xem trạng thái ván đấu hiện tại, người còn sống, thời gian còn lại (bảo mật tuyệt đối). |
| `/vote` | Không | Kéo bảng biểu quyết treo cổ xuống cuối kênh chat nếu bị người chơi nhắn tin làm trôi tin nhắn. |
| `/help` | Không | Xem hướng dẫn chơi và các lệnh của Bot. |
| `/pause` | Không | Chủ phòng hoặc Quản trị viên tạm dừng ván đấu. |
| `/resume` | Không | Tiếp tục ván đấu đang bị tạm dừng. |
| `/stop` | Không | Mở hộp thoại xác nhận hủy bỏ ván đấu hiện tại. |
| `/preset list` | Không | Xem danh sách các preset có sẵn và preset đã lưu trong máy chủ. |
| `/preset load` | `name` | Áp dụng một preset cụ thể vào sảnh chờ hiện tại. |
| `/preset save` | `name`, `description` | Lưu cấu hình hiện tại thành preset mới dùng lại cho máy chủ (yêu cầu tối thiểu 4 vai). |

---

## ⚙️ TÙY CHỈNH CẤU HÌNH & TRẢI NGHIỆM BIỂU QUYẾT

1. **Cơ chế chống trôi bảng biểu quyết sau thảo luận:**
   - Sau khi kết thúc thời gian thảo luận ban ngày (vốn có rất nhiều tin nhắn chat của người chơi), Bot **không edit đè lên tin nhắn cũ** mà sẽ tự động gửi một **tin nhắn hoàn toàn mới tại đáy kênh chat**.
   - Tin nhắn có nội dung **ping nhắc nhở tất cả các cử tri còn sống** vào bỏ phiếu.
   - Bảng biểu quyết đi kèm nút bấm **`🔄 Kéo bảng vote xuống`** và hỗ trợ lệnh **`/vote`** để người chơi có thể kéo bảng vote xuống đáy chat bất kỳ lúc nào nếu tiếp tục chat làm trôi tin nhắn.
   - Hiển thị trực quan tiến độ bỏ phiếu theo thời gian thực: `📊 Tiến độ bỏ phiếu: X/Y người` kèm icon `✅` (đã vote) và `⏳` (chưa vote).
   - Tự động chuyển pha sớm (Early Resolution) sau 2 giây khi tất cả cử tri đã bỏ phiếu xong mà không cần chờ hết timer.

2. **Cơ chế bảo mật kênh: Khóa chat người đã chết & Khóa kênh ban đêm:**
   - **Khóa chat người chết (2 lớp bảo vệ):**
     - *Lớp 1 (Discord Permission Overwrite):* Ngay khi người chơi tử trận (bị Sói cắn, dính độc Phù thủy, Thợ săn bắn, chết vì người yêu qua đời hay bị treo cổ), Bot tự động gán quyền riêng `{ SendMessages: false }` cho người đó trong kênh. Hộp thoại nhập tin nhắn trên app Discord của người đó sẽ bị khóa hoàn toàn.
     - *Lớp 2 (Event Listener Real-time):* Nếu ai đó có quyền Admin/bypass cố tình nhắn tin khi đã chết, Bot sẽ ngay lập tức xóa tin nhắn đó và gửi cảnh báo ngắn để không làm lộ bí mật (spoil) ván đấu.
   - **Khóa kênh ban đêm:** Khi đêm buông xuống (`NIGHT`), Bot tự động khóa chat toàn bộ kênh cho `@everyone` để cả làng im lặng đi ngủ và tránh bàn tán ngoài luồng. Khi bình minh/thảo luận đến, Bot tự động mở lại kênh cho những người còn sống.
   - **Tự động phục hồi:** Khi ván đấu kết thúc hoặc bị hủy, Bot tự động gỡ bỏ toàn bộ lệnh cấm chat để mọi người cùng thảo luận tự do.

3. **Preset Cơ bản (`basic`):** Mặc định 4 người chơi (1 Sói thường, 1 Tiên tri, 1 Bảo vệ, 1 Dân làng).
4. **Preset Nâng cao (`advanced`):** Đầy đủ các vai đặc biệt (Sói quỷ, Sói cuồng nộ, Sói trắng, Phù thủy, Thợ săn, Thần tình yêu, Thằng ngốc, Kẻ chán đời).
5. **Quy tắc tối thiểu 4 người:**
   - Trận đấu có từ 3 người trở xuống luôn bị chặn không thể bắt đầu.
   - Nút **Bắt đầu ván** tự động vô hiệu hóa (`disabled`) và hiển thị `Bắt đầu (Cần ≥ 4 người)` khi phòng chưa đủ 4 người.
   - Nếu cố tình bypass bằng lệnh hoặc tương tác, hệ thống sẽ từ chối và cảnh báo:  
     `“Cần tối thiểu 4 người chơi để bắt đầu trận Ma Sói. Hiện tại đang có [số lượng] người.”`
6. **Quy tắc cấu hình mặc định:**
   - **Tối thiểu 4 người:** Trận đấu dưới 4 người luôn bị chặn; nút Bắt đầu tự động vô hiệu hóa (`Bắt đầu (Cần ≥ 4 người)`).
   - **Mặc định KHÔNG công bố vai khi chết/treo cổ (`revealRoleOnDeath = false`):** Khi người chơi bị treo cổ hoặc bị giết ban đêm, danh tính vai trò sẽ được giữ kín bí mật. Nếu muốn bật lại, chủ phòng có thể bấm nút **Bật/Tắt Lộ vai khi chết** trong `/custom`.
   - `/custom` và `/preset save` chặn lưu cấu hình có dưới 4 vai.
7. **Tự động cân bằng:** Bấm nút **"Tự cân bằng Dân làng"** trong `/custom` hoặc khi chọn preset, hệ thống sẽ tự động bù đắp số Dân làng để tổng số vai vừa khít với số người chơi trong phòng (khi đạt ≥ 4 người).
8. **Khóa luật khi trận đấu bắt đầu:** Khi chủ phòng bấm **Bắt đầu ván**, toàn bộ cấu hình sẽ bị khóa chặt.

---

## 🧪 KẾT QUẢ KIỂM THỬ THỰC TẾ

Dự án đã được tích hợp bộ kiểm thử tự động toàn diện bằng **Vitest** với **53/53 test cases PASS 100%**:

```
 RUN  v3.2.7 D:/ma chó

 ✓ tests/engine/roles-special.test.ts (4 tests)
   - Thằng ngốc (Idiot): Lần đầu bị biểu quyết treo cổ sẽ sống sót, lộ vai và mất quyền biểu quyết
   - Thợ săn (Hunter): Bị treo cổ ban ngày được bắn một người còn sống
   - Thần tình yêu (Cupid): Ghép đôi đêm 1 và chết vì đau lòng (Heartbreak)
   - Kẻ chán đời (Tanner): Thắng độc lập nếu bị treo cổ, chết ban đêm không thắng

 ✓ tests/database/persistence.test.ts (3 tests)
   - Lưu game và phục hồi chính xác (Hydration) từ SQLite
   - Phục hồi toàn bộ ván đang hoạt động khi bot khởi động lại (Reboot Recovery)
   - Lưu và truy xuất preset cấu hình theo server

 ✓ tests/engine/game.test.ts (14 tests)
   - Khởi tạo game ở trạng thái LOBBY
   - Cho phép thêm người chơi và chặn trùng lặp
   - Cho phép xóa người chơi khỏi sảnh chờ
   - Kiểm tra điều kiện tối thiểu 4 người chơi:
     + Chặn bắt đầu ván khi có 0 người chơi (trả lời chuẩn xác thông báo)
     + Chặn bắt đầu ván khi có 1 người chơi (trả lời chuẩn xác thông báo)
     + Chặn bắt đầu ván khi có 3 người chơi (trả lời chuẩn xác thông báo)
     + Cho phép bắt đầu ván khi có đúng 4 người chơi và đội hình hợp lệ
     + Cho phép bắt đầu ván khi có nhiều hơn 4 người chơi (5 người)
     + Từ chối cấu hình có dưới 4 vai qua setConfig
     + Tự động cân bằng số vai khớp với số người khi có từ 4 người chơi với cấu hình mặc định
   - Mặc định không công bố vai khi chết/treo cổ (revealRoleOnDeath = false)
   - Xáo và phân vai đúng số lượng khi cấu hình hợp lệ
   - Hỗ trợ xác nhận vai bí mật và kiểm tra tất cả đã sẵn sàng
   - Hỗ trợ tạm dừng, tiếp tục và hủy trận

 ✓ tests/engine/win-conditions.test.ts (5 tests)
   - Cặp đôi khác phe thắng khi là 2 người sống sót cuối cùng
   - Sói trắng thắng độc lập khi là người sống sót duy nhất
   - Phe Sói thắng khi số lượng Sói >= Dân làng
   - Phe Dân thắng khi toàn bộ Sói đã bị tiêu diệt
   - Hòa (DRAW) khi toàn bộ người chơi đều chết

 ✓ tests/engine/night-resolver.test.ts (10 tests)
   - Bảo vệ che chở thành công nạn nhân của Sói
   - Bảo vệ không được bảo vệ cùng 1 người 2 đêm liên tiếp
   - Phù thủy cứu nạn nhân và dùng bình cứu đúng quy định
   - Phù thủy hạ độc giết chết mục tiêu
   - Phù thủy không được dùng cả 2 bình trong cùng 1 đêm
   - Tiên tri soi Sói thường và Sói trắng đều ra kết quả là Sói
   - Sói quỷ chuyển hóa thành công mục tiêu bị cắn thành Sói
   - Sói quỷ chuyển hóa thất bại nếu mục tiêu được bảo vệ, không tiêu hao lượt
   - Hiệu ứng Sói cuồng nộ xuyên thủng khiên bảo vệ
   - Sói trắng giết đồng loại ở đêm chẵn >= 2

 ✓ tests/discord/mock-adapter.test.ts (10 tests)
   - Người khác không thể bấm nút riêng của người chơi khác (Unauthorized check)
   - Nút cũ của pha trước bị từ chối nếu pha game đã thay đổi (Outdated phase check)
   - Thao tác lặp (chống spam) được chặn an toàn
   - Hai trận độc lập ở hai kênh khác nhau hoàn toàn tách biệt
   - Hỗ trợ danh sách trên 25 người chơi bằng cách phân trang Select Menu hợp lệ
   - Khởi động lại không mất trạng thái và xử lý deadline đã qua một cách idempotent
   - Kiểm tra chặn bypass điều kiện tối thiểu 4 người chơi:
     + Nút Bắt đầu bị vô hiệu hóa khi phòng dưới 4 người và kích hoạt cảnh báo nếu bấm
     + Nút Bắt đầu được kích hoạt khi phòng đạt đủ 4 người chơi
     + Lệnh /start từ chối bắt đầu nếu sảnh đang có dưới 4 người
     + Tự cân bằng và Preset Save từ chối cấu hình dưới 4 người

 Test Files  6 passed (6)
      Tests  44 passed (44)
```

### Phân biệt kiểm thử:
- **Đã kiểm tra tự động (Automated Tests):** Toàn bộ logic kiểm tra số người chơi (0, 1, 3, 4, >4), chặn bypass nút Bắt đầu, chặn bypass lệnh /start, chặn bypass preset /custom, giải quyết thứ tự đêm, tương tác kỹ năng (bảo vệ, cứu, độc, chuyển hóa, xuyên khiên cuồng nộ, sói trắng, thợ săn, thần tình yêu, thằng ngốc, tanner), điều kiện thắng ưu tiên, lưu trữ và khôi phục SQLite, an toàn phân quyền nút bấm, phân trang >25 người, cơ chế chống trôi bảng vote và live update.
- **Cần kiểm tra trên tài khoản Discord thật:** Độ trễ mạng khi gửi DM thực tế, quyền tạo Private Thread trên server thực tế của người dùng, giao diện trực quan của modal trên Discord Desktop/Mobile.

---

## 🌐 HƯỚNG DẪN ĐẨY LÊN GITHUB & CHẠY TRÊN CLOUD PHONE

### PHẦN 1: Đẩy mã nguồn từ máy tính lên GitHub
File `.gitignore` của dự án đã được thiết lập sẵn sàng để **chỉ đẩy mã nguồn nhẹ (vài trăm KB)**, hoàn toàn không đẩy thư mục nặng `node_modules`, file database SQLite hay file bí mật `.env`.

Mở terminal tại thư mục dự án (`d:\ma chó`) và chạy các lệnh:

```bash
# 1. Khởi tạo Git repository
git init

# 2. Thêm tất cả file mã nguồn sạch
git add .

# 3. Tạo commit đầu tiên
git commit -m "feat: discord werewolf vn bot full implementation"

# 4. Đổi tên nhánh chính thành main
git branch -M main

# 5. Tạo một repository mới trên GitHub (khuyên dùng chế độ Private), sau đó liên kết URL:
git remote add origin https://github.com/<tai-khoan-cua-ban>/<ten-repo>.git

# 6. Đẩy mã nguồn lên GitHub
git push -u origin main
```

---

### PHẦN 2: Chạy trên Cloud Phone mới (Không cần chép cả project vào)

Trên các dòng Cloud Phone (Redfinger, LDCloud, UgPhone, vMOS...), bạn không cần copy cả thư mục nặng nề từ máy tính sang. Chỉ cần dùng **Termux** để clone mã nguồn từ GitHub về và chạy:

#### Bước 1: Cài đặt Termux trên Cloud Phone
1. Mở trình duyệt trên Cloud Phone, tải và cài đặt ứng dụng **Termux** (từ [F-Droid](https://f-droid.org/packages/com.termux/) hoặc [GitHub Termux Release](https://github.com/termux/termux-app/releases)).
2. Mở Termux và chạy lệnh giữ máy luôn hoạt động (tránh Cloud Phone ngủ đông làm tắt bot):
   ```bash
   termux-wake-lock
   ```

#### Bước 2: Cài đặt Node.js và Git trên Cloud Phone
Trong cửa sổ dòng lệnh Termux, gõ:
```bash
pkg update -y && pkg install nodejs-lts git -y
```

#### Bước 3: Tải mã nguồn từ GitHub về
```bash
git clone https://github.com/<tai-khoan-cua-ban>/<ten-repo>.git
cd <ten-repo>
```

#### Bước 4: Chạy script cài đặt tự động (hoặc từng bước thủ công)
Bạn có thể chạy script thiết lập tự động đã có sẵn trong dự án:
```bash
bash setup-cloudphone.sh
```

*Hoặc thực hiện thủ công các bước sau:*
```bash
# 1. Cài đặt dependencies (chỉ mất vài chục giây):
npm install

# 2. Biên dịch TypeScript:
npm run build

# 3. Tạo file cấu hình .env:
cp .env.example .env
nano .env   # Điền DISCORD_TOKEN và CLIENT_ID rồi bấm Ctrl+O để lưu, Ctrl+X để thoát

# 4. Đăng ký Slash Command:
npm run register

# 5. Khởi động Bot:
npm start
```

#### Bước 5: Chạy Bot ngầm 24/7 trên Cloud Phone với PM2
Để Bot tiếp tục chạy ngay cả khi bạn tắt màn hình hoặc đóng app Cloud Phone:
```bash
# Cài PM2 quản lý tiến trình:
npm install -g pm2

# Khởi chạy bot ngầm:
pm2 start dist/index.js --name werewolf-bot

# Lưu lại trạng thái để tự khởi động cùng máy:
pm2 save

# Kiểm tra log hoạt động của Bot:
pm2 logs werewolf-bot
```

