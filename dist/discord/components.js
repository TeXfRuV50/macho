"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WerewolfComponents = void 0;
const discord_js_1 = require("discord.js");
const types_1 = require("./types");
class WerewolfComponents {
    /**
     * Bộ nút điều khiển tại Sảnh chờ (Lobby)
     */
    static buildLobbyControls(game) {
        const canStart = game.players.size >= 4;
        const row1 = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'LOBBY', 'join', 'all'))
            .setLabel('Tham gia')
            .setStyle(discord_js_1.ButtonStyle.Success)
            .setEmoji('✋'), new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'LOBBY', 'leave', 'all'))
            .setLabel('Rời sảnh')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('🚪'), new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'LOBBY', 'start', game.hostId))
            .setLabel(canStart ? 'Bắt đầu ván' : 'Bắt đầu (Cần ≥ 4 người)')
            .setStyle(canStart ? discord_js_1.ButtonStyle.Primary : discord_js_1.ButtonStyle.Secondary)
            .setEmoji(canStart ? '🚀' : '⏳')
            .setDisabled(!canStart), new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'LOBBY', 'custom_menu', game.hostId))
            .setLabel('Tùy chỉnh (/custom)')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('⚙️'));
        const row2 = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'LOBBY', 'preset_basic', game.hostId))
            .setLabel('Preset Cơ bản')
            .setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'LOBBY', 'preset_advanced', game.hostId))
            .setLabel('Preset Nâng cao')
            .setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'LOBBY', 'stop_prompt', game.hostId))
            .setLabel('Hủy phòng')
            .setStyle(discord_js_1.ButtonStyle.Danger)
            .setEmoji('🛑'));
        return [row1, row2];
    }
    /**
     * Nút xác nhận đã nhận và hiểu vai trò bí mật
     */
    static buildRoleConfirmButton(gameId, userId) {
        return new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(gameId, 'ROLE_DISTRIBUTION', 'confirm_role', userId))
            .setLabel('Đã hiểu vai trò & Sẵn sàng')
            .setStyle(discord_js_1.ButtonStyle.Success)
            .setEmoji('✅'));
    }
    /**
     * Menu chọn mục tiêu soi của Tiên tri
     */
    static buildSeerMenu(game, seerId) {
        const targets = Array.from(game.players.values()).filter((p) => p.isAlive && p.id !== seerId);
        const pages = (0, types_1.paginateOptions)(targets, 25);
        const rows = [];
        pages.forEach((pageTargets, idx) => {
            const select = new discord_js_1.StringSelectMenuBuilder()
                .setCustomId((0, types_1.buildCustomId)(game.id, 'NIGHT', 'seer_target', seerId, `page_${idx}`))
                .setPlaceholder(pages.length > 1 ? `Chọn người để soi (Trang ${idx + 1}/${pages.length})` : 'Chọn người để soi chân tướng...');
            select.addOptions(pageTargets.map((p) => new discord_js_1.StringSelectMenuOptionBuilder()
                .setLabel(`${p.name}`)
                .setDescription(`ID: ${p.id}`)
                .setValue(p.id)
                .setEmoji('🔮')));
            rows.push(new discord_js_1.ActionRowBuilder().addComponents(select));
        });
        return rows;
    }
    /**
     * Menu chọn mục tiêu bảo vệ của Bảo vệ
     */
    static buildBodyguardMenu(game, bgPlayer) {
        const targets = Array.from(game.players.values()).filter((p) => {
            if (!p.isAlive)
                return false;
            if (p.id === bgPlayer.id && !game.config.rules.bodyguardCanProtectSelf)
                return false;
            if (p.id === bgPlayer.skills.lastProtectedTargetId)
                return false;
            return true;
        });
        const pages = (0, types_1.paginateOptions)(targets, 25);
        const rows = [];
        pages.forEach((pageTargets, idx) => {
            const select = new discord_js_1.StringSelectMenuBuilder()
                .setCustomId((0, types_1.buildCustomId)(game.id, 'NIGHT', 'bg_target', bgPlayer.id, `page_${idx}`))
                .setPlaceholder('Chọn người để bảo vệ đêm nay...');
            select.addOptions(pageTargets.map((p) => new discord_js_1.StringSelectMenuOptionBuilder()
                .setLabel(`${p.name}${p.id === bgPlayer.id ? ' (Bản thân)' : ''}`)
                .setValue(p.id)
                .setEmoji('🛡️')));
            rows.push(new discord_js_1.ActionRowBuilder().addComponents(select));
        });
        return rows;
    }
    /**
     * Menu chọn mục tiêu cắn của Bầy sói
     */
    static buildWolfBiteMenu(game, wolfId) {
        // Sói chọn cắn người còn sống không thuộc phe Sói (hoặc bất kỳ ai còn sống)
        const targets = Array.from(game.players.values()).filter((p) => p.isAlive && p.id !== wolfId);
        const pages = (0, types_1.paginateOptions)(targets, 25);
        const rows = [];
        pages.forEach((pageTargets, idx) => {
            const select = new discord_js_1.StringSelectMenuBuilder()
                .setCustomId((0, types_1.buildCustomId)(game.id, 'NIGHT', 'wolf_vote_target', wolfId, `page_${idx}`))
                .setPlaceholder('Bỏ phiếu cắn xé nạn nhân đêm nay...');
            select.addOptions(pageTargets.map((p) => new discord_js_1.StringSelectMenuOptionBuilder()
                .setLabel(`${p.name}`)
                .setValue(p.id)
                .setEmoji('🩸')));
            rows.push(new discord_js_1.ActionRowBuilder().addComponents(select));
        });
        return rows;
    }
    /**
     * Điều khiển của Phù thủy: Nút Cứu, Menu Độc, Nút Bỏ qua
     */
    static buildWitchControls(game, witchPlayer, wolfVictimPlayer) {
        const controls = [];
        const buttonRow = new discord_js_1.ActionRowBuilder();
        // Nút cứu nạn nhân
        const canHeal = witchPlayer.skills.witchHealRemaining > 0 &&
            wolfVictimPlayer !== null &&
            (wolfVictimPlayer.id !== witchPlayer.id || game.config.rules.witchCanSelfHealAlways);
        buttonRow.addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'NIGHT', 'witch_heal', witchPlayer.id))
            .setLabel(wolfVictimPlayer ? `Cứu ${wolfVictimPlayer.name}` : 'Không có ai bị cắn')
            .setStyle(discord_js_1.ButtonStyle.Success)
            .setEmoji('🧪')
            .setDisabled(!canHeal), new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'NIGHT', 'witch_pass', witchPlayer.id))
            .setLabel('Không làm gì (Bỏ qua)')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('⏩'));
        controls.push(buttonRow);
        // Menu hạ độc nếu còn bình độc
        if (witchPlayer.skills.witchPoisonRemaining > 0) {
            const poisonTargets = Array.from(game.players.values()).filter((p) => p.isAlive && p.id !== witchPlayer.id);
            const pages = (0, types_1.paginateOptions)(poisonTargets, 25);
            pages.forEach((pageTargets, idx) => {
                const select = new discord_js_1.StringSelectMenuBuilder()
                    .setCustomId((0, types_1.buildCustomId)(game.id, 'NIGHT', 'witch_poison_target', witchPlayer.id, `page_${idx}`))
                    .setPlaceholder('Dùng bình Độc lên một người (Tùy chọn)...');
                select.addOptions(pageTargets.map((p) => new discord_js_1.StringSelectMenuOptionBuilder()
                    .setLabel(`Đầu độc: ${p.name}`)
                    .setValue(p.id)
                    .setEmoji('☠️')));
                controls.push(new discord_js_1.ActionRowBuilder().addComponents(select));
            });
        }
        return controls;
    }
    /**
     * Menu Sói trắng chọn giết đồng loại (Đêm chẵn >= 2)
     */
    static buildWhiteWolfMenu(game, whiteWolfId) {
        const wolfTargets = Array.from(game.players.values()).filter((p) => p.isAlive && p.faction === 'WEREWOLF' && p.id !== whiteWolfId);
        if (wolfTargets.length === 0)
            return [];
        const select = new discord_js_1.StringSelectMenuBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'NIGHT', 'white_wolf_target', whiteWolfId))
            .setPlaceholder('Bí mật giết một con Sói khác trong bầy...');
        select.addOptions(wolfTargets.map((p) => new discord_js_1.StringSelectMenuOptionBuilder()
            .setLabel(`Giết: ${p.name}`)
            .setValue(p.id)
            .setEmoji('🐺')));
        return [new discord_js_1.ActionRowBuilder().addComponents(select)];
    }
    /**
     * Menu Thần tình yêu ghép đôi (Đêm 1)
     */
    static buildCupidMenu(game, cupidId) {
        const alivePlayers = Array.from(game.players.values()).filter((p) => p.isAlive);
        const pages = (0, types_1.paginateOptions)(alivePlayers, 25);
        const rows = [];
        pages.forEach((pageTargets, idx) => {
            const select = new discord_js_1.StringSelectMenuBuilder()
                .setCustomId((0, types_1.buildCustomId)(game.id, 'NIGHT', 'cupid_pair', cupidId, `page_${idx}`))
                .setPlaceholder('Chọn đúng 2 người để kết đôi...')
                .setMinValues(2)
                .setMaxValues(2);
            select.addOptions(pageTargets.map((p) => new discord_js_1.StringSelectMenuOptionBuilder()
                .setLabel(`${p.name}`)
                .setValue(p.id)
                .setEmoji('💘')));
            rows.push(new discord_js_1.ActionRowBuilder().addComponents(select));
        });
        return rows;
    }
    /**
     * Menu Biểu quyết treo cổ ban ngày
     */
    static buildVotingControls(game) {
        const alivePlayers = Array.from(game.players.values()).filter((p) => p.isAlive);
        const pages = (0, types_1.paginateOptions)(alivePlayers, 25);
        const controls = [];
        pages.forEach((pageTargets, idx) => {
            const select = new discord_js_1.StringSelectMenuBuilder()
                .setCustomId((0, types_1.buildCustomId)(game.id, 'VOTING', 'cast_vote', 'all', `page_${idx}`))
                .setPlaceholder(pages.length > 1 ? `Bỏ phiếu treo cổ (Trang ${idx + 1}/${pages.length})` : 'Chọn người bạn muốn treo cổ...');
            select.addOptions(pageTargets.map((p) => new discord_js_1.StringSelectMenuOptionBuilder()
                .setLabel(`Treo cổ: ${p.name}`)
                .setValue(p.id)
                .setEmoji('⚖️')));
            controls.push(new discord_js_1.ActionRowBuilder().addComponents(select));
        });
        // Nút Bỏ qua (Bỏ phiếu trắng) và Nút Kéo bảng vote xuống đáy kênh
        const buttonRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'VOTING', 'skip_vote', 'all'))
            .setLabel('Bỏ phiếu trắng / Bỏ qua')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('🏳️'), new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'VOTING', 'repost_vote', 'all'))
            .setLabel('Kéo bảng vote xuống')
            .setStyle(discord_js_1.ButtonStyle.Primary)
            .setEmoji('🔄'));
        controls.push(buttonRow);
        return controls;
    }
    /**
     * Menu Thợ săn bắn trả thù
     */
    static buildHunterShotMenu(game, hunterId) {
        const aliveTargets = Array.from(game.players.values()).filter((p) => p.isAlive && p.id !== hunterId);
        const pages = (0, types_1.paginateOptions)(aliveTargets, 25);
        const rows = [];
        pages.forEach((pageTargets, idx) => {
            const select = new discord_js_1.StringSelectMenuBuilder()
                .setCustomId((0, types_1.buildCustomId)(game.id, 'HUNTER', 'shot_target', hunterId, `page_${idx}`))
                .setPlaceholder('Chọn người để nổ phát súng cuối cùng...');
            select.addOptions(pageTargets.map((p) => new discord_js_1.StringSelectMenuOptionBuilder()
                .setLabel(`Bắn gục: ${p.name}`)
                .setValue(p.id)
                .setEmoji('🎯')));
            rows.push(new discord_js_1.ActionRowBuilder().addComponents(select));
        });
        return rows;
    }
    /**
     * Nút xác nhận hủy trận đấu
     */
    static buildStopConfirmation(gameId, hostId) {
        return new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(gameId, 'LOBBY', 'confirm_stop', hostId))
            .setLabel('Xác nhận Dừng Trận')
            .setStyle(discord_js_1.ButtonStyle.Danger)
            .setEmoji('⚠️'), new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(gameId, 'LOBBY', 'cancel_stop', hostId))
            .setLabel('Quay lại')
            .setStyle(discord_js_1.ButtonStyle.Secondary));
    }
}
exports.WerewolfComponents = WerewolfComponents;
