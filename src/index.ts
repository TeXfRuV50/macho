import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
} from 'discord.js';
import dotenv from 'dotenv';
import { DatabaseManager } from './database/database';
import { DmManager } from './discord/dm-manager';
import { InteractionHandler } from './discord/interaction-handler';
import { GameSession } from './discord/game-session';
import { CliUi } from './discord/cli-ui';

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const dbPath = process.env.DATABASE_PATH || './werewolf.db';

// In Banner phong cách hiện đại cho Termux và CMD
CliUi.printBanner();

if (!token || token === 'your_discord_bot_token_here') {
  CliUi.log('WARN', 'Chưa thiết lập DISCORD_TOKEN trong file .env!');
  console.log(
    '  👉 Hãy copy .env.example sang .env và điền Token bot của bạn để kết nối với Discord.\n' +
    '  💡 Để chạy kiểm thử nội bộ không cần token, hãy chạy lệnh: npm test\n'
  );
  process.exit(0);
}

const db = new DatabaseManager(dbPath);
const dmManager = new DmManager();
const interactionHandler = new InteractionHandler(db, dmManager);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
  ],
});

client.once(Events.ClientReady, async () => {
  let activeGamesCount = 0;

  // Phục hồi toàn bộ ván đấu đang chạy dở từ SQLite (Reboot Recovery)
  try {
    const activeGames = db.getAllActiveGames();
    activeGamesCount = activeGames.length;

    for (const game of activeGames) {
      const session = new GameSession(game, db, dmManager, client);
      interactionHandler.registerSession(session);
      await session.checkExpiredDeadline();
      CliUi.log('GAME', `Đã phục hồi ván đấu ID: ${game.id}`, `Kênh: ${game.channelId} | Pha: ${game.phase}`);
    }
  } catch (err: any) {
    CliUi.logError('Lỗi khi phục hồi ván đấu cũ từ database', err);
  }

  // In Bảng điều khiển hệ thống đẹp mắt
  CliUi.printDashboard({
    botTag: client.user?.tag || 'Werewolf Bot',
    botId: client.user?.id,
    serverCount: client.guilds.cache.size,
    activeGames: activeGamesCount,
    dbPath,
  });

  CliUi.log('SUCCESS', `Bot đã kết nối thành công với tài khoản: ${client.user?.tag}`);
  CliUi.log('INFO', 'Hệ thống Quản Trò Ma Sói đã sẵn sàng phục vụ!');

  // Heartbeat định kỳ mỗi 60 giây để theo dõi RAM / Ping trên Termux / VPS
  setInterval(() => {
    const ping = client.ws.ping >= 0 ? client.ws.ping : 0;
    const currentActiveGames = interactionHandler.getActiveSessionsCount();
    CliUi.printHeartbeat(ping, currentActiveGames);
  }, 60000);
});

client.on('error', (err: any) => {
  CliUi.log('ERROR', `Discord Client Error: ${err?.message || err}`);
});

client.on('interactionCreate', async (interaction) => {
  await interactionHandler.handleInteraction(interaction);
});

client.on('messageCreate', async (message) => {
  await interactionHandler.handleMessage(message);
});

// Bắt lỗi toàn cục để không bao giờ crash tiến trình bot
process.on('unhandledRejection', (reason: any) => {
  CliUi.log('ERROR', `Unhandled Rejection: ${reason?.message || reason}`);
});

process.on('uncaughtException', (err: any) => {
  CliUi.logError('Uncaught Exception', err);
});

// Xử lý đóng ứng dụng an toàn (Graceful Shutdown)
process.on('SIGINT', () => {
  CliUi.log('WARN', 'Đang dừng Bot an toàn và lưu cơ sở dữ liệu...');
  db.close();
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  CliUi.log('WARN', 'Đang dừng Bot an toàn và lưu cơ sở dữ liệu...');
  db.close();
  client.destroy();
  process.exit(0);
});

client.login(token).catch((err) => {
  CliUi.logError('Đăng nhập Discord thất bại! Vui lòng kiểm tra lại DISCORD_TOKEN trong file .env', err);
});
