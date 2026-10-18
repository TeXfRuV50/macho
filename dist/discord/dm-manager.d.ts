import { BaseMessageOptions, Client, Guild, Message, TextChannel } from 'discord.js';
import { Player } from '../engine/types';
export interface SendPrivateResult {
    success: boolean;
    message?: Message;
    usedFallbackThread: boolean;
    error?: string;
}
export declare class DmManager {
    private privateThreads;
    /**
     * Gửi thông tin bí mật an toàn cho người chơi.
     * Ưu tiên gửi Direct Message (DM).
     * Nếu DM bị chặn, tạo Private Thread bí mật chỉ có người đó và Bot.
     * Tuyệt đối không để lộ danh tính hay kỹ năng ra kênh chung.
     */
    sendPrivate(client: Client, guild: Guild, channel: TextChannel, player: Player, options: BaseMessageOptions, gameId: string): Promise<SendPrivateResult>;
    /**
     * Xóa và dọn dẹp toàn bộ các Private Thread sau khi ván đấu kết thúc
     */
    cleanupThreads(channel: TextChannel, gameId: string): Promise<void>;
}
