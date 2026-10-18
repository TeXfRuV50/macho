import { GameConfig } from './types';
export interface Preset {
    id: string;
    name: string;
    description: string;
    minPlayers: number;
    maxPlayers: number;
    config: GameConfig;
}
export declare const DEFAULT_CONFIG: GameConfig;
export declare const PRESET_BASIC: Preset;
export declare const PRESET_ADVANCED: Preset;
export declare const BUILTIN_PRESETS: Record<string, Preset>;
/**
 * Tự động tính toán số Dân làng để tổng số vai vừa khít với số người chơi trong phòng.
 * Không tự ý thêm vai đặc biệt nếu chủ phòng không cấu hình.
 */
export declare function balancePresetForPlayerCount(baseConfig: GameConfig, playerCount: number): GameConfig;
/**
 * Kiểm tra tính hợp lệ của cấu hình
 */
export declare function validateGameConfig(config: GameConfig, playerCount: number): {
    valid: boolean;
    errors: string[];
};
