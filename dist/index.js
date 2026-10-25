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
const cli_ui_1 = require("./discord/cli-ui");
dotenv_1.default.config();
const token = process.env.DISCORD_TOKEN;
const dbPath = process.env.DATABASE_PATH || './werewolf.db';
// In Banner phong cách hiện đại cho Termux và CMD
cli_ui_1.CliUi.printBanner();
if (!token || token === 'your_discord_bot_token_here') {
    cli_ui_1.CliUi.log('WARN', 'Chưa thiết lập DISCORD_TOKEN trong file .env!');
    console.log('  👉 Hãy copy .env.example sang .env và điền Token bot của bạn để kết nối với Discord.\n' +
        '  💡 Để chạy kiểm thử nội bộ không cần token, hãy chạy lệnh: npm test\n');
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
    let activeGamesCount = 0;
    // Phục hồi toàn bộ ván đấu đang chạy dở từ SQLite (Reboot Recovery)
    try {
        const activeGames = db.getAllActiveGames();
        activeGamesCount = activeGames.length;
        for (const game of activeGames) {
            const session = new game_session_1.GameSession(game, db, dmManager, client);
            interactionHandler.registerSession(session);
            await session.checkExpiredDeadline();
            cli_ui_1.CliUi.log('GAME', `Đã phục hồi ván đấu ID: ${game.id}`, `Kênh: ${game.channelId} | Pha: ${game.phase}`);
        }
    }
    catch (err) {
        cli_ui_1.CliUi.logError('Lỗi khi phục hồi ván đấu cũ từ database', err);
    }
    // In Bảng điều khiển hệ thống đẹp mắt
    cli_ui_1.CliUi.printDashboard({
        botTag: client.user?.tag || 'Werewolf Bot',
        botId: client.user?.id,
        serverCount: client.guilds.cache.size,
        activeGames: activeGamesCount,
        dbPath,
    });
    cli_ui_1.CliUi.log('SUCCESS', `Bot đã kết nối thành công với tài khoản: ${client.user?.tag}`);
    cli_ui_1.CliUi.log('INFO', 'Hệ thống Quản Trò Ma Sói đã sẵn sàng phục vụ!');
    // Heartbeat định kỳ mỗi 60 giây để theo dõi RAM / Ping trên Termux / VPS
    setInterval(() => {
        const ping = client.ws.ping >= 0 ? client.ws.ping : 0;
        const currentActiveGames = interactionHandler.getActiveSessionsCount();
        cli_ui_1.CliUi.printHeartbeat(ping, currentActiveGames);
    }, 60000);
});
client.on('error', (err) => {
    cli_ui_1.CliUi.log('ERROR', `Discord Client Error: ${err?.message || err}`);
});
client.on('interactionCreate', async (interaction) => {
    try {
        await interactionHandler.handleInteraction(interaction);
    }
    catch (err) {
        cli_ui_1.CliUi.logError('Lỗi xử lý interactionCreate', err);
    }
});
client.on('messageCreate', async (message) => {
    try {
        await interactionHandler.handleMessage(message);
    }
    catch (err) {
        cli_ui_1.CliUi.logError('Lỗi xử lý messageCreate', err);
    }
});
// Bắt lỗi toàn cục để không bao giờ crash tiến trình bot
process.on('unhandledRejection', (reason) => {
    cli_ui_1.CliUi.log('ERROR', `Unhandled Rejection: ${reason?.message || reason}`);
});
process.on('uncaughtException', (err) => {
    cli_ui_1.CliUi.logError('Uncaught Exception', err);
});
// Xử lý đóng ứng dụng an toàn (Graceful Shutdown)
process.on('SIGINT', () => {
    cli_ui_1.CliUi.log('WARN', 'Đang dừng Bot an toàn và lưu cơ sở dữ liệu...');
    db.close();
    client.destroy();
    process.exit(0);
});
process.on('SIGTERM', () => {
    cli_ui_1.CliUi.log('WARN', 'Đang dừng Bot an toàn và lưu cơ sở dữ liệu...');
    db.close();
    client.destroy();
    process.exit(0);
});
client.login(token).catch((err) => {
    cli_ui_1.CliUi.logError('Đăng nhập Discord thất bại! Vui lòng kiểm tra lại DISCORD_TOKEN trong file .env', err);
});
