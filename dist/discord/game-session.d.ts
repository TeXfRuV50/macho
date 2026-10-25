import { Client, Guild, TextChannel } from 'discord.js';
import { WerewolfGame } from '../engine/game';
import { DatabaseManager } from '../database/database';
import { DmManager } from './dm-manager';
import { GameWinResult } from '../engine/types';
export declare class GameSession {
    readonly game: WerewolfGame;
    readonly db: DatabaseManager;
    readonly dmManager: DmManager;
    readonly client: Client;
    mainMessageId: string | null;
    private timerHandle;
    private watchdogHandle;
    private botChatTimers;
    private isProcessingPhaseTransition;
    constructor(game: WerewolfGame, db: DatabaseManager, dmManager: DmManager, client: Client);
    getChannel(): Promise<TextChannel | null>;
    getGuild(): Promise<Guild | null>;
    /**
     * Cập nhật tin nhắn bảng điều khiển chính trên kênh
     */
    updateMainMessage(options: {
        embeds?: any[];
        components?: any[];
        content?: string | null;
    }): Promise<void>;
    /**
     * Gửi một tin nhắn mới làm bảng điều khiển chính ở đáy kênh (chống trôi tin nhắn sau thảo luận)
     * Đồng thời gỡ bỏ components ở tin nhắn cũ nếu có để tránh người chơi bấm nhầm nút cũ
     */
    postNewMainMessage(options: {
        embeds?: any[];
        components?: any[];
        content?: string;
    }): Promise<void>;
    /**
     * Kéo bảng bỏ phiếu xuống cuối kênh khi bị người chơi chat trôi tin nhắn
     */
    repostVotingMessage(): Promise<boolean>;
    /**
     * Kéo bảng đêm xuống cuối kênh để người chơi dễ bấm kỹ năng
     */
    repostNightMessage(): Promise<boolean>;
    /**
     * Bắt đầu ván đấu: Chia vai bí mật và gửi DM cho từng người
     */
    start(): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Xử lý khi người chơi bấm nút xác nhận vai
     */
    handleRoleConfirm(userId: string): Promise<void>;
    /**
     * Chuyển sang Đêm (NIGHT)
     */
    advanceToNight(): Promise<void>;
    /**
     * Gửi gọi dậy riêng cho từng vai thức dậy trong đêm
     */
    private dispatchNightCalls;
    /**
     * Chuyển sang Bình minh (DAWN) & Xử lý đêm
     */
    advanceToDawn(): Promise<void>;
    /**
     * Chuyển sang Thảo luận (DISCUSSION)
     */
    advanceToDiscussion(): Promise<void>;
    /**
     * Chuyển sang Biểu quyết treo cổ (VOTING)
     */
    advanceToVoting(): Promise<void>;
    /**
     * Chốt biểu quyết và công bố kết quả (RESOLUTION)
     */
    advanceToResolution(): Promise<void>;
    /**
     * Kết thúc ván đấu
     */
    finishGame(winResult: GameWinResult): Promise<void>;
    /**
     * Hủy ván đấu
     */
    cancelGame(reason?: string): Promise<void>;
    /**
     * Khóa quyền gửi tin nhắn đối với tất cả người chơi đã tử trận trong kênh ván chơi
     */
    syncDeadPlayersChatPermissions(): Promise<void>;
    /**
     * Khóa kênh ban đêm để cả làng im lặng đi ngủ
     */
    lockChannelForNight(): Promise<void>;
    /**
     * Mở lại kênh vào ban ngày cho người còn sống thảo luận
     */
    unlockChannelForDay(): Promise<void>;
    /**
     * Phục hồi toàn bộ quyền chat của kênh khi ván đấu kết thúc hoặc bị hủy
     */
    restoreAllChannelPermissions(): Promise<void>;
    /**
     * Đặt hẹn giờ chuyển pha
     */
    private schedulePhaseTimer;
    clearBotChatTimers(): void;
    clearPhaseTimer(): void;
    /**
     * Watchdog định kỳ mỗi 1.5 giây kiểm tra hạn chót, đảm bảo game không bao giờ bị kẹt
     */
    startWatchdog(): void;
    stopWatchdog(): void;
    /**
     * Kiểm tra hạn chót khi bot khởi động lại (Reboot Recovery)
     */
    checkExpiredDeadline(): Promise<void>;
}
