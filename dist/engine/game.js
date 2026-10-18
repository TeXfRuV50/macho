"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WerewolfGame = void 0;
const presets_1 = require("./presets");
const night_resolver_1 = require("./night-resolver");
const roles_1 = require("./roles");
class WerewolfGame {
    id;
    guildId;
    channelId;
    hostId;
    phase = 'LOBBY';
    dayNumber = 0;
    nightNumber = 0;
    phaseDeadline = 0;
    config;
    customRoles = {};
    players = new Map();
    actions = [];
    currentPhaseActions = [];
    // Trạng thái theo dõi hiệu ứng đặc biệt
    activeBerserkPierce = false;
    nextNightBerserkPierce = false;
    pendingHunterId = null;
    hasRevotedToday = false;
    lastDawnResult = null;
    lastLynchResult = null;
    logs = [];
    constructor(id, guildId, channelId, hostId, customConfig) {
        this.id = id;
        this.guildId = guildId;
        this.channelId = channelId;
        this.hostId = hostId;
        this.config = customConfig ? JSON.parse(JSON.stringify(customConfig)) : JSON.parse(JSON.stringify(presets_1.DEFAULT_CONFIG));
    }
    // ==========================================
    // LOBBY MANAGEMENT
    // ==========================================
    addPlayer(userId, name) {
        if (this.phase !== 'LOBBY') {
            return { success: false, message: 'Trận đấu đã bắt đầu hoặc đã kết thúc, không thể tham gia.' };
        }
        if (this.players.has(userId)) {
            return { success: false, message: 'Bạn đã có tên trong phòng chờ rồi.' };
        }
        const player = {
            id: userId,
            name,
            roleId: 'VILLAGER',
            originalRoleId: 'VILLAGER',
            faction: 'VILLAGE',
            isAlive: true,
            canVote: true,
            skills: {
                witchHealRemaining: 1,
                witchPoisonRemaining: 1,
                demonWolfInfectRemaining: 1,
                lastProtectedTargetId: null,
                hasUsedHunterShot: false,
                idiotRevealed: false,
            },
            hasConfirmedRole: false,
            joinedAt: Date.now(),
        };
        this.players.set(userId, player);
        if (this.players.size >= 4) {
            this.config = (0, presets_1.balancePresetForPlayerCount)(this.config, this.players.size);
        }
        this.log(`Người chơi ${name} đã tham gia sảnh chờ.`);
        return { success: true, message: `Người chơi ${name} đã tham gia.` };
    }
    removePlayer(userId) {
        if (this.phase !== 'LOBBY') {
            return { success: false, message: 'Trận đấu đang diễn ra, không thể xóa người chơi.' };
        }
        if (!this.players.has(userId)) {
            return { success: false, message: 'Người chơi này không có trong phòng.' };
        }
        const p = this.players.get(userId);
        this.players.delete(userId);
        if (this.players.size >= 4) {
            this.config = (0, presets_1.balancePresetForPlayerCount)(this.config, this.players.size);
        }
        this.log(`Người chơi ${p.name} đã rời sảnh chờ.`);
        return { success: true, message: `Đã xóa ${p.name} khỏi sảnh chờ.` };
    }
    setConfig(newConfig) {
        if (this.phase !== 'LOBBY') {
            return { success: false, message: 'Trận đấu đã bắt đầu, đội hình và luật đã bị KHÓA!' };
        }
        const totalRoles = Object.values(newConfig.roles).reduce((a, b) => a + Math.max(0, b), 0);
        if (totalRoles < 4) {
            return {
                success: false,
                message: `Cần tối thiểu 4 người chơi để lưu hoặc áp dụng cấu hình Ma Sói. Cấu hình hiện tại chỉ có ${totalRoles} vai.`,
            };
        }
        this.config = JSON.parse(JSON.stringify(newConfig));
        return { success: true, message: 'Đã cập nhật cấu hình phòng.' };
    }
    // ==========================================
    // START GAME & ROLE DISTRIBUTION
    // ==========================================
    startGame() {
        if (this.phase !== 'LOBBY') {
            return { success: false, message: 'Ván đấu không ở trạng thái sảnh chờ.' };
        }
        const playerCount = this.players.size;
        if (playerCount < 4) {
            return {
                success: false,
                message: `Cần tối thiểu 4 người chơi để bắt đầu trận Ma Sói. Hiện tại đang có ${playerCount} người.`,
            };
        }
        // Tự động cân bằng số lượng Dân làng cho vừa khớp với số người chơi trong phòng
        let specialRolesCount = 0;
        for (const [roleId, count] of Object.entries(this.config.roles)) {
            if (roleId !== 'VILLAGER') {
                specialRolesCount += Math.max(0, count);
            }
        }
        if (specialRolesCount > playerCount) {
            return {
                success: false,
                message: `Cấu hình chưa hợp lệ:\n- Số lượng vai đặc biệt (${specialRolesCount}) vượt quá số người chơi trong phòng (${playerCount}). Vui lòng vào /custom để giảm bớt vai đặc biệt hoặc thêm người chơi.`,
            };
        }
        this.config = (0, presets_1.balancePresetForPlayerCount)(this.config, playerCount);
        const validation = (0, presets_1.validateGameConfig)(this.config, playerCount);
        if (!validation.valid) {
            return { success: false, message: `Cấu hình chưa hợp lệ:\n- ${validation.errors.join('\n- ')}` };
        }
        // Xáo trộn và phân vai
        const rolePool = [];
        for (const [roleId, count] of Object.entries(this.config.roles)) {
            for (let i = 0; i < count; i++) {
                rolePool.push(roleId);
            }
        }
        // Fisher-Yates Shuffle
        for (let i = rolePool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rolePool[i], rolePool[j]] = [rolePool[j], rolePool[i]];
        }
        let idx = 0;
        for (const player of this.players.values()) {
            const assignedRoleId = rolePool[idx++];
            player.roleId = assignedRoleId;
            player.originalRoleId = assignedRoleId;
            const roleInfo = (0, roles_1.getRoleInfo)(assignedRoleId, this.customRoles);
            player.faction = roleInfo.faction;
            player.isAlive = true;
            player.canVote = true;
            player.hasConfirmedRole = false;
            // Khởi tạo kỹ năng
            player.skills = {
                witchHealRemaining: assignedRoleId === 'WITCH' ? 1 : 0,
                witchPoisonRemaining: assignedRoleId === 'WITCH' ? 1 : 0,
                demonWolfInfectRemaining: assignedRoleId === 'DEMON_WOLF' ? 1 : 0,
                lastProtectedTargetId: null,
                hasUsedHunterShot: false,
                idiotRevealed: false,
            };
        }
        this.phase = 'ROLE_DISTRIBUTION';
        this.phaseDeadline = Date.now() + this.config.timers.roleConfirmSec * 1000;
        this.log(`Bắt đầu chia vai bí mật cho ${playerCount} người chơi. Chờ xác nhận vai.`);
        return { success: true, message: 'Bắt đầu phát vai bí mật!' };
    }
    confirmRole(userId) {
        const player = this.players.get(userId);
        if (!player)
            return { success: false, allConfirmed: false };
        player.hasConfirmedRole = true;
        // Kiểm tra xem tất cả người chơi đã xác nhận chưa
        const allConfirmed = Array.from(this.players.values()).every((p) => p.hasConfirmedRole);
        return { success: true, allConfirmed };
    }
    // ==========================================
    // PHASE TRANSITIONS & STATE MACHINE
    // ==========================================
    startNight() {
        this.nightNumber += 1;
        this.phase = 'NIGHT';
        this.currentPhaseActions = [];
        this.phaseDeadline = Date.now() + this.config.timers.nightSec * 1000;
        // Kích hoạt hiệu ứng Berserk từ đêm trước nếu có
        this.activeBerserkPierce = this.nextNightBerserkPierce;
        this.nextNightBerserkPierce = false;
        this.log(`--- BẮT ĐẦU ĐÊM THỨ ${this.nightNumber} ---`);
        if (this.activeBerserkPierce) {
            this.log(`Hiệu ứng Sói cuồng nộ đang hoạt động: Đòn cắn đêm nay sẽ XUYÊN THỦNG khiên bảo vệ!`);
        }
    }
    resolveNightPhase() {
        const { result, updatedPlayers, nextNightBerserkPierce } = night_resolver_1.NightResolver.resolveNight(this.nightNumber, this.players, this.currentPhaseActions, this.config, this.activeBerserkPierce);
        this.players = updatedPlayers;
        this.nextNightBerserkPierce = nextNightBerserkPierce;
        this.lastDawnResult = result;
        this.phase = 'DAWN';
        this.phaseDeadline = Date.now() + this.config.timers.dawnSec * 1000;
        this.log(`--- TRỜI ĐÃ SÁNG (Bình minh Ngày ${this.nightNumber}) ---`);
        for (const l of result.logs) {
            this.log(l);
        }
        // Nếu có Thợ săn tử trận cần bắn súng
        if (result.hunterTriggeredId) {
            this.pendingHunterId = result.hunterTriggeredId;
        }
        return result;
    }
    handleHunterShot(targetId) {
        if (!this.pendingHunterId) {
            return { success: false, message: 'Hiện không có phát súng thợ săn nào chờ xử lý.', killedPlayer: null };
        }
        const hunter = this.players.get(this.pendingHunterId);
        if (!hunter) {
            this.pendingHunterId = null;
            return { success: false, message: 'Thợ săn không tồn tại.', killedPlayer: null };
        }
        const target = this.players.get(targetId);
        if (!target || !target.isAlive) {
            return { success: false, message: 'Mục tiêu không hợp lệ hoặc đã chết.', killedPlayer: null };
        }
        target.isAlive = false;
        target.deathReason = 'HUNTER_SHOT';
        target.deathNight = this.nightNumber;
        target.deathPhase = this.phase;
        hunter.skills.hasUsedHunterShot = true;
        this.pendingHunterId = null;
        this.log(`Thợ săn ${hunter.name} trước khi nhắm mắt đã bắn gục ${target.name}!`);
        // Xử lý nếu mục tiêu của thợ săn có người yêu (Lovers heartbreak)
        if (target.loverId) {
            const partner = this.players.get(target.loverId);
            if (partner && partner.isAlive) {
                partner.isAlive = false;
                partner.deathReason = 'HEARTBREAK';
                partner.deathNight = this.nightNumber;
                partner.deathPhase = this.phase;
                this.log(`${partner.name} đau đớn tột cùng trước cái chết của người yêu ${target.name} nên đã quyên sinh!`);
            }
        }
        return { success: true, message: `Thợ săn đã bắn ${target.name}.`, killedPlayer: target };
    }
    startDiscussion() {
        this.dayNumber += 1;
        this.phase = 'DISCUSSION';
        this.phaseDeadline = Date.now() + this.config.timers.discussionSec * 1000;
        this.log(`--- NGÀY THỨ ${this.dayNumber}: BẮT ĐẦU THẢO LUẬN (${this.config.timers.discussionSec}s) ---`);
    }
    startVoting() {
        this.phase = 'VOTING';
        this.currentPhaseActions = [];
        this.phaseDeadline = Date.now() + this.config.timers.votingSec * 1000;
        this.log(`--- NGÀY THỨ ${this.dayNumber}: BẮT ĐẦU BỎ PHIẾU TREO CỔ (${this.config.timers.votingSec}s) ---`);
    }
    resolveVotingPhase() {
        this.phase = 'RESOLUTION';
        const votes = this.currentPhaseActions.filter((a) => a.type === 'DAY_VOTE' || a.type === 'DAY_VOTE_SKIP');
        const voteCounts = {};
        let skipVotes = 0;
        for (const v of votes) {
            const voter = this.players.get(v.userId);
            // Chỉ người còn sống và còn quyền biểu quyết mới được tính phiếu
            if (!voter || !voter.isAlive || !voter.canVote)
                continue;
            if (v.type === 'DAY_VOTE_SKIP' || !v.targetId) {
                skipVotes++;
            }
            else {
                const target = this.players.get(v.targetId);
                if (target && target.isAlive) {
                    voteCounts[v.targetId] = (voteCounts[v.targetId] || 0) + 1;
                }
                else {
                    skipVotes++;
                }
            }
        }
        let maxVotes = 0;
        let topCandidates = [];
        for (const [targetId, count] of Object.entries(voteCounts)) {
            if (count > maxVotes) {
                maxVotes = count;
                topCandidates = [targetId];
            }
            else if (count === maxVotes) {
                topCandidates.push(targetId);
            }
        }
        // Nếu số phiếu bỏ qua nhiều hơn hoặc bằng số phiếu cao nhất của một người, không treo cổ ai
        if (skipVotes >= maxVotes || maxVotes === 0) {
            this.log(`Đa số phiếu chọn bỏ qua hoặc không ai đạt đủ số phiếu để treo cổ.`);
            this.lastLynchResult = {
                lynchedPlayer: null,
                idiotSurvived: false,
                tannerWon: false,
                hunterTriggeredId: null,
                heartbrokenPlayer: null,
            };
            return {
                lynchedPlayer: null,
                idiotSurvived: false,
                tannerWon: false,
                isTie: false,
                revoteTriggered: false,
                voteCounts,
            };
        }
        // Kiểm tra hòa phiếu
        if (topCandidates.length > 1) {
            if (this.config.rules.tieVoteAction === 'REVOTE_ONCE' && !this.hasRevotedToday) {
                this.hasRevotedToday = true;
                this.log(`Hòa phiếu giữa ${topCandidates.length} người! Kích hoạt bỏ phiếu lại một lần duy nhất.`);
                return {
                    lynchedPlayer: null,
                    idiotSurvived: false,
                    tannerWon: false,
                    isTie: true,
                    revoteTriggered: true,
                    voteCounts,
                };
            }
            else {
                this.log(`Hòa phiếu! Theo luật, hôm nay không ai bị treo cổ.`);
                this.lastLynchResult = {
                    lynchedPlayer: null,
                    idiotSurvived: false,
                    tannerWon: false,
                    hunterTriggeredId: null,
                    heartbrokenPlayer: null,
                };
                return {
                    lynchedPlayer: null,
                    idiotSurvived: false,
                    tannerWon: false,
                    isTie: true,
                    revoteTriggered: false,
                    voteCounts,
                };
            }
        }
        // Xác định người bị treo cổ
        const lynchedId = topCandidates[0];
        const lynchedPlayer = this.players.get(lynchedId);
        let idiotSurvived = false;
        let tannerWon = false;
        let hunterTriggeredId = null;
        let heartbrokenPlayer = null;
        // 1. Kiểm tra Thằng ngốc (Idiot): Lần đầu bị treo cổ được tha chết, lộ vai, mất quyền biểu quyết
        if (lynchedPlayer.roleId === 'IDIOT' && !lynchedPlayer.skills.idiotRevealed) {
            lynchedPlayer.skills.idiotRevealed = true;
            lynchedPlayer.canVote = false;
            idiotSurvived = true;
            this.log(`Người bị treo cổ là Thằng ngốc ${lynchedPlayer.name}! Dân làng tha mạng nhưng tước vĩnh viễn quyền biểu quyết.`);
        }
        else if (lynchedPlayer.roleId === 'TANNER') {
            // 2. Kẻ chán đời (Tanner) bị treo cổ -> Thắng độc lập!
            lynchedPlayer.isAlive = false;
            lynchedPlayer.deathReason = 'LYNCH';
            lynchedPlayer.deathNight = this.nightNumber;
            lynchedPlayer.deathPhase = 'RESOLUTION';
            tannerWon = true;
            this.log(`Kẻ chán đời ${lynchedPlayer.name} đã bị treo cổ thành công và ĐẠT ĐƯỢC ƯỚC NGUYỆN CHIẾN THẮNG!`);
        }
        else {
            // Treo cổ bình thường
            lynchedPlayer.isAlive = false;
            lynchedPlayer.deathReason = 'LYNCH';
            lynchedPlayer.deathNight = this.nightNumber;
            lynchedPlayer.deathPhase = 'RESOLUTION';
            this.log(`${lynchedPlayer.name} đã bị dân làng treo cổ trên giàn thiêu.`);
            // Sói cuồng nộ bị treo cổ: kích hoạt hiệu ứng cuồng nộ đêm sau
            if (lynchedPlayer.roleId === 'BERSERK_WOLF' && lynchedPlayer.originalRoleId === 'BERSERK_WOLF') {
                this.nextNightBerserkPierce = true;
                this.log(`Sói cuồng nộ đã bị treo cổ! Cơn cuồng nộ truyền thừa sẽ giúp sói xuyên khiên vào đêm kế tiếp.`);
            }
            // Thợ săn bị treo cổ: được kích hoạt bắn súng trả thù
            if (lynchedPlayer.roleId === 'HUNTER' && !lynchedPlayer.skills.hasUsedHunterShot) {
                hunterTriggeredId = lynchedPlayer.id;
                this.pendingHunterId = lynchedPlayer.id;
                this.log(`Thợ săn ${lynchedPlayer.name} bị treo cổ! Súng săn chuẩn bị nổ.`);
            }
            // Cặp đôi chết dây chuyền
            if (lynchedPlayer.loverId) {
                const partner = this.players.get(lynchedPlayer.loverId);
                if (partner && partner.isAlive) {
                    partner.isAlive = false;
                    partner.deathReason = 'HEARTBREAK';
                    partner.deathNight = this.nightNumber;
                    partner.deathPhase = 'RESOLUTION';
                    heartbrokenPlayer = partner;
                    this.log(`${partner.name} vì quá thương xót người yêu ${lynchedPlayer.name} nên đã tự vẫn theo.`);
                }
            }
        }
        this.lastLynchResult = {
            lynchedPlayer,
            idiotSurvived,
            tannerWon,
            hunterTriggeredId,
            heartbrokenPlayer,
        };
        return {
            lynchedPlayer,
            idiotSurvived,
            tannerWon,
            isTie: false,
            revoteTriggered: false,
            voteCounts,
        };
    }
    // ==========================================
    // ACTION DISPATCHER & VALIDATION
    // ==========================================
    submitAction(action) {
        if (this.phase === 'PAUSED' || this.phase === 'CANCELLED' || this.phase === 'FINISHED') {
            return { success: false, message: 'Game đang dừng hoặc đã kết thúc.' };
        }
        const player = this.players.get(action.userId);
        if (!player) {
            return { success: false, message: 'Bạn không có trong danh sách người chơi của ván này.' };
        }
        if (!player.isAlive && action.type !== 'HUNTER_SHOT') {
            return { success: false, message: 'Người đã chết không thể thực hiện hành động này.' };
        }
        // Xác thực mục tiêu còn sống nếu có targetId
        if (action.targetId) {
            const target = this.players.get(action.targetId);
            if (!target || !target.isAlive) {
                return { success: false, message: 'Mục tiêu đã chết hoặc không tồn tại.' };
            }
        }
        // Kiểm tra hành động theo pha
        if (this.phase === 'NIGHT') {
            // 1. Thần tình yêu
            if (action.type === 'CUPID_LINK') {
                if (player.roleId !== 'CUPID' || this.nightNumber !== 1) {
                    return { success: false, message: 'Thần tình yêu chỉ được ghép đôi vào Đêm 1.' };
                }
                if (!action.targetId || !action.secondaryTargetId || action.targetId === action.secondaryTargetId) {
                    return { success: false, message: 'Phải chọn 2 người chơi khác nhau để ghép đôi.' };
                }
            }
            // 2. Bảo vệ
            if (action.type === 'BODYGUARD_PROTECT') {
                if (player.roleId !== 'BODYGUARD') {
                    return { success: false, message: 'Bạn không phải là Bảo vệ.' };
                }
                if (action.targetId === player.id && !this.config.rules.bodyguardCanProtectSelf) {
                    return { success: false, message: 'Luật phòng không cho phép Bảo vệ tự bảo vệ mình.' };
                }
                if (action.targetId === player.skills.lastProtectedTargetId) {
                    return { success: false, message: 'Không thể bảo vệ cùng một người 2 đêm liên tiếp.' };
                }
            }
            // 3. Tiên tri
            if (action.type === 'SEER_INVESTIGATE') {
                if (player.roleId !== 'SEER') {
                    return { success: false, message: 'Bạn không phải là Tiên tri.' };
                }
                if (action.targetId === player.id) {
                    return { success: false, message: 'Tiên tri không thể soi chính mình.' };
                }
            }
            // 4. Biểu quyết Sói
            if (action.type === 'WOLF_VOTE') {
                if (player.faction !== 'WEREWOLF') {
                    return { success: false, message: 'Bạn không thuộc Phe Sói.' };
                }
            }
            // 5. Sói quỷ chuyển hóa
            if (action.type === 'DEMON_WOLF_INFECT') {
                if (player.roleId !== 'DEMON_WOLF') {
                    return { success: false, message: 'Bạn không phải là Sói quỷ.' };
                }
                if (player.skills.demonWolfInfectRemaining <= 0) {
                    return { success: false, message: 'Bạn đã sử dụng hết lượt chuyển hóa của trận này.' };
                }
            }
            // 6. Phù thủy
            if (action.type === 'WITCH_HEAL') {
                if (player.roleId !== 'WITCH') {
                    return { success: false, message: 'Bạn không phải là Phù thủy.' };
                }
                if (player.skills.witchHealRemaining <= 0) {
                    return { success: false, message: 'Bạn đã dùng hết bình cứu.' };
                }
            }
            if (action.type === 'WITCH_POISON') {
                if (player.roleId !== 'WITCH') {
                    return { success: false, message: 'Bạn không phải là Phù thủy.' };
                }
                if (player.skills.witchPoisonRemaining <= 0) {
                    return { success: false, message: 'Bạn đã dùng hết bình độc.' };
                }
            }
            // 7. Sói trắng
            if (action.type === 'WHITE_WOLF_KILL') {
                if (player.roleId !== 'WHITE_WOLF') {
                    return { success: false, message: 'Bạn không phải là Sói trắng.' };
                }
                if (this.nightNumber < 2 || this.nightNumber % 2 !== 0) {
                    return { success: false, message: 'Sói trắng chỉ thức dậy vào các đêm chẵn từ Đêm 2.' };
                }
                const target = this.players.get(action.targetId);
                if (!target || target.faction !== 'WEREWOLF' || target.id === player.id) {
                    return { success: false, message: 'Mục tiêu phải là một con sói khác trong bầy.' };
                }
            }
        }
        else if (this.phase === 'VOTING') {
            if (action.type === 'DAY_VOTE' || action.type === 'DAY_VOTE_SKIP') {
                if (!player.canVote) {
                    return { success: false, message: 'Bạn đã bị tước quyền biểu quyết.' };
                }
            }
        }
        else if (this.pendingHunterId) {
            if (action.type === 'HUNTER_SHOT') {
                if (player.id !== this.pendingHunterId) {
                    return { success: false, message: 'Không phải lượt bắn của bạn.' };
                }
            }
        }
        else {
            return { success: false, message: 'Không phải pha hợp lệ để gửi hành động này.' };
        }
        // Xóa hành động cũ của người chơi trong pha này (nếu có) để ghi đè (cho phép đổi vote)
        const isDayVote = action.type === 'DAY_VOTE' || action.type === 'DAY_VOTE_SKIP';
        this.currentPhaseActions = this.currentPhaseActions.filter((a) => {
            if (a.userId !== action.userId)
                return true;
            if (isDayVote && (a.type === 'DAY_VOTE' || a.type === 'DAY_VOTE_SKIP'))
                return false;
            return a.type !== action.type;
        });
        const fullAction = {
            ...action,
            id: `${this.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: Date.now(),
        };
        this.currentPhaseActions.push(fullAction);
        this.actions.push(fullAction);
        return { success: true, message: 'Hành động đã được ghi nhận.' };
    }
    // ==========================================
    // WIN CONDITION EVALUATION
    // ==========================================
    checkWinCondition() {
        // Nếu Tanner vừa thắng ở pha treo cổ
        if (this.lastLynchResult?.tannerWon) {
            const tanner = this.lastLynchResult.lynchedPlayer;
            return {
                winner: 'SOLO',
                winnerRoleId: 'TANNER',
                winnerPlayerIds: [tanner.id],
                reason: `Kẻ chán đời ${tanner.name} đã bị treo cổ thành công và giành chiến thắng độc lập!`,
            };
        }
        const alivePlayers = Array.from(this.players.values()).filter((p) => p.isAlive);
        // 1. Trường hợp tất cả đều chết -> Hòa
        if (alivePlayers.length === 0) {
            return {
                winner: 'DRAW',
                reason: 'Tất cả mọi người trong làng đều đã tử trận. Trận đấu kết thúc với kết quả Hòa!',
            };
        }
        // 2. Kiểm tra Cặp đôi khác phe (Lovers win)
        // Nếu chỉ còn đúng 2 người sống sót và 2 người đó yêu nhau, ban đầu khác phe
        if (alivePlayers.length === 2 && this.config.rules.allowLoversWin) {
            const [p1, p2] = alivePlayers;
            if (p1.loverId === p2.id && p2.loverId === p1.id) {
                // Khác phe ban đầu
                const role1 = (0, roles_1.getRoleInfo)(p1.originalRoleId, this.customRoles);
                const role2 = (0, roles_1.getRoleInfo)(p2.originalRoleId, this.customRoles);
                if (role1.faction !== role2.faction) {
                    return {
                        winner: 'LOVERS',
                        winnerPlayerIds: [p1.id, p2.id],
                        reason: `Tình yêu vượt qua ranh giới chủng tộc! Cặp đôi ${p1.name} và ${p2.name} là 2 người sống sót cuối cùng và giành chiến thắng!`,
                    };
                }
            }
        }
        // 3. Kiểm tra Sói trắng thắng độc lập
        // Sói trắng là người duy nhất còn sống sót trong cả làng
        if (alivePlayers.length === 1 && alivePlayers[0].roleId === 'WHITE_WOLF') {
            const ww = alivePlayers[0];
            return {
                winner: 'SOLO',
                winnerRoleId: 'WHITE_WOLF',
                winnerPlayerIds: [ww.id],
                reason: `Sói trắng ${ww.name} đã tàn sát toàn bộ bầy sói lẫn dân làng và là người sống sót duy nhất!`,
            };
        }
        // Đếm số lượng Sói và Dân còn sống
        const aliveWolves = alivePlayers.filter((p) => p.faction === 'WEREWOLF');
        const aliveNonWolves = alivePlayers.filter((p) => p.faction !== 'WEREWOLF');
        // 4. Phe Sói thắng:
        // Số Sói >= Số người không phải Sói
        if (aliveWolves.length >= aliveNonWolves.length && aliveWolves.length > 0) {
            // Ngoại lệ: Nếu chỉ còn 2 người và là Cặp đôi khác phe, điều kiện 2 đã xử lý ở trên
            return {
                winner: 'WEREWOLF',
                winnerPlayerIds: aliveWolves.map((w) => w.id),
                reason: `Phe Sói (${aliveWolves.length} người) đã áp đảo hoàn toàn số dân làng còn lại (${aliveNonWolves.length} người)!`,
            };
        }
        // 5. Phe Dân thắng:
        // Toàn bộ Sói và các mối hiểm họa độc lập đã bị tiêu diệt
        if (aliveWolves.length === 0) {
            const aliveVillagers = alivePlayers.filter((p) => p.faction === 'VILLAGE');
            return {
                winner: 'VILLAGE',
                winnerPlayerIds: aliveVillagers.map((v) => v.id),
                reason: `Toàn bộ bầy Sói hung ác đã bị tiêu diệt! Bình yên đã trở lại với Dân làng.`,
            };
        }
        // Chưa kết thúc
        return {
            winner: 'NONE',
            reason: 'Trận đấu đang tiếp diễn.',
        };
    }
    // ==========================================
    // GAME CONTROL & HELPERS
    // ==========================================
    pause() {
        if (this.phase === 'FINISHED' || this.phase === 'CANCELLED' || this.phase === 'PAUSED') {
            return { success: false, message: `Không thể tạm dừng game ở trạng thái ${this.phase}.` };
        }
        this.phase = 'PAUSED';
        this.log(`Trận đấu đã được chủ phòng tạm dừng.`);
        return { success: true, message: 'Đã tạm dừng trận đấu.' };
    }
    resume() {
        if (this.phase !== 'PAUSED') {
            return { success: false, message: 'Trận đấu không bị tạm dừng.' };
        }
        // Khôi phục lại pha trước đó (mặc định quay lại tiếp tục night hoặc discussion/voting)
        this.phase = this.nightNumber > 0 ? (this.dayNumber > 0 ? 'DISCUSSION' : 'NIGHT') : 'LOBBY';
        this.log(`Trận đấu đã được tiếp tục.`);
        return { success: true, message: 'Đã tiếp tục trận đấu.' };
    }
    cancel(reason = 'Chủ phòng hủy trận') {
        this.phase = 'CANCELLED';
        this.log(`Trận đấu đã bị hủy. Lý do: ${reason}`);
        return { success: true, message: `Đã hủy trận đấu: ${reason}` };
    }
    log(msg) {
        const timestamp = new Date().toLocaleTimeString('vi-VN');
        this.logs.push(`[${timestamp}] ${msg}`);
    }
}
exports.WerewolfGame = WerewolfGame;
