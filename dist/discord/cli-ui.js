"use strict";
/**
 * CLI UI & Terminal Dashboard for Termux & Windows CMD / Linux
 * Cung cấp giao diện bảng điều khiển Console hiện đại, bắt mắt, có màu sắc ANSI
 * Tương thích hoàn hảo với màn hình điện thoại Termux và máy tính CMD / PowerShell.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CliUi = exports.CliColors = void 0;
class CliColors {
    static enabled = Boolean(process.stdout.isTTY || process.env.TERMUX_VERSION || process.env.COLORTERM);
    static reset(text) { return this.enabled ? `\x1b[0m${text}\x1b[0m` : text; }
    static bold(text) { return this.enabled ? `\x1b[1m${text}\x1b[22m` : text; }
    static dim(text) { return this.enabled ? `\x1b[2m${text}\x1b[22m` : text; }
    static italic(text) { return this.enabled ? `\x1b[3m${text}\x1b[23m` : text; }
    static underline(text) { return this.enabled ? `\x1b[4m${text}\x1b[24m` : text; }
    // Foreground colors
    static black(text) { return this.enabled ? `\x1b[30m${text}\x1b[39m` : text; }
    static red(text) { return this.enabled ? `\x1b[31m${text}\x1b[39m` : text; }
    static green(text) { return this.enabled ? `\x1b[32m${text}\x1b[39m` : text; }
    static yellow(text) { return this.enabled ? `\x1b[33m${text}\x1b[39m` : text; }
    static blue(text) { return this.enabled ? `\x1b[34m${text}\x1b[39m` : text; }
    static magenta(text) { return this.enabled ? `\x1b[35m${text}\x1b[39m` : text; }
    static cyan(text) { return this.enabled ? `\x1b[36m${text}\x1b[39m` : text; }
    static white(text) { return this.enabled ? `\x1b[37m${text}\x1b[39m` : text; }
    static gray(text) { return this.enabled ? `\x1b[90m${text}\x1b[39m` : text; }
    // Bright colors
    static brightRed(text) { return this.enabled ? `\x1b[91m${text}\x1b[39m` : text; }
    static brightGreen(text) { return this.enabled ? `\x1b[92m${text}\x1b[39m` : text; }
    static brightYellow(text) { return this.enabled ? `\x1b[93m${text}\x1b[39m` : text; }
    static brightBlue(text) { return this.enabled ? `\x1b[94m${text}\x1b[39m` : text; }
    static brightMagenta(text) { return this.enabled ? `\x1b[95m${text}\x1b[39m` : text; }
    static brightCyan(text) { return this.enabled ? `\x1b[96m${text}\x1b[39m` : text; }
    // Background colors
    static bgRed(text) { return this.enabled ? `\x1b[41m${text}\x1b[49m` : text; }
    static bgGreen(text) { return this.enabled ? `\x1b[42m${text}\x1b[49m` : text; }
    static bgYellow(text) { return this.enabled ? `\x1b[43m${text}\x1b[49m` : text; }
    static bgBlue(text) { return this.enabled ? `\x1b[44m${text}\x1b[49m` : text; }
    static bgMagenta(text) { return this.enabled ? `\x1b[45m${text}\x1b[49m` : text; }
    static bgCyan(text) { return this.enabled ? `\x1b[46m${text}\x1b[49m` : text; }
}
exports.CliColors = CliColors;
class CliUi {
    static startTime = Date.now();
    /**
     * Lấy thời gian hiện tại định dạng [HH:mm:ss]
     */
    static getTime() {
        const d = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
    /**
     * Định dạng thời gian bot đã chạy (Uptime)
     */
    static getUptime() {
        const totalSec = Math.floor((Date.now() - this.startTime) / 1000);
        const hours = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;
        const pad = (n) => n.toString().padStart(2, '0');
        return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
    }
    /**
     * Lấy lượng RAM đang sử dụng
     */
    static getMemoryUsage() {
        const mem = process.memoryUsage();
        const rssMb = (mem.rss / 1024 / 1024).toFixed(1);
        const heapMb = (mem.heapUsed / 1024 / 1024).toFixed(1);
        return `${rssMb} MB (Heap: ${heapMb} MB)`;
    }
    /**
     * In Logo ASCII Werewolf phong cách Cyberpunk / Fantasy
     * Thiết kế gọn gàng (48 ký tự) để vừa vặn trên màn hình Termux điện thoại
     */
    static printBanner() {
        const c = CliColors;
        console.log('');
        console.log(c.brightMagenta('   /\\_                                      _/\\'));
        console.log(c.brightMagenta('  /   \\_       __   __       __   __       _/   \\'));
        console.log(c.cyan(' /  /\\  \\     /  \\ /  \\     /  \\ /  \\     /  /\\  \\'));
        console.log(c.cyan(' |  | \\  \\___/    V    \\___/    V    \\___/  / |  |'));
        console.log(c.brightCyan(' |  |  \\                                   /  |  |'));
        console.log(c.brightBlue('  \\  \\  |     W E R E W O L F   B O T     |  /  /'));
        console.log(c.brightBlue('   \\  \\ |      Quản Trò Discord Tiếng Việt | /  /'));
        console.log(c.magenta('    \\___/                                 \\___/'));
        console.log(c.gray('  ───────────────────────────────────────────────────'));
        console.log(c.bold(c.white('  🐺 PHIÊN BẢN: ')) +
            c.brightGreen('1.0.0 (V10 Engine)') +
            c.gray('  |  ') +
            c.bold(c.white('NỀN TẢNG: ')) +
            c.brightYellow(process.platform === 'android' ? 'Termux (Android)' : process.platform));
        console.log(c.gray('  ───────────────────────────────────────────────────\n'));
    }
    /**
     * In Bảng Dashboard thông số hệ thống dạng hộp Unicode
     */
    static printDashboard(stats) {
        const c = CliColors;
        console.log(c.brightCyan('  ╭── 📊 BẢNG ĐIỀU KHIỂN HỆ THỐNG ─────────────────────╮'));
        console.log(c.brightCyan('  │ ') +
            c.bold(c.white('🟢 Trạng thái:  ')) +
            c.brightGreen('ĐANG HOẠT ĐỘNG (READY)'.padEnd(30)) +
            c.brightCyan('│'));
        console.log(c.brightCyan('  │ ') +
            c.bold(c.white('🤖 Tài khoản:   ')) +
            c.brightYellow((stats.botTag || 'Unknown').padEnd(30)) +
            c.brightCyan('│'));
        if (stats.botId) {
            console.log(c.brightCyan('  │ ') +
                c.bold(c.white('🆔 Bot ID:      ')) +
                c.gray((stats.botId).padEnd(30)) +
                c.brightCyan('│'));
        }
        console.log(c.brightCyan('  │ ') +
            c.bold(c.white('🌐 Máy chủ:     ')) +
            c.cyan(`${stats.serverCount} servers kết nối`.padEnd(30)) +
            c.brightCyan('│'));
        console.log(c.brightCyan('  │ ') +
            c.bold(c.white('🐺 Trận đấu:    ')) +
            c.brightMagenta(`${stats.activeGames} ván đang hoạt động`.padEnd(30)) +
            c.brightCyan('│'));
        console.log(c.brightCyan('  │ ') +
            c.bold(c.white('💾 Database:    ')) +
            c.white((stats.dbPath || 'SQLite').padEnd(30)) +
            c.brightCyan('│'));
        console.log(c.brightCyan('  │ ') +
            c.bold(c.white('⚡ Bộ nhớ RAM:  ')) +
            c.brightGreen(this.getMemoryUsage().padEnd(30)) +
            c.brightCyan('│'));
        console.log(c.brightCyan('  │ ') +
            c.bold(c.white('⏱️  Thời gian:   ')) +
            c.brightYellow(this.getUptime().padEnd(30)) +
            c.brightCyan('│'));
        console.log(c.brightCyan('  ╰────────────────────────────────────────────────────╯\n'));
    }
    /**
     * Log có định dạng màu sắc chuyên nghiệp kèm nhãn (Badge)
     */
    static log(type, message, meta) {
        const c = CliColors;
        const timeStr = c.gray(`[${this.getTime()}]`);
        let badge = '';
        switch (type) {
            case 'SUCCESS':
                badge = c.bgGreen(c.bold(c.black(' OK '))) + ' ';
                break;
            case 'INFO':
                badge = c.bgBlue(c.bold(c.white(' INFO '))) + ' ';
                break;
            case 'WARN':
                badge = c.bgYellow(c.bold(c.black(' WARN '))) + ' ';
                break;
            case 'ERROR':
                badge = c.bgRed(c.bold(c.white(' ERR '))) + ' ';
                break;
            case 'GAME':
                badge = c.bgMagenta(c.bold(c.white(' GAME '))) + ' ';
                break;
            case 'BOT':
                badge = c.bgCyan(c.bold(c.black(' BOT '))) + ' ';
                break;
            case 'ACTION':
                badge = c.bold(c.brightYellow('⚡ ACTION')) + ' ';
                break;
            case 'HEARTBEAT':
                badge = c.bold(c.brightMagenta('💓 PING ')) + ' ';
                break;
        }
        const metaStr = meta ? c.gray(` (${meta})`) : '';
        console.log(`${timeStr} ${badge} ${message}${metaStr}`);
    }
    /**
     * Log lỗi với khung viền đỏ dễ nhìn
     */
    static logError(title, err) {
        const c = CliColors;
        console.log(c.brightRed('\n  ╭── ❌ LỖI HỆ THỐNG ─────────────────────────────────╮'));
        console.log(c.brightRed('  │ ') + c.bold(c.white(title)));
        if (err?.message) {
            console.log(c.brightRed('  │ ') + c.yellow(`Chi tiết: ${err.message}`));
        }
        if (err?.code) {
            console.log(c.brightRed('  │ ') + c.gray(`Mã lỗi (Code): ${err.code}`));
        }
        console.log(c.brightRed('  ╰────────────────────────────────────────────────────╯\n'));
    }
    /**
     * In thanh trạng thái ngắn gọn định kỳ (Heartbeat Status Bar)
     */
    static printHeartbeat(pingMs = 0, activeGamesCount = 0) {
        const c = CliColors;
        const time = this.getTime();
        const mem = (process.memoryUsage().rss / 1024 / 1024).toFixed(0);
        const uptime = this.getUptime();
        console.log(c.gray(`[${time}] `) +
            c.brightMagenta('💓 ') +
            c.bold(c.white('RAM: ')) + c.brightGreen(`${mem}MB`) + c.gray(' │ ') +
            c.bold(c.white('Ping: ')) + c.cyan(`${pingMs}ms`) + c.gray(' │ ') +
            c.bold(c.white('Ván đấu: ')) + c.brightYellow(`${activeGamesCount}`) + c.gray(' │ ') +
            c.bold(c.white('Uptime: ')) + c.white(uptime));
    }
}
exports.CliUi = CliUi;
