import { GameConfig, NightResolutionResult, Player, PlayerAction } from './types';
export declare class NightResolver {
    /**
     * Xử lý toàn bộ các hành động trong đêm theo đúng thứ tự logic đã được định nghĩa.
     * Đảm bảo tính toán xác định (deterministic), không phụ thuộc vào trạng thái Discord.
     */
    static resolveNight(nightNumber: number, players: Map<string, Player>, actions: PlayerAction[], config: GameConfig, activeBerserkPierce: boolean): {
        result: NightResolutionResult;
        updatedPlayers: Map<string, Player>;
        nextNightBerserkPierce: boolean;
    };
}
