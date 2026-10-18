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
    addPlayer(userId: string, name: string): {
        success: boolean;
        message: string;
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
        isTie: boolean;
        revoteTriggered: boolean;
        voteCounts: Record<string, number>;
    };
    submitAction(action: Omit<PlayerAction, 'id' | 'timestamp'>): {
        success: boolean;
        message: string;
    };
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
