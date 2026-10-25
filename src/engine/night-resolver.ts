import {
  GameConfig,
  NightResolutionResult,
  Player,
  PlayerAction,
  RoleId,
} from './types';
import { STANDARD_ROLES } from './roles';

export class NightResolver {
  /**
   * Xử lý toàn bộ các hành động trong đêm theo đúng thứ tự logic đã được định nghĩa.
   * Đảm bảo tính toán xác định (deterministic), không phụ thuộc vào trạng thái Discord.
   */
  public static resolveNight(
    nightNumber: number,
    players: Map<string, Player>,
    actions: PlayerAction[],
    config: GameConfig,
    activeBerserkPierce: boolean
  ): {
    result: NightResolutionResult;
    updatedPlayers: Map<string, Player>;
    nextNightBerserkPierce: boolean;
  } {
    const updatedPlayers = new Map<string, Player>();
    for (const [id, p] of players.entries()) {
      updatedPlayers.set(id, JSON.parse(JSON.stringify(p)));
    }

    const logs: string[] = [];
    const investigationResults: NightResolutionResult['investigationResults'] = [];
    const detectiveResults: NonNullable<NightResolutionResult['detectiveResults']> = [];
    const wolfSeerResults: NonNullable<NightResolutionResult['wolfSeerResults']> = [];
    const deaths: NightResolutionResult['deaths'] = [];

    let wolfVictimId: string | null = null;
    let wolfVictimId2: string | null = null;
    let wolfVictimIds: string[] = [];
    let serialKillerVictimId: string | null = null;
    let wasSerialKillerImmune = false;
    let wasProtected = false;
    let wasHealed = false;
    let wasInfected = false;
    let newWerewolfId: string | null = null;
    let berserkTriggeredNextNight = false;
    let hunterTriggeredId: string | null = null;

    // 0. Sói Cuồng Nộ: Phế kỹ năng của 1 người chơi (Cứ mỗi 1 sói chết = 1 lượt)
    let silencedUserId: string | null = null;
    const berserkAction = actions.find((a) => a.type === 'BERSERK_DISABLE');
    if (berserkAction && berserkAction.targetId) {
      const berserkPlayer = updatedPlayers.get(berserkAction.userId);
      if (berserkPlayer && berserkPlayer.isAlive && berserkPlayer.roleId === 'BERSERK_WOLF') {
        const deadWolvesCount = Array.from(players.values()).filter(
          (p) =>
            !p.isAlive &&
            (p.faction === 'WEREWOLF' ||
              p.originalRoleId === 'ALPHA_WOLF' ||
              p.originalRoleId === 'WEREWOLF' ||
              p.originalRoleId === 'DEMON_WOLF' ||
              p.originalRoleId === 'BERSERK_WOLF' ||
              p.originalRoleId === 'WOLF_SEER' ||
              p.originalRoleId === 'WHITE_WOLF')
        ).length;
        const usedDisables = berserkPlayer.skills.berserkUsedDisables || 0;
        if (deadWolvesCount > usedDisables) {
          const target = updatedPlayers.get(berserkAction.targetId);
          if (target && target.isAlive && target.faction !== 'WEREWOLF') {
            silencedUserId = target.id;
            berserkPlayer.skills.berserkUsedDisables = usedDisables + 1;
            logs.push(`⚡ Sói Cuồng Nộ đã phế bỏ hoàn toàn kỹ năng của ${target.name} đêm nay!`);
          }
        }
      }
    }

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

    // 2. Bảo vệ & Bác sĩ: Chọn mục tiêu bảo vệ
    const bodyguardActions = actions.filter((a) => a.type === 'BODYGUARD_PROTECT');
    const doctorActions = actions.filter((a) => a.type === 'DOCTOR_PROTECT');
    const protectedPlayerIds = new Set<string>();

    for (const act of bodyguardActions) {
      const bg = updatedPlayers.get(act.userId);
      if (!bg || !bg.isAlive) continue;

      if (silencedUserId && bg.id === silencedUserId) {
        logs.push(`⚡ Kỹ năng bảo vệ của Bảo vệ ${bg.name} đã bị Sói Cuồng Nộ phế bỏ đêm nay!`);
        continue;
      }

      const targetId = act.targetId;
      if (!targetId) continue;

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

    for (const act of doctorActions) {
      const doc = updatedPlayers.get(act.userId);
      if (!doc || !doc.isAlive) continue;

      if (silencedUserId && doc.id === silencedUserId) {
        logs.push(`⚡ Kỹ năng chữa trị của Bác sĩ ${doc.name} đã bị Sói Cuồng Nộ phế bỏ đêm nay!`);
        continue;
      }

      const targetId = act.targetId;
      if (!targetId) continue;

      if (doc.skills.doctorLastProtectedTargetId === targetId) {
        logs.push(`Bác sĩ ${doc.name} không thể bảo vệ cùng một người 2 đêm liên tiếp.`);
        continue;
      }

      protectedPlayerIds.add(targetId);
      doc.skills.doctorLastProtectedTargetId = targetId;
      logs.push(`Bác sĩ ${doc.name} đã chữa trị bảo hộ mục tiêu khỏi cái chết.`);
    }

    // Kiểm tra trạng thái kích hoạt của Sói Trùm:
    // Có ít nhất 1 Sói Trùm còn sống VÀ chưa có bất kỳ con sói nào chết trước đêm này
    const hasAnyWolfDied = Array.from(players.values()).some(
      (p) =>
        !p.isAlive &&
        (p.faction === 'WEREWOLF' ||
          p.originalRoleId === 'ALPHA_WOLF' ||
          p.originalRoleId === 'WEREWOLF' ||
          p.originalRoleId === 'DEMON_WOLF' ||
          p.originalRoleId === 'BERSERK_WOLF' ||
          p.originalRoleId === 'WOLF_SEER' ||
          p.originalRoleId === 'WHITE_WOLF')
    );
    const hasAliveAlphaWolf = Array.from(players.values()).some(
      (p) => p.isAlive && p.roleId === 'ALPHA_WOLF'
    );
    const isAlphaWolfActive = hasAliveAlphaWolf && !hasAnyWolfDied;

    // 3. Quyết định mục tiêu bị Sói cắn (Tổng hợp vote của bầy sói)
    const wolfVotes = actions.filter((a) => a.type === 'WOLF_VOTE');
    const voteCounts = new Map<string, number>();

    for (const vote of wolfVotes) {
      const wolf = updatedPlayers.get(vote.userId);
      // Chỉ thành viên phe sói còn sống mới được vote cắn
      if (!wolf || !wolf.isAlive || wolf.faction !== 'WEREWOLF') continue;

      if (vote.targetId) {
        const target = updatedPlayers.get(vote.targetId);
        // Bầy sói không được vote cắn đồng đội phe Sói
        if (target && target.isAlive && target.faction !== 'WEREWOLF') {
          voteCounts.set(vote.targetId, (voteCounts.get(vote.targetId) || 0) + 1);
        }
      }

      if (vote.secondaryTargetId && isAlphaWolfActive) {
        const target2 = updatedPlayers.get(vote.secondaryTargetId);
        // Bầy sói không được vote cắn đồng đội phe Sói
        if (target2 && target2.isAlive && target2.faction !== 'WEREWOLF' && target2.id !== vote.targetId) {
          voteCounts.set(vote.secondaryTargetId, (voteCounts.get(vote.secondaryTargetId) || 0) + 1);
        }
      }
    }

    if (voteCounts.size > 0) {
      if (!isAlphaWolfActive) {
        // Tìm mục tiêu có số phiếu cao nhất (1 nạn nhân)
        let maxVotes = 0;
        let topTargets: string[] = [];
        for (const [tId, count] of voteCounts.entries()) {
          if (count > maxVotes) {
            maxVotes = count;
            topTargets = [tId];
          } else if (count === maxVotes) {
            topTargets.push(tId);
          }
        }

        if (topTargets.length === 1) {
          wolfVictimIds.push(topTargets[0]);
        } else {
          // Hòa phiếu: Theo cấu hình (Mặc định không cắn ai hoặc ngẫu nhiên)
          if (config.rules.wolfTieAction === 'RANDOM') {
            const picked = topTargets[Math.floor(Math.random() * topTargets.length)];
            wolfVictimIds.push(picked);
            logs.push(`Bầy sói hòa phiếu, nạn nhân được chọn ngẫu nhiên.`);
          } else {
            logs.push(`Bầy sói không đạt được đồng thuận, đêm nay không có ai bị cắn.`);
          }
        }
      } else {
        // Sói Trùm kích hoạt: Cắn 2 nạn nhân đêm nay!
        const sortedEntries = Array.from(voteCounts.entries()).sort((a, b) => b[1] - a[1]);

        if (sortedEntries.length === 1) {
          wolfVictimIds.push(sortedEntries[0][0]);
          logs.push(`👑 Sói Trùm: Bầy sói thống nhất cắn 1 nạn nhân.`);
        } else {
          const maxVotes = sortedEntries[0][1];
          const topTier = sortedEntries.filter((e) => e[1] === maxVotes).map((e) => e[0]);

          if (topTier.length >= 2) {
            if (topTier.length === 2) {
              wolfVictimIds.push(topTier[0], topTier[1]);
            } else {
              if (config.rules.wolfTieAction === 'RANDOM') {
                const shuffled = [...topTier].sort(() => Math.random() - 0.5);
                wolfVictimIds.push(shuffled[0], shuffled[1]);
                logs.push(`👑 Sói Trùm: Nhiều mục tiêu hòa phiếu, bầy sói ngẫu nhiên chọn 2 nạn nhân.`);
              } else {
                wolfVictimIds.push(topTier[0]);
              }
            }
          } else {
            // topTier chỉ có 1 người (Mục tiêu 1)
            wolfVictimIds.push(topTier[0]);
            // Tìm mục tiêu thứ 2 từ số phiếu tiếp theo
            const remaining = sortedEntries.filter((e) => e[1] < maxVotes);
            if (remaining.length > 0) {
              const secondMax = remaining[0][1];
              const secondTier = remaining.filter((e) => e[1] === secondMax).map((e) => e[0]);
              if (secondTier.length === 1) {
                wolfVictimIds.push(secondTier[0]);
              } else {
                const pickedSecond = secondTier[Math.floor(Math.random() * secondTier.length)];
                wolfVictimIds.push(pickedSecond);
              }
            }
          }
          logs.push(`👑 Sói Trùm uy quyền: Bầy sói mở cuộc tấn công đúp cắn 2 nạn nhân đêm nay!`);
        }
      }
    }

    wolfVictimId = wolfVictimIds[0] || null;
    wolfVictimId2 = wolfVictimIds[1] || null;

    // 4. Kiểm tra Sói quỷ (Lây lan hay cắn chết)
    let demonWolfAttemptInfect = false;
    let demonWolfPlayer = Array.from(updatedPlayers.values()).find(
      (p) => p.isAlive && p.roleId === 'DEMON_WOLF'
    );
    if (demonWolfPlayer && demonWolfPlayer.skills.demonWolfInfectRemaining > 0) {
      const infectAction = actions.find((a) => a.type === 'DEMON_WOLF_INFECT' && a.userId === demonWolfPlayer?.id);
      const killAction = actions.find((a) => a.type === 'DEMON_WOLF_KILL_MODE' && a.userId === demonWolfPlayer?.id);
      if (killAction) {
        demonWolfAttemptInfect = false;
      } else if (infectAction || demonWolfPlayer.skills.demonWolfMode === 'INFECT') {
        demonWolfAttemptInfect = true;
      }
    }

    // 5. Phù thủy: Hành động cứu / độc
    const witchHealAction = actions.find((a) => a.type === 'WITCH_HEAL');
    const witchPoisonAction = actions.find((a) => a.type === 'WITCH_POISON');
    let poisonedVictimId: string | null = null;

    // Xử lý Cứu
    if (witchHealAction && wolfVictimId) {
      const witch = updatedPlayers.get(witchHealAction.userId);
      if (witch && witch.isAlive && witch.skills.witchHealRemaining > 0) {
        if (silencedUserId && witch.id === silencedUserId) {
          logs.push(`⚡ Kỹ năng bình cứu của Phù thủy ${witch.name} đã bị Sói Cuồng Nộ phế bỏ đêm nay!`);
        } else {
          // Kiểm tra luật tự cứu của Phù thủy
          let canHeal = true;
          if (wolfVictimId === witch.id) {
            if (nightNumber === 1 && !config.rules.witchCanSelfHealFirstNightOnly && !config.rules.witchCanSelfHealAlways) {
              canHeal = false;
            } else if (nightNumber > 1 && !config.rules.witchCanSelfHealAlways) {
              canHeal = false;
            }
          }

          if (canHeal) {
            wasHealed = true;
            witch.skills.witchHealRemaining -= 1;
            logs.push(`Phù thủy đã sử dụng bình cứu.`);
          } else {
            logs.push(`Phù thủy không được phép tự cứu bản thân đêm nay theo luật.`);
          }
        }
      }
    }

    // Xử lý Độc
    if (witchPoisonAction && witchPoisonAction.targetId) {
      if (nightNumber === 1) {
        logs.push(`Theo luật Werewolf Online, Phù thủy không được dùng bình độc vào Đêm 1.`);
      } else {
        const witch = updatedPlayers.get(witchPoisonAction.userId);
        if (witch && witch.isAlive && witch.skills.witchPoisonRemaining > 0) {
          if (silencedUserId && witch.id === silencedUserId) {
            logs.push(`⚡ Kỹ năng bình độc của Phù thủy ${witch.name} đã bị Sói Cuồng Nộ phế bỏ đêm nay!`);
          } else {
            // Phù thủy chỉ được dùng tối đa 1 bình mỗi đêm
            if (wasHealed && witchHealAction?.userId === witch.id) {
              logs.push(`Phù thủy chỉ được dùng tối đa 1 bình mỗi đêm.`);
            } else {
              const target = updatedPlayers.get(witchPoisonAction.targetId);
              if (target && target.isAlive) {
                poisonedVictimId = target.id;
                witch.skills.witchPoisonRemaining -= 1;
                logs.push(`Phù thủy đã hạ độc một người.`);
              }
            }
          }
        }
      }
    }

    // 6. Tiên tri, Thám tử, Sói tiên tri soi
    const seerActions = actions.filter((a) => a.type === 'SEER_INVESTIGATE');
    for (const act of seerActions) {
      const seer = updatedPlayers.get(act.userId);
      if (!seer || !seer.isAlive) continue;
      if (!act.targetId) continue;

      const target = updatedPlayers.get(act.targetId);
      if (!target) continue;

      if (silencedUserId && seer.id === silencedUserId) {
        investigationResults.push({
          seerId: seer.id,
          targetId: target.id,
          isWolf: false,
          isSilenced: true,
        });
        logs.push(`⚡ Kỹ năng soi của Tiên tri ${seer.name} đã bị Sói Cuồng Nộ phế bỏ đêm nay!`);
        continue;
      }

      // Sói thường, Sói quỷ, Sói cuồng nộ, Sói trắng, Sói tiên tri đều là Sói
      const isWolf = target.faction === 'WEREWOLF' || target.roleId === 'WHITE_WOLF' || target.roleId === 'WOLF_SEER';
      investigationResults.push({
        seerId: seer.id,
        targetId: target.id,
        isWolf,
      });
      logs.push(`Tiên tri ${seer.name} đã thực hiện soi.`);
    }

    // Thám tử điều tra 2 người
    const detectiveActions = actions.filter((a) => a.type === 'DETECTIVE_INVESTIGATE');
    for (const act of detectiveActions) {
      const det = updatedPlayers.get(act.userId);
      if (!det || !det.isAlive) continue;
      if (!act.targetId || !act.secondaryTargetId) continue;

      const p1 = updatedPlayers.get(act.targetId);
      const p2 = updatedPlayers.get(act.secondaryTargetId);
      if (!p1 || !p2) continue;

      if (silencedUserId && det.id === silencedUserId) {
        detectiveResults.push({
          detectiveId: det.id,
          target1Id: p1.id,
          target2Id: p2.id,
          isSameTeam: false,
          isSilenced: true,
        });
        logs.push(`⚡ Kỹ năng điều tra của Thám tử ${det.name} đã bị Sói Cuồng Nộ phế bỏ đêm nay!`);
        continue;
      }

      const isSameTeam = p1.faction === p2.faction;
      detectiveResults.push({
        detectiveId: det.id,
        target1Id: p1.id,
        target2Id: p2.id,
        isSameTeam,
      });
      logs.push(`Thám tử ${det.name} đã điều tra mối liên kết giữa ${p1.name} và ${p2.name}.`);
    }

    // Sói tiên tri soi chính xác vai trò
    const wolfSeerActions = actions.filter((a) => a.type === 'WOLF_SEER_INVESTIGATE');
    for (const act of wolfSeerActions) {
      const ws = updatedPlayers.get(act.userId);
      if (!ws || !ws.isAlive) continue;
      if (!act.targetId) continue;

      if (silencedUserId && ws.id === silencedUserId) {
        logs.push(`⚡ Kỹ năng soi của Sói tiên tri ${ws.name} đã bị Sói Cuồng Nộ phế bỏ đêm nay!`);
        continue;
      }

      const aliveWolves = Array.from(updatedPlayers.values()).filter((p) => p.isAlive && p.faction === 'WEREWOLF');
      if (aliveWolves.length <= 1) {
        logs.push(`Sói tiên tri ${ws.name} là con sói cuối cùng còn sống nên không thể sử dụng kỹ năng soi.`);
        continue;
      }

      const target = updatedPlayers.get(act.targetId);
      if (!target) continue;

      const roleInfo = STANDARD_ROLES[target.roleId];
      const targetRoleName = roleInfo ? roleInfo.name : target.roleId;
      wolfSeerResults.push({
        wolfSeerId: ws.id,
        targetId: target.id,
        targetRoleId: target.roleId,
        targetRoleName,
      });
      logs.push(`Sói tiên tri ${ws.name} đã soi ra vai trò của ${target.name}.`);
    }

    // 7. Sói trắng cắn riêng (Từ đêm 2, mỗi đêm chẵn)
    let whiteWolfVictimId: string | null = null;
    if (nightNumber >= 2 && nightNumber % 2 === 0) {
      const whiteWolfAction = actions.find((a) => a.type === 'WHITE_WOLF_KILL');
      if (whiteWolfAction && whiteWolfAction.targetId) {
        const whiteWolf = updatedPlayers.get(whiteWolfAction.userId);
        if (whiteWolf && whiteWolf.isAlive && whiteWolf.roleId === 'WHITE_WOLF') {
          if (silencedUserId && whiteWolf.id === silencedUserId) {
            logs.push(`⚡ Kỹ năng cắn riêng của Sói trắng ${whiteWolf.name} đã bị Sói Cuồng Nộ phế bỏ đêm nay!`);
          } else {
            const target = updatedPlayers.get(whiteWolfAction.targetId);
            // Sói trắng có thể cắn Dân làng hoặc bất kỳ ai còn sống ngoại trừ bản thân
            if (target && target.isAlive && target.id !== whiteWolf.id) {
              whiteWolfVictimId = target.id;
              logs.push(`Sói trắng đã bí mật ra tay tiêu diệt một nạn nhân trong đêm.`);
            }
          }
        }
      }
    }

    // 8. Đánh giá kết quả đòn cắn bầy sói
    for (let i = 0; i < wolfVictimIds.length; i++) {
      const vId = wolfVictimIds[i];
      const victim = updatedPlayers.get(vId);
      if (!victim || !victim.isAlive) continue;

      const isProtected = protectedPlayerIds.has(vId);

      // Nếu có hiệu ứng Sói cuồng nộ (Berserk pierce): đòn cắn xuyên lớp bảo vệ
      if (isProtected && activeBerserkPierce) {
        logs.push(`Đòn cắn của Sói mang sức mạnh Cuồng nộ đã XUYÊN THỦNG lớp khiên bảo vệ của ${victim.name}!`);
      }

      const protectedEffective = isProtected && !activeBerserkPierce;
      if (i === 0) {
        wasProtected = protectedEffective;
      }

      const isSerialKiller = victim.roleId === 'SERIAL_KILLER' || victim.originalRoleId === 'SERIAL_KILLER';
      const healedThis = wasHealed && (witchHealAction?.targetId === vId || (!witchHealAction?.targetId && i === 0));

      if (isSerialKiller) {
        // Sát nhân mình đồng da sắt miễn nhiễm cắn đêm của bầy sói
        wasSerialKillerImmune = true;
        if (i === 0) wasProtected = true;
        logs.push(`Bầy sói đã cắn ${victim.name}, nhưng Kẻ sát nhân mình đồng da sắt đã miễn nhiễm với đòn cắn đêm!`);
      } else if (healedThis) {
        logs.push(`Nạn nhân ${victim.name} của bầy sói đã được Phù thủy cứu mạng.`);
      } else if (protectedEffective) {
        logs.push(`Nạn nhân ${victim.name} của bầy sói đã được Bảo vệ che chở bình an.`);
      } else {
        // Không được cứu và không được bảo vệ hiệu quả
        if (demonWolfAttemptInfect && demonWolfPlayer && i === 0) {
          // Chuyển hóa thành sói thành công!
          victim.faction = 'WEREWOLF';
          victim.roleId = 'WEREWOLF'; // Trở thành sói thường, mất kỹ năng cũ
          demonWolfPlayer.skills.demonWolfInfectRemaining -= 1; // Tiêu hao lượt
          wasInfected = true;
          newWerewolfId = victim.id;
          logs.push(`Nạn nhân ${victim.name} không chết mà đã bị Sói quỷ tha hóa thành Sói!`);
        } else {
          // Bị cắn chết
          victim.isAlive = false;
          victim.deathReason = 'WOLF_BITE';
          victim.deathNight = nightNumber;
          victim.deathPhase = 'NIGHT';
          deaths.push({ player: victim, reason: 'WOLF_BITE' });
          logs.push(`${victim.name} đã bị bầy sói cắn chết.`);
        }
      }

      // Nếu chuyển hóa thất bại do được cứu hoặc bảo vệ, không mất lượt của Sói quỷ
      if (demonWolfAttemptInfect && i === 0 && (healedThis || protectedEffective || isSerialKiller)) {
        logs.push(`Sói quỷ chuyển hóa thất bại do mục tiêu được bảo vệ/cứu. Lượt chuyển hóa không bị tiêu hao.`);
      }
    }

    // Sát nhân ra tay đâm chết nạn nhân
    const skAction = actions.find((a) => a.type === 'SERIAL_KILLER_KILL');
    if (skAction && skAction.targetId) {
      const sk = updatedPlayers.get(skAction.userId);
      if (sk && sk.isAlive && sk.roleId === 'SERIAL_KILLER') {
        if (silencedUserId && sk.id === silencedUserId) {
          logs.push(`⚡ Kỹ năng hạ sát của Kẻ sát nhân ${sk.name} đã bị Sói Cuồng Nộ phế bỏ đêm nay!`);
        } else {
          const skTarget = updatedPlayers.get(skAction.targetId);
          if (skTarget && skTarget.isAlive) {
            if (protectedPlayerIds.has(skTarget.id)) {
              logs.push(`Kẻ sát nhân đã đâm ${skTarget.name}, nhưng nạn nhân may mắn được che chở an toàn!`);
            } else {
              skTarget.isAlive = false;
              skTarget.deathReason = 'SERIAL_KILLER';
              skTarget.deathNight = nightNumber;
              skTarget.deathPhase = 'NIGHT';
              deaths.push({ player: skTarget, reason: 'SERIAL_KILLER' });
              serialKillerVictimId = skTarget.id;
              logs.push(`${skTarget.name} đã bị Kẻ sát nhân đâm chết bằng một nhát dao chí mạng.`);
            }
          }
        }
      }
    }

    // Phù thủy độc chết
    if (poisonedVictimId) {
      const poisonedTarget = updatedPlayers.get(poisonedVictimId)!;
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
      const whiteWolfTarget = updatedPlayers.get(whiteWolfVictimId)!;
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
        } else if (silencedUserId && deadPlayer.id === silencedUserId) {
          logs.push(`⚡ Thợ săn ${deadPlayer.name} đã bị Sói Cuồng Nộ phế kỹ năng nên không thể nổ súng trả thù!`);
        } else {
          hunterTriggeredId = deadPlayer.id;
          logs.push(`Thợ săn ${deadPlayer.name} tử trận! Khẩu súng săn chuẩn bị khai hỏa.`);
        }
      }
    }

    return {
      result: {
        deaths,
        wolfVictimId,
        wolfVictimId2,
        wolfVictimIds,
        wasProtected,
        wasHealed,
        wasInfected,
        newWerewolfId,
        berserkTriggeredNextNight,
        silencedUserId,
        hunterTriggeredId,
        serialKillerVictimId,
        wasSerialKillerImmune,
        investigationResults,
        detectiveResults,
        wolfSeerResults,
        logs,
      },
      updatedPlayers,
      nextNightBerserkPierce: berserkTriggeredNextNight,
    };
  }
}
