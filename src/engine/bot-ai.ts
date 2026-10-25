import { WerewolfGame } from './game';
import { Player, RoleId } from './types';

export interface BotChatMessage {
  botId: string;
  botName: string;
  text: string;
  delaySec: number;
}

export class WerewolfBotAi {
  /**
   * Tự động thực hiện các hành động ban đêm cho tất cả Bot còn sống
   */
  public static performNightActions(game: WerewolfGame): { actionsSubmitted: number; logs: string[] } {
    let count = 0;
    const logs: string[] = [];
    const alivePlayers = Array.from(game.players.values()).filter((p) => p.isAlive);
    const aliveBots = alivePlayers.filter((p) => p.isBot);

    if (aliveBots.length === 0) {
      return { actionsSubmitted: 0, logs: [] };
    }

    // 1. Thần tình yêu (Đêm 1)
    if (game.nightNumber === 1) {
      const cupidBot = aliveBots.find((p) => p.roleId === 'CUPID');
      if (cupidBot) {
        if (alivePlayers.length >= 2) {
          const shuffled = [...alivePlayers].sort(() => Math.random() - 0.5);
          const p1 = shuffled[0];
          const p2 = shuffled[1];
          const res = game.submitAction({
            userId: cupidBot.id,
            roleId: 'CUPID',
            type: 'CUPID_LINK',
            targetId: p1.id,
            secondaryTargetId: p2.id,
            nightNumber: game.nightNumber,
            phase: 'NIGHT',
          });
          if (res.success) {
            count++;
            logs.push(`Bot Thần tình yêu (${cupidBot.name}) đã se duyên cho 2 người.`);
          }
        }
      }
    }

    // 2. Bảo vệ
    const bodyguardBot = aliveBots.find((p) => p.roleId === 'BODYGUARD');
    if (bodyguardBot) {
      const validTargets = alivePlayers.filter((p) => {
        if (p.id === bodyguardBot.id && !game.config.rules.bodyguardCanProtectSelf) return false;
        if (p.id === bodyguardBot.skills.lastProtectedTargetId) return false;
        return true;
      });

      if (validTargets.length > 0) {
        const target = validTargets[Math.floor(Math.random() * validTargets.length)];
        const res = game.submitAction({
          userId: bodyguardBot.id,
          roleId: 'BODYGUARD',
          type: 'BODYGUARD_PROTECT',
          targetId: target.id,
          nightNumber: game.nightNumber,
          phase: 'NIGHT',
        });
        if (res.success) {
          count++;
          logs.push(`Bot Bảo vệ (${bodyguardBot.name}) đã chọn mục tiêu bảo vệ.`);
        }
      }
    }

    // 3. Tiên tri (Ưu tiên soi những người chưa từng soi)
    const seerBot = aliveBots.find((p) => p.roleId === 'SEER');
    if (seerBot) {
      const previouslyInvestigated = new Set(
        game.actions
          .filter((a) => a.type === 'SEER_INVESTIGATE' && a.userId === seerBot.id && a.targetId)
          .map((a) => a.targetId!)
      );
      const uninvestigated = alivePlayers.filter((p) => p.id !== seerBot.id && !previouslyInvestigated.has(p.id));
      const targetPool = uninvestigated.length > 0 ? uninvestigated : alivePlayers.filter((p) => p.id !== seerBot.id);

      if (targetPool.length > 0) {
        const target = targetPool[Math.floor(Math.random() * targetPool.length)];
        const res = game.submitAction({
          userId: seerBot.id,
          roleId: 'SEER',
          type: 'SEER_INVESTIGATE',
          targetId: target.id,
          nightNumber: game.nightNumber,
          phase: 'NIGHT',
        });
        if (res.success) {
          count++;
          logs.push(`Bot Tiên tri (${seerBot.name}) đã soi mục tiêu ${target.name}.`);
        }
      }
    }

    // 4. Bầy Ma Sói
    const aliveWolfBots = aliveBots.filter((p) => p.faction === 'WEREWOLF');
    if (aliveWolfBots.length > 0) {
      // Tìm xem có người chơi sói thật nào đã vote trước chưa
      const existingWolfVote = game.currentPhaseActions.find(
        (a) => a.type === 'WOLF_VOTE' && !game.players.get(a.userId)?.isBot
      );

      let chosenTargetId: string | null = null;
      let chosenTarget2Id: string | null = null;
      const nonWolves = alivePlayers.filter((p) => p.faction !== 'WEREWOLF');
      const targetPool = nonWolves.length > 0 ? nonWolves : alivePlayers.filter((p) => p.id !== aliveWolfBots[0].id);

      if (existingWolfVote?.targetId) {
        chosenTargetId = existingWolfVote.targetId;
      } else {
        if (targetPool.length > 0) {
          chosenTargetId = targetPool[Math.floor(Math.random() * targetPool.length)].id;
        }
      }

      if (game.isAlphaWolfActive() && chosenTargetId) {
        if (existingWolfVote?.secondaryTargetId) {
          chosenTarget2Id = existingWolfVote.secondaryTargetId;
        } else {
          const secondPool = targetPool.filter((p) => p.id !== chosenTargetId);
          if (secondPool.length > 0) {
            chosenTarget2Id = secondPool[Math.floor(Math.random() * secondPool.length)].id;
          }
        }
      }

      if (chosenTargetId) {
        for (const wolfBot of aliveWolfBots) {
          const res = game.submitAction({
            userId: wolfBot.id,
            roleId: wolfBot.roleId,
            type: 'WOLF_VOTE',
            targetId: chosenTargetId,
            secondaryTargetId: chosenTarget2Id || undefined,
            nightNumber: game.nightNumber,
            phase: 'NIGHT',
          });
          if (res.success) {
            count++;
          }
        }
        logs.push(`${aliveWolfBots.length} Bot Ma Sói đã đồng thuận bỏ phiếu cắn xé${chosenTarget2Id ? ' (2 mục tiêu do có Sói Trùm)' : ''}.`);

        // Sói quỷ bot (Infect)
        const demonWolfBot = aliveWolfBots.find(
          (w) => w.roleId === 'DEMON_WOLF' && w.skills.demonWolfInfectRemaining > 0
        );
        if (demonWolfBot && Math.random() < 0.4) {
          game.submitAction({
            userId: demonWolfBot.id,
            roleId: 'DEMON_WOLF',
            type: 'DEMON_WOLF_INFECT',
            targetId: chosenTargetId,
            nightNumber: game.nightNumber,
            phase: 'NIGHT',
          });
        }
      }
    }

    // 5. Phù thủy
    const witchBot = aliveBots.find((p) => p.roleId === 'WITCH');
    if (witchBot) {
      // Tìm xem có nạn nhân sói cắn trong các vote hiện tại không
      const wolfVotes = game.currentPhaseActions.filter((a) => a.type === 'WOLF_VOTE');
      let predictedVictimId: string | null = null;
      if (wolfVotes.length > 0) {
        const voteCounts: Record<string, number> = {};
        for (const v of wolfVotes) {
          if (v.targetId) {
            voteCounts[v.targetId] = (voteCounts[v.targetId] || 0) + 1;
          }
        }
        let maxV = 0;
        for (const [tid, vcnt] of Object.entries(voteCounts)) {
          if (vcnt > maxV) {
            maxV = vcnt;
            predictedVictimId = tid;
          }
        }
      }

      let usedPotion = false;

      // 70% cơ hội cứu nếu có người bị cắn và còn bình cứu
      if (predictedVictimId && witchBot.skills.witchHealRemaining > 0) {
        let canHeal = true;
        if (predictedVictimId === witchBot.id) {
          if (game.nightNumber === 1 && !game.config.rules.witchCanSelfHealFirstNightOnly && !game.config.rules.witchCanSelfHealAlways) {
            canHeal = false;
          } else if (game.nightNumber > 1 && !game.config.rules.witchCanSelfHealAlways) {
            canHeal = false;
          }
        }

        if (canHeal && Math.random() < 0.75) {
          const res = game.submitAction({
            userId: witchBot.id,
            roleId: 'WITCH',
            type: 'WITCH_HEAL',
            nightNumber: game.nightNumber,
            phase: 'NIGHT',
          });
          if (res.success) {
            usedPotion = true;
            count++;
            logs.push(`Bot Phù thủy (${witchBot.name}) đã dùng bình cứu.`);
          }
        }
      }

      // 10% cơ hội hạ độc một người nếu chưa dùng bình cứu đêm nay
      if (!usedPotion && witchBot.skills.witchPoisonRemaining > 0 && Math.random() < 0.12) {
        const poisonTargets = alivePlayers.filter((p) => p.id !== witchBot.id);
        if (poisonTargets.length > 0) {
          const target = poisonTargets[Math.floor(Math.random() * poisonTargets.length)];
          const res = game.submitAction({
            userId: witchBot.id,
            roleId: 'WITCH',
            type: 'WITCH_POISON',
            targetId: target.id,
            nightNumber: game.nightNumber,
            phase: 'NIGHT',
          });
          if (res.success) {
            usedPotion = true;
            count++;
            logs.push(`Bot Phù thủy (${witchBot.name}) đã dùng bình độc.`);
          }
        }
      }

      if (!usedPotion) {
        game.submitAction({
          userId: witchBot.id,
          roleId: 'WITCH',
          type: 'WITCH_PASS',
          nightNumber: game.nightNumber,
          phase: 'NIGHT',
        });
      }
    }

    // 6. Sói trắng (Đêm chẵn >= 2)
    if (game.nightNumber >= 2 && game.nightNumber % 2 === 0) {
      const whiteWolfBot = aliveBots.find((p) => p.roleId === 'WHITE_WOLF');
      if (whiteWolfBot) {
        const otherWolves = alivePlayers.filter(
          (p) => p.faction === 'WEREWOLF' && p.id !== whiteWolfBot.id
        );
        if (otherWolves.length > 0 && Math.random() < 0.5) {
          const target = otherWolves[Math.floor(Math.random() * otherWolves.length)];
          const res = game.submitAction({
            userId: whiteWolfBot.id,
            roleId: 'WHITE_WOLF',
            type: 'WHITE_WOLF_KILL',
            targetId: target.id,
            nightNumber: game.nightNumber,
            phase: 'NIGHT',
          });
          if (res.success) {
            count++;
            logs.push(`Bot Sói trắng (${whiteWolfBot.name}) đã chọn giết đồng loại.`);
          }
        }
      }
    }

    // 7. Bác sĩ (Doctor - Werewolf Online)
    const doctorBot = aliveBots.find((p) => p.roleId === 'DOCTOR');
    if (doctorBot) {
      const validTargets = alivePlayers.filter((p) => {
        if (p.id === doctorBot.skills.doctorLastProtectedTargetId) return false;
        return true;
      });
      if (validTargets.length > 0) {
        const target = validTargets[Math.floor(Math.random() * validTargets.length)];
        const res = game.submitAction({
          userId: doctorBot.id,
          roleId: 'DOCTOR',
          type: 'DOCTOR_PROTECT',
          targetId: target.id,
          nightNumber: game.nightNumber,
          phase: 'NIGHT',
        });
        if (res.success) {
          count++;
          logs.push(`Bot Bác sĩ (${doctorBot.name}) đã chọn mục tiêu bảo vệ.`);
        }
      }
    }

    // 8. Thám tử (Detective - Werewolf Online)
    const detectiveBot = aliveBots.find((p) => p.roleId === 'DETECTIVE');
    if (detectiveBot) {
      const candidates = alivePlayers.filter((p) => p.id !== detectiveBot.id);
      if (candidates.length >= 2) {
        const shuffled = [...candidates].sort(() => Math.random() - 0.5);
        const p1 = shuffled[0];
        const p2 = shuffled[1];
        const res = game.submitAction({
          userId: detectiveBot.id,
          roleId: 'DETECTIVE',
          type: 'DETECTIVE_INVESTIGATE',
          targetId: p1.id,
          secondaryTargetId: p2.id,
          nightNumber: game.nightNumber,
          phase: 'NIGHT',
        });
        if (res.success) {
          count++;
          logs.push(`Bot Thám tử (${detectiveBot.name}) đã chọn 2 người để điều tra.`);
        }
      }
    }

    // 9. Sói tiên tri (Wolf Seer - Werewolf Online)
    const wolfSeerBot = aliveBots.find((p) => p.roleId === 'WOLF_SEER');
    const aliveWolvesCount = alivePlayers.filter((p) => p.faction === 'WEREWOLF').length;
    if (wolfSeerBot && aliveWolvesCount > 1) {
      const nonWolves = alivePlayers.filter((p) => p.faction !== 'WEREWOLF');
      const targetPool = nonWolves.length > 0 ? nonWolves : alivePlayers.filter((p) => p.id !== wolfSeerBot.id);
      if (targetPool.length > 0) {
        const target = targetPool[Math.floor(Math.random() * targetPool.length)];
        const res = game.submitAction({
          userId: wolfSeerBot.id,
          roleId: 'WOLF_SEER',
          type: 'WOLF_SEER_INVESTIGATE',
          targetId: target.id,
          nightNumber: game.nightNumber,
          phase: 'NIGHT',
        });
        if (res.success) {
          count++;
          logs.push(`Bot Sói tiên tri (${wolfSeerBot.name}) đã chọn soi vai trò.`);
        }
      }
    }

    // 10. Kẻ sát nhân (Serial Killer - Werewolf Online)
    const serialKillerBot = aliveBots.find((p) => p.roleId === 'SERIAL_KILLER');
    if (serialKillerBot) {
      const candidates = alivePlayers.filter((p) => p.id !== serialKillerBot.id);
      if (candidates.length > 0) {
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        const res = game.submitAction({
          userId: serialKillerBot.id,
          roleId: 'SERIAL_KILLER',
          type: 'SERIAL_KILLER_KILL',
          targetId: target.id,
          nightNumber: game.nightNumber,
          phase: 'NIGHT',
        });
        if (res.success) {
          count++;
          logs.push(`Bot Kẻ sát nhân (${serialKillerBot.name}) đã chọn mục tiêu hạ sát.`);
        }
      }
    }

    return { actionsSubmitted: count, logs };
  }

