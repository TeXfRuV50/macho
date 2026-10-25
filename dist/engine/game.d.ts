import { GameConfig, GamePhase, GameWinResult, NightResolutionResult, Player, PlayerAction } from './types';
import { RoleInfo } from './roles';
export declare class WerewolfGame {
    readonly id: string;
    readonly guildId: string;
    readonly channelId: string;
    hostId: string;
    phase: GamePhase;
    dayNumber: number;
    nightNumber: number;
    phaseDeadline: number;
    config: GameConfig;
    customRoles: Record<string, RoleInfo>;
    players: Map<string, Player>;
    actions: PlayerAction[];
    currentPhaseActions: PlayerAction[];
    activeBerserkPierce: boolean;
    nextNightBerserkPierce: boolean;
    pendingHunterId: string | null;
    hasRevotedToday: boolean;
    lastDawnResult: NightResolutionResult | null;
    lastLynchResult: {
        lynchedPlayer: Player | null;
        idiotSurvived: boolean;
        tannerWon: boolean;
        hunterTriggeredId: string | null;
        heartbrokenPlayer: Player | null;
    } | null;
    logs: string[];
    constructor(id: string, guildId: string, channelId: string, hostId: string, customConfig?: GameConfig);
    static readonly BOT_NAMES: string[];
    addPlayer(userId: string, name: string, isBot?: boolean): {
        success: boolean;
        message: string;
    };
    addBotPlayer(customName?: string): {
        success: boolean;
        message: string;
        botId?: string;
    };
    fillBots(targetCount?: number): {
        success: boolean;
        message: string;
        addedCount: number;
    };
    removeBotPlayer(): {
        success: boolean;
        message: string;
    };
    clearBots(): {
        success: boolean;
        message: string;
        removedCount: number;
    };
    removePlayer(userId: string): {
        success: boolean;
        message: string;
    };
    setConfig(newConfig: GameConfig): {
        success: boolean;
        message: string;
    };
    startGame(): {
        success: boolean;
        message: string;
    };
    confirmRole(userId: string): {
        success: boolean;
        allConfirmed: boolean;
    };
    startNight(): void;
    resolveNightPhase(): NightResolutionResult;
    handleHunterShot(targetId: string): {
        success: boolean;
        message: string;
        killedPlayer: Player | null;
    };
    startDiscussion(): void;
    startVoting(): void;
    resolveVotingPhase(): {
        lynchedPlayer: Player | null;
        idiotSurvived: boolean;
        tannerWon: boolean;
        hunterTriggeredId: string | null;
        isTie: boolean;
        revoteTriggered: boolean;
        voteCounts: Record<string, number>;
    };
    submitAction(action: Omit<PlayerAction, 'id' | 'timestamp'>): {
        success: boolean;
        message: string;
    };
    /**
     * Kiểm tra xem đã có bất kỳ con sói nào chết trong ván đấu hay chưa.
     * Bao gồm cả Sói thường, Sói quỷ, Sói cuồng nộ, Sói tiên tri, Sói trắng, Sói trùm...
     */
    hasAnyWolfDied(): boolean;
    /**
     * Sói Trùm có đang kích hoạt khả năng cắn 2 người hay không:
     * Có ít nhất 1 Sói Trùm còn sống VÀ chưa có con sói nào chết.
     */
    isAlphaWolfActive(): boolean;
    /**
     * Tổng hợp số phiếu cắn hiện tại của bầy sói trong đêm này.
     * Trả về Map<targetId, voteCount>.
     */
    getWolfVoteTally(): Map<string, number>;
    checkWinCondition(): GameWinResult;
    pause(): {
        success: boolean;
        message: string;
    };
    resume(): {
        success: boolean;
        message: string;
    };
    cancel(reason?: string): {
        success: boolean;
        message: string;
    };
    log(msg: string): void;
}
