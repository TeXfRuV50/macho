import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { SLASH_COMMANDS } from './discord/commands';

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error('❌ Thiếu biến môi trường DISCORD_TOKEN hoặc CLIENT_ID trong file .env');
  process.exit(1);
}

const safeClientId = clientId as string;
const rest = new REST({ version: '10' }).setToken(token);

async function deploy() {
  try {
    const commandsJson = SLASH_COMMANDS.map((cmd) => cmd.toJSON());
    console.log(`⏳ Đang đăng ký ${commandsJson.length} slash commands với Discord...`);

    if (guildId) {
      // Đăng ký cho 1 Guild cụ thể (cập nhật tức thì để test)
      console.log(`Đang đăng ký lệnh cho Server ID: ${guildId}`);
      await rest.put(Routes.applicationGuildCommands(safeClientId, guildId), { body: commandsJson });
      console.log('✅ Đã đăng ký slash commands thành công cho Guild!');
    } else {
      // Đăng ký Global
      console.log('Đang đăng ký lệnh Toàn cục (Global)...');
      await rest.put(Routes.applicationCommands(safeClientId), { body: commandsJson });
      console.log('✅ Đã đăng ký slash commands thành công toàn cầu!');
    }
  } catch (error) {
    console.error('❌ Lỗi khi đăng ký slash commands:', error);
  }
}

deploy();
