"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCustomId = buildCustomId;
exports.parseCustomId = parseCustomId;
exports.paginateOptions = paginateOptions;
function buildCustomId(gameId, phase, action, targetUserId = 'all', extra) {
    const parts = ['ww', gameId, phase, action, targetUserId];
    if (extra)
        parts.push(extra);
    return parts.join(':');
}
function parseCustomId(customId) {
    const parts = customId.split(':');
    if (parts.length < 5 || parts[0] !== 'ww') {
        return null;
    }
    return {
        prefix: 'ww',
        gameId: parts[1],
        phase: parts[2],
        action: parts[3],
        targetUserId: parts[4],
        extra: parts.slice(5).join(':') || undefined,
    };
}
/**
 * Phân trang danh sách người chơi nếu vượt quá giới hạn 25 của Discord Select Menu
 */
function paginateOptions(items, pageSize = 25) {
    const pages = [];
    for (let i = 0; i < items.length; i += pageSize) {
        pages.push(items.slice(i, i + pageSize));
    }
    return pages;
}
