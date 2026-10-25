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

  describe('Chống cắn đồng đội Sói (No Wolf Friendly Fire)', () => {
    it('Sói không thể submit phiếu cắn đồng đội phe Sói', () => {
      const game = new WerewolfGame('game-wolf-ff', 'g1', 'c1', 'h1');
      game.addPlayer('w1', 'Sói 1');
      game.addPlayer('w2', 'Sói 2');
      game.addPlayer('v1', 'Dân 1');
      game.addPlayer('v2', 'Dân 2');

      game.players.get('w1')!.roleId = 'WEREWOLF';
      game.players.get('w1')!.faction = 'WEREWOLF';
      game.players.get('w2')!.roleId = 'DEMON_WOLF';
      game.players.get('w2')!.faction = 'WEREWOLF';

      game.startNight();

      const voteTeammate = game.submitAction({
        userId: 'w1',
        roleId: 'WEREWOLF',
        type: 'WOLF_VOTE',
        targetId: 'w2',
        nightNumber: 1,
        phase: 'NIGHT',
      });

      expect(voteTeammate.success).toBe(false);
      expect(voteTeammate.message).toContain('không thể bỏ phiếu cắn đồng đội');

      const voteVillager = game.submitAction({
        userId: 'w1',
        roleId: 'WEREWOLF',
        type: 'WOLF_VOTE',
        targetId: 'v1',
        nightNumber: 1,
        phase: 'NIGHT',
      });
      expect(voteVillager.success).toBe(true);
    });
  });

  describe('Sói Trắng (White Wolf) - Cắn dân làng & đồng loại', () => {
    it('Sói Trắng có thể cắn Dân làng vào đêm chẵn (Đêm 2)', () => {
      const game = new WerewolfGame('game-ww-villager', 'g1', 'c1', 'h1');
      game.addPlayer('ww', 'Sói Trắng');
      game.addPlayer('wolf', 'Sói Thường');
      game.addPlayer('v1', 'Dân 1');
      game.addPlayer('v2', 'Dân 2');

      game.players.get('ww')!.roleId = 'WHITE_WOLF';
      game.players.get('ww')!.faction = 'WEREWOLF';
      game.players.get('wolf')!.roleId = 'WEREWOLF';
      game.players.get('wolf')!.faction = 'WEREWOLF';

      // Chuyển sang Đêm 2
      game.nightNumber = 1;
      game.startNight();
      expect(game.nightNumber).toBe(2);

      // Sói thường và Sói trắng cùng cắn v1
      game.submitAction({
        userId: 'wolf',
        roleId: 'WEREWOLF',
        type: 'WOLF_VOTE',
        targetId: 'v1',
        nightNumber: 2,
        phase: 'NIGHT',
      });

      // Sói Trắng bí mật cắn Dân làng v2
      const wwAction = game.submitAction({
        userId: 'ww',
        roleId: 'WHITE_WOLF',
        type: 'WHITE_WOLF_KILL',
        targetId: 'v2',
        nightNumber: 2,
        phase: 'NIGHT',
      });
      expect(wwAction.success).toBe(true);

      const res = game.resolveNightPhase();
      expect(res.deaths).toHaveLength(2);
      const deadIds = res.deaths.map((d) => d.player.id);
      expect(deadIds).toContain('v1'); // Bị bầy sói cắn
      expect(deadIds).toContain('v2'); // Bị Sói trắng cắn
      expect(res.deaths.find((d) => d.player.id === 'v2')?.reason).toBe('WHITE_WOLF');
    });

    it('Sói Trắng cũng có thể cắn Sói đồng loại vào đêm chẵn (Đêm 2)', () => {
      const game = new WerewolfGame('game-ww-wolf', 'g1', 'c1', 'h1');
      game.addPlayer('ww', 'Sói Trắng');
      game.addPlayer('wolf', 'Sói Thường');
      game.addPlayer('v1', 'Dân 1');
      game.addPlayer('v2', 'Dân 2');

      game.players.get('ww')!.roleId = 'WHITE_WOLF';
      game.players.get('ww')!.faction = 'WEREWOLF';
      game.players.get('wolf')!.roleId = 'WEREWOLF';
      game.players.get('wolf')!.faction = 'WEREWOLF';

      game.nightNumber = 1;
      game.startNight();
      expect(game.nightNumber).toBe(2);

      // Sói Trắng cắn Sói thường
      const wwAction = game.submitAction({
        userId: 'ww',
        roleId: 'WHITE_WOLF',
        type: 'WHITE_WOLF_KILL',
        targetId: 'wolf',
        nightNumber: 2,
        phase: 'NIGHT',
      });
      expect(wwAction.success).toBe(true);

      const res = game.resolveNightPhase();
      const wolfDeath = res.deaths.find((d) => d.player.id === 'wolf');
      expect(wolfDeath).toBeDefined();
      expect(wolfDeath?.reason).toBe('WHITE_WOLF');
    });

    it('Sói Trắng không thể tự cắn chính mình và không thể cắn vào Đêm 1', () => {
      const game = new WerewolfGame('game-ww-invalid', 'g1', 'c1', 'h1');
      game.addPlayer('ww', 'Sói Trắng');
      game.addPlayer('v1', 'Dân 1');
      game.addPlayer('v2', 'Dân 2');
      game.addPlayer('v3', 'Dân 3');

      game.players.get('ww')!.roleId = 'WHITE_WOLF';
      game.players.get('ww')!.faction = 'WEREWOLF';

      game.nightNumber = 0;
      game.startNight();
      expect(game.nightNumber).toBe(1);

      // Đêm 1 không thể cắn
      const night1Fail = game.submitAction({
        userId: 'ww',
        roleId: 'WHITE_WOLF',
        type: 'WHITE_WOLF_KILL',
        targetId: 'v1',
        nightNumber: 1,
        phase: 'NIGHT',
      });
      expect(night1Fail.success).toBe(false);

      // Đêm 2 không thể tự cắn
      game.startNight();
      expect(game.nightNumber).toBe(2);
      const selfFail = game.submitAction({
        userId: 'ww',
        roleId: 'WHITE_WOLF',
        type: 'WHITE_WOLF_KILL',
        targetId: 'ww',
        nightNumber: 2,
        phase: 'NIGHT',
      });
      expect(selfFail.success).toBe(false);
    });
  });

  describe('Sói Quỷ (Demon Wolf) - Lựa chọn Lây lan hoặc Cắn chết', () => {
    it('Chế độ Cắn chết: Nạn nhân bị cắn chết bình thường và không tiêu hao lượt lây lan', () => {
      const game = new WerewolfGame('game-demon-kill', 'g1', 'c1', 'h1');
      game.addPlayer('demon', 'Sói Quỷ');
      game.addPlayer('v1', 'Dân 1');
      game.addPlayer('v2', 'Dân 2');
      game.addPlayer('v3', 'Dân 3');

      const demon = game.players.get('demon')!;
      demon.roleId = 'DEMON_WOLF';
      demon.faction = 'WEREWOLF';
      demon.skills.demonWolfInfectRemaining = 1;
      demon.skills.demonWolfMode = 'KILL';

      game.startNight();

      // Vote cắn v1
      game.submitAction({
        userId: 'demon',
        roleId: 'DEMON_WOLF',
        type: 'WOLF_VOTE',
        targetId: 'v1',
        nightNumber: 1,
        phase: 'NIGHT',
      });

      // Chọn chế độ cắn chết
      game.submitAction({
        userId: 'demon',
        roleId: 'DEMON_WOLF',
        type: 'DEMON_WOLF_KILL_MODE',
        nightNumber: 1,
        phase: 'NIGHT',
      });

      const res = game.resolveNightPhase();
      expect(res.deaths).toHaveLength(1);
      expect(res.deaths[0].player.id).toBe('v1');
      expect(res.wasInfected).toBe(false);
      // Lượt lây lan vẫn còn nguyên vẹn
      expect(game.players.get('demon')?.skills.demonWolfInfectRemaining).toBe(1);
    });

    it('Chế độ Lây lan: Nạn nhân biến thành Sói và tiêu hao 1 lượt lây lan', () => {
      const game = new WerewolfGame('game-demon-infect', 'g1', 'c1', 'h1');
      game.addPlayer('demon', 'Sói Quỷ');
      game.addPlayer('v1', 'Dân 1');
      game.addPlayer('v2', 'Dân 2');
      game.addPlayer('v3', 'Dân 3');

      const demon = game.players.get('demon')!;
      demon.roleId = 'DEMON_WOLF';
      demon.faction = 'WEREWOLF';
      demon.skills.demonWolfInfectRemaining = 1;
      demon.skills.demonWolfMode = 'INFECT';

      game.startNight();

      // Vote cắn v1
      game.submitAction({
        userId: 'demon',
        roleId: 'DEMON_WOLF',
        type: 'WOLF_VOTE',
        targetId: 'v1',
        nightNumber: 1,
        phase: 'NIGHT',
      });

      // Chọn chế độ lây lan
      game.submitAction({
        userId: 'demon',
        roleId: 'DEMON_WOLF',
        type: 'DEMON_WOLF_INFECT',
        targetId: 'v1',
        nightNumber: 1,
        phase: 'NIGHT',
      });

      const res = game.resolveNightPhase();
      expect(res.deaths).toHaveLength(0); // Không ai chết
      expect(res.wasInfected).toBe(true);
      expect(res.newWerewolfId).toBe('v1');
      expect(game.players.get('v1')?.faction).toBe('WEREWOLF');
      expect(game.players.get('v1')?.roleId).toBe('WEREWOLF');
      expect(game.players.get('demon')?.skills.demonWolfInfectRemaining).toBe(0); // Tiêu hao lượt
    });
  });

  describe('Sói Cuồng Nộ (Berserk Wolf) - Phế kỹ năng khi có sói chết', () => {
    it('Chưa có sói nào chết thì không thể phế kỹ năng ai', () => {
      const game = new WerewolfGame('game-berserk-0', 'g1', 'c1', 'h1');
      game.addPlayer('berserk', 'Sói Cuồng Nộ');
      game.addPlayer('seer', 'Tiên tri');
      game.addPlayer('v1', 'Dân 1');
      game.addPlayer('v2', 'Dân 2');

      game.players.get('berserk')!.roleId = 'BERSERK_WOLF';
      game.players.get('berserk')!.faction = 'WEREWOLF';
      game.players.get('seer')!.roleId = 'SEER';

      expect(game.getDeadWolvesCount()).toBe(0);

      game.startNight();

      const res = game.submitAction({
        userId: 'berserk',
        roleId: 'BERSERK_WOLF',
        type: 'BERSERK_DISABLE',
        targetId: 'seer',
        nightNumber: 1,
        phase: 'NIGHT',
      });

      expect(res.success).toBe(false);
      expect(res.message).toContain('chưa có lượt phế kỹ năng nào');
    });

    it('Khi có 1 sói chết, Sói Cuồng Nộ phế kỹ năng soi của Tiên tri', () => {
      const game = new WerewolfGame('game-berserk-seer', 'g1', 'c1', 'h1');
      game.addPlayer('berserk', 'Sói Cuồng Nộ');
      game.addPlayer('deadWolf', 'Sói Đã Chết');
      game.addPlayer('seer', 'Tiên tri');
      game.addPlayer('v1', 'Dân 1');

      game.players.get('berserk')!.roleId = 'BERSERK_WOLF';
      game.players.get('berserk')!.faction = 'WEREWOLF';
      game.players.get('deadWolf')!.roleId = 'WEREWOLF';
      game.players.get('deadWolf')!.faction = 'WEREWOLF';
      game.players.get('deadWolf')!.isAlive = false;
      game.players.get('deadWolf')!.deathReason = 'LYNCH';

      game.players.get('seer')!.roleId = 'SEER';

      expect(game.getDeadWolvesCount()).toBe(1);

      game.startNight();

      // Sói cuồng nộ phế kỹ năng Tiên tri
      const disableAction = game.submitAction({
        userId: 'berserk',
        roleId: 'BERSERK_WOLF',
        type: 'BERSERK_DISABLE',
        targetId: 'seer',
        nightNumber: 2,
        phase: 'NIGHT',
      });
      expect(disableAction.success).toBe(true);

      // Tiên tri soi Sói Cuồng Nộ
      game.submitAction({
        userId: 'seer',
        roleId: 'SEER',
        type: 'SEER_INVESTIGATE',
        targetId: 'berserk',
        nightNumber: 2,
        phase: 'NIGHT',
      });

      const res = game.resolveNightPhase();
      expect(res.silencedUserId).toBe('seer');
      expect(res.investigationResults).toHaveLength(1);
      expect(res.investigationResults[0].isSilenced).toBe(true);
      // Đã dùng 1 lượt
      expect(game.players.get('berserk')!.skills.berserkUsedDisables).toBe(1);
    });

    it('Sói Cuồng Nộ phế kỹ năng bảo vệ của Bác sĩ khiến nạn nhân bị cắn chết', () => {
      const game = new WerewolfGame('game-berserk-doc', 'g1', 'c1', 'h1');
      game.addPlayer('berserk', 'Sói Cuồng Nộ');
      game.addPlayer('deadWolf', 'Sói Đã Chết');
      game.addPlayer('doc', 'Bác sĩ');
      game.addPlayer('v1', 'Dân 1');

      game.players.get('berserk')!.roleId = 'BERSERK_WOLF';
      game.players.get('berserk')!.faction = 'WEREWOLF';
      game.players.get('deadWolf')!.roleId = 'WEREWOLF';
      game.players.get('deadWolf')!.faction = 'WEREWOLF';
      game.players.get('deadWolf')!.isAlive = false;

      game.players.get('doc')!.roleId = 'DOCTOR';

      game.startNight();

      // Phế Bác sĩ
      game.submitAction({
        userId: 'berserk',
        roleId: 'BERSERK_WOLF',
        type: 'BERSERK_DISABLE',
        targetId: 'doc',
        nightNumber: 2,
        phase: 'NIGHT',
      });

      // Bác sĩ cố gắng cứu v1
      game.submitAction({
        userId: 'doc',
        roleId: 'DOCTOR',
        type: 'DOCTOR_PROTECT',
        targetId: 'v1',
        nightNumber: 2,
        phase: 'NIGHT',
      });

      // Sói cắn v1
      game.submitAction({
        userId: 'berserk',
        roleId: 'BERSERK_WOLF',
        type: 'WOLF_VOTE',
        targetId: 'v1',
        nightNumber: 2,
        phase: 'NIGHT',
      });

      const res = game.resolveNightPhase();
      // v1 vẫn bị cắn chết vì Bác sĩ đã bị phế
      expect(res.deaths).toHaveLength(1);
      expect(res.deaths[0].player.id).toBe('v1');
      expect(res.wasProtected).toBe(false);
    });

    it('Sói Cuồng Nộ phế kỹ năng Thợ săn khiến Thợ săn chết không thể nổ súng', () => {
      const game = new WerewolfGame('game-berserk-hunter', 'g1', 'c1', 'h1');
      game.addPlayer('berserk', 'Sói Cuồng Nộ');
      game.addPlayer('deadWolf', 'Sói Đã Chết');
      game.addPlayer('hunter', 'Thợ săn');
      game.addPlayer('v1', 'Dân 1');

      game.players.get('berserk')!.roleId = 'BERSERK_WOLF';
      game.players.get('berserk')!.faction = 'WEREWOLF';
      game.players.get('deadWolf')!.roleId = 'WEREWOLF';
      game.players.get('deadWolf')!.faction = 'WEREWOLF';
      game.players.get('deadWolf')!.isAlive = false;

      game.players.get('hunter')!.roleId = 'HUNTER';

      game.startNight();

      // Phế Thợ săn
      game.submitAction({
        userId: 'berserk',
        roleId: 'BERSERK_WOLF',
        type: 'BERSERK_DISABLE',
        targetId: 'hunter',
        nightNumber: 2,
        phase: 'NIGHT',
      });

      // Cắn Thợ săn
      game.submitAction({
        userId: 'berserk',
        roleId: 'BERSERK_WOLF',
        type: 'WOLF_VOTE',
        targetId: 'hunter',
        nightNumber: 2,
        phase: 'NIGHT',
      });

      const res = game.resolveNightPhase();
      expect(res.deaths).toHaveLength(1);
      expect(res.deaths[0].player.id).toBe('hunter');
      // Thợ săn bị phế nên không kích hoạt súng trả thù!
      expect(res.hunterTriggeredId).toBeNull();
    });
  });
});
