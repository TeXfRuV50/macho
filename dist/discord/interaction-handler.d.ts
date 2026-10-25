import { Interaction, Message } from 'discord.js';
import { DatabaseManager } from '../database/database';
import { DmManager } from './dm-manager';
import { GameSession } from './game-session';
export declare class InteractionHandler {
    private activeSessions;
    private db;
    private dmManager;
    private customRoleRegistry;
    constructor(db: DatabaseManager, dmManager: DmManager);
    registerSession(session: GameSession): void;
    getSession(channelId: string): GameSession | undefined;
    removeSession(channelId: string): void;
    getActiveSessionsCount(): number;
    /**
     * Phản hồi ngầm (deferReply) nhanh chóng trong <50ms để ngăn lỗi "không phản hồi kịp thời" (>3s)
     */
    safeDeferReply(interaction: any, ephemeral?: boolean): Promise<void>;
    /**
     * Trả lời tương tác an toàn, tránh lỗi 10062 (Unknown interaction) và không làm sập bot
     */
    safeReply(interaction: any, options: any): Promise<void>;
    /**
     * Bộ điều phối xử lý tương tác chính của Discord
     */
    handleInteraction(interaction: Interaction): Promise<void>;
    private handleChatInput;
    private handleButton;
    private handleStringSelect;
    private handleModal;
    /**
     * Giám sát tin nhắn chat trong kênh ván chơi:
     * 1. Chặn người chết chat trong kênh đang chơi
     * 2. Chặn chat ban đêm để làng giữ im lặng
     */
    handleMessage(message: Message): Promise<void>;
}
