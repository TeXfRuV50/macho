/**
 * CLI UI & Terminal Dashboard for Termux & Windows CMD / Linux
 * Cung cấp giao diện bảng điều khiển Console hiện đại, bắt mắt, có màu sắc ANSI
 * Tương thích hoàn hảo với màn hình điện thoại Termux và máy tính CMD / PowerShell.
 */
export declare class CliColors {
    private static enabled;
    static reset(text: string): string;
    static bold(text: string): string;
    static dim(text: string): string;
    static italic(text: string): string;
    static underline(text: string): string;
    static black(text: string): string;
    static red(text: string): string;
    static green(text: string): string;
    static yellow(text: string): string;
    static blue(text: string): string;
    static magenta(text: string): string;
    static cyan(text: string): string;
    static white(text: string): string;
    static gray(text: string): string;
    static brightRed(text: string): string;
    static brightGreen(text: string): string;
    static brightYellow(text: string): string;
    static brightBlue(text: string): string;
    static brightMagenta(text: string): string;
    static brightCyan(text: string): string;
    static bgRed(text: string): string;
    static bgGreen(text: string): string;
    static bgYellow(text: string): string;
    static bgBlue(text: string): string;
    static bgMagenta(text: string): string;
    static bgCyan(text: string): string;
}
export type LogType = 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'GAME' | 'BOT' | 'ACTION' | 'HEARTBEAT';
export declare class CliUi {
    private static startTime;
    /**
     * Lấy thời gian hiện tại định dạng [HH:mm:ss]
     */
    static getTime(): string;
    /**
     * Định dạng thời gian bot đã chạy (Uptime)
     */
    static getUptime(): string;
    /**
     * Lấy lượng RAM đang sử dụng
     */
    static getMemoryUsage(): string;
    /**
     * In Logo ASCII Werewolf phong cách Cyberpunk / Fantasy
     * Thiết kế gọn gàng (48 ký tự) để vừa vặn trên màn hình Termux điện thoại
     */
    static printBanner(): void;
    /**
     * In Bảng Dashboard thông số hệ thống dạng hộp Unicode
     */
    static printDashboard(stats: {
        botTag: string;
        botId?: string;
        serverCount: number;
        activeGames: number;
        dbPath: string;
    }): void;
    /**
     * Log có định dạng màu sắc chuyên nghiệp kèm nhãn (Badge)
     */
    static log(type: LogType, message: string, meta?: string): void;
    /**
     * Log lỗi với khung viền đỏ dễ nhìn
     */
    static logError(title: string, err: any): void;
    /**
     * In thanh trạng thái ngắn gọn định kỳ (Heartbeat Status Bar)
     */
    static printHeartbeat(pingMs?: number, activeGamesCount?: number): void;
}
