"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
const commands_1 = require("./discord/commands");
dotenv_1.default.config();
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
if (!token || !clientId) {
    console.error('❌ Thiếu biến môi trường DISCORD_TOKEN hoặc CLIENT_ID trong file .env');
    process.exit(1);
}
const safeClientId = clientId;
const rest = new discord_js_1.REST({ version: '10' }).setToken(token);
async function deploy() {
    try {
        const commandsJson = commands_1.SLASH_COMMANDS.map((cmd) => cmd.toJSON());
        console.log(`⏳ Đang đăng ký ${commandsJson.length} slash commands với Discord...`);
        if (guildId) {
            // Đăng ký cho 1 Guild cụ thể (cập nhật tức thì để test)
            console.log(`Đang đăng ký lệnh cho Server ID: ${guildId}`);
            await rest.put(discord_js_1.Routes.applicationGuildCommands(safeClientId, guildId), { body: commandsJson });
            console.log('✅ Đã đăng ký slash commands thành công cho Guild!');
        }
        else {
            // Đăng ký Global
            console.log('Đang đăng ký lệnh Toàn cục (Global)...');
            await rest.put(discord_js_1.Routes.applicationCommands(safeClientId), { body: commandsJson });
            console.log('✅ Đã đăng ký slash commands thành công toàn cầu!');
        }
    }
    catch (error) {
        console.error('❌ Lỗi khi đăng ký slash commands:', error);
    }
}
deploy();
