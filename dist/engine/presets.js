"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUILTIN_PRESETS = exports.PRESET_WOLVESVILLE = exports.PRESET_ADVANCED = exports.PRESET_BASIC = exports.DEFAULT_CONFIG = void 0;
exports.balancePresetForPlayerCount = balancePresetForPlayerCount;
exports.validateGameConfig = validateGameConfig;
exports.DEFAULT_CONFIG = {
    roles: {
        WEREWOLF: 1,
        SEER: 1,
        BODYGUARD: 1,
        VILLAGER: 1, // 4 vai mặc định khớp với mức tối thiểu 4 người chơi
    },
    timers: {
        roleConfirmSec: 25,
        nightSec: 45,
        dawnSec: 15,
        discussionSec: 90,
        votingSec: 40,
        hunterShotSec: 30,
    },
    rules: {
        witchCanSelfHealFirstNightOnly: false,
        witchCanSelfHealAlways: true,
        bodyguardCanProtectSelf: true,
        hunterCanShootIfPoisoned: false,
        revealRoleOnDeath: false, // Mặc định tắt lộ vai khi chết / treo cổ
        tieVoteAction: 'SKIP',
        wolfTieAction: 'NO_KILL',
        allowLoversWin: true,
    },
};
exports.PRESET_BASIC = {
    id: 'basic',
    name: 'Cơ bản (Ma Sói Nhập Môn)',
    description: 'Bộ vai cổ điển, cân bằng, dễ làm quen cho người mới: Dân làng, Sói thường, Tiên tri, Bảo vệ.',
    minPlayers: 4,
    maxPlayers: 20,
    config: {
        ...exports.DEFAULT_CONFIG,
        roles: {
            WEREWOLF: 1,
            SEER: 1,
            BODYGUARD: 1,
            VILLAGER: 1, // 4 người mặc định
        },
    },
};
exports.PRESET_ADVANCED = {
    id: 'advanced',
    name: 'Nâng cao (Rừng Sâu Khát Máu)',
    description: 'Đầy đủ các vai đặc biệt: Phù thủy, Thợ săn, Thần tình yêu, Thằng ngốc, Sói quỷ, Sói cuồng nộ, Sói trắng, Kẻ chán đời.',
    minPlayers: 8,
    maxPlayers: 25,
    config: {
        ...exports.DEFAULT_CONFIG,
        roles: {
            WEREWOLF: 1,
            DEMON_WOLF: 1,
            BERSERK_WOLF: 1,
            WHITE_WOLF: 1,
            SEER: 1,
            BODYGUARD: 1,
            WITCH: 1,
            HUNTER: 1,
            CUPID: 1,
            IDIOT: 1,
            TANNER: 1,
            VILLAGER: 2, // 13 người
        },
    },
};
exports.PRESET_WOLVESVILLE = {
    id: 'wolvesville',
    name: 'Wolvesville (Werewolf Online)',
    description: 'Preset theo chuẩn Werewolf Online: Sói thường, Sói tiên tri, Bác sĩ, Thám tử, Xạ thủ, Kẻ khờ, Kẻ sát nhân.',
    minPlayers: 6,
    maxPlayers: 25,
    config: {
        ...exports.DEFAULT_CONFIG,
        roles: {
            WEREWOLF: 1,
            WOLF_SEER: 1,
            DOCTOR: 1,
            DETECTIVE: 1,
            GUNNER: 1,
            FOOL: 1,
            SERIAL_KILLER: 1,
            VILLAGER: 1,
        },
    },
};
exports.BUILTIN_PRESETS = {
    basic: exports.PRESET_BASIC,
    advanced: exports.PRESET_ADVANCED,
    wolvesville: exports.PRESET_WOLVESVILLE,
};
/**
 * Tự động tính toán số Dân làng để tổng số vai vừa khít với số người chơi trong phòng.
 * Không tự ý thêm vai đặc biệt nếu chủ phòng không cấu hình.
 */
function balancePresetForPlayerCount(baseConfig, playerCount) {
    const newConfig = JSON.parse(JSON.stringify(baseConfig));
    // Tính tổng số vai không phải Villager
    let specialRolesCount = 0;
    for (const [roleId, count] of Object.entries(newConfig.roles)) {
        if (roleId !== 'VILLAGER') {
            specialRolesCount += Math.max(0, count);
        }
    }
    // Số lượng dân làng = playerCount - specialRolesCount
    const neededVillagers = Math.max(0, playerCount - specialRolesCount);
    newConfig.roles['VILLAGER'] = neededVillagers;
    return newConfig;
}
/**
 * Kiểm tra tính hợp lệ của cấu hình
 */
function validateGameConfig(config, playerCount) {
    const errors = [];
    let totalRoles = 0;
    let wolfCount = 0;
    let villageCount = 0;
    for (const [roleId, count] of Object.entries(config.roles)) {
        if (count < 0) {
            errors.push(`Số lượng vai ${roleId} không được là số âm.`);
        }
        totalRoles += count;
        if (['WEREWOLF', 'DEMON_WOLF', 'BERSERK_WOLF', 'WHITE_WOLF'].includes(roleId)) {
            wolfCount += count;
        }
        else if (roleId !== 'TANNER') {
            villageCount += count;
        }
    }
    if (playerCount < 4) {
        errors.push(`Cần tối thiểu 4 người chơi để bắt đầu trận Ma Sói. Hiện tại đang có ${playerCount} người.`);
    }
    if (totalRoles < 4) {
        errors.push(`Cần tối thiểu 4 vai trong cấu hình Ma Sói (hiện có ${totalRoles} vai).`);
    }
    if (totalRoles !== playerCount) {
        errors.push(`Tổng số lượng vai (${totalRoles}) phải bằng chính xác số người chơi (${playerCount}).`);
    }
    if (wolfCount <= 0) {
        errors.push('Đội hình phải có ít nhất 1 thành viên Phe Sói.');
    }
    if (wolfCount >= playerCount) {
        errors.push('Số lượng Sói không thể chiếm toàn bộ người chơi.');
    }
    if (villageCount <= 0) {
        errors.push('Đội hình phải có ít nhất 1 thành viên Phe Dân.');
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
