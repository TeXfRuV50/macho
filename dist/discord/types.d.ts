export interface ParsedCustomId {
    prefix: 'ww';
    gameId: string;
    phase: string;
    action: string;
    targetUserId: string;
    extra?: string;
}
export declare function buildCustomId(gameId: string, phase: string, action: string, targetUserId?: string, extra?: string): string;
export declare function parseCustomId(customId: string): ParsedCustomId | null;
/**
 * Phân trang danh sách người chơi nếu vượt quá giới hạn 25 của Discord Select Menu
 */
export declare function paginateOptions<T>(items: T[], pageSize?: number): T[][];