  /**
   * Tự động thực hiện bỏ phiếu treo cổ ban ngày cho tất cả Bot còn sống
   */
  public static performDayVotes(game: WerewolfGame): { votesSubmitted: number } {
    let count = 0;
    const alivePlayers = Array.from(game.players.values()).filter((p) => p.isAlive);
    const aliveBots = alivePlayers.filter((p) => p.isBot && p.canVote);

    for (const bot of aliveBots) {
      let candidates: Player[];

      // Nếu là Tiên tri và từng soi ra Sói còn sống, Tiên tri kiên quyết vote con Sói đó!
      if (bot.roleId === 'SEER') {
        const investigatedWolves = game.actions
          .filter((a) => a.type === 'SEER_INVESTIGATE' && a.userId === bot.id && a.targetId)
          .map((a) => game.players.get(a.targetId!))
          .filter(
            (p): p is Player =>
              Boolean(p && p.isAlive && (p.faction === 'WEREWOLF' || (game.customRoles[p.roleId] as any)?.seenAsWolfBySeer))
          );

        if (investigatedWolves.length > 0) {
          candidates = investigatedWolves;
        } else {
          candidates = alivePlayers.filter((p) => p.id !== bot.id);
        }
      } else if (bot.faction === 'WEREWOLF') {
        // Nếu là Sói, ưu tiên biểu quyết treo cổ người phe Dân
        const nonWolves = alivePlayers.filter((p) => p.faction !== 'WEREWOLF');
        candidates = nonWolves.length > 0 ? nonWolves : alivePlayers.filter((p) => p.id !== bot.id);
      } else {
        candidates = alivePlayers.filter((p) => p.id !== bot.id);
      }

      // 10% cơ hội bỏ phiếu trắng (ngoại trừ Tiên tri đã tìm ra sói)
      const isSeerWithTarget = bot.roleId === 'SEER' && candidates.some((c) => c.faction === 'WEREWOLF');
      if (!isSeerWithTarget && (Math.random() < 0.1 || candidates.length === 0)) {
        const res = game.submitAction({
          userId: bot.id,
          roleId: bot.roleId,
          type: 'DAY_VOTE_SKIP',
          nightNumber: game.nightNumber,
          phase: 'VOTING',
        });
        if (res.success) count++;
      } else {
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        const res = game.submitAction({
          userId: bot.id,
          roleId: bot.roleId,
          type: 'DAY_VOTE',
          targetId: target.id,
          nightNumber: game.nightNumber,
          phase: 'VOTING',
        });
        if (res.success) count++;
      }
    }

    return { votesSubmitted: count };
  }

