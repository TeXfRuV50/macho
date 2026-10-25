"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DmManager = void 0;
const discord_js_1 = require("discord.js");
class DmManager {
    // Lưu map các thread riêng tư cho từng người chơi: gameId:userId -> threadId
    privateThreads = new Map();
    /**
     * Gửi thông tin bí mật an toàn cho người chơi.
     * Ưu tiên gửi Direct Message (DM).
     * Nếu DM bị chặn, tạo Private Thread bí mật chỉ có người đó và Bot.
     * Tuyệt đối không để lộ danh tính hay kỹ năng ra kênh chung.
     */
    async sendPrivate(client, guild, channel, player, options, gameId) {
        if (player.isBot) {
            return { success: true, usedFallbackThread: false };
        }
        try {
            const user = await client.users.fetch(player.id);
            if (!user) {
                return { success: false, usedFallbackThread: false, error: 'Không tìm thấy người dùng Discord' };
            }
            // 1. Thử gửi DM trực tiếp
            try {
                const msg = await user.send(options);
                return { success: true, message: msg, usedFallbackThread: false };
            }
            catch (dmErr) {
                // Mã lỗi 50007: Cannot send messages to this user (chặn DM)
                // Chuyển sang phương án Fallback Private Thread
            }
            // 2. Fallback: Tạo Private Thread trong kênh game
            const threadKey = `${gameId}:${player.id}`;
            let threadId = this.privateThreads.get(threadKey);
            let thread = null;
            if (threadId) {
                try {
                    thread = await channel.threads.fetch(threadId);
                }
                catch {
                    thread = null;
                }
            }
            if (!thread) {
                try {
                    thread = await channel.threads.create({
                        name: `🔒-riêng-tư-${player.name}`,
                        type: discord_js_1.ChannelType.PrivateThread,
                        invitable: false,
                        reason: `Kênh riêng tư bí mật cho người chơi ${player.name} trong game Ma Sói`,
                    });
                    await thread.members.add(player.id);
                    this.privateThreads.set(threadKey, thread.id);
                }
                catch (threadErr) {
                    return {
                        success: false,
                        usedFallbackThread: false,
                        error: `Không thể gửi DM (người dùng chặn DM) và không có quyền tạo Private Thread (${threadErr?.message || 'Lỗi quyền'}).`,
                    };
                }
            }
            const threadMsg = await thread.send(options);
            return { success: true, message: threadMsg, usedFallbackThread: true };
        }
        catch (err) {
            return { success: false, usedFallbackThread: false, error: err?.message || 'Lỗi không xác định khi gửi tin riêng' };
        }
    }
    /**
     * Xóa và dọn dẹp toàn bộ các Private Thread sau khi ván đấu kết thúc
     */
    async cleanupThreads(channel, gameId) {
        for (const [key, threadId] of this.privateThreads.entries()) {
            if (key.startsWith(`${gameId}:`)) {
                try {
                    const thread = await channel.threads.fetch(threadId);
                    if (thread) {
                        await thread.delete('Kết thúc ván đấu Ma Sói, dọn phòng riêng tư');
                    }
                }
                catch {
                    // Bỏ qua nếu đã bị xóa trước đó
                }
                this.privateThreads.delete(key);
            }
        }
    }
}
exports.DmManager = DmManager;
