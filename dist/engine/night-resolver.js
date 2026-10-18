"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NightResolver = void 0;
class NightResolver {
    /**
     * Xử lý toàn bộ các hành động trong đêm theo đúng thứ tự logic đã được định nghĩa.
     * Đảm bảo tính toán xác định (deterministic), không phụ thuộc vào trạng thái Discord.
     */
    static resolveNight(nightNumber, players, actions, config, activeBerserkPierce) {
        const updatedPlayers = new Map();
        for (const [id, p] of players.entries()) {
            updatedPlayers.set(id, JSON.parse(JSON.stringify(p)));
        }
        const logs = [];
        const investigationResults = [];
        const deaths = [];
        let wolfVictimId = null;
        let wasProtected = false;
        let wasHealed = false;
        let wasInfected = false;
        let newWerewolfId = null;
        let berserkTriggeredNextNight = false;
        let hunterTriggeredId = null;
        // 1. Thần tình yêu (Đêm 1): Ghép đôi
        if (nightNumber === 1) {
            const cupidAction = actions.find((a) => a.type === 'CUPID_LINK');
            if (cupidAction && cupidAction.targetId && cupidAction.secondaryTargetId) {
                const p1 = updatedPlayers.get(cupidAction.targetId);
                const p2 = updatedPlayers.get(cupidAction.secondaryTargetId);
                if (p1 && p2 && p1.isAlive && p2.isAlive && p1.id !== p2.id) {
                    p1.loverId = p2.id;
                    p2.loverId = p1.id;
                    logs.push(`Thần tình yêu đã se duyên cho ${p1.name} và ${p2.name}.`);
                }
            }
        }
        // 2. Bảo vệ: Chọn mục tiêu bảo vệ
        const bodyguardActions = actions.filter((a) => a.type === 'BODYGUARD_PROTECT');
        const protectedPlayerIds = new Set();
        for (const act of bodyguardActions) {
            const bg = updatedPlayers.get(act.userId);
            if (!bg || !bg.isAlive)
                continue;
            const targetId = act.targetId;
            if (!targetId)
                continue;
            // Kiểm tra luật tự bảo vệ
            if (targetId === bg.id && !config.rules.bodyguardCanProtectSelf) {
                logs.push(`Bảo vệ ${bg.name} không được phép tự bảo vệ.`);
                continue;
            }
            // Kiểm tra luật không bảo vệ 1 người 2 đêm liên tiếp
            if (bg.skills.lastProtectedTargetId === targetId) {
                logs.push(`Bảo vệ ${bg.name} không thể bảo vệ cùng một người 2 đêm liên tiếp.`);
                continue;
            }
            protectedPlayerIds.add(targetId);
            bg.skills.lastProtectedTargetId = targetId;
            logs.push(`Bảo vệ đã che chắn cho mục tiêu.`);
        }
        // 3. Quyết định mục tiêu bị Sói cắn (Tổng hợp vote của bầy sói)
        const wolfVotes = actions.filter((a) => a.type === 'WOLF_VOTE');
        const voteCounts = new Map();
        for (const vote of wolfVotes) {
            const wolf = updatedPlayers.get(vote.userId);
            // Chỉ thành viên phe sói còn sống mới được vote cắn
            if (!wolf || !wolf.isAlive || wolf.faction !== 'WEREWOLF')
                continue;
            if (!vote.targetId)
                continue;
            const target = updatedPlayers.get(vote.targetId);
            if (!target || !target.isAlive)
                continue;
            voteCounts.set(vote.targetId, (voteCounts.get(vote.targetId) || 0) + 1);
        }
        if (voteCounts.size > 0) {
            // Tìm mục tiêu có số phiếu cao nhất
            let maxVotes = 0;
            let topTargets = [];
            for (const [tId, count] of voteCounts.entries()) {
                if (count > maxVotes) {
                    maxVotes = count;
                    topTargets = [tId];
                }
                else if (count === maxVotes) {
                    topTargets.push(tId);
                }
            }
            if (topTargets.length === 1) {
                wolfVictimId = topTargets[0];
            }
            else {
                // Hòa phiếu: Theo cấu hình (Mặc định không cắn ai hoặc ngẫu nhiên)
                if (config.rules.wolfTieAction === 'RANDOM') {
                    wolfVictimId = topTargets[Math.floor(Math.random() * topTargets.length)];
                    logs.push(`Bầy sói hòa phiếu, nạn nhân được chọn ngẫu nhiên.`);
                }
                else {
                    wolfVictimId = null;
                    logs.push(`Bầy sói không đạt được đồng thuận, đêm nay không có ai bị cắn.`);
                }
            }
        }
        // 4. Kiểm tra Sói quỷ chuyển hóa (Demon Wolf Infect)
        const infectAction = actions.find((a) => a.type === 'DEMON_WOLF_INFECT');
        let demonWolfAttemptInfect = false;
        let demonWolfPlayer;
        if (infectAction && wolfVictimId && infectAction.targetId === wolfVictimId) {
            demonWolfPlayer = updatedPlayers.get(infectAction.userId);
            if (demonWolfPlayer &&
                demonWolfPlayer.isAlive &&
                demonWolfPlayer.roleId === 'DEMON_WOLF' &&
                demonWolfPlayer.skills.demonWolfInfectRemaining > 0) {
                demonWolfAttemptInfect = true;
            }
        }
        // 5. Phù thủy: Hành động cứu / độc
        const witchHealAction = actions.find((a) => a.type === 'WITCH_HEAL');
        const witchPoisonAction = actions.find((a) => a.type === 'WITCH_POISON');
        let poisonedVictimId = null;
        // Xử lý Cứu
        if (witchHealAction && wolfVictimId) {
            const witch = updatedPlayers.get(witchHealAction.userId);
            if (witch && witch.isAlive && witch.skills.witchHealRemaining > 0) {
                // Kiểm tra luật tự cứu của Phù thủy
                let canHeal = true;
                if (wolfVictimId === witch.id) {
                    if (nightNumber === 1 && !config.rules.witchCanSelfHealFirstNightOnly && !config.rules.witchCanSelfHealAlways) {
                        canHeal = false;
                    }
                    else if (nightNumber > 1 && !config.rules.witchCanSelfHealAlways) {
                        canHeal = false;
                    }
                }
                if (canHeal) {
                    wasHealed = true;
                    witch.skills.witchHealRemaining -= 1;
                    logs.push(`Phù thủy đã sử dụng bình cứu.`);
                }
                else {
                    logs.push(`Phù thủy không được phép tự cứu bản thân đêm nay theo luật.`);
                }
            }
        }
        // Xử lý Độc
        if (witchPoisonAction && witchPoisonAction.targetId) {
            const witch = updatedPlayers.get(witchPoisonAction.userId);
            if (witch && witch.isAlive && witch.skills.witchPoisonRemaining > 0) {
                // Phù thủy chỉ được dùng tối đa 1 bình mỗi đêm
                if (wasHealed && witchHealAction?.userId === witch.id) {
                    logs.push(`Phù thủy chỉ được dùng tối đa 1 bình mỗi đêm.`);
                }
                else {
                    const target = updatedPlayers.get(witchPoisonAction.targetId);
                    if (target && target.isAlive) {
                        poisonedVictimId = target.id;
                        witch.skills.witchPoisonRemaining -= 1;
                        logs.push(`Phù thủy đã hạ độc một người.`);
                    }
                }
            }
        }
        // 6. Tiên tri soi
        const seerActions = actions.filter((a) => a.type === 'SEER_INVESTIGATE');
        for (const act of seerActions) {
            const seer = updatedPlayers.get(act.userId);
            if (!seer || !seer.isAlive)
                continue;
            if (!act.targetId)
                continue;
            const target = updatedPlayers.get(act.targetId);
            if (!target)
                continue;
            // Sói thường, Sói quỷ, Sói cuồng nộ, Sói trắng đều là Sói
            const isWolf = target.faction === 'WEREWOLF' || target.roleId === 'WHITE_WOLF';
            investigationResults.push({
                seerId: seer.id,
                targetId: target.id,
                isWolf,
            });
            logs.push(`Tiên tri ${seer.name} đã thực hiện soi.`);
        }
        // 7. Sói trắng cắn riêng (Từ đêm 2, mỗi đêm chẵn)
        let whiteWolfVictimId = null;
        if (nightNumber >= 2 && nightNumber % 2 === 0) {
            const whiteWolfAction = actions.find((a) => a.type === 'WHITE_WOLF_KILL');
            if (whiteWolfAction && whiteWolfAction.targetId) {
                const whiteWolf = updatedPlayers.get(whiteWolfAction.userId);
                if (whiteWolf && whiteWolf.isAlive && whiteWolf.roleId === 'WHITE_WOLF') {
                    const target = updatedPlayers.get(whiteWolfAction.targetId);
                    // Sói trắng chỉ được cắn thành viên khác thuộc Phe Sói
                    if (target && target.isAlive && target.faction === 'WEREWOLF' && target.id !== whiteWolf.id) {
                        whiteWolfVictimId = target.id;
                        logs.push(`Sói trắng đã bí mật ra tay tiêu diệt đồng loại.`);
                    }
                }
            }
        }
        // 8. Đánh giá kết quả đòn cắn bầy sói
        if (wolfVictimId) {
            const isProtected = protectedPlayerIds.has(wolfVictimId);
            // Nếu có hiệu ứng Sói cuồng nộ (Berserk pierce): đòn cắn xuyên lớp bảo vệ
            if (isProtected && activeBerserkPierce) {
                logs.push(`Đòn cắn của Sói mang sức mạnh Cuồng nộ đã XUYÊN THỦNG lớp khiên bảo vệ!`);
            }
            const protectedEffective = isProtected && !activeBerserkPierce;
            wasProtected = protectedEffective;
            if (wasHealed) {
                logs.push(`Nạn nhân của bầy sói đã được Phù thủy cứu mạng.`);
            }
            else if (protectedEffective) {
                logs.push(`Nạn nhân của bầy sói đã được Bảo vệ che chở bình an.`);
            }
            else {
                // Không được cứu và không được bảo vệ hiệu quả
                if (demonWolfAttemptInfect && demonWolfPlayer) {
                    // Chuyển hóa thành sói thành công!
                    const victim = updatedPlayers.get(wolfVictimId);
                    victim.faction = 'WEREWOLF';
                    victim.roleId = 'WEREWOLF'; // Trở thành sói thường, mất kỹ năng cũ
                    demonWolfPlayer.skills.demonWolfInfectRemaining -= 1; // Tiêu hao lượt
                    wasInfected = true;
                    newWerewolfId = victim.id;
                    logs.push(`Nạn nhân không chết mà đã bị Sói quỷ tha hóa thành Sói!`);
                }
                else {
                    // Bị cắn chết
                    const victim = updatedPlayers.get(wolfVictimId);
                    victim.isAlive = false;
                    victim.deathReason = 'WOLF_BITE';
                    victim.deathNight = nightNumber;
                    victim.deathPhase = 'NIGHT';
                    deaths.push({ player: victim, reason: 'WOLF_BITE' });
                    logs.push(`${victim.name} đã bị bầy sói cắn chết.`);
                }
            }
            // Nếu chuyển hóa thất bại do được cứu hoặc bảo vệ, không mất lượt của Sói quỷ
            if (demonWolfAttemptInfect && (wasHealed || protectedEffective)) {
                logs.push(`Sói quỷ chuyển hóa thất bại do mục tiêu được bảo vệ/cứu. Lượt chuyển hóa không bị tiêu hao.`);
            }
        }
        // Phù thủy độc chết
        if (poisonedVictimId) {
            const poisonedTarget = updatedPlayers.get(poisonedVictimId);
            if (poisonedTarget.isAlive) {
                poisonedTarget.isAlive = false;
                poisonedTarget.deathReason = 'WITCH_POISON';
                poisonedTarget.deathNight = nightNumber;
                poisonedTarget.deathPhase = 'NIGHT';
                deaths.push({ player: poisonedTarget, reason: 'WITCH_POISON' });
                logs.push(`${poisonedTarget.name} đã chết vì trúng bình độc.`);
            }
        }
        // Sói trắng giết đồng loại
        if (whiteWolfVictimId) {
            const whiteWolfTarget = updatedPlayers.get(whiteWolfVictimId);
            if (whiteWolfTarget.isAlive) {
                whiteWolfTarget.isAlive = false;
                whiteWolfTarget.deathReason = 'WHITE_WOLF';
                whiteWolfTarget.deathNight = nightNumber;
                whiteWolfTarget.deathPhase = 'NIGHT';
                deaths.push({ player: whiteWolfTarget, reason: 'WHITE_WOLF' });
                logs.push(`${whiteWolfTarget.name} đã bị xé xác bí ẩn trong đêm.`);
            }
        }
        // 9. Xử lý Chết dây chuyền: Cặp đôi (Lovers)
        // Nếu Lover A chết, Lover B chết theo vì đau lòng (HEARTBREAK)
        let processedDeathsCount = 0;
        while (processedDeathsCount < deaths.length) {
            const deadOne = deaths[processedDeathsCount].player;
            processedDeathsCount++;
            if (deadOne.loverId) {
                const partner = updatedPlayers.get(deadOne.loverId);
                if (partner && partner.isAlive) {
                    partner.isAlive = false;
                    partner.deathReason = 'HEARTBREAK';
                    partner.deathNight = nightNumber;
                    partner.deathPhase = 'NIGHT';
                    deaths.push({ player: partner, reason: 'HEARTBREAK' });
                    logs.push(`${partner.name} vì quá đau lòng trước cái chết của người yêu ${deadOne.name} nên đã quyên sinh theo!`);
                }
            }
        }
        // 10. Kiểm tra hiệu ứng Sói cuồng nộ và Thợ săn chết
        for (const death of deaths) {
            const deadPlayer = death.player;
            // Nếu Sói cuồng nộ chết trong đêm, kích hoạt hiệu ứng xuyên khiên cho đêm kế tiếp
            if (deadPlayer.roleId === 'BERSERK_WOLF' && deadPlayer.originalRoleId === 'BERSERK_WOLF') {
                berserkTriggeredNextNight = true;
                logs.push(`Sói cuồng nộ đã chết! Cơn phẫn nộ sẽ khiến bầy sói xuyên thủng khiên bảo vệ vào đêm sau.`);
            }
            // Nếu Thợ săn chết:
            // Kiểm tra luật chết vì độc: mặc định chết vì độc thì KHÔNG được bắn
            if (deadPlayer.roleId === 'HUNTER' && !deadPlayer.skills.hasUsedHunterShot) {
                if (death.reason === 'WITCH_POISON' && !config.rules.hunterCanShootIfPoisoned) {
                    logs.push(`Thợ săn ${deadPlayer.name} bị chết vì độc dược nên không kịp rút súng.`);
                }
                else {
                    hunterTriggeredId = deadPlayer.id;
                    logs.push(`Thợ săn ${deadPlayer.name} tử trận! Khẩu súng săn chuẩn bị khai hỏa.`);
                }
            }
        }
        return {
            result: {
                deaths,
                wolfVictimId,
                wasProtected,
                wasHealed,
                wasInfected,
                newWerewolfId,
                berserkTriggeredNextNight,
                hunterTriggeredId,
                investigationResults,
                logs,
            },
            updatedPlayers,
            nextNightBerserkPierce: berserkTriggeredNextNight,
        };
    }
}
exports.NightResolver = NightResolver;