  /**
   * Tạo tin nhắn thảo luận sinh động cho các Bot trong pha thảo luận ban ngày (DISCUSSION)
   * - Tiên tri nếu soi ra Sói sẽ tố cáo mạnh mẽ, nếu soi ra Dân sẽ bảo vệ.
   * - Sói sẽ giả làm Dân làng chân chính, nghi ngờ người khác hoặc đóng vai dân vô tội ngủ say.
   * - Kẻ chán đời sẽ khiêu khích để được treo cổ.
   * - Thợ săn cảnh cáo bầy sói không được chạm vào mình.
   */
  public static generateDiscussionChat(game: WerewolfGame): BotChatMessage[] {
    const alivePlayers = Array.from(game.players.values()).filter((p) => p.isAlive);
    const aliveBots = alivePlayers.filter((p) => p.isBot);

    if (aliveBots.length === 0) return [];

    const messages: BotChatMessage[] = [];
    const aliveNonWolves = alivePlayers.filter((p) => p.faction !== 'WEREWOLF');

    // 1. Kiểm tra Bot Tiên tri
    const seerBot = aliveBots.find((b) => b.roleId === 'SEER');
    let accusedWolfPlayer: Player | null = null;

    if (seerBot) {
      // Tìm xem có ai từng soi ra là sói và còn sống không
      const seerActions = game.actions.filter(
        (a) => a.type === 'SEER_INVESTIGATE' && a.userId === seerBot.id && a.targetId
      );
      const investigatedAlive = seerActions
        .map((a) => game.players.get(a.targetId!))
        .filter((p): p is Player => Boolean(p && p.isAlive));

      const foundWolf = investigatedAlive.find(
        (p) => p.faction === 'WEREWOLF' || (game.customRoles[p.roleId] as any)?.seenAsWolfBySeer
      );

      if (foundWolf) {
        accusedWolfPlayer = foundWolf;
        const seerWolfDialogues = [
          `Hôm qua tui là Tiên tri soi **${foundWolf.name}** ra là SÓI 100% rồi nha bà con, hôm nay dồn phiếu treo cổ nó đi!`,
          `Đêm qua quả cầu pha lê của tui báo **${foundWolf.name}** mang dòng máu Ma Sói! Đừng để nó biện hộ!`,
          `Tin tui đi cả làng ơi, tui là Tiên tri và đêm qua đã soi trúng con SÓI **${foundWolf.name}** rồi, hôm nay treo nó ngay!`,
          `Tui soi **${foundWolf.name}** đêm qua rồi, hiện nguyên hình Ma Sói luôn. Làng mình đừng bị nó dắt mũi nha!`,
        ];
        messages.push({
          botId: seerBot.id,
          botName: seerBot.name,
          text: seerWolfDialogues[Math.floor(Math.random() * seerWolfDialogues.length)],
          delaySec: 1.5,
        });
      } else if (investigatedAlive.length > 0) {
        const innocent = investigatedAlive[investigatedAlive.length - 1];
        const seerInnocentDialogues = [
          `Đêm qua tui là Tiên tri soi thử **${innocent.name}**, bạn này là Dân lành lương thiện nha, đừng ai nghi oan!`,
          `Tui bảo chứng cho **${innocent.name}**, đêm qua soi thấy người tốt, làng mình đừng vote nhầm nha.`,
          `Tui là Tiên tri đã kiểm tra **${innocent.name}** rồi, hoàn toàn trong sạch nhé mọi người!`,
        ];
        messages.push({
          botId: seerBot.id,
          botName: seerBot.name,
          text: seerInnocentDialogues[Math.floor(Math.random() * seerInnocentDialogues.length)],
          delaySec: 2,
        });
      } else {
        const seerGeneralDialogues = [
          `Mọi người thảo luận xem ai khả nghi nhất đi, để đêm nay Tiên tri tui soi chân tướng cho!`,
          `Hi vọng đêm nay tui sẽ soi trúng hang ổ của bầy sói hung ác.`,
        ];
        messages.push({
          botId: seerBot.id,
          botName: seerBot.name,
          text: seerGeneralDialogues[Math.floor(Math.random() * seerGeneralDialogues.length)],
          delaySec: 2,
        });
      }
    }

    // 2. Các bot còn lại tham gia thảo luận (tối đa thêm 3-4 bot)
    const otherBots = aliveBots.filter((b) => b.id !== seerBot?.id).sort(() => Math.random() - 0.5);
    const discussionLimit = Math.min(otherBots.length, 4);

    for (let i = 0; i < discussionLimit; i++) {
      const bot = otherBots[i];
      let delay = messages.length === 0 ? 2 + i * 5 : (accusedWolfPlayer ? 7.5 : 5.5) + i * 5;
      let text = '';

      if (bot.faction === 'WEREWOLF') {
        // Nếu chính con sói này bị Tiên tri vừa tố giác ở trên, nó sẽ cãi lại kịch liệt!
        if (accusedWolfPlayer && accusedWolfPlayer.id === bot.id) {
          const wolfDefendDialogues = [
            `Ủa gì vậy trời? Tui là Dân làng chân chính từ đầu tới giờ nha, đừng có vu khống! Chắc bạn là Sói giả mạo Tiên tri để hại dân rồi!`,
            `Oan uổng quá làng ơi! Tui dân đen 100%, bạn kia vu oan tui kìa! Ai tin bạn đó là trúng kế của Sói rồi!`,
            `Đừng nghe nó lừa bà con ơi! Tui đêm qua ngủ say như cún, ai là sói chứ tui người tốt nha!`,
          ];
          text = wolfDefendDialogues[Math.floor(Math.random() * wolfDefendDialogues.length)];
          delay = 4.5; // Cãi lại ngay sau khi bị tố giác
        } else {
          // Sói đóng giả làm dân lương thiện, nghi ngờ người khác
          const suspectVillager = aliveNonWolves.find((p) => p.id !== bot.id);
          const suspectName = suspectVillager ? suspectVillager.name : 'ai đó';
          const wolfPretendDialogues = [
            `Tui là Dân làng gộc chân chính nha, đêm qua tui ngủ ngon lành cành đào, đừng ai nghi oan tui!`,
            `Thấy bạn **${suspectName}** nãy giờ cứ im im ít nói bất thường, khả nghi là Sói trà trộn lắm nè...`,
            `Đêm qua bầy Sói hung ác quá! May mà tui không bị xé xác, hôm nay làng mình phải đồng lòng tìm ra Sói mới được!`,
            `Làng mình bình tĩnh nha, đừng để Sói chia rẽ nội bộ, tui bảo đảm tui phe Dân 100%!`,
            `Bà con chú ý thái độ của bạn **${suspectName}**, nãy giờ lén lút khả nghi ghê á.`,
          ];
          text = wolfPretendDialogues[Math.floor(Math.random() * wolfPretendDialogues.length)];
        }
      } else if (bot.roleId === 'BODYGUARD') {
        const suspect = alivePlayers.find((p) => p.id !== bot.id);
        const bgDialogues = [
          `Đêm qua tui có che chở cho một người, may là sáng dậy thấy làng vẫn an lành.`,
          `Hi vọng đêm nay khiên chắn của tui tiếp tục bảo vệ đúng người sói nhắm tới.`,
          `Tui có linh cảm không lành về bạn **${suspect?.name || 'mấy người im lặng'}**, mọi người để ý xem sao.`,
        ];
        text = bgDialogues[Math.floor(Math.random() * bgDialogues.length)];
      } else if (bot.roleId === 'WITCH') {
        const witchDialogues = [
          `Đêm qua suýt có người mất mạng đó nha, may mà có phép màu cứu sống!`,
          `Mọi người phân tích kỹ vào, ai mà sơ hở lộ mặt chuột là coi chừng bình độc của phù thủy đấy!`,
          `Bà con đừng vội vàng, cứ thảo luận kỹ xem ai có biểu hiện bất thường nhất.`,
        ];
        text = witchDialogues[Math.floor(Math.random() * witchDialogues.length)];
      } else if (bot.roleId === 'HUNTER') {
        const hunterDialogues = [
          `Cảnh báo bầy Sói nha, súng tui lúc nào cũng đút sẵn đạn, đụng vô tui là kéo chết chung đó!`,
          `Ai mà vote treo tui hôm nay là tui bắn gục một người ngay trước khi chết đó, liệu mà vote!`,
          `Làng mình có ai có thông tin gì chắc chắn chưa? Khai mau để tui biết đường nhắm súng!`,
        ];
        text = hunterDialogues[Math.floor(Math.random() * hunterDialogues.length)];
      } else if (bot.roleId === 'CUPID') {
        const cupidDialogues = [
          `Mũi tên tình yêu của tui đã ghép nối hai trái tim rồi, mong hai người bảo vệ nhau thật tốt!`,
          `Tình yêu sẽ chiến thắng bóng tối! Làng mình hôm nay bình tĩnh thảo luận đừng vote nhầm người tốt nha.`,
          `Đêm qua tui đã se duyên xong xuôi, giờ chỉ mong bầy sói không cắn trúng cặp uyên ương.`,
        ];
        text = cupidDialogues[Math.floor(Math.random() * cupidDialogues.length)];
      } else if (bot.roleId === 'IDIOT') {
        const idiotDialogues = [
          `Ủa rồi nãy giờ mọi người nói gì tui hông hiểu gì hết trơn á 🤡`,
          `Tui thấy ai trong làng cũng dễ thương hết trơn, sao mọi người cứ nghi ngờ nhau hoài vậy nè!`,
          `Đừng có ai vote treo cổ tui nha, tui vô tội chỉ thích đi dạo ngắm cảnh thôi à!`,
        ];
        text = idiotDialogues[Math.floor(Math.random() * idiotDialogues.length)];
      } else if (bot.roleId === 'TANNER' || bot.roleId === 'FOOL') {
        const tannerDialogues = [
          `Tui chính là Ma Sói đầu đàn nè, ngon thì cả làng dồn phiếu treo cổ tui đi xem nào!`,
          `Cuộc đời này chán chường quá rồi, hôm nay bà con treo cổ tui lên giàn thiêu đi cho thanh thản!`,
          `Ai dám vote tui không? Nghi ngờ gì nữa mà không vote tui đi nào!`,
          `Cả làng vote treo cổ tui đi xem nào, tui không giãy giụa đâu 🤡`,
        ];
        text = tannerDialogues[Math.floor(Math.random() * tannerDialogues.length)];
      } else if (bot.roleId === 'DOCTOR') {
        const docDialogues = [
          `Đêm qua Bác sĩ tui đã chuẩn bị ống tiêm cứu chữa rồi, hi vọng người tui bảo vệ vẫn bình an!`,
          `Làng mình cứ bình tĩnh phân tích, đêm nay tui sẽ cố gắng cứu đúng người bị hại.`,
          `Y đức của Bác sĩ sẽ luôn đứng về phía dân làng lương thiện!`,
        ];
        text = docDialogues[Math.floor(Math.random() * docDialogues.length)];
      } else if (bot.roleId === 'DETECTIVE') {
        // Thám tử kiểm tra
        const detActions = game.actions.filter(
          (a) => a.type === 'DETECTIVE_INVESTIGATE' && a.userId === bot.id
        );
        if (detActions.length > 0) {
          const lastDet = detActions[detActions.length - 1];
          const p1 = game.players.get(lastDet.targetId || '');
          const p2 = game.players.get(lastDet.secondaryTargetId || '');
          if (p1 && p2 && p1.isAlive && p2.isAlive) {
            const sameTeam = p1.faction === p2.faction;
            text = sameTeam
              ? `Thám tử tui đêm qua đã điều tra **${p1.name}** và **${p2.name}**, kết quả họ CÙNG MỘT PHE nha!`
              : `Thám tử tui đêm qua đối chiếu **${p1.name}** và **${p2.name}**, kết quả họ KHÁC PHE! 1 trong 2 người có vấn đề đó!`;
          } else {
            text = `Thám tử tui đang thu thập manh mối, mọi người nói nhiều lên để tui tìm sơ hở!`;
          }
        } else {
          text = `Thám tử tui đang quan sát xem ai là kẻ đáng ngờ nhất đây.`;
        }
      } else if (bot.roleId === 'GUNNER') {
        const bullets = bot.skills.gunnerBulletsRemaining ?? 0;
        const gunnerDialogues = [
          `Xạ thủ tui còn ${bullets} viên đạn bạc trong nòng súng nha, đứa nào cãi bậy tui nổ súng ban ngày luôn ráng chịu!`,
          `Cả làng chỉ điểm con sói khả nghi nhất đi, súng tui đã lên đạn sẵn sàng khai hỏa rồi!`,
          `Đừng ai làm loạn, Xạ thủ tui đang ngắm bắn đứa nào sơ hở là bay màu ngay!`,
        ];
        text = gunnerDialogues[Math.floor(Math.random() * gunnerDialogues.length)];
      } else if (bot.roleId === 'SERIAL_KILLER') {
        const skDialogues = [
          `Trời ơi làng mình dạo này loạn lạc ghê, đêm nào cũng có án mạng, tui sợ quá!`,
          `Tui là dân hiền lành nha, mong đêm nay không bị kẻ nào đâm sau lưng...`,
          `Hôm nay phải tìm ra kẻ sát nhân lẫn ma sói mới được, ghê rợn quá bà con ơi!`,
        ];
        text = skDialogues[Math.floor(Math.random() * skDialogues.length)];
      } else {
        // Dân làng thường
        const lastDawn = game.lastDawnResult;
        const deaths = lastDawn?.deaths || [];
        const suspect = alivePlayers.find((p) => p.id !== bot.id);
        const villDialogues = [
          deaths.length > 0
            ? `Sáng ra thấy **${deaths[0].player.name}** ngã xuống xót xa quá, làng mình phải đồng lòng tìm ra con sói ác độc!`
            : `May quá đêm qua một đêm bình yên không ai bị hại, chắc chắn phe Sói đã bị chặn đứng rồi!`,
          `Tui là dân đen vô tội nha, nãy giờ nghe mọi người nói mà hoang mang quá.`,
          `Thấy bạn **${suspect?.name || 'ai đó'}** có vẻ đáng ngờ ghê, mọi người thấy sao?`,
          `Hôm nay cả làng phải đoàn kết, dồn phiếu đúng người mới thắng được sói!`,
          `Mong là đêm nay Tiên tri soi ra sói chỉ điểm cho làng mình.`,
        ];
        text = villDialogues[Math.floor(Math.random() * villDialogues.length)];
      }

      if (text) {
        messages.push({
          botId: bot.id,
          botName: bot.name,
          text,
          delaySec: delay,
        });
      }
    }

    // Sắp xếp tin nhắn theo độ trễ thời gian tăng dần
    return messages.sort((a, b) => a.delaySec - b.delaySec);
  }

