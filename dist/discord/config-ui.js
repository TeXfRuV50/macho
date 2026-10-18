"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigUi = void 0;
const discord_js_1 = require("discord.js");
const types_1 = require("./types");
const roles_1 = require("../engine/roles");
class ConfigUi {
    /**
     * Tạo Embed tóm tắt cấu hình hiện tại
     */
    static buildConfigSummaryEmbed(config, playerCount) {
        const rolesList = Object.entries(config.roles)
            .filter(([_, count]) => count > 0)
            .map(([roleId, count]) => `• **${(0, roles_1.getRoleInfo)(roleId).name}**: ${count}`)
            .join('\n');
        const totalRoles = Object.values(config.roles).reduce((a, b) => a + b, 0);
        return new discord_js_1.EmbedBuilder()
            .setColor(0xe67e22)
            .setTitle('⚙️ BẢNG TÙY CHỈNH CẤU HÌNH PHÒNG CHƠI')
            .setDescription('Chủ phòng có thể chỉnh sửa số lượng từng vai, thời gian và luật chơi bên dưới.')
            .addFields({
            name: `🎭 Đội hình vai trò (${totalRoles} vai / ${playerCount} người)`,
            value: rolesList || '_Chưa có vai nào_',
            inline: false,
        }, {
            name: '⏱️ Thời lượng',
            value: `• Xác nhận vai: ${config.timers.roleConfirmSec}s\n` +
                `• Đêm: ${config.timers.nightSec}s\n` +
                `• Thảo luận: ${config.timers.discussionSec}s\n` +
                `• Biểu quyết: ${config.timers.votingSec}s`,
            inline: true,
        }, {
            name: '📜 Luật chơi',
            value: `• Công bố vai khi chết: ${config.rules.revealRoleOnDeath ? 'Bật' : 'Tắt (Mặc định)'}\n` +
                `• Bảo vệ tự che chở: ${config.rules.bodyguardCanProtectSelf ? 'Cho phép' : 'Cấm'}\n` +
                `• Phù thủy tự cứu: ${config.rules.witchCanSelfHealAlways ? 'Mọi đêm' : 'Chỉ Đêm 1'}\n` +
                `• Thợ săn trúng độc được bắn: ${config.rules.hunterCanShootIfPoisoned ? 'Có' : 'Không'}\n` +
                `• Hòa phiếu: ${config.rules.tieVoteAction === 'REVOTE_ONCE' ? 'Bỏ phiếu lại 1 lần' : 'Bỏ qua'}`,
            inline: true,
        })
            .setFooter({ text: 'Khi trận đấu bắt đầu, toàn bộ cấu hình sẽ bị KHÓA chặt chẽ.' });
    }
    /**
     * Bộ nút & menu điều khiển cấu hình
     */
    static buildConfigControls(gameId, hostId) {
        // Menu chọn vai để tăng/giảm số lượng
        const roleSelect = new discord_js_1.StringSelectMenuBuilder()
            .setCustomId((0, types_1.buildCustomId)(gameId, 'CONFIG', 'select_role_to_edit', hostId))
            .setPlaceholder('Chọn một vai để chỉnh số lượng (+/-)...');
        for (const roleId of roles_1.IMPLEMENTED_ROLE_IDS) {
            const info = (0, roles_1.getRoleInfo)(roleId);
            roleSelect.addOptions(new discord_js_1.StringSelectMenuOptionBuilder()
                .setLabel(info.name)
                .setValue(roleId)
                .setDescription(`Phe: ${info.faction}`));
        }
        const row1 = new discord_js_1.ActionRowBuilder().addComponents(roleSelect);
        // Hàng nút điều chỉnh
        const row2 = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(gameId, 'CONFIG', 'auto_balance', hostId))
            .setLabel('Tự cân bằng Dân làng')
            .setStyle(discord_js_1.ButtonStyle.Success)
            .setEmoji('⚖️'), new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(gameId, 'CONFIG', 'open_timer_modal', hostId))
            .setLabel('Chỉnh thời gian')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('⏱️'), new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(gameId, 'CONFIG', 'toggle_reveal_role', hostId))
            .setLabel('Bật/Tắt Lộ vai khi chết')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('👁️'), new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(gameId, 'CONFIG', 'open_custom_role_modal', hostId))
            .setLabel('Tạo vai mới')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('✨'));
        return [row1, row2];
    }
    /**
     * Modal chỉnh sửa thời gian
     */
    static buildTimerModal(gameId) {
        return new discord_js_1.ModalBuilder()
            .setCustomId(`modal:timer:${gameId}`)
            .setTitle('Điều chỉnh thời gian (giây)')
            .addComponents(new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.TextInputBuilder()
            .setCustomId('night_sec')
            .setLabel('Thời gian Đêm (15 - 180s)')
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setValue('45')
            .setRequired(true)), new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.TextInputBuilder()
            .setCustomId('discussion_sec')
            .setLabel('Thời gian Thảo luận (20 - 300s)')
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setValue('90')
            .setRequired(true)), new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.TextInputBuilder()
            .setCustomId('voting_sec')
            .setLabel('Thời gian Biểu quyết (15 - 120s)')
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setValue('40')
            .setRequired(true)));
    }
    /**
     * Modal tạo vai mới an toàn (Schema-backed)
     */
    static buildCustomRoleModal(gameId) {
        return new discord_js_1.ModalBuilder()
            .setCustomId(`modal:custom_role:${gameId}`)
            .setTitle('Tạo vai trò tùy chỉnh mới')
            .addComponents(new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.TextInputBuilder()
            .setCustomId('role_id')
            .setLabel('Mã vai (Chữ hoa & số, VD: GHOST_HUNTER)')
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setPlaceholder('GHOST_HUNTER')
            .setRequired(true)), new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.TextInputBuilder()
            .setCustomId('role_name')
            .setLabel('Tên hiển thị của vai')
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setPlaceholder('Thợ bắt ma')
            .setRequired(true)), new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.TextInputBuilder()
            .setCustomId('role_desc')
            .setLabel('Mô tả vai')
            .setStyle(discord_js_1.TextInputStyle.Paragraph)
            .setPlaceholder('Mô tả ngắn gọn về vai trò này...')
            .setRequired(true)), new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.TextInputBuilder()
            .setCustomId('role_skill')
            .setLabel('Loại kỹ năng: INVESTIGATE/PROTECT/KILL/NONE')
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setValue('INVESTIGATE')
            .setRequired(true)), new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.TextInputBuilder()
            .setCustomId('role_faction')
            .setLabel('Phe: VILLAGE / WEREWOLF / SOLO')
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setValue('VILLAGE')
            .setRequired(true)));
    }
}
exports.ConfigUi = ConfigUi;
