"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./database/database");
const dm_manager_1 = require("./discord/dm-manager");
const interaction_handler_1 = require("./discord/interaction-handler");
const game_session_1 = require("./discord/game-session");
dotenv_1.default.config();
const token = process.env.DISCORD_TOKEN;
const dbPath = process.env.DATABASE_PATH || './werewolf.db';
console.log('🐺 ===============================================');
console.log('🐺  DISCORD WEREWOLF BOT (QUẢN TRÒ TIẾNG VIỆT)   ');
console.log('🐺 ===============================================');
if (!token || token === 'your_discord_bot_token_here') {
    console.warn('⚠️ Chưa thiết lập DISCORD_TOKEN trong file .env!\n' +
        '👉 Hãy copy .env.example sang .env và điền Token bot của bạn để kết nối với Discord.\n' +
        '💡 Để chạy kiểm thử nội bộ không cần token, hãy chạy lệnh: npm test');
    process.exit(0);
}
const db = new database_1.DatabaseManager(dbPath);
const dmManager = new dm_manager_1.DmManager();
const interactionHandler = new interaction_handler_1.InteractionHandler(db, dmManager);
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.DirectMessages,
    ],
    partials: [
        discord_js_1.Partials.Channel,
        discord_js_1.Partials.Message,
        discord_js_1.Partials.User,
    ],
});
client.once(discord_js_1.Events.ClientReady, async () => {
    console.log(`✅ Bot đã đăng nhập thành công với tài khoản: ${client.user?.tag}`);
    // Phục hồi toàn bộ ván đấu đang chạy dở từ SQLite (Reboot Recovery)
    try {
        const activeGames = db.getAllActiveGames();
        console.log(`📦 Tìm thấy ${activeGames.length} ván đấu đang hoạt động trong database.`);
        for (const game of activeGames) {
            const session = new game_session_1.GameSession(game, db, dmManager, client);
            interactionHandler.registerSession(session);
            await session.checkExpiredDeadline();
            console.log(`🔄 Đã phục hồi ván đấu ID: ${game.id} tại kênh: ${game.channelId} (Pha: ${game.phase})`);
        }
    }
    catch (err) {
        console.error('❌ Lỗi khi phục hồi ván đấu cũ từ database:', err);
    }
    console.log('🐺 Bot Quản Trò Ma Sói đã sẵn sàng nhận lệnh!');
});
client.on('error', (err) => {
    console.error('❌ [Discord Client Error]:', err?.message || err);
});
client.on('interactionCreate', async (interaction) => {
    await interactionHandler.handleInteraction(interaction);
});
client.on('messageCreate', async (message) => {
    await interactionHandler.handleMessage(message);
});
// Bắt lỗi toàn cục để không bao giờ crash tiến trình bot
process.on('unhandledRejection', (reason) => {
    console.error('❌ [Unhandled Rejection]:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
    console.error('❌ [Uncaught Exception]:', err?.message || err);
});
// Xử lý đóng ứng dụng an toàn (Graceful Shutdown)
process.on('SIGINT', () => {
    console.log('\n🛑 Đang dừng Bot an toàn...');
    db.close();
    client.destroy();
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.log('\n🛑 Đang dừng Bot an toàn...');
    db.close();
    client.destroy();
    process.exit(0);
});
client.login(token).catch((err) => {
    console.error('❌ Đăng nhập Discord thất bại. Kiểm tra lại DISCORD_TOKEN trong file .env:', err?.message);
});