  /**
   * Tạo lời bình luận của Bot khi tiến hành biểu quyết treo cổ (VOTING).
   * Giữ bí mật tuyệt đối lá phiếu của bot, KHÔNG làm lộ danh tính người bị vote.
   */
  public static generateVotingComments(game: WerewolfGame): Array<{ botId: string; botName: string; text: string }> {
    const comments: Array<{ botId: string; botName: string; text: string }> = [];
    const botVotes = game.currentPhaseActions.filter(
      (a) => (a.type === 'DAY_VOTE' || a.type === 'DAY_VOTE_SKIP') && game.players.get(a.userId)?.isBot
    );

    // Lấy ngẫu nhiên tối đa 1 bot đã vote để bình luận nhẹ nhàng giữ bí mật
    const sampleVotes = [...botVotes].sort(() => Math.random() - 0.5).slice(0, 1);

    for (const v of sampleVotes) {
      const bot = game.players.get(v.userId);
      if (!bot) continue;

      const secretVoteDialogues = [
        'Tui đã hoàn thành bỏ phiếu bí mật rồi nha! Giữ kín lá phiếu cho hồi hộp.',
        'Đã gửi lá phiếu vào hòm phiếu! Chờ xem ai sẽ bị đưa lên giàn treo cổ.',
        'Tui đã vote xong rồi, hy vọng hôm nay làng mình quyết định sáng suốt!',
        'Đã bỏ phiếu xong, kết quả ra sao hồi sau sẽ rõ nha mọi người.',
      ];

      comments.push({
        botId: bot.id,
        botName: bot.name,
        text: secretVoteDialogues[Math.floor(Math.random() * secretVoteDialogues.length)],
      });
    }

    return comments;
  }

  /**
   * Bot Thợ săn tự động nổ súng trả thù khi tử trận
   */
  public static performHunterShot(game: WerewolfGame, hunterId: string): Player | null {
    const hunter = game.players.get(hunterId);
    if (!hunter || !hunter.isBot) return null;

    // Đảm bảo pendingHunterId được thiết lập cho lượt bắn
    game.pendingHunterId = hunterId;

    const aliveTargets = Array.from(game.players.values()).filter((p) => p.isAlive && p.id !== hunterId);
    if (aliveTargets.length === 0) return null;

    const shotTarget = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
    const res = game.handleHunterShot(shotTarget.id);
    return res.success ? shotTarget : null;
  }
}
