"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WerewolfComponents = void 0;
const discord_js_1 = require("discord.js");
const types_1 = require("./types");
const roles_1 = require("../engine/roles");
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
            .setLabel('Thêm / Chỉnh vai (+/-)')
            .setStyle(discord_js_1.ButtonStyle.Primary)
            .setEmoji('🎭'));
        const row2 = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'LOBBY', 'add_bot', game.hostId))
            .setLabel('+1 Bot')
            .setStyle(discord_js_1.ButtonStyle.Primary)
            .setEmoji('🤖'), new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'LOBBY', 'fill_bots', game.hostId))
            .setLabel('Điền đủ Bot')
            .setStyle(discord_js_1.ButtonStyle.Success)
            .setEmoji('⚡'), new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'LOBBY', 'clear_bots', game.hostId))
            .setLabel('Xóa Bot')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('🧹'), new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'LOBBY', 'preset_basic', game.hostId))
            .setLabel('Preset Cơ bản')
            .setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'LOBBY', 'preset_advanced', game.hostId))
            .setLabel('Preset Nâng cao')
            .setStyle(discord_js_1.ButtonStyle.Secondary));
        const row3 = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'LOBBY', 'preset_wolvesville', game.hostId))
            .setLabel('Preset Wolvesville')
            .setStyle(discord_js_1.ButtonStyle.Primary)
            .setEmoji('🐺'), new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'LOBBY', 'add_all_roles', game.hostId))
            .setLabel('Thêm tất cả vai')
            .setStyle(discord_js_1.ButtonStyle.Success)
            .setEmoji('⚡'), new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'LOBBY', 'stop_prompt', game.hostId))
            .setLabel('Hủy phòng')
            .setStyle(discord_js_1.ButtonStyle.Danger)
            .setEmoji('🛑'));
        return [row1, row2, row3];
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
     * Nút tương tác tại kênh chính trong giai đoạn phát vai (xem vai & xác nhận)
     */
    static buildRoleDistributionControls(game) {
        return [
            new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
                .setCustomId((0, types_1.buildCustomId)(game.id, 'ROLE_DISTRIBUTION', 'view_my_role_channel', 'all'))
                .setLabel('🎭 Xem vai bí mật của tôi')
                .setStyle(discord_js_1.ButtonStyle.Primary)
                .setEmoji('👁️'), new discord_js_1.ButtonBuilder()
                .setCustomId((0, types_1.buildCustomId)(game.id, 'ROLE_DISTRIBUTION', 'confirm_role_channel', 'all'))
                .setLabel('Đã hiểu vai & Sẵn sàng')
                .setStyle(discord_js_1.ButtonStyle.Success)
                .setEmoji('✅')),
        ];
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
                .setLabel(p.isBot ? `🤖 ${p.name}` : `${p.name}`)
                .setDescription(p.isBot ? 'Người chơi ảo (Bot)' : `ID: ${p.id}`)
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
                .setLabel(`${p.isBot ? `🤖 ${p.name}` : p.name}${p.id === bgPlayer.id ? ' (Bản thân)' : ''}`)
                .setDescription(p.isBot ? 'Người chơi ảo (Bot)' : `ID: ${p.id}`)
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
        // Sói chọn cắn người còn sống không thuộc phe Sói (hoặc bất kỳ ai còn sống ngoại trừ bản thân)
        const targets = Array.from(game.players.values()).filter((p) => p.isAlive && p.id !== wolfId);
        const pages = (0, types_1.paginateOptions)(targets, 25);
        const rows = [];
        const voteTally = game.getWolfVoteTally();
        const isAlphaActive = game.isAlphaWolfActive();
        pages.forEach((pageTargets, idx) => {
            const maxSelect = isAlphaActive ? Math.min(2, pageTargets.length) : 1;
            const select = new discord_js_1.StringSelectMenuBuilder()
                .setCustomId((0, types_1.buildCustomId)(game.id, 'NIGHT', 'wolf_vote_target', wolfId, `page_${idx}`))
                .setPlaceholder(isAlphaActive
                ? '👑 Sói Trùm kích hoạt: Chọn tối đa 2 nạn nhân để cắn...'
                : 'Bỏ phiếu cắn xé nạn nhân đêm nay...')
                .setMinValues(1)
                .setMaxValues(maxSelect);
            select.addOptions(pageTargets.map((p) => {
                const voteCount = voteTally.get(p.id) || 0;
                const voteBadge = voteCount > 0 ? ` [${voteCount} phiếu]` : '';
                const desc = voteCount > 0
                    ? `🔥 Đang nhận ${voteCount} phiếu cắn từ bầy sói`
                    : p.isBot
                        ? 'Người chơi ảo (Bot)'
                        : `ID: ${p.id}`;
                return new discord_js_1.StringSelectMenuOptionBuilder()
                    .setLabel(`${p.isBot ? '🤖 ' : ''}${p.name}${voteBadge}`)
                    .setDescription(desc)
                    .setValue(p.id)
                    .setEmoji(voteCount > 0 ? '🎯' : '🩸');
            }));
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
        // Menu hạ độc nếu còn bình độc (Theo luật Werewolf Online: Đêm 1 không thể dùng bình độc)
        if (game.nightNumber === 1) {
            const disabledRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
                .setCustomId((0, types_1.buildCustomId)(game.id, 'NIGHT', 'witch_poison_disabled', witchPlayer.id))
                .setLabel('☠️ Bình độc: Khóa ở Đêm 1 (Theo luật Werewolf Online)')
                .setStyle(discord_js_1.ButtonStyle.Secondary)
                .setDisabled(true));
            controls.push(disabledRow);
        }
        else if (witchPlayer.skills.witchPoisonRemaining > 0) {
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
     * Menu chọn mục tiêu bảo vệ của Bác sĩ (Doctor - Werewolf Online)
     */
    static buildDoctorMenu(game, doctorPlayer) {
        const targets = Array.from(game.players.values()).filter((p) => {
            if (!p.isAlive)
                return false;
            if (p.id === doctorPlayer.skills.doctorLastProtectedTargetId)
                return false;
            return true;
        });
        const pages = (0, types_1.paginateOptions)(targets, 25);
        const rows = [];
        pages.forEach((pageTargets, idx) => {
            const select = new discord_js_1.StringSelectMenuBuilder()
                .setCustomId((0, types_1.buildCustomId)(game.id, 'NIGHT', 'doctor_target', doctorPlayer.id, `page_${idx}`))
                .setPlaceholder('Chọn người để cứu chữa/bảo vệ đêm nay...');
            select.addOptions(pageTargets.map((p) => new discord_js_1.StringSelectMenuOptionBuilder()
                .setLabel(`${p.isBot ? `🤖 ${p.name}` : p.name}${p.id === doctorPlayer.id ? ' (Bản thân)' : ''}`)
                .setDescription(p.isBot ? 'Người chơi ảo (Bot)' : `ID: ${p.id}`)
                .setValue(p.id)
                .setEmoji('🩺')));
            rows.push(new discord_js_1.ActionRowBuilder().addComponents(select));
        });
        return rows;
    }
    /**
     * Menu chọn 2 người để kiểm tra của Thám tử (Detective - Werewolf Online)
     */
    static buildDetectiveMenu(game, detectiveId) {
        const targets = Array.from(game.players.values()).filter((p) => p.isAlive && p.id !== detectiveId);
        if (targets.length < 2)
            return [];
        const pages = (0, types_1.paginateOptions)(targets, 25);
        const rows = [];
        pages.forEach((pageTargets, idx) => {
            const select = new discord_js_1.StringSelectMenuBuilder()
                .setCustomId((0, types_1.buildCustomId)(game.id, 'NIGHT', 'detective_pair', detectiveId, `page_${idx}`))
                .setPlaceholder('Chọn đúng 2 người để điều tra cùng hay khác phe...')
                .setMinValues(2)
                .setMaxValues(2);
            select.addOptions(pageTargets.map((p) => new discord_js_1.StringSelectMenuOptionBuilder()
                .setLabel(p.isBot ? `🤖 ${p.name}` : `${p.name}`)
                .setDescription(p.isBot ? 'Người chơi ảo (Bot)' : `ID: ${p.id}`)
                .setValue(p.id)
                .setEmoji('🔍')));
            rows.push(new discord_js_1.ActionRowBuilder().addComponents(select));
        });
        return rows;
    }
    /**
     * Menu soi chính xác vai trò của Sói tiên tri (Wolf Seer - Werewolf Online)
     */
    static buildWolfSeerMenu(game, wolfSeerId) {
        const aliveWolves = Array.from(game.players.values()).filter((p) => p.isAlive && p.faction === 'WEREWOLF');
        if (aliveWolves.length <= 1)
            return [];
        const targets = Array.from(game.players.values()).filter((p) => p.isAlive && p.id !== wolfSeerId);
        const pages = (0, types_1.paginateOptions)(targets, 25);
        const rows = [];
        pages.forEach((pageTargets, idx) => {
            const select = new discord_js_1.StringSelectMenuBuilder()
                .setCustomId((0, types_1.buildCustomId)(game.id, 'NIGHT', 'wolf_seer_target', wolfSeerId, `page_${idx}`))
                .setPlaceholder('Chọn người để soi chính xác vai trò...');
            select.addOptions(pageTargets.map((p) => new discord_js_1.StringSelectMenuOptionBuilder()
                .setLabel(p.isBot ? `🤖 ${p.name}` : `${p.name}`)
                .setDescription(p.isBot ? 'Người chơi ảo (Bot)' : `ID: ${p.id}`)
                .setValue(p.id)
                .setEmoji('👁️')));
            rows.push(new discord_js_1.ActionRowBuilder().addComponents(select));
        });
        return rows;
    }
    /**
     * Menu chọn nạn nhân hạ sát của Kẻ sát nhân (Serial Killer - Werewolf Online)
     */
    static buildSerialKillerMenu(game, skId) {
        const targets = Array.from(game.players.values()).filter((p) => p.isAlive && p.id !== skId);
        const pages = (0, types_1.paginateOptions)(targets, 25);
        const rows = [];
        pages.forEach((pageTargets, idx) => {
            const select = new discord_js_1.StringSelectMenuBuilder()
                .setCustomId((0, types_1.buildCustomId)(game.id, 'NIGHT', 'serial_killer_target', skId, `page_${idx}`))
                .setPlaceholder('Chọn nạn nhân để hạ sát đêm nay...');
            select.addOptions(pageTargets.map((p) => new discord_js_1.StringSelectMenuOptionBuilder()
                .setLabel(p.isBot ? `🤖 ${p.name}` : `${p.name}`)
                .setDescription(p.isBot ? 'Người chơi ảo (Bot)' : `ID: ${p.id}`)
                .setValue(p.id)
                .setEmoji('🔪')));
            rows.push(new discord_js_1.ActionRowBuilder().addComponents(select));
        });
        return rows;
    }
    /**
     * Menu nổ súng ban ngày của Xạ thủ (Gunner - Werewolf Online)
     */
    static buildGunnerMenu(game, gunnerPlayer) {
        if (!gunnerPlayer.skills.gunnerBulletsRemaining || gunnerPlayer.skills.gunnerBulletsRemaining <= 0) {
            return [];
        }
        const targets = Array.from(game.players.values()).filter((p) => p.isAlive && p.id !== gunnerPlayer.id);
        const pages = (0, types_1.paginateOptions)(targets, 25);
        const rows = [];
        pages.forEach((pageTargets, idx) => {
            const select = new discord_js_1.StringSelectMenuBuilder()
                .setCustomId((0, types_1.buildCustomId)(game.id, 'DISCUSSION', 'gunner_target', gunnerPlayer.id, `page_${idx}`))
                .setPlaceholder(`Bắn hạ một người (Còn ${gunnerPlayer.skills.gunnerBulletsRemaining} viên đạn)...`);
            select.addOptions(pageTargets.map((p) => new discord_js_1.StringSelectMenuOptionBuilder()
                .setLabel(p.isBot ? `Bắn: 🤖 ${p.name}` : `Bắn: ${p.name}`)
                .setDescription(p.isBot ? 'Người chơi ảo (Bot)' : `ID: ${p.id}`)
                .setValue(p.id)
                .setEmoji('🔫')));
            rows.push(new discord_js_1.ActionRowBuilder().addComponents(select));
        });
        return rows;
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
                .setLabel(p.isBot ? `Treo cổ: 🤖 ${p.name}` : `Treo cổ: ${p.name}`)
                .setDescription(p.isBot ? 'Người chơi ảo (Bot)' : `ID: ${p.id}`)
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
                .setLabel(p.isBot ? `Bắn gục: 🤖 ${p.name}` : `Bắn gục: ${p.name}`)
                .setDescription(p.isBot ? 'Người chơi ảo (Bot)' : `ID: ${p.id}`)
                .setValue(p.id)
                .setEmoji('🎯')));
            rows.push(new discord_js_1.ActionRowBuilder().addComponents(select));
        });
        return rows;
    }
    /**
     * Bộ nút điều khiển tại Kênh ban đêm (Thực hiện kỹ năng bí mật & xem vai)
     */
    static buildNightControls(game) {
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'NIGHT', 'use_night_skill', 'all'))
            .setLabel('🌙 Dùng kỹ năng đêm')
            .setStyle(discord_js_1.ButtonStyle.Primary)
            .setEmoji('✨'), new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'NIGHT', 'view_my_role', 'all'))
            .setLabel('🎭 Xem vai của tôi')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('👁️'), new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'NIGHT', 'repost_night', 'all'))
            .setLabel('Kéo bảng đêm xuống')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('🔄'));
        return [row];
    }
    /**
     * Tạo nội dung phản hồi riêng tư (Ephemeral) khi người chơi bấm nút "Dùng kỹ năng đêm" tại kênh
     */
    static buildPlayerNightSkillResponse(game, player) {
        if (!player.isAlive) {
            return {
                content: '☠️ Bạn đã tử trận và không thể thực hiện hành động ban đêm.',
                components: [],
            };
        }
        const roleInfo = (0, roles_1.getRoleInfo)(player.roleId, game.customRoles);
        // 1. Phe Ma Sói (WEREWOLF, ALPHA_WOLF, DEMON_WOLF, BERSERK_WOLF, WOLF_SEER, WHITE_WOLF)
        if (player.faction === 'WEREWOLF') {
            const wolves = Array.from(game.players.values()).filter((p) => p.isAlive && p.faction === 'WEREWOLF');
            // SỬA: Sói trắng không lộ role và các sói chỉ ghi mỗi chữ sói khi làm đồng đội
            const wolfList = wolves
                .map((w) => {
                if (w.id === player.id) {
                    const myRole = (0, roles_1.getRoleInfo)(w.roleId, game.customRoles).name;
                    return w.isBot
                        ? `• 🤖 **${w.name}** *(Bot)* - 🐺 ${myRole} *(Bạn)*`
                        : `• <@${w.id}> (**${w.name}**) - 🐺 ${myRole} *(Bạn)*`;
                }
                else {
                    return w.isBot
                        ? `• 🤖 **${w.name}** *(Bot)* - 🐺 Sói`
                        : `• <@${w.id}> (**${w.name}**) - 🐺 Sói`;
                }
            })
                .join('\n');
            // Tình hình biểu quyết hiện tại của bầy Sói
            const voteTally = game.getWolfVoteTally();
            let tallySection = '';
            if (voteTally.size === 0) {
                tallySection = '📊 **Số phiếu biểu quyết hiện tại của bầy Sói:** *(Chưa có con sói nào bỏ phiếu)*';
            }
            else {
                const sorted = Array.from(voteTally.entries()).sort((a, b) => b[1] - a[1]);
                const lines = sorted.map(([tId, count]) => {
                    const tPlayer = game.players.get(tId);
                    const tName = tPlayer ? tPlayer.name : tId;
                    return `• 🎯 **${tName}**: **${count}** phiếu`;
                });
                tallySection = `📊 **Số phiếu biểu quyết hiện tại của bầy Sói:**\n${lines.join('\n')}`;
            }
            const existingVote = game.currentPhaseActions.find((a) => a.type === 'WOLF_VOTE' && a.userId === player.id);
            const votedTarget1 = existingVote?.targetId ? game.players.get(existingVote.targetId) : null;
            const votedTarget2 = existingVote?.secondaryTargetId ? game.players.get(existingVote.secondaryTargetId) : null;
            let statusVote = '';
            if (votedTarget1 && votedTarget2) {
                statusVote = `\n👉 **Bạn đang bỏ phiếu cắn:** **${votedTarget1.name}** và **${votedTarget2.name}**`;
            }
            else if (votedTarget1) {
                statusVote = `\n👉 **Bạn đang bỏ phiếu cắn:** **${votedTarget1.name}** (<@${votedTarget1.id}>)`;
            }
            const isAlphaActive = game.isAlphaWolfActive();
            const alphaInfo = isAlphaActive
                ? `\n👑 **SỨC MẠNH SÓI TRÙM KÍCH HOẠT:** Chưa có con sói nào chết! Bầy sói được cắn **2 người** đêm nay.\n`
                : '';
            const components = [];
            // Menu cắn của bầy sói
            const biteMenus = WerewolfComponents.buildWolfBiteMenu(game, player.id);
            components.push(...biteMenus);
            // Kỹ năng phụ riêng của từng loại sói
            if (player.roleId === 'WOLF_SEER') {
                if (wolves.length > 1) {
                    const wsMenus = WerewolfComponents.buildWolfSeerMenu(game, player.id);
                    components.push(...wsMenus);
                }
            }
            else if (player.roleId === 'WHITE_WOLF') {
                if (game.nightNumber >= 2 && game.nightNumber % 2 === 0) {
                    const wwMenus = WerewolfComponents.buildWhiteWolfMenu(game, player.id);
                    components.push(...wwMenus);
                }
            }
            const instructionText = isAlphaActive
                ? `Hãy chọn tối đa 2 mục tiêu cắn xé đêm nay:`
                : `Hãy chọn mục tiêu cắn xé đêm nay (người nhận nhiều phiếu cắn nhất sẽ bị xé xác):`;
            return {
                content: `🐺 **[BẦY MA SÓI - ĐÊM THỨ ${game.nightNumber}]**\n` +
                    `Đồng đội bầy đàn của bạn:\n${wolfList}\n` +
                    `${alphaInfo}` +
                    `${tallySection}\n` +
                    `${statusVote}\n\n` +
                    instructionText,
                components,
            };
        }
        // 2. Tiên tri (SEER)
        if (player.roleId === 'SEER') {
            const existingInv = game.currentPhaseActions.find((a) => a.type === 'SEER_INVESTIGATE' && a.userId === player.id);
            const target = existingInv?.targetId ? game.players.get(existingInv.targetId) : null;
            const statusText = target ? `\n👉 **Bạn đang chọn soi:** **${target.name}** (<@${target.id}>)\n` : '';
            return {
                content: `🔮 **[TIÊN TRI - ĐÊM THỨ ${game.nightNumber}]**${statusText}\n` +
                    `Hãy chọn một người chơi để soi xem họ có thuộc Phe Sói hay không (kết quả hiển thị khi bình minh):`,
                components: WerewolfComponents.buildSeerMenu(game, player.id),
            };
        }
        // 3. Bảo vệ (BODYGUARD)
        if (player.roleId === 'BODYGUARD') {
            const existingProt = game.currentPhaseActions.find((a) => a.type === 'BODYGUARD_PROTECT' && a.userId === player.id);
            const target = existingProt?.targetId ? game.players.get(existingProt.targetId) : null;
            const statusText = target ? `\n👉 **Bạn đang bảo vệ:** **${target.name}** (<@${target.id}>)\n` : '';
            return {
                content: `🛡️ **[BẢO VỆ - ĐÊM THỨ ${game.nightNumber}]**${statusText}\n` +
                    `Hãy chọn một người chơi để che chở khỏi nanh vuốt sói đêm nay:`,
                components: WerewolfComponents.buildBodyguardMenu(game, player),
            };
        }
        // 4. Bác sĩ (DOCTOR - Werewolf Online)
        if (player.roleId === 'DOCTOR') {
            const existingDoc = game.currentPhaseActions.find((a) => a.type === 'DOCTOR_PROTECT' && a.userId === player.id);
            const target = existingDoc?.targetId ? game.players.get(existingDoc.targetId) : null;
            const statusText = target ? `\n👉 **Bạn đang cứu chữa:** **${target.name}** (<@${target.id}>)\n` : '';
            return {
                content: `🩺 **[BÁC SĨ - ĐÊM THỨ ${game.nightNumber}]**${statusText}\n` +
                    `Hãy chọn một người chơi để cứu chữa/bảo vệ đêm nay (không thể cứu cùng một người 2 đêm liên tiếp):`,
                components: WerewolfComponents.buildDoctorMenu(game, player),
            };
        }
        // 5. Thám tử (DETECTIVE - Werewolf Online)
        if (player.roleId === 'DETECTIVE') {
            const existingDet = game.currentPhaseActions.find((a) => a.type === 'DETECTIVE_INVESTIGATE' && a.userId === player.id);
            let statusText = '';
            if (existingDet?.targetId && existingDet?.secondaryTargetId) {
                const p1 = game.players.get(existingDet.targetId);
                const p2 = game.players.get(existingDet.secondaryTargetId);
                if (p1 && p2) {
                    statusText = `\n👉 **Bạn đang chọn điều tra:** **${p1.name}** và **${p2.name}**\n`;
                }
            }
            return {
                content: `🔍 **[THÁM TỬ - ĐÊM THỨ ${game.nightNumber}]**${statusText}\n` +
                    `Hãy chọn đúng 2 người chơi để điều tra xem họ CÙNG PHE hay KHÁC PHE:`,
                components: WerewolfComponents.buildDetectiveMenu(game, player.id),
            };
        }
        // 6. Kẻ Sát Nhân (SERIAL_KILLER - Werewolf Online)
        if (player.roleId === 'SERIAL_KILLER') {
            const existingSk = game.currentPhaseActions.find((a) => a.type === 'SERIAL_KILLER_KILL' && a.userId === player.id);
            const target = existingSk?.targetId ? game.players.get(existingSk.targetId) : null;
            const statusText = target ? `\n👉 **Bạn đang nhắm hạ sát:** **${target.name}** (<@${target.id}>)\n` : '';
            return {
                content: `🔪 **[KẺ SÁT NHÂN - ĐÊM THỨ ${game.nightNumber}]**${statusText}\n` +
                    `Bạn được miễn nhiễm cắn đêm nay! Hãy chọn một nạn nhân để ra tay hạ sát:`,
                components: WerewolfComponents.buildSerialKillerMenu(game, player.id),
            };
        }
        // 7. Phù thủy (WITCH)
        if (player.roleId === 'WITCH') {
            const wolfVotes = game.currentPhaseActions.filter((a) => a.type === 'WOLF_VOTE');
            let predictedVictim = null;
            if (wolfVotes.length > 0) {
                const counts = {};
                for (const v of wolfVotes) {
                    if (v.targetId)
                        counts[v.targetId] = (counts[v.targetId] || 0) + 1;
                }
                let maxV = 0;
                let topId = null;
                for (const [tid, cnt] of Object.entries(counts)) {
                    if (cnt > maxV) {
                        maxV = cnt;
                        topId = tid;
                    }
                }
                if (topId)
                    predictedVictim = game.players.get(topId) || null;
            }
            const controls = WerewolfComponents.buildWitchControls(game, player, predictedVictim);
            return {
                content: `🧪 **[PHÙ THỦY - ĐÊM THỨ ${game.nightNumber}]**\n` +
                    `Bình cứu còn lại: **${player.skills.witchHealRemaining}** | Bình độc còn lại: **${player.skills.witchPoisonRemaining}**\n` +
                    (predictedVictim ? `🩸 Nạn nhân bị Sói cắn đêm nay: **${predictedVictim.name}** (<@${predictedVictim.id}>)` : `🕊️ Chưa thấy ai bị sói cắn hoặc sói chưa bỏ phiếu.`),
                components: controls,
            };
        }
        // 8. Thần tình yêu (CUPID)
        if (player.roleId === 'CUPID') {
            if (game.nightNumber === 1) {
                return {
                    content: '💘 **[THẦN TÌNH YÊU - ĐÊM 1]** Hãy chọn đúng 2 người chơi để kết đôi thành Cặp đôi trong ván này:',
                    components: WerewolfComponents.buildCupidMenu(game, player.id),
                };
            }
            return {
                content: '💘 **[THẦN TÌNH YÊU]** Bạn chỉ thức dậy se duyên vào Đêm 1. Đêm nay hãy ngủ ngon nhé!',
                components: [],
            };
        }
        // 9. Các vai không có kỹ năng ban đêm
        return {
            content: `🌾 **[${roleInfo.name.toUpperCase()}]**\n` +
                `Bạn không có kỹ năng hành động trong ban đêm. Hãy ngủ say giấc, giữ im lặng và chờ đón bình minh nhé!`,
            components: [],
        };
    }
    /**
     * Bộ nút điều khiển tại Kênh thảo luận ban ngày (Xạ thủ nổ súng & xem kết quả soi)
     */
    static buildDiscussionControls(game) {
        const hasGunner = Array.from(game.players.values()).some((p) => p.isAlive && p.roleId === 'GUNNER' && (p.skills.gunnerBulletsRemaining ?? 0) > 0);
        const row = new discord_js_1.ActionRowBuilder();
        if (hasGunner) {
            row.addComponents(new discord_js_1.ButtonBuilder()
                .setCustomId((0, types_1.buildCustomId)(game.id, 'DISCUSSION', 'gunner_shoot_btn', 'all'))
                .setLabel('🔫 Xạ thủ nổ súng')
                .setStyle(discord_js_1.ButtonStyle.Danger));
        }
        row.addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'DISCUSSION', 'view_investigation_result', 'all'))
            .setLabel('🔍 Kết quả soi đêm qua')
            .setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'DISCUSSION', 'view_my_role', 'all'))
            .setLabel('🎭 Xem vai của tôi')
            .setStyle(discord_js_1.ButtonStyle.Secondary));
        return [row];
    }
    /**
     * Bộ nút điều khiển tại Kênh bình minh (Bắn súng thợ săn & xem kết quả soi)
     */
    static buildDawnControls(game, result) {
        const row = new discord_js_1.ActionRowBuilder();
        if (result.hunterTriggeredId) {
            row.addComponents(new discord_js_1.ButtonBuilder()
                .setCustomId((0, types_1.buildCustomId)(game.id, 'HUNTER', 'hunter_shoot_btn', 'all'))
                .setLabel('🎯 Thợ săn nổ súng trả thù')
                .setStyle(discord_js_1.ButtonStyle.Danger)
                .setEmoji('🎯'));
        }
        row.addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'DAWN', 'view_investigation_result', 'all'))
            .setLabel('🔍 Xem kết quả soi đêm qua')
            .setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'DAWN', 'view_my_role', 'all'))
            .setLabel('🎭 Xem vai của tôi')
            .setStyle(discord_js_1.ButtonStyle.Secondary));
        return [row];
    }
    /**
     * Bộ nút điều khiển sau khi chốt treo cổ (Thợ săn bị treo nổ súng trả thù)
     */
    static buildResolutionControls(game, result) {
        if (!result.hunterTriggeredId)
            return [];
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId((0, types_1.buildCustomId)(game.id, 'HUNTER', 'hunter_shoot_btn', 'all'))
            .setLabel('🎯 Thợ săn nổ súng trả thù')
            .setStyle(discord_js_1.ButtonStyle.Danger)
            .setEmoji('🎯'));
        return [row];
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
