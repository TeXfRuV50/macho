"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InteractionHandler = void 0;
const game_1 = require("../engine/game");
const game_session_1 = require("./game-session");
const types_1 = require("./types");
const commands_1 = require("./commands");
const embeds_1 = require("./embeds");
const components_1 = require("./components");
const config_ui_1 = require("./config-ui");
const presets_1 = require("../engine/presets");
const custom_roles_1 = require("../engine/custom-roles");
const roles_1 = require("../engine/roles");
class InteractionHandler {
    activeSessions = new Map(); // channelId -> GameSession
    db;
    dmManager;
    customRoleRegistry;
    constructor(db, dmManager) {
        this.db = db;
        this.dmManager = dmManager;
        this.customRoleRegistry = new custom_roles_1.CustomRoleRegistry();
    }
    registerSession(session) {
        this.activeSessions.set(session.game.channelId, session);
    }
    getSession(channelId) {
        return this.activeSessions.get(channelId);
    }
    removeSession(channelId) {
        this.activeSessions.delete(channelId);
    }
    /**
     * Trả lời tương tác an toàn, tránh lỗi 10062 (Unknown interaction) và không làm sập bot
     */
    async safeReply(interaction, options) {
        try {
            if (!interaction || typeof interaction.reply !== 'function')
                return;
            if (interaction.deferred) {
                await interaction.editReply(options);
            }
            else if (!interaction.replied) {
                await interaction.reply(options);
            }
            else {
                await interaction.followUp(options);
            }
        }
        catch (err) {
            // 10062: Unknown interaction (hết hạn >3s do mạng lag)
            // 40060: Interaction has already been acknowledged
            if (err?.code === 10062 || err?.code === 40060) {
                return;
            }
            console.warn('[SafeReply Warning]:', err?.message || err);
        }
    }
    /**
     * Bộ điều phối xử lý tương tác chính của Discord
     */
    async handleInteraction(interaction) {
        try {
            if (interaction.isChatInputCommand()) {
                await this.handleChatInput(interaction);
            }
            else if (interaction.isButton()) {
                await this.handleButton(interaction);
            }
            else if (interaction.isStringSelectMenu()) {
                await this.handleStringSelect(interaction);
            }
            else if (interaction.isModalSubmit()) {
                await this.handleModal(interaction);
            }
        }
        catch (err) {
            console.error('[InteractionHandler] Lỗi xử lý:', err);
            if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: `❌ Đã xảy ra lỗi khi xử lý tương tác: ${err?.message || 'Lỗi hệ thống'}`,
                        ephemeral: true,
                    });
                }
                catch {
                    // Bỏ qua nếu interaction không còn hợp lệ
                }
            }
        }
    }
    // ==========================================
    // SLASH COMMANDS
    // ==========================================
    async handleChatInput(interaction) {
        const { commandName, channelId, guildId, user } = interaction;
        if (!channelId || !guildId) {
            await interaction.reply({ content: 'Lệnh này chỉ dùng trong kênh văn bản của máy chủ.', ephemeral: true });
            return;
        }
        const currentSession = this.activeSessions.get(channelId);
        // 1. /help
        if (commandName === 'help') {
            await interaction.reply({ embeds: [embeds_1.WerewolfEmbeds.buildHelpEmbed()], ephemeral: true });
            return;
        }
        // 2. /roles
        if (commandName === 'roles') {
            await interaction.reply({
                embeds: [embeds_1.WerewolfEmbeds.buildRolesCatalogEmbed(currentSession?.game.customRoles)],
                ephemeral: true,
            });
            return;
        }
        // 3. /start
        if (commandName === 'start') {
            if (currentSession && currentSession.game.phase === 'LOBBY') {
                if (currentSession.game.hostId !== user.id) {
                    await interaction.reply({
                        content: '⚠️ Chỉ chủ phòng mới có quyền bắt đầu ván đấu.',
                        ephemeral: true,
                    });
                    return;
                }
                if (currentSession.game.players.size < 4) {
                    await interaction.reply({
                        content: `Cần tối thiểu 4 người chơi để bắt đầu trận Ma Sói. Hiện tại đang có ${currentSession.game.players.size} người.`,
                        ephemeral: true,
                    });
                    return;
                }
                await interaction.deferReply({ ephemeral: true });
                const res = await currentSession.start();
                await interaction.editReply({ content: res.message });
                return;
            }
            if (currentSession && currentSession.game.phase !== 'FINISHED' && currentSession.game.phase !== 'CANCELLED') {
                await interaction.reply({
                    content: '⚠️ Đang có một ván đấu khác hoạt động trong kênh này! Hãy kết thúc ván cũ trước.',
                    ephemeral: true,
                });
                return;
            }
            const gameId = `ww-${Date.now().toString(36)}`;
            const game = new game_1.WerewolfGame(gameId, guildId, channelId, user.id);
            const session = new game_session_1.GameSession(game, this.db, this.dmManager, interaction.client);
            this.activeSessions.set(channelId, session);
            // Thêm chủ phòng vào danh sách người chơi
            game.addPlayer(user.id, user.displayName || user.username);
            // Parse danh sách mentions nếu có: /start players:"@An @Binh"
            const playersInput = interaction.options.getString('players');
            if (playersInput) {
                const userIds = (0, commands_1.parseMentionIds)(playersInput);
                for (const uid of userIds) {
                    if (uid === user.id)
                        continue;
                    try {
                        const member = await interaction.guild?.members.fetch(uid);
                        if (member && !member.user.bot) {
                            game.addPlayer(uid, member.displayName || member.user.username);
                        }
                    }
                    catch {
                        // Bỏ qua nếu không fetch được
                    }
                }
            }
            this.db.saveGame(game);
            const embed = embeds_1.WerewolfEmbeds.buildLobbyEmbed(game);
            const controls = components_1.WerewolfComponents.buildLobbyControls(game);
            const replyMsg = await interaction.reply({
                embeds: [embed],
                components: controls,
                withResponse: true,
            });
            session.mainMessageId = replyMsg.resource?.message?.id || replyMsg.id;
            return;
        }
        // 4. /role (Xem vai bí mật của bản thân)
        if (commandName === 'role') {
            if (!currentSession || currentSession.game.phase === 'LOBBY') {
                await interaction.reply({ content: 'Ván đấu chưa bắt đầu hoặc chưa chia vai!', ephemeral: true });
                return;
            }
            const player = currentSession.game.players.get(user.id);
            if (!player) {
                await interaction.reply({ content: 'Bạn không tham gia ván đấu này.', ephemeral: true });
                return;
            }
            const roleInfo = (0, roles_1.getRoleInfo)(player.roleId, currentSession.game.customRoles);
            const partner = player.loverId ? currentSession.game.players.get(player.loverId) : undefined;
            const roleEmbed = embeds_1.WerewolfEmbeds.buildPrivateRoleEmbed(player, roleInfo, partner);
            await interaction.reply({ embeds: [roleEmbed], ephemeral: true });
            return;
        }
        // 4b. /action hoặc /skill (Thực hiện kỹ năng bí mật)
        if (commandName === 'action' || commandName === 'skill') {
            if (!currentSession || currentSession.game.phase === 'LOBBY' || currentSession.game.phase === 'FINISHED') {
                await interaction.reply({ content: 'Hiện không trong giai đoạn có thể sử dụng kỹ năng.', ephemeral: true });
                return;
            }
            const player = currentSession.game.players.get(user.id);
            if (!player) {
                await interaction.reply({ content: 'Bạn không tham gia ván đấu này.', ephemeral: true });
                return;
            }
            if (currentSession.game.phase === 'NIGHT') {
                const skillResp = components_1.WerewolfComponents.buildPlayerNightSkillResponse(currentSession.game, player);
                await interaction.reply({ ...skillResp, ephemeral: true });
                return;
            }
            if (currentSession.game.phase === 'DISCUSSION' && player.roleId === 'GUNNER' && (player.skills.gunnerBulletsRemaining ?? 0) > 0) {
                const gunnerMenus = components_1.WerewolfComponents.buildGunnerMenu(currentSession.game, player);
                await interaction.reply({
                    content: `🔫 **[XẠ THỦ]** Bạn còn **${player.skills.gunnerBulletsRemaining}** viên đạn bạc. Hãy chọn người để bắn hạ:`,
                    components: gunnerMenus,
                    ephemeral: true,
                });
                return;
            }
            const roleInfo = (0, roles_1.getRoleInfo)(player.roleId, currentSession.game.customRoles);
            const partner = player.loverId ? currentSession.game.players.get(player.loverId) : undefined;
            const roleEmbed = embeds_1.WerewolfEmbeds.buildPrivateRoleEmbed(player, roleInfo, partner);
            await interaction.reply({
                content: 'Hiện không phải thời điểm dùng kỹ năng riêng. Dưới đây là thông tin vai trò của bạn:',
                embeds: [roleEmbed],
                ephemeral: true,
            });
            return;
        }
        // 5. /status
        if (commandName === 'status') {
            if (!currentSession) {
                await interaction.reply({ content: 'Hiện không có ván đấu nào trong kênh này.', ephemeral: true });
                return;
            }
            await interaction.reply({ embeds: [embeds_1.WerewolfEmbeds.buildStatusEmbed(currentSession.game)], ephemeral: true });
            return;
        }
        // 5b. /vote (Kéo bảng biểu quyết treo cổ xuống cuối kênh)
        if (commandName === 'vote') {
            if (!currentSession) {
                await interaction.reply({ content: 'Hiện không có ván đấu nào trong kênh này.', ephemeral: true });
                return;
            }
            if (currentSession.game.phase !== 'VOTING') {
                await interaction.reply({
                    content: `Hiện không phải thời gian biểu quyết treo cổ (Pha hiện tại: **${currentSession.game.phase}**).`,
                    ephemeral: true,
                });
                return;
            }
            await currentSession.repostVotingMessage();
            await interaction.reply({ content: '✅ Đã kéo bảng biểu quyết treo cổ xuống cuối kênh!', ephemeral: true });
            return;
        }
        // 6. /add
        if (commandName === 'add') {
            if (!currentSession || currentSession.game.phase !== 'LOBBY') {
                await interaction.reply({ content: 'Chỉ có thể thêm người chơi khi đang ở Sảnh chờ (Lobby).', ephemeral: true });
                return;
            }
            if (currentSession.game.hostId !== user.id) {
                await interaction.reply({ content: 'Chỉ chủ phòng mới có quyền thêm người chơi.', ephemeral: true });
                return;
            }
            const targetUser = interaction.options.getUser('user', true);
            if (targetUser.bot) {
                await interaction.reply({
                    content: 'Không thể thêm tài khoản bot Discord vào ván chơi. Để thêm bot ảo AI chơi cùng, bạn hãy dùng lệnh `/addbot`, `/fillbots` hoặc bấm nút **"+1 Bot"** / **"Điền đủ Bot"** trên bảng sảnh chờ!',
                    ephemeral: true,
                });
                return;
            }
            const res = currentSession.game.addPlayer(targetUser.id, targetUser.displayName || targetUser.username);
            if (!res.success) {
                await interaction.reply({ content: res.message, ephemeral: true });
                return;
            }
            this.db.saveGame(currentSession.game);
            await currentSession.updateMainMessage({
                embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(currentSession.game)],
                components: components_1.WerewolfComponents.buildLobbyControls(currentSession.game),
            });
            await interaction.reply({ content: `✅ Đã thêm <@${targetUser.id}> vào sảnh chờ!`, ephemeral: true });
            return;
        }
        // 6b. /addbot
        if (commandName === 'addbot') {
            if (!currentSession || currentSession.game.phase !== 'LOBBY') {
                await interaction.reply({ content: 'Chỉ có thể thêm bot khi đang ở Sảnh chờ (Lobby).', ephemeral: true });
                return;
            }
            if (currentSession.game.hostId !== user.id) {
                await interaction.reply({ content: 'Chỉ chủ phòng mới có quyền thêm bot.', ephemeral: true });
                return;
            }
            const count = interaction.options.getInteger('count') || 1;
            let added = 0;
            for (let i = 0; i < count; i++) {
                const res = currentSession.game.addBotPlayer();
                if (res.success) {
                    added++;
                }
                else {
                    break;
                }
            }
            if (added === 0) {
                await interaction.reply({ content: '❌ Không thể thêm bot (sảnh chờ đã đầy tối đa 25 người).', ephemeral: true });
                return;
            }
            this.db.saveGame(currentSession.game);
            await currentSession.updateMainMessage({
                embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(currentSession.game)],
                components: components_1.WerewolfComponents.buildLobbyControls(currentSession.game),
            });
            await interaction.reply({
                content: `🤖 Đã thêm **${added}** bot vào sảnh chờ! Tổng số người chơi hiện tại: **${currentSession.game.players.size}**.`,
                ephemeral: true,
            });
            return;
        }
        // 6c. /fillbots
        if (commandName === 'fillbots') {
            if (!currentSession || currentSession.game.phase !== 'LOBBY') {
                await interaction.reply({ content: 'Chỉ có thể điền bot khi đang ở Sảnh chờ (Lobby).', ephemeral: true });
                return;
            }
            if (currentSession.game.hostId !== user.id) {
                await interaction.reply({ content: 'Chỉ chủ phòng mới có quyền điền bot.', ephemeral: true });
                return;
            }
            const target = interaction.options.getInteger('target') || undefined;
            const res = currentSession.game.fillBots(target);
            this.db.saveGame(currentSession.game);
            await currentSession.updateMainMessage({
                embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(currentSession.game)],
                components: components_1.WerewolfComponents.buildLobbyControls(currentSession.game),
            });
            await interaction.reply({ content: `⚡ ${res.message}`, ephemeral: true });
            return;
        }
        // 6d. /clearbots
        if (commandName === 'clearbots') {
            if (!currentSession || currentSession.game.phase !== 'LOBBY') {
                await interaction.reply({ content: 'Chỉ có thể xóa bot khi đang ở Sảnh chờ (Lobby).', ephemeral: true });
                return;
            }
            if (currentSession.game.hostId !== user.id) {
                await interaction.reply({ content: 'Chỉ chủ phòng mới có quyền xóa bot.', ephemeral: true });
                return;
            }
            const res = currentSession.game.clearBots();
            this.db.saveGame(currentSession.game);
            await currentSession.updateMainMessage({
                embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(currentSession.game)],
                components: components_1.WerewolfComponents.buildLobbyControls(currentSession.game),
            });
            await interaction.reply({ content: `🧹 ${res.message}`, ephemeral: true });
            return;
        }
        // 6e. /bot [add|fill|remove|clear]
        if (commandName === 'bot') {
            if (!currentSession || currentSession.game.phase !== 'LOBBY') {
                await interaction.reply({ content: 'Chỉ có thể quản lý bot khi đang ở Sảnh chờ (Lobby).', ephemeral: true });
                return;
            }
            if (currentSession.game.hostId !== user.id) {
                await interaction.reply({ content: 'Chỉ chủ phòng mới có quyền điều chỉnh bot.', ephemeral: true });
                return;
            }
            const sub = interaction.options.getSubcommand();
            if (sub === 'add') {
                const count = interaction.options.getInteger('count') || 1;
                let added = 0;
                for (let i = 0; i < count; i++) {
                    const res = currentSession.game.addBotPlayer();
                    if (res.success)
                        added++;
                    else
                        break;
                }
                this.db.saveGame(currentSession.game);
                await currentSession.updateMainMessage({
                    embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(currentSession.game)],
                    components: components_1.WerewolfComponents.buildLobbyControls(currentSession.game),
                });
                await interaction.reply({ content: `🤖 Đã thêm **${added}** bot vào sảnh chờ!`, ephemeral: true });
            }
            else if (sub === 'fill') {
                const target = interaction.options.getInteger('target') || undefined;
                const res = currentSession.game.fillBots(target);
                this.db.saveGame(currentSession.game);
                await currentSession.updateMainMessage({
                    embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(currentSession.game)],
                    components: components_1.WerewolfComponents.buildLobbyControls(currentSession.game),
                });
                await interaction.reply({ content: `⚡ ${res.message}`, ephemeral: true });
            }
            else if (sub === 'remove') {
                const res = currentSession.game.removeBotPlayer();
                this.db.saveGame(currentSession.game);
                await currentSession.updateMainMessage({
                    embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(currentSession.game)],
                    components: components_1.WerewolfComponents.buildLobbyControls(currentSession.game),
                });
                await interaction.reply({ content: res.success ? `🗑️ ${res.message}` : `❌ ${res.message}`, ephemeral: true });
            }
            else if (sub === 'clear') {
                const res = currentSession.game.clearBots();
                this.db.saveGame(currentSession.game);
                await currentSession.updateMainMessage({
                    embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(currentSession.game)],
                    components: components_1.WerewolfComponents.buildLobbyControls(currentSession.game),
                });
                await interaction.reply({ content: `🧹 ${res.message}`, ephemeral: true });
            }
            return;
        }
        // 7. /remove
        if (commandName === 'remove') {
            if (!currentSession || currentSession.game.phase !== 'LOBBY') {
                await interaction.reply({ content: 'Chỉ có thể xóa người chơi khi đang ở Sảnh chờ.', ephemeral: true });
                return;
            }
            if (currentSession.game.hostId !== user.id) {
                await interaction.reply({ content: 'Chỉ chủ phòng mới có quyền xóa người chơi.', ephemeral: true });
                return;
            }
            const targetUser = interaction.options.getUser('user', true);
            const res = currentSession.game.removePlayer(targetUser.id);
            if (!res.success) {
                await interaction.reply({ content: res.message, ephemeral: true });
                return;
            }
            this.db.saveGame(currentSession.game);
            await currentSession.updateMainMessage({
                embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(currentSession.game)],
            });
            await interaction.reply({ content: `✅ Đã xóa <@${targetUser.id}> khỏi sảnh chờ.`, ephemeral: true });
            return;
        }
        // 8. /custom
        if (commandName === 'custom') {
            if (!currentSession) {
                await interaction.reply({ content: 'Không có ván đấu nào trong kênh này.', ephemeral: true });
                return;
            }
            if (currentSession.game.hostId !== user.id) {
                await interaction.reply({ content: 'Chỉ chủ phòng mới có quyền điều chỉnh cấu hình.', ephemeral: true });
                return;
            }
            const embed = config_ui_1.ConfigUi.buildRoleTableEmbed(currentSession.game.config, currentSession.game.customRoles, currentSession.game.players.size, 0);
            const controls = config_ui_1.ConfigUi.buildRoleTableControls(currentSession.game.id, currentSession.game.hostId, currentSession.game.config, currentSession.game.customRoles, 0);
            await interaction.reply({ embeds: [embed], components: controls, ephemeral: true });
            return;
        }
        // 8b. /addallroles
        if (commandName === 'addallroles') {
            if (!currentSession) {
                await interaction.reply({ content: 'Không có ván đấu nào trong kênh này.', ephemeral: true });
                return;
            }
            if (currentSession.game.hostId !== user.id) {
                await interaction.reply({ content: 'Chỉ chủ phòng mới có quyền điều chỉnh vai trò.', ephemeral: true });
                return;
            }
            for (const roleId of config_ui_1.ORDERED_CONFIG_ROLES) {
                currentSession.game.config.roles[roleId] = Math.max(1, currentSession.game.config.roles[roleId] || 1);
            }
            if (currentSession.game.customRoles) {
                for (const customId of Object.keys(currentSession.game.customRoles)) {
                    currentSession.game.config.roles[customId] = Math.max(1, currentSession.game.config.roles[customId] || 1);
                }
            }
            this.db.saveGame(currentSession.game);
            if (currentSession.game.phase === 'LOBBY') {
                await currentSession.updateMainMessage({
                    embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(currentSession.game)],
                    components: components_1.WerewolfComponents.buildLobbyControls(currentSession.game),
                });
            }
            await interaction.reply({
                content: '⚡ **Đã thêm tất cả các vai trò vào ván đấu!** (Mỗi vai 1 vị trí)',
                ephemeral: true,
            });
            return;
        }
        // 9. /pause, /resume, /stop
        if (commandName === 'pause' || commandName === 'resume' || commandName === 'stop') {
            if (!currentSession) {
                await interaction.reply({ content: 'Không có ván đấu nào đang hoạt động.', ephemeral: true });
                return;
            }
            const isHost = currentSession.game.hostId === user.id;
            const isAdmin = interaction.member?.permissions.has('ManageChannels') || false;
            if (!isHost && !isAdmin) {
                await interaction.reply({ content: 'Bạn phải là Chủ phòng hoặc Quản trị viên để thực hiện lệnh này.', ephemeral: true });
                return;
            }
            if (commandName === 'pause') {
                const res = currentSession.game.pause();
                this.db.saveGame(currentSession.game);
                currentSession.clearPhaseTimer();
                await interaction.reply({ content: `⏸️ ${res.message}` });
            }
            else if (commandName === 'resume') {
                const res = currentSession.game.resume();
                this.db.saveGame(currentSession.game);
                await interaction.reply({ content: `▶️ ${res.message}` });
                await currentSession.advanceToNight();
            }
            else if (commandName === 'stop') {
                const confirmRow = components_1.WerewolfComponents.buildStopConfirmation(currentSession.game.id, currentSession.game.hostId);
                await interaction.reply({
                    content: '⚠️ Bạn có chắc chắn muốn DỪNG và HỦY BỎ ván đấu này không?',
                    components: [confirmRow],
                    ephemeral: true,
                });
            }
            return;
        }
        // 10. /preset [save|load|list]
        if (commandName === 'preset') {
            const sub = interaction.options.getSubcommand();
            if (sub === 'list') {
                const guildPresets = this.db.getGuildPresets(guildId);
                let listText = '**Bộ cấu hình có sẵn:**\n• `basic`: ' + presets_1.BUILTIN_PRESETS.basic.description + '\n• `advanced`: ' + presets_1.BUILTIN_PRESETS.advanced.description;
                if (guildPresets.length > 0) {
                    listText += '\n\n**Bộ cấu hình của máy chủ:**\n' + guildPresets.map((p) => `• \`${p.name}\`: ${p.description}`).join('\n');
                }
                await interaction.reply({ content: listText, ephemeral: true });
                return;
            }
            if (!currentSession) {
                await interaction.reply({ content: 'Cần có sảnh chờ trong kênh để thực hiện thao tác preset.', ephemeral: true });
                return;
            }
            if (currentSession.game.hostId !== user.id) {
                await interaction.reply({ content: 'Chỉ chủ phòng mới có thể lưu/tải preset.', ephemeral: true });
                return;
            }
            if (sub === 'save') {
                const totalRoles = Object.values(currentSession.game.config.roles).reduce((a, b) => a + b, 0);
                if (totalRoles < 4) {
                    await interaction.reply({
                        content: `Cần tối thiểu 4 người chơi để lưu cấu hình Ma Sói. Cấu hình hiện tại chỉ có ${totalRoles} vai.`,
                        ephemeral: true,
                    });
                    return;
                }
                const name = interaction.options.getString('name', true);
                const desc = interaction.options.getString('description') || 'Preset tùy chỉnh';
                this.db.savePreset(guildId, name, desc, currentSession.game.config, user.id);
                await interaction.reply({ content: `💾 Đã lưu preset **${name}** thành công cho máy chủ!`, ephemeral: true });
            }
            else if (sub === 'load') {
                const name = interaction.options.getString('name', true).toLowerCase();
                let loadedConfig = presets_1.BUILTIN_PRESETS[name]?.config;
                if (!loadedConfig) {
                    const customPreset = this.db.getPreset(guildId, name);
                    if (customPreset)
                        loadedConfig = customPreset.config;
                }
                if (!loadedConfig) {
                    await interaction.reply({ content: `❌ Không tìm thấy preset nào có tên \`${name}\`.`, ephemeral: true });
                    return;
                }
                currentSession.game.setConfig(loadedConfig);
                this.db.saveGame(currentSession.game);
                await currentSession.updateMainMessage({
                    embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(currentSession.game)],
                });
                await interaction.reply({ content: `✅ Đã áp dụng preset **${name}** cho sảnh chờ!`, ephemeral: true });
            }
            return;
        }
    }
    // ==========================================
    // BUTTON HANDLER
    // ==========================================
    async handleButton(interaction) {
        const parsed = (0, types_1.parseCustomId)(interaction.customId);
        if (!parsed)
            return;
        const { gameId, phase, action, targetUserId } = parsed;
        const session = Array.from(this.activeSessions.values()).find((s) => s.game.id === gameId);
        if (!session) {
            await this.safeReply(interaction, { content: 'Ván đấu không còn tồn tại hoặc đã kết thúc.', ephemeral: true });
            return;
        }
        // Kiểm tra quyền hạn của người bấm
        if (targetUserId !== 'all') {
            if (targetUserId === 'host' && session.game.hostId !== interaction.user.id) {
                await this.safeReply(interaction, { content: 'Chỉ chủ phòng mới được dùng nút này.', ephemeral: true });
                return;
            }
            else if (targetUserId !== 'host' && targetUserId !== interaction.user.id) {
                await this.safeReply(interaction, { content: 'Đây là nút riêng dành cho người chơi khác.', ephemeral: true });
                return;
            }
        }
        // Kiểm tra pha tương tác hợp lệ
        if (phase !== 'CONFIG' && phase !== session.game.phase && action !== 'confirm_stop' && action !== 'cancel_stop') {
            await this.safeReply(interaction, { content: 'Thao tác đã quá hạn hoặc không thuộc pha hiện tại.', ephemeral: true });
            return;
        }
        // Xử lý các action nút bấm
        if (action === 'join') {
            const res = session.game.addPlayer(interaction.user.id, interaction.member?.displayName || interaction.user.username);
            if (!res.success) {
                await this.safeReply(interaction, { content: res.message, ephemeral: true });
                return;
            }
            await this.safeReply(interaction, { content: `✅ Bạn đã tham gia vào sảnh chờ!`, ephemeral: true });
            this.db.saveGame(session.game);
            await session.updateMainMessage({
                embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(session.game)],
                components: components_1.WerewolfComponents.buildLobbyControls(session.game),
            });
        }
        else if (action === 'leave') {
            const res = session.game.removePlayer(interaction.user.id);
            if (!res.success) {
                await this.safeReply(interaction, { content: res.message, ephemeral: true });
                return;
            }
            await this.safeReply(interaction, { content: `🚪 Bạn đã rời khỏi sảnh chờ.`, ephemeral: true });
            this.db.saveGame(session.game);
            await session.updateMainMessage({
                embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(session.game)],
                components: components_1.WerewolfComponents.buildLobbyControls(session.game),
            });
        }
        else if (action === 'add_bot') {
            const res = session.game.addBotPlayer();
            if (!res.success) {
                await this.safeReply(interaction, { content: res.message, ephemeral: true });
                return;
            }
            await this.safeReply(interaction, { content: `🤖 ${res.message} (Tổng cộng: **${session.game.players.size}** người)`, ephemeral: true });
            this.db.saveGame(session.game);
            await session.updateMainMessage({
                embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(session.game)],
                components: components_1.WerewolfComponents.buildLobbyControls(session.game),
            });
        }
        else if (action === 'fill_bots') {
            const res = session.game.fillBots();
            await this.safeReply(interaction, { content: `⚡ ${res.message}`, ephemeral: true });
            this.db.saveGame(session.game);
            await session.updateMainMessage({
                embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(session.game)],
                components: components_1.WerewolfComponents.buildLobbyControls(session.game),
            });
        }
        else if (action === 'clear_bots') {
            const res = session.game.clearBots();
            await this.safeReply(interaction, { content: `🧹 ${res.message}`, ephemeral: true });
            this.db.saveGame(session.game);
            await session.updateMainMessage({
                embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(session.game)],
                components: components_1.WerewolfComponents.buildLobbyControls(session.game),
            });
        }
        else if (action === 'start') {
            if (session.game.players.size < 4) {
                await this.safeReply(interaction, {
                    content: `Cần tối thiểu 4 người chơi để bắt đầu trận Ma Sói. Hiện tại đang có ${session.game.players.size} người.`,
                    ephemeral: true,
                });
                return;
            }
            try {
                await interaction.deferReply({ ephemeral: true });
            }
            catch (err) {
                if (err?.code !== 10062)
                    throw err;
                return;
            }
            const res = await session.start();
            await this.safeReply(interaction, { content: res.message });
        }
        else if (action === 'confirm_role' || action === 'confirm_role_channel') {
            await this.safeReply(interaction, { content: '✅ Đã xác nhận vai thành công!', ephemeral: true });
            await session.handleRoleConfirm(interaction.user.id);
        }
        else if (action === 'view_my_role' || action === 'view_my_role_channel') {
            const player = session.game.players.get(interaction.user.id);
            if (!player) {
                await this.safeReply(interaction, { content: 'Bạn không tham gia ván đấu này.', ephemeral: true });
                return;
            }
            const roleInfo = (0, roles_1.getRoleInfo)(player.roleId, session.game.customRoles);
            const partner = player.loverId ? session.game.players.get(player.loverId) : undefined;
            const roleEmbed = embeds_1.WerewolfEmbeds.buildPrivateRoleEmbed(player, roleInfo, partner);
            await this.safeReply(interaction, { embeds: [roleEmbed], ephemeral: true });
        }
        else if (action === 'use_night_skill') {
            if (session.game.phase !== 'NIGHT') {
                await this.safeReply(interaction, { content: 'Hiện không phải thời gian ban đêm.', ephemeral: true });
                return;
            }
            const player = session.game.players.get(interaction.user.id);
            if (!player) {
                await this.safeReply(interaction, { content: 'Bạn không tham gia ván đấu này.', ephemeral: true });
                return;
            }
            const skillResp = components_1.WerewolfComponents.buildPlayerNightSkillResponse(session.game, player);
            await this.safeReply(interaction, { ...skillResp, ephemeral: true });
        }
        else if (action === 'repost_night') {
            if (session.game.phase !== 'NIGHT') {
                await this.safeReply(interaction, { content: 'Hiện không trong giai đoạn ban đêm.', ephemeral: true });
                return;
            }
            await this.safeReply(interaction, { content: '✅ Đã kéo bảng đêm xuống cuối kênh!', ephemeral: true });
            await session.repostNightMessage();
        }
        else if (action === 'gunner_shoot_btn') {
            if (session.game.phase !== 'DISCUSSION') {
                await this.safeReply(interaction, { content: 'Xạ thủ chỉ có thể nổ súng trong giờ thảo luận ban ngày.', ephemeral: true });
                return;
            }
            const player = session.game.players.get(interaction.user.id);
            if (!player || player.roleId !== 'GUNNER' || !player.isAlive || (player.skills.gunnerBulletsRemaining ?? 0) <= 0) {
                await this.safeReply(interaction, { content: '❌ Bạn không phải là Xạ thủ hoặc bạn đã sử dụng hết đạn bạc!', ephemeral: true });
                return;
            }
            const gunnerMenus = components_1.WerewolfComponents.buildGunnerMenu(session.game, player);
            await this.safeReply(interaction, {
                content: `🔫 **[XẠ THỦ]** Bạn đang có **${player.skills.gunnerBulletsRemaining}** viên đạn bạc. Hãy chọn người chơi để nổ súng bắn hạ:`,
                components: gunnerMenus,
                ephemeral: true,
            });
        }
        else if (action === 'hunter_shoot_btn') {
            if (session.game.pendingHunterId !== interaction.user.id) {
                await this.safeReply(interaction, { content: '❌ Bạn không phải là Thợ săn đang cần nổ súng trả thù.', ephemeral: true });
                return;
            }
            const hunterMenus = components_1.WerewolfComponents.buildHunterShotMenu(session.game, interaction.user.id);
            await this.safeReply(interaction, {
                content: '🎯 **[PHÁT SÚNG THỢ SĂN]** Hãy chọn một người chơi để nổ súng trả thù:',
                components: hunterMenus,
                ephemeral: true,
            });
        }
        else if (action === 'view_investigation_result') {
            const player = session.game.players.get(interaction.user.id);
            if (!player) {
                await this.safeReply(interaction, { content: 'Bạn không tham gia ván đấu này.', ephemeral: true });
                return;
            }
            if (player.roleId === 'SEER') {
                const invAction = session.game.actions.filter((a) => a.type === 'SEER_INVESTIGATE' && a.userId === player.id).pop();
                if (invAction && invAction.targetId) {
                    const target = session.game.players.get(invAction.targetId);
                    const isWolf = target?.faction === 'WEREWOLF' || session.game.customRoles[target?.roleId || '']?.seenAsWolfBySeer;
                    const resultText = isWolf
                        ? `🐺 **Mục tiêu <@${target?.id}> (${target?.name}) THUỘC PHE MA SÓI!**`
                        : `🌾 **Mục tiêu <@${target?.id}> (${target?.name}) KHÔNG PHẢI là Ma Sói!**`;
                    await this.safeReply(interaction, { content: `🔮 **[KẾT QUẢ SOI ĐÊM ${invAction.nightNumber}]**\n${resultText}`, ephemeral: true });
                    return;
                }
            }
            else if (player.roleId === 'DETECTIVE') {
                const detAction = session.game.actions.filter((a) => a.type === 'DETECTIVE_INVESTIGATE' && a.userId === player.id).pop();
                if (detAction && detAction.targetId && detAction.secondaryTargetId) {
                    const p1 = session.game.players.get(detAction.targetId);
                    const p2 = session.game.players.get(detAction.secondaryTargetId);
                    if (p1 && p2) {
                        const same = p1.faction === p2.faction;
                        const resultText = same
                            ? `⚖️ **${p1.name}** và **${p2.name}** thuộc **CÙNG MỘT PHE**!`
                            : `⚡ **${p1.name}** và **${p2.name}** thuộc **HAI PHE KHÁC NHAU**!`;
                        await this.safeReply(interaction, { content: `🔍 **[KẾT QUẢ ĐIỀU TRA ĐÊM ${detAction.nightNumber}]**\n${resultText}`, ephemeral: true });
                        return;
                    }
                }
            }
            else if (player.roleId === 'WOLF_SEER') {
                const wsAction = session.game.actions.filter((a) => a.type === 'WOLF_SEER_INVESTIGATE' && a.userId === player.id).pop();
                if (wsAction && wsAction.targetId) {
                    const target = session.game.players.get(wsAction.targetId);
                    if (target) {
                        const role = (0, roles_1.getRoleInfo)(target.roleId, session.game.customRoles);
                        await this.safeReply(interaction, {
                            content: `👁️ **[KẾT QUẢ SOI VAI ĐÊM ${wsAction.nightNumber}]**\nMục tiêu **<@${target.id}> (${target.name})** chính là vai: **${role.name}** (${role.faction === 'WEREWOLF' ? 'Phe Sói' : role.faction === 'VILLAGE' ? 'Phe Dân' : 'Phe Độc lập'})!`,
                            ephemeral: true,
                        });
                        return;
                    }
                }
            }
            await this.safeReply(interaction, { content: 'Bạn không có thông tin điều tra nào từ đêm qua.', ephemeral: true });
        }
        else if (action === 'skip_vote') {
            const res = session.game.submitAction({
                userId: interaction.user.id,
                roleId: session.game.players.get(interaction.user.id)?.roleId || 'VILLAGER',
                type: 'DAY_VOTE_SKIP',
                nightNumber: session.game.nightNumber,
                phase: 'VOTING',
            });
            await this.safeReply(interaction, {
                content: res.success ? '🏳️ Bạn đã chọn bỏ phiếu trắng (Bỏ qua treo cổ)!' : res.message,
                ephemeral: true,
            });
            if (res.success) {
                this.db.saveGame(session.game);
                await session.updateMainMessage({
                    embeds: [embeds_1.WerewolfEmbeds.buildVotingEmbed(session.game)],
                    components: components_1.WerewolfComponents.buildVotingControls(session.game),
                });
                // Tự động chuyển pha sớm nếu tất cả cử tri đã bỏ phiếu xong
                const aliveVoters = Array.from(session.game.players.values()).filter((p) => p.isAlive && p.canVote);
                const votes = session.game.currentPhaseActions.filter((a) => a.type === 'DAY_VOTE' || a.type === 'DAY_VOTE_SKIP');
                const votedUserIds = new Set(votes.map((v) => v.userId));
                if (votedUserIds.size >= aliveVoters.length) {
                    session.clearPhaseTimer();
                    setTimeout(() => {
                        session.advanceToResolution();
                    }, 2000);
                }
            }
        }
        else if (action === 'repost_vote') {
            if (session.game.phase !== 'VOTING') {
                await this.safeReply(interaction, { content: 'Hiện không trong giai đoạn bỏ phiếu treo cổ.', ephemeral: true });
                return;
            }
            await this.safeReply(interaction, { content: '✅ Đã kéo bảng biểu quyết treo cổ xuống cuối kênh!', ephemeral: true });
            await session.repostVotingMessage();
        }
        else if (action === 'witch_heal') {
            const res = session.game.submitAction({
                userId: interaction.user.id,
                roleId: 'WITCH',
                type: 'WITCH_HEAL',
                nightNumber: session.game.nightNumber,
                phase: 'NIGHT',
            });
            await this.safeReply(interaction, { content: res.message, ephemeral: true });
        }
        else if (action === 'witch_pass') {
            const res = session.game.submitAction({
                userId: interaction.user.id,
                roleId: 'WITCH',
                type: 'WITCH_PASS',
                nightNumber: session.game.nightNumber,
                phase: 'NIGHT',
            });
            await this.safeReply(interaction, { content: 'Đã bỏ qua không dùng thuốc đêm nay.', ephemeral: true });
        }
        else if (action === 'preset_basic') {
            const balanced = (0, presets_1.balancePresetForPlayerCount)(presets_1.BUILTIN_PRESETS.basic.config, session.game.players.size);
            session.game.setConfig(balanced);
            await this.safeReply(interaction, { content: '✅ Đã áp dụng Preset Cơ bản và cân bằng số Dân làng!', ephemeral: true });
            this.db.saveGame(session.game);
            await session.updateMainMessage({ embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(session.game)] });
        }
        else if (action === 'preset_advanced') {
            const balanced = (0, presets_1.balancePresetForPlayerCount)(presets_1.BUILTIN_PRESETS.advanced.config, session.game.players.size);
            session.game.setConfig(balanced);
            await this.safeReply(interaction, { content: '✅ Đã áp dụng Preset Nâng cao và cân bằng số Dân làng!', ephemeral: true });
            this.db.saveGame(session.game);
            await session.updateMainMessage({ embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(session.game)] });
        }
        else if (action === 'preset_wolvesville') {
            const balanced = (0, presets_1.balancePresetForPlayerCount)(presets_1.BUILTIN_PRESETS.wolvesville.config, session.game.players.size);
            session.game.setConfig(balanced);
            await this.safeReply(interaction, { content: '✅ Đã áp dụng Preset Wolvesville (Werewolf Online) và cân bằng số Dân làng!', ephemeral: true });
            this.db.saveGame(session.game);
            await session.updateMainMessage({ embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(session.game)] });
        }
        else if (action === 'stop_prompt') {
            const confirmRow = components_1.WerewolfComponents.buildStopConfirmation(session.game.id, session.game.hostId);
            await this.safeReply(interaction, {
                content: '⚠️ Bạn có chắc chắn muốn HỦY BỎ ván đấu này?',
                components: [confirmRow],
                ephemeral: true,
            });
        }
        else if (action === 'confirm_stop') {
            await this.safeReply(interaction, { content: '🛑 Đã dừng và hủy bỏ trận đấu.', ephemeral: true });
            await session.cancelGame('Chủ phòng xác nhận dừng');
            this.activeSessions.delete(session.game.channelId);
        }
        else if (action === 'cancel_stop') {
            await this.safeReply(interaction, { content: 'Đã hủy thao tác dừng.', ephemeral: true });
        }
        else if (action === 'custom_menu' || action === 'open_role_table') {
            const embed = config_ui_1.ConfigUi.buildRoleTableEmbed(session.game.config, session.game.customRoles, session.game.players.size, 0);
            const controls = config_ui_1.ConfigUi.buildRoleTableControls(session.game.id, session.game.hostId, session.game.config, session.game.customRoles, 0);
            if (interaction.replied || interaction.deferred) {
                try {
                    await interaction.followUp({ embeds: [embed], components: controls, ephemeral: true });
                }
                catch { }
            }
            else {
                await this.safeReply(interaction, { embeds: [embed], components: controls, ephemeral: true });
            }
        }
        else if (action === 'role_inc') {
            const [roleId, pageStr] = (parsed.extra || '').split(':');
            const page = parseInt(pageStr || '0', 10);
            if (roleId) {
                session.game.config.roles[roleId] = Math.min(25, (session.game.config.roles[roleId] || 0) + 1);
                this.db.saveGame(session.game);
                await session.updateMainMessage({ embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(session.game)] });
                const embed = config_ui_1.ConfigUi.buildRoleTableEmbed(session.game.config, session.game.customRoles, session.game.players.size, page);
                const controls = config_ui_1.ConfigUi.buildRoleTableControls(session.game.id, session.game.hostId, session.game.config, session.game.customRoles, page);
                try {
                    await interaction.update({ embeds: [embed], components: controls });
                }
                catch (err) {
                    if (err?.code !== 10062)
                        console.warn('[RoleInc Warning]:', err?.message);
                }
            }
        }
        else if (action === 'role_dec') {
            const [roleId, pageStr] = (parsed.extra || '').split(':');
            const page = parseInt(pageStr || '0', 10);
            if (roleId) {
                session.game.config.roles[roleId] = Math.max(0, (session.game.config.roles[roleId] || 0) - 1);
                this.db.saveGame(session.game);
                await session.updateMainMessage({ embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(session.game)] });
                const embed = config_ui_1.ConfigUi.buildRoleTableEmbed(session.game.config, session.game.customRoles, session.game.players.size, page);
                const controls = config_ui_1.ConfigUi.buildRoleTableControls(session.game.id, session.game.hostId, session.game.config, session.game.customRoles, page);
                try {
                    await interaction.update({ embeds: [embed], components: controls });
                }
                catch (err) {
                    if (err?.code !== 10062)
                        console.warn('[RoleDec Warning]:', err?.message);
                }
            }
        }
        else if (action === 'role_page') {
            const page = parseInt(parsed.extra || '0', 10);
            const embed = config_ui_1.ConfigUi.buildRoleTableEmbed(session.game.config, session.game.customRoles, session.game.players.size, page);
            const controls = config_ui_1.ConfigUi.buildRoleTableControls(session.game.id, session.game.hostId, session.game.config, session.game.customRoles, page);
            try {
                await interaction.update({ embeds: [embed], components: controls });
            }
            catch (err) {
                if (err?.code !== 10062)
                    console.warn('[RolePage Warning]:', err?.message);
            }
        }
        else if (action === 'auto_balance_table') {
            const page = parseInt(parsed.extra || '0', 10);
            const balanced = (0, presets_1.balancePresetForPlayerCount)(session.game.config, session.game.players.size);
            session.game.setConfig(balanced);
            this.db.saveGame(session.game);
            await session.updateMainMessage({
                embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(session.game)],
                components: components_1.WerewolfComponents.buildLobbyControls(session.game),
            });
            const embed = config_ui_1.ConfigUi.buildRoleTableEmbed(session.game.config, session.game.customRoles, session.game.players.size, page);
            const controls = config_ui_1.ConfigUi.buildRoleTableControls(session.game.id, session.game.hostId, session.game.config, session.game.customRoles, page);
            try {
                await interaction.update({ embeds: [embed], components: controls });
            }
            catch (err) {
                if (err?.code !== 10062)
                    console.warn('[AutoBalanceTable Warning]:', err?.message);
            }
        }
        else if (action === 'add_all_roles') {
            if (interaction.user.id !== session.game.hostId) {
                await this.safeReply(interaction, {
                    content: '❌ Chỉ chủ phòng mới có quyền điều chỉnh vai trò!',
                    ephemeral: true,
                });
                return;
            }
            for (const roleId of config_ui_1.ORDERED_CONFIG_ROLES) {
                session.game.config.roles[roleId] = Math.max(1, session.game.config.roles[roleId] || 1);
            }
            if (session.game.customRoles) {
                for (const customId of Object.keys(session.game.customRoles)) {
                    session.game.config.roles[customId] = Math.max(1, session.game.config.roles[customId] || 1);
                }
            }
            this.db.saveGame(session.game);
            if (session.game.phase === 'LOBBY') {
                await session.updateMainMessage({
                    embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(session.game)],
                    components: components_1.WerewolfComponents.buildLobbyControls(session.game),
                });
            }
            if (parsed.phase === 'LOBBY') {
                await this.safeReply(interaction, {
                    content: '⚡ **Đã thêm tất cả các vai trò vào ván đấu!** (Mỗi vai 1 vị trí)',
                    ephemeral: true,
                });
            }
            else {
                const page = parseInt(parsed.extra || '0', 10);
                const embed = config_ui_1.ConfigUi.buildRoleTableEmbed(session.game.config, session.game.customRoles, session.game.players.size, page);
                const controls = config_ui_1.ConfigUi.buildRoleTableControls(session.game.id, session.game.hostId, session.game.config, session.game.customRoles, page);
                try {
                    await interaction.update({ embeds: [embed], components: controls });
                }
                catch {
                    await this.safeReply(interaction, {
                        content: '⚡ **Đã thêm tất cả các vai trò vào ván đấu!**',
                        ephemeral: true,
                    });
                }
            }
        }
        else if (action === 'main_config_menu') {
            const embed = config_ui_1.ConfigUi.buildConfigSummaryEmbed(session.game.config, session.game.players.size);
            const controls = config_ui_1.ConfigUi.buildConfigControls(session.game.id, session.game.hostId);
            try {
                await interaction.update({ embeds: [embed], components: controls });
            }
            catch (err) {
                if (err?.code !== 10062)
                    console.warn('[MainConfigMenu Warning]:', err?.message);
            }
        }
        else if (action === 'auto_balance') {
            if (session.game.players.size < 4) {
                await this.safeReply(interaction, {
                    content: `Cần tối thiểu 4 người chơi để bắt đầu trận Ma Sói. Hiện tại đang có ${session.game.players.size} người.`,
                    ephemeral: true,
                });
                return;
            }
            const balanced = (0, presets_1.balancePresetForPlayerCount)(session.game.config, session.game.players.size);
            session.game.setConfig(balanced);
            this.db.saveGame(session.game);
            await session.updateMainMessage({
                embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(session.game)],
                components: components_1.WerewolfComponents.buildLobbyControls(session.game),
            });
            const embed = config_ui_1.ConfigUi.buildConfigSummaryEmbed(session.game.config, session.game.players.size);
            await interaction.update({ embeds: [embed] });
        }
        else if (action === 'toggle_reveal_role') {
            session.game.config.rules.revealRoleOnDeath = !session.game.config.rules.revealRoleOnDeath;
            this.db.saveGame(session.game);
            const embed = config_ui_1.ConfigUi.buildConfigSummaryEmbed(session.game.config, session.game.players.size);
            await interaction.update({ embeds: [embed] });
        }
        else if (action === 'open_timer_modal') {
            const modal = config_ui_1.ConfigUi.buildTimerModal(session.game.id);
            await interaction.showModal(modal);
        }
        else if (action === 'open_custom_role_modal') {
            const modal = config_ui_1.ConfigUi.buildCustomRoleModal(session.game.id);
            await interaction.showModal(modal);
        }
    }
    // ==========================================
    // SELECT MENU HANDLER
    // ==========================================
    async handleStringSelect(interaction) {
        const parsed = (0, types_1.parseCustomId)(interaction.customId);
        if (!parsed)
            return;
        const { gameId, action, targetUserId } = parsed;
        const session = Array.from(this.activeSessions.values()).find((s) => s.game.id === gameId);
        if (!session) {
            await this.safeReply(interaction, { content: 'Ván đấu không còn tồn tại.', ephemeral: true });
            return;
        }
        if (targetUserId !== 'all' && targetUserId !== interaction.user.id) {
            await this.safeReply(interaction, { content: 'Bạn không có quyền thực hiện menu này.', ephemeral: true });
            return;
        }
        const selectedValue = interaction.values[0];
        if (action === 'seer_target') {
            const res = session.game.submitAction({
                userId: interaction.user.id,
                roleId: 'SEER',
                type: 'SEER_INVESTIGATE',
                targetId: selectedValue,
                nightNumber: session.game.nightNumber,
                phase: 'NIGHT',
            });
            await this.safeReply(interaction, {
                content: res.success ? `🔮 Bạn đã chọn soi <@${selectedValue}>. Kết quả sẽ nhận được lúc bình minh!` : res.message,
                ephemeral: true,
            });
        }
        else if (action === 'doctor_target') {
            const res = session.game.submitAction({
                userId: interaction.user.id,
                roleId: 'DOCTOR',
                type: 'DOCTOR_PROTECT',
                targetId: selectedValue,
                nightNumber: session.game.nightNumber,
                phase: 'NIGHT',
            });
            await this.safeReply(interaction, {
                content: res.success ? `🩺 Bạn đã chọn bảo vệ <@${selectedValue}> đêm nay!` : res.message,
                ephemeral: true,
            });
        }
        else if (action === 'detective_pair') {
            if (interaction.values.length < 2) {
                await this.safeReply(interaction, { content: 'Phải chọn đúng 2 người chơi.', ephemeral: true });
                return;
            }
            const [p1, p2] = interaction.values;
            const res = session.game.submitAction({
                userId: interaction.user.id,
                roleId: 'DETECTIVE',
                type: 'DETECTIVE_INVESTIGATE',
                targetId: p1,
                secondaryTargetId: p2,
                nightNumber: session.game.nightNumber,
                phase: 'NIGHT',
            });
            await this.safeReply(interaction, {
                content: res.success ? `🔍 Bạn đã chọn điều tra <@${p1}> và <@${p2}>! Kết quả sẽ có khi trời sáng.` : res.message,
                ephemeral: true,
            });
        }
        else if (action === 'wolf_seer_target') {
            const res = session.game.submitAction({
                userId: interaction.user.id,
                roleId: 'WOLF_SEER',
                type: 'WOLF_SEER_INVESTIGATE',
                targetId: selectedValue,
                nightNumber: session.game.nightNumber,
                phase: 'NIGHT',
            });
            await this.safeReply(interaction, {
                content: res.success ? `👁️ Bạn đã chọn soi vai của <@${selectedValue}>! Kết quả sẽ nhận được lúc bình minh.` : res.message,
                ephemeral: true,
            });
        }
        else if (action === 'serial_killer_target') {
            const res = session.game.submitAction({
                userId: interaction.user.id,
                roleId: 'SERIAL_KILLER',
                type: 'SERIAL_KILLER_KILL',
                targetId: selectedValue,
                nightNumber: session.game.nightNumber,
                phase: 'NIGHT',
            });
            await this.safeReply(interaction, {
                content: res.success ? `🔪 Bạn đã nhắm mục tiêu <@${selectedValue}> để hạ sát đêm nay!` : res.message,
                ephemeral: true,
            });
        }
        else if (action === 'gunner_target') {
            const res = session.game.submitAction({
                userId: interaction.user.id,
                roleId: 'GUNNER',
                type: 'GUNNER_SHOOT',
                targetId: selectedValue,
                nightNumber: session.game.nightNumber,
                phase: 'DISCUSSION',
            });
            await this.safeReply(interaction, {
                content: res.message,
                ephemeral: true,
            });
            if (res.success) {
                this.db.saveGame(session.game);
                const targetPlayer = session.game.players.get(selectedValue);
                const channel = await session.getChannel();
                if (channel && targetPlayer) {
                    await channel.send(`💥 **[TIẾNG SÚNG VANG RỀN]** Xạ thủ <@${interaction.user.id}> đã nổ súng bắn hạ **${targetPlayer.name}** (<@${targetPlayer.id}>)!`);
                }
                await session.syncDeadPlayersChatPermissions();
                await session.updateMainMessage({
                    embeds: [embeds_1.WerewolfEmbeds.buildDiscussionEmbed(session.game)],
                });
                const winCheck = session.game.checkWinCondition();
                if (winCheck.winner !== 'NONE') {
                    await session.finishGame(winCheck);
                }
            }
        }
        else if (action === 'bg_target') {
            const res = session.game.submitAction({
                userId: interaction.user.id,
                roleId: 'BODYGUARD',
                type: 'BODYGUARD_PROTECT',
                targetId: selectedValue,
                nightNumber: session.game.nightNumber,
                phase: 'NIGHT',
            });
            await this.safeReply(interaction, {
                content: res.success ? `🛡️ Bạn đã bảo vệ <@${selectedValue}> đêm nay!` : res.message,
                ephemeral: true,
            });
        }
        else if (action === 'wolf_vote_target') {
            const selectedValues = interaction.values;
            const targetId1 = selectedValues[0];
            const targetId2 = selectedValues.length > 1 ? selectedValues[1] : undefined;
            const res = session.game.submitAction({
                userId: interaction.user.id,
                roleId: 'WEREWOLF',
                type: 'WOLF_VOTE',
                targetId: targetId1,
                secondaryTargetId: targetId2,
                nightNumber: session.game.nightNumber,
                phase: 'NIGHT',
            });
            if (!res.success) {
                await this.safeReply(interaction, {
                    content: `❌ ${res.message}`,
                    ephemeral: true,
                });
                return;
            }
            const player = session.game.players.get(interaction.user.id);
            if (player) {
                const updatedResponse = components_1.WerewolfComponents.buildPlayerNightSkillResponse(session.game, player);
                try {
                    if (interaction.isMessageComponent()) {
                        await interaction.update({
                            content: `✅ **Đã ghi nhận phiếu cắn của bạn!**\n\n${updatedResponse.content}`,
                            components: updatedResponse.components,
                        });
                        return;
                    }
                }
                catch {
                    // Fallback if update fails
                }
                await this.safeReply(interaction, {
                    content: `✅ **Đã ghi nhận phiếu cắn của bạn!**\n\n${updatedResponse.content}`,
                    components: updatedResponse.components,
                    ephemeral: true,
                });
            }
            else {
                await this.safeReply(interaction, {
                    content: `🩸 Bạn đã bỏ phiếu cắn thành công!`,
                    ephemeral: true,
                });
            }
        }
        else if (action === 'witch_poison_target') {
            const res = session.game.submitAction({
                userId: interaction.user.id,
                roleId: 'WITCH',
                type: 'WITCH_POISON',
                targetId: selectedValue,
                nightNumber: session.game.nightNumber,
                phase: 'NIGHT',
            });
            await this.safeReply(interaction, {
                content: res.success ? `☠️ Bạn đã đầu độc <@${selectedValue}>!` : res.message,
                ephemeral: true,
            });
        }
        else if (action === 'white_wolf_target') {
            const res = session.game.submitAction({
                userId: interaction.user.id,
                roleId: 'WHITE_WOLF',
                type: 'WHITE_WOLF_KILL',
                targetId: selectedValue,
                nightNumber: session.game.nightNumber,
                phase: 'NIGHT',
            });
            await this.safeReply(interaction, {
                content: res.success ? `🐺 Bạn đã bí mật ra tay tiêu diệt <@${selectedValue}>!` : res.message,
                ephemeral: true,
            });
        }
        else if (action === 'cupid_pair') {
            if (interaction.values.length < 2) {
                await this.safeReply(interaction, { content: 'Phải chọn đúng 2 người chơi.', ephemeral: true });
                return;
            }
            const [p1, p2] = interaction.values;
            const res = session.game.submitAction({
                userId: interaction.user.id,
                roleId: 'CUPID',
                type: 'CUPID_LINK',
                targetId: p1,
                secondaryTargetId: p2,
                nightNumber: 1,
                phase: 'NIGHT',
            });
            await this.safeReply(interaction, {
                content: res.success ? `💘 Bạn đã se duyên cho <@${p1}> và <@${p2}>!` : res.message,
                ephemeral: true,
            });
        }
        else if (action === 'cast_vote') {
            const res = session.game.submitAction({
                userId: interaction.user.id,
                roleId: session.game.players.get(interaction.user.id)?.roleId || 'VILLAGER',
                type: 'DAY_VOTE',
                targetId: selectedValue,
                nightNumber: session.game.nightNumber,
                phase: 'VOTING',
            });
            await this.safeReply(interaction, {
                content: res.success ? `⚖️ Bạn đã bỏ phiếu biểu quyết treo cổ <@${selectedValue}>!` : res.message,
                ephemeral: true,
            });
            if (res.success) {
                this.db.saveGame(session.game);
                await session.updateMainMessage({
                    embeds: [embeds_1.WerewolfEmbeds.buildVotingEmbed(session.game)],
                    components: components_1.WerewolfComponents.buildVotingControls(session.game),
                });
                // Tự động chuyển pha sớm nếu tất cả cử tri đã bỏ phiếu xong
                const aliveVoters = Array.from(session.game.players.values()).filter((p) => p.isAlive && p.canVote);
                const votes = session.game.currentPhaseActions.filter((a) => a.type === 'DAY_VOTE' || a.type === 'DAY_VOTE_SKIP');
                const votedUserIds = new Set(votes.map((v) => v.userId));
                if (votedUserIds.size >= aliveVoters.length) {
                    session.clearPhaseTimer();
                    setTimeout(() => {
                        session.advanceToResolution();
                    }, 2000);
                }
            }
        }
        else if (action === 'shot_target') {
            const res = session.game.handleHunterShot(selectedValue);
            await this.safeReply(interaction, {
                content: res.success ? `🎯 Phát súng săn trúng đích! <@${selectedValue}> đã tử trận.` : res.message,
                ephemeral: true,
            });
            if (res.success) {
                this.db.saveGame(session.game);
                const hunter = session.game.players.get(interaction.user.id);
                const target = session.game.players.get(selectedValue);
                const channel = await session.getChannel();
                if (channel && hunter && target) {
                    await channel.send(`🎯 **[PHÁT SÚNG THỢ SĂN]** Thợ săn **${hunter.name}** trước khi trút hơi thở cuối cùng đã nổ súng bắn gục **${target.name}** (<@${target.id}>)!`);
                }
                await session.syncDeadPlayersChatPermissions();
                const winCheck = session.game.checkWinCondition();
                if (winCheck.winner !== 'NONE') {
                    await session.finishGame(winCheck);
                }
            }
        }
        else if (action === 'select_role_to_edit') {
            // Tăng hoặc chuyển số lượng vai
            const current = session.game.config.roles[selectedValue] || 0;
            session.game.config.roles[selectedValue] = current + 1;
            this.db.saveGame(session.game);
            await session.updateMainMessage({ embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(session.game)] });
            const embed = config_ui_1.ConfigUi.buildConfigSummaryEmbed(session.game.config, session.game.players.size);
            try {
                await interaction.update({ embeds: [embed] });
            }
            catch (err) {
                if (err?.code !== 10062)
                    console.warn('[SelectRole Warning]:', err?.message);
            }
        }
    }
    // ==========================================
    // MODAL HANDLER
    // ==========================================
    async handleModal(interaction) {
        const customId = interaction.customId;
        if (customId.startsWith('modal:timer:')) {
            const gameId = customId.split(':')[2];
            const session = Array.from(this.activeSessions.values()).find((s) => s.game.id === gameId);
            if (!session) {
                await this.safeReply(interaction, { content: 'Không tìm thấy ván đấu.', ephemeral: true });
                return;
            }
            const nightSec = parseInt(interaction.fields.getTextInputValue('night_sec'), 10) || 45;
            const discSec = parseInt(interaction.fields.getTextInputValue('discussion_sec'), 10) || 90;
            const voteSec = parseInt(interaction.fields.getTextInputValue('voting_sec'), 10) || 40;
            session.game.config.timers.nightSec = Math.max(15, Math.min(300, nightSec));
            session.game.config.timers.discussionSec = Math.max(20, Math.min(300, discSec));
            session.game.config.timers.votingSec = Math.max(15, Math.min(180, voteSec));
            this.db.saveGame(session.game);
            await this.safeReply(interaction, { content: '⏱️ Đã cập nhật thời gian các pha!', ephemeral: true });
            await session.updateMainMessage({ embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(session.game)] });
        }
        else if (customId.startsWith('modal:custom_role:')) {
            const gameId = customId.split(':')[2];
            const session = Array.from(this.activeSessions.values()).find((s) => s.game.id === gameId);
            if (!session) {
                await this.safeReply(interaction, { content: 'Không tìm thấy ván đấu.', ephemeral: true });
                return;
            }
            const roleId = interaction.fields.getTextInputValue('role_id').trim().toUpperCase();
            const roleName = interaction.fields.getTextInputValue('role_name').trim();
            const roleDesc = interaction.fields.getTextInputValue('role_desc').trim();
            const skillType = interaction.fields.getTextInputValue('role_skill').trim().toUpperCase();
            const faction = interaction.fields.getTextInputValue('role_faction').trim().toUpperCase();
            const regResult = this.customRoleRegistry.registerRole({
                id: roleId,
                name: roleName,
                description: roleDesc,
                faction: ['VILLAGE', 'WEREWOLF', 'SOLO'].includes(faction) ? faction : 'VILLAGE',
                skillType: ['INVESTIGATE', 'PROTECT', 'KILL', 'NONE'].includes(skillType) ? skillType : 'NONE',
                skillUsesPerGame: 0,
                activeNights: 'ALL',
                targetCondition: 'OTHER_ALIVE',
                seenAsWolfBySeer: faction === 'WEREWOLF',
            });
            if (!regResult.success || !regResult.role) {
                await this.safeReply(interaction, { content: `❌ ${regResult.error}`, ephemeral: true });
                return;
            }
            const roleInfo = this.customRoleRegistry.toRoleInfo(regResult.role);
            session.game.customRoles[roleId] = roleInfo;
            session.game.config.roles[roleId] = 1;
            this.db.saveGame(session.game);
            await this.safeReply(interaction, {
                content: `✨ Đã thêm vai mới **${roleName}** (${roleId}) vào cấu hình ván!`,
                ephemeral: true,
            });
            await session.updateMainMessage({ embeds: [embeds_1.WerewolfEmbeds.buildLobbyEmbed(session.game)] });
        }
    }
    /**
     * Giám sát tin nhắn chat trong kênh ván chơi:
     * 1. Chặn người chết chat trong kênh đang chơi
     * 2. Chặn chat ban đêm để làng giữ im lặng
     */
    async handleMessage(message) {
        if (!message || message.author?.bot)
            return;
        const session = this.activeSessions.get(message.channelId);
        if (!session)
            return;
        const game = session.game;
        // Chỉ kiểm soát khi trận đấu đang thực sự diễn ra
        if (game.phase === 'LOBBY' || game.phase === 'FINISHED' || game.phase === 'CANCELLED') {
            return;
        }
        // 1. Kiểm tra nếu người gửi là người chơi đã chết
        const player = game.players.get(message.author.id);
        if (player && !player.isAlive) {
            try {
                if (typeof message.delete === 'function') {
                    await message.delete();
                }
            }
            catch { }
            try {
                if (message.channel && typeof message.channel.send === 'function') {
                    const warn = await message.channel.send({
                        content: `👻 <@${message.author.id}>, bạn đã tử trận nên không thể nhắn tin trong kênh này cho đến khi ván kết thúc!`,
                    });
                    setTimeout(() => {
                        if (warn && typeof warn.delete === 'function') {
                            warn.delete().catch(() => { });
                        }
                    }, 5000);
                }
            }
            catch { }
            return;
        }
        // 2. Kiểm tra nếu đang là ban đêm (NIGHT)
        if (game.phase === 'NIGHT') {
            try {
                if (typeof message.delete === 'function') {
                    await message.delete();
                }
            }
            catch { }
            try {
                if (message.channel && typeof message.channel.send === 'function') {
                    const warn = await message.channel.send({
                        content: `🤫 <@${message.author.id}>, trời đang là ban đêm! Cả làng đang ngủ say, vui lòng giữ im lặng!`,
                    });
                    setTimeout(() => {
                        if (warn && typeof warn.delete === 'function') {
                            warn.delete().catch(() => { });
                        }
                    }, 4000);
                }
            }
            catch { }
            return;
        }
    }
}
exports.InteractionHandler = InteractionHandler;
