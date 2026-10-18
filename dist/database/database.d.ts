import { WerewolfGame } from '../engine/game';
import { GameConfig, PlayerAction } from '../engine/types';
import { Preset } from '../engine/presets';
export declare class DatabaseManager {
    private db;
    constructor(dbPath?: string);
    private initTables;
    /**
     * Lưu hoặc cập nhật thông tin game và players vào SQLite
     */
    saveGame(game: WerewolfGame): void;
    /**
     * Lưu hành động người chơi
     */
    recordAction(action: PlayerAction, gameId: string): void;
    /**
     * Lấy game theo ID
     */
    getGame(gameId: string): WerewolfGame | null;
    /**
     * Lấy game đang hoạt động tại kênh
     */
    getActiveGameByChannel(channelId: string): WerewolfGame | null;
    /**
     * Lấy toàn bộ game đang hoạt động để phục hồi khi reboot bot
     */
    getAllActiveGames(): WerewolfGame[];
    private hydrateGame;
    savePreset(guildId: string, name: string, description: string, config: GameConfig, createdBy: string): void;
    getPreset(guildId: string, name: string): Preset | null;
    getGuildPresets(guildId: string): Preset[];
    addGameLog(gameId: string, logEntry: string): void;
    getGameLogs(gameId: string): string[];
    close(): void;
}
