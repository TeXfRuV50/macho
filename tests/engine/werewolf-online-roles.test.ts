import { describe, it, expect } from 'vitest';
import { WerewolfGame } from '../../src/engine/game';
import { NightResolver } from '../../src/engine/night-resolver';
import { DEFAULT_CONFIG } from '../../src/engine/presets';
import { Player, PlayerAction } from '../../src/engine/types';

function createMockPlayer(id: string, name: string, roleId: any, faction: any): Player {
  return {
    id,
    name,
    isBot: false,
    roleId,
    originalRoleId: roleId,
    faction,
    isAlive: true,
    deathReason: null,
    deathNight: null,
    deathPhase: null,
    hasConfirmedRole: true,
    canVote: true,
    loverId: null,
    skills: {
      witchHealRemaining: 1,
      witchPoisonRemaining: 1,
      demonWolfInfectRemaining: 1,
      lastProtectedTargetId: null,
      doctorLastProtectedTargetId: null,
      gunnerBulletsRemaining: roleId === 'GUNNER' ? 2 : 0,
      hasUsedHunterShot: false,
      idiotRevealed: false,
    },
  };
}

describe('Werewolf Online (Wolvesville) Roles & Mechanics', () => {
  describe('Bác sĩ (Doctor)', () => {
    it('Bác sĩ bảo vệ thành công mục tiêu bị sói cắn', () => {
      const players = new Map<string, Player>();
      players.set('doc', createMockPlayer('doc', 'Bác sĩ', 'DOCTOR', 'VILLAGE'));
      players.set('wolf', createMockPlayer('wolf', 'Sói', 'WEREWOLF', 'WEREWOLF'));
      players.set('v1', createMockPlayer('v1', 'Dân', 'VILLAGER', 'VILLAGE'));

      const actions: PlayerAction[] = [
        {
          id: 'a1',
          userId: 'doc',
          roleId: 'DOCTOR',
          type: 'DOCTOR_PROTECT',
          targetId: 'v1',
          nightNumber: 1,
          phase: 'NIGHT',
          timestamp: Date.now(),
        },
        {
          id: 'a2',
          userId: 'wolf',
          roleId: 'WEREWOLF',
          type: 'WOLF_VOTE',
          targetId: 'v1',
          nightNumber: 1,
          phase: 'NIGHT',
          timestamp: Date.now(),
        },
      ];

      const { result, updatedPlayers } = NightResolver.resolveNight(1, players, actions, DEFAULT_CONFIG, false);

      expect(result.deaths).toHaveLength(0);
      expect(result.wasProtected).toBe(true);
      expect(updatedPlayers.get('v1')?.isAlive).toBe(true);
      expect(updatedPlayers.get('doc')?.skills.doctorLastProtectedTargetId).toBe('v1');
    });

    it('Bác sĩ không thể bảo vệ cùng 1 người 2 đêm liên tiếp trong game engine', () => {
      const game = new WerewolfGame('game-doc', 'g1', 'c1', 'h1');
      game.addPlayer('doc', 'Bác sĩ');
      game.addPlayer('wolf', 'Sói');
      game.addPlayer('v1', 'Dân 1');
      game.addPlayer('v2', 'Dân 2');

      game.players.get('doc')!.roleId = 'DOCTOR';
      game.players.get('doc')!.skills.doctorLastProtectedTargetId = 'v1';

      game.startNight();

      const res = game.submitAction({
        userId: 'doc',
        roleId: 'DOCTOR',
        type: 'DOCTOR_PROTECT',
        targetId: 'v1',
        nightNumber: 2,
        phase: 'NIGHT',
      });

      expect(res.success).toBe(false);
      expect(res.message).toContain('2 đêm liên tiếp');
    });
  });

  describe('Thám tử (Detective)', () => {
    it('Thám tử soi 2 người cùng phe trả về isSameTeam: true', () => {
      const players = new Map<string, Player>();
      players.set('det', createMockPlayer('det', 'Thám tử', 'DETECTIVE', 'VILLAGE'));
      players.set('v1', createMockPlayer('v1', 'Dân 1', 'VILLAGER', 'VILLAGE'));
      players.set('v2', createMockPlayer('v2', 'Dân 2', 'VILLAGER', 'VILLAGE'));

      const actions: PlayerAction[] = [
        {
          id: 'a1',
          userId: 'det',
          roleId: 'DETECTIVE',
          type: 'DETECTIVE_INVESTIGATE',
          targetId: 'v1',
          secondaryTargetId: 'v2',
          nightNumber: 1,
          phase: 'NIGHT',
          timestamp: Date.now(),
        },
      ];

      const { result } = NightResolver.resolveNight(1, players, actions, DEFAULT_CONFIG, false);

      expect(result.detectiveResults).toHaveLength(1);
      expect(result.detectiveResults[0].isSameTeam).toBe(true);
    });

    it('Thám tử soi 2 người khác phe trả về isSameTeam: false', () => {
      const players = new Map<string, Player>();
      players.set('det', createMockPlayer('det', 'Thám tử', 'DETECTIVE', 'VILLAGE'));
      players.set('wolf', createMockPlayer('wolf', 'Sói', 'WEREWOLF', 'WEREWOLF'));
      players.set('v1', createMockPlayer('v1', 'Dân', 'VILLAGER', 'VILLAGE'));

      const actions: PlayerAction[] = [
        {
          id: 'a1',
          userId: 'det',
          roleId: 'DETECTIVE',
          type: 'DETECTIVE_INVESTIGATE',
          targetId: 'wolf',
          secondaryTargetId: 'v1',
          nightNumber: 1,
          phase: 'NIGHT',
          timestamp: Date.now(),
        },
      ];

      const { result } = NightResolver.resolveNight(1, players, actions, DEFAULT_CONFIG, false);

      expect(result.detectiveResults).toHaveLength(1);
      expect(result.detectiveResults[0].isSameTeam).toBe(false);
    });
  });

  describe('Sói Tiên Tri (Wolf Seer)', () => {
    it('Sói Tiên Tri soi ra chính xác vai trò của người chơi', () => {
      const players = new Map<string, Player>();
      players.set('ws', createMockPlayer('ws', 'Sói TT', 'WOLF_SEER', 'WEREWOLF'));
      players.set('w2', createMockPlayer('w2', 'Sói thường', 'WEREWOLF', 'WEREWOLF'));
      players.set('target', createMockPlayer('target', 'Thợ săn', 'HUNTER', 'VILLAGE'));

      const actions: PlayerAction[] = [
        {
          id: 'a1',
          userId: 'ws',
          roleId: 'WOLF_SEER',
          type: 'WOLF_SEER_INVESTIGATE',
          targetId: 'target',
          nightNumber: 1,
          phase: 'NIGHT',
          timestamp: Date.now(),
        },
      ];

      const { result } = NightResolver.resolveNight(1, players, actions, DEFAULT_CONFIG, false);

      expect(result.wolfSeerResults).toHaveLength(1);
      expect(result.wolfSeerResults[0].targetRoleId).toBe('HUNTER');
    });

    it('Sói Tiên Tri bị vô hiệu hóa kỹ năng soi nếu là con sói duy nhất còn sống', () => {
      const game = new WerewolfGame('game-ws', 'g1', 'c1', 'h1');
      game.addPlayer('ws', 'Sói TT');
      game.addPlayer('v1', 'Dân 1');
      game.addPlayer('v2', 'Dân 2');
      game.addPlayer('v3', 'Dân 3');

      game.players.get('ws')!.roleId = 'WOLF_SEER';
      game.players.get('ws')!.faction = 'WEREWOLF';

      game.startNight();

      const res = game.submitAction({
        userId: 'ws',
        roleId: 'WOLF_SEER',
        type: 'WOLF_SEER_INVESTIGATE',
        targetId: 'v1',
        nightNumber: 1,
        phase: 'NIGHT',
      });

      expect(res.success).toBe(false);
      expect(res.message).toContain('con sói cuối cùng');
    });
  });

  describe('Kẻ Sát Nhân (Serial Killer)', () => {
    it('Kẻ Sát Nhân có Miễn nhiễm ban đêm trước đòn cắn của Ma Sói', () => {
      const players = new Map<string, Player>();
      players.set('sk', createMockPlayer('sk', 'Sát nhân', 'SERIAL_KILLER', 'SOLO'));
      players.set('wolf', createMockPlayer('wolf', 'Sói', 'WEREWOLF', 'WEREWOLF'));
      players.set('v1', createMockPlayer('v1', 'Dân', 'VILLAGER', 'VILLAGE'));

      const actions: PlayerAction[] = [
        {
          id: 'a1',
          userId: 'wolf',
          roleId: 'WEREWOLF',
          type: 'WOLF_VOTE',
          targetId: 'sk',
          nightNumber: 1,
          phase: 'NIGHT',
          timestamp: Date.now(),
        },
        {
          id: 'a2',
          userId: 'sk',
          roleId: 'SERIAL_KILLER',
          type: 'SERIAL_KILLER_KILL',
          targetId: 'v1',
          nightNumber: 1,
          phase: 'NIGHT',
          timestamp: Date.now(),
        },
      ];

      const { result, updatedPlayers } = NightResolver.resolveNight(1, players, actions, DEFAULT_CONFIG, false);

      expect(result.wasSerialKillerImmune).toBe(true);
      expect(updatedPlayers.get('sk')?.isAlive).toBe(true);
      expect(updatedPlayers.get('v1')?.isAlive).toBe(false);
      expect(updatedPlayers.get('v1')?.deathReason).toBe('SERIAL_KILLER');
    });

    it('Kẻ Sát Nhân thắng SOLO khi là người sống sót duy nhất hoặc 1v1', () => {
      const game = new WerewolfGame('game-sk-win', 'g1', 'c1', 'h1');
      game.addPlayer('sk', 'Sát nhân');
      game.addPlayer('v1', 'Dân');

      game.players.get('sk')!.roleId = 'SERIAL_KILLER';
      game.players.get('sk')!.faction = 'SOLO';

      const winRes = game.checkWinCondition();
      expect(winRes.winner).toBe('SOLO');
      expect(winRes.winnerRoleId).toBe('SERIAL_KILLER');
      expect(winRes.winnerPlayerIds).toContain('sk');
    });

    it('Phe Dân và Phe Sói không thể thắng chừng nào Kẻ Sát Nhân còn sống', () => {
      const game = new WerewolfGame('game-sk-block', 'g1', 'c1', 'h1');
      game.addPlayer('sk', 'Sát nhân');
      game.addPlayer('w1', 'Sói 1');
      game.addPlayer('w2', 'Sói 2');
      game.addPlayer('v1', 'Dân 1');

      game.players.get('sk')!.roleId = 'SERIAL_KILLER';
      game.players.get('sk')!.faction = 'SOLO';
      game.players.get('w1')!.roleId = 'WEREWOLF';
      game.players.get('w1')!.faction = 'WEREWOLF';
      game.players.get('w2')!.roleId = 'WEREWOLF';
      game.players.get('w2')!.faction = 'WEREWOLF';

      // Sói đang có 2 người, dân có 1 người, SK có 1 người. Tổng non-wolf = 2.
      // Sói = non-wolves nhưng SK còn sống nên Sói CHƯA THỂ THẮNG!
      const winRes = game.checkWinCondition();
      expect(winRes.winner).toBe('NONE');
    });
  });

  describe('Xạ Thủ (Gunner)', () => {
    it('Xạ thủ có 2 viên đạn và nổ súng ban ngày (DISCUSSION) tiêu diệt mục tiêu tức thì', () => {
      const game = new WerewolfGame('game-gunner', 'g1', 'c1', 'h1');
      game.addPlayer('gunner', 'Xạ thủ');
      game.addPlayer('wolf', 'Sói');
      game.addPlayer('v1', 'Dân 1');
      game.addPlayer('v2', 'Dân 2');

      game.players.get('gunner')!.roleId = 'GUNNER';
      game.players.get('gunner')!.skills.gunnerBulletsRemaining = 2;

      game.startDiscussion();

      // Xạ thủ bắn Sói
      const shootRes = game.submitAction({
        userId: 'gunner',
        roleId: 'GUNNER',
        type: 'GUNNER_SHOOT',
        targetId: 'wolf',
        nightNumber: 1,
        phase: 'DISCUSSION',
      });

      expect(shootRes.success).toBe(true);
      expect(game.players.get('wolf')?.isAlive).toBe(false);
      expect(game.players.get('wolf')?.deathReason).toBe('GUNNER_SHOT');
      expect(game.players.get('gunner')?.skills.gunnerBulletsRemaining).toBe(1);

      // Bắn tiếp phát thứ 2
      const secondShoot = game.submitAction({
        userId: 'gunner',
        roleId: 'GUNNER',
        type: 'GUNNER_SHOOT',
        targetId: 'v1',
        nightNumber: 1,
        phase: 'DISCUSSION',
      });
      expect(secondShoot.success).toBe(true);
      expect(game.players.get('gunner')?.skills.gunnerBulletsRemaining).toBe(0);

      // Phát thứ 3 hết đạn phải thất bại
      const thirdShoot = game.submitAction({
        userId: 'gunner',
        roleId: 'GUNNER',
        type: 'GUNNER_SHOOT',
        targetId: 'v2',
        nightNumber: 1,
        phase: 'DISCUSSION',
      });
      expect(thirdShoot.success).toBe(false);
      expect(thirdShoot.message).toContain('hết đạn bạc');
    });
  });

  describe('Kẻ Khờ (Fool)', () => {
    it('Kẻ Khờ (Fool) bị treo cổ ban ngày sẽ giành chiến thắng Solo ngay lập tức', () => {
      const game = new WerewolfGame('game-fool', 'g1', 'c1', 'h1');
      game.addPlayer('fool', 'Kẻ Khờ');
      game.addPlayer('u2', 'Dân 1');
      game.addPlayer('u3', 'Dân 2');
      game.addPlayer('w1', 'Sói');

      game.players.get('fool')!.roleId = 'FOOL';
      game.players.get('fool')!.originalRoleId = 'FOOL';
      game.players.get('fool')!.faction = 'SOLO';

      game.startVoting();

      // u2 và u3 dồn phiếu treo cổ Fool
      game.submitAction({ userId: 'u2', roleId: 'VILLAGER', type: 'DAY_VOTE', targetId: 'fool', nightNumber: 1, phase: 'VOTING' });
      game.submitAction({ userId: 'u3', roleId: 'VILLAGER', type: 'DAY_VOTE', targetId: 'fool', nightNumber: 1, phase: 'VOTING' });

      const lynchRes = game.resolveVotingPhase();
      expect(lynchRes.tannerWon).toBe(true);
      expect(lynchRes.lynchedPlayer?.id).toBe('fool');

      const winRes = game.checkWinCondition();
      expect(winRes.winner).toBe('SOLO');
      expect(winRes.winnerRoleId).toBe('FOOL');
      expect(winRes.winnerPlayerIds).toContain('fool');
    });
  });

  describe('Sói Trùm (Alpha Wolf)', () => {
    it('Sói Trùm còn sống và chưa có sói nào chết thì bầy sói cắn được 2 người trong đêm', () => {
      const game = new WerewolfGame('game-alpha', 'g1', 'c1', 'h1');
      game.addPlayer('alpha', 'Sói Trùm');
      game.addPlayer('wolf', 'Sói Thường');
      game.addPlayer('v1', 'Dân 1');
      game.addPlayer('v2', 'Dân 2');
      game.addPlayer('v3', 'Dân 3');

      game.players.get('alpha')!.roleId = 'ALPHA_WOLF';
      game.players.get('alpha')!.faction = 'WEREWOLF';
      game.players.get('wolf')!.roleId = 'WEREWOLF';
      game.players.get('wolf')!.faction = 'WEREWOLF';
      game.players.get('v1')!.roleId = 'VILLAGER';
      game.players.get('v2')!.roleId = 'VILLAGER';
      game.players.get('v3')!.roleId = 'VILLAGER';

      expect(game.isAlphaWolfActive()).toBe(true);

      game.startNight();

      // Sói Trùm vote cắn v1 và v2
      const voteRes = game.submitAction({
        userId: 'alpha',
        roleId: 'ALPHA_WOLF',
        type: 'WOLF_VOTE',
        targetId: 'v1',
        secondaryTargetId: 'v2',
        nightNumber: 1,
        phase: 'NIGHT',
      });
      expect(voteRes.success).toBe(true);

      const res = game.resolveNightPhase();
      expect(res.deaths).toHaveLength(2);
      const deadIds = res.deaths.map((d) => d.player.id);
      expect(deadIds).toContain('v1');
      expect(deadIds).toContain('v2');
      expect(game.players.get('v1')?.isAlive).toBe(false);
      expect(game.players.get('v2')?.isAlive).toBe(false);
    });

    it('Nếu 1 trong 2 nạn nhân được Bác sĩ cứu, người kia vẫn bị cắn chết', () => {
      const game = new WerewolfGame('game-alpha-doc', 'g1', 'c1', 'h1');
      game.addPlayer('alpha', 'Sói Trùm');
      game.addPlayer('doc', 'Bác sĩ');
      game.addPlayer('v1', 'Dân 1');
      game.addPlayer('v2', 'Dân 2');

      game.players.get('alpha')!.roleId = 'ALPHA_WOLF';
      game.players.get('alpha')!.faction = 'WEREWOLF';
      game.players.get('doc')!.roleId = 'DOCTOR';
      game.players.get('doc')!.faction = 'VILLAGE';
      game.players.get('v1')!.roleId = 'VILLAGER';
      game.players.get('v2')!.roleId = 'VILLAGER';

      game.startNight();

      // Bác sĩ cứu v1
      game.submitAction({
        userId: 'doc',
        roleId: 'DOCTOR',
        type: 'DOCTOR_PROTECT',
        targetId: 'v1',
        nightNumber: 1,
        phase: 'NIGHT',
      });

      // Sói trùm cắn v1 và v2
      game.submitAction({
        userId: 'alpha',
        roleId: 'ALPHA_WOLF',
        type: 'WOLF_VOTE',
        targetId: 'v1',
        secondaryTargetId: 'v2',
        nightNumber: 1,
        phase: 'NIGHT',
      });

      const res = game.resolveNightPhase();
      expect(res.deaths).toHaveLength(1);
      expect(res.deaths[0].player.id).toBe('v2');
      expect(game.players.get('v1')?.isAlive).toBe(true);
      expect(game.players.get('v2')?.isAlive).toBe(false);
    });

    it('Khi có 1 con sói chết, Sói Trùm mất khả năng cắn 2 người và bầy sói trở lại cắn 1 người', () => {
      const game = new WerewolfGame('game-alpha-lose-power', 'g1', 'c1', 'h1');
      game.addPlayer('alpha', 'Sói Trùm');
      game.addPlayer('w2', 'Sói Thường');
      game.addPlayer('v1', 'Dân 1');
      game.addPlayer('v2', 'Dân 2');

      game.players.get('alpha')!.roleId = 'ALPHA_WOLF';
      game.players.get('alpha')!.faction = 'WEREWOLF';
      game.players.get('w2')!.roleId = 'WEREWOLF';
      game.players.get('w2')!.faction = 'WEREWOLF';
      game.players.get('v1')!.roleId = 'VILLAGER';
      game.players.get('v2')!.roleId = 'VILLAGER';

      // Giả lập w2 bị giết chết (ví dụ bị treo cổ ở Day 1)
      game.players.get('w2')!.isAlive = false;
      game.players.get('w2')!.deathReason = 'LYNCH';

      expect(game.hasAnyWolfDied()).toBe(true);
      expect(game.isAlphaWolfActive()).toBe(false);

      game.startNight();

      // Sói Trùm cố gắng submit cắn 2 người sẽ bị từ chối
      const voteFail = game.submitAction({
        userId: 'alpha',
        roleId: 'ALPHA_WOLF',
        type: 'WOLF_VOTE',
        targetId: 'v1',
        secondaryTargetId: 'v2',
        nightNumber: 2,
        phase: 'NIGHT',
      });
      expect(voteFail.success).toBe(false);
      expect(voteFail.message).toContain('không thể cắn 2 người');

      // Bầy sói cắn 1 người bình thường
      const voteOk = game.submitAction({
        userId: 'alpha',
        roleId: 'ALPHA_WOLF',
        type: 'WOLF_VOTE',
        targetId: 'v1',
        nightNumber: 2,
        phase: 'NIGHT',
      });
      expect(voteOk.success).toBe(true);

      const res = game.resolveNightPhase();
      expect(res.deaths).toHaveLength(1);
      expect(res.deaths[0].player.id).toBe('v1');
    });
  });
});
