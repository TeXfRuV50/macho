import { describe, it, expect } from 'vitest';
import { WerewolfGame } from '../../src/engine/game';
import { DEFAULT_CONFIG } from '../../src/engine/presets';

describe('Special Roles & Mechanics', () => {
  it('Thằng ngốc (Idiot): Lần đầu bị biểu quyết treo cổ sẽ sống sót, lộ vai và mất quyền biểu quyết', () => {
    const game = new WerewolfGame('game-idiot', 'g1', 'c1', 'h1');
    game.addPlayer('u1', 'Idiot');
    game.addPlayer('u2', 'Voter 1');
    game.addPlayer('u3', 'Voter 2');
    game.addPlayer('u4', 'Wolf');

    game.players.get('u1')!.roleId = 'IDIOT';
    game.players.get('u1')!.originalRoleId = 'IDIOT';
    game.players.get('u4')!.roleId = 'WEREWOLF';
    game.players.get('u4')!.originalRoleId = 'WEREWOLF';
    game.players.get('u4')!.faction = 'WEREWOLF';

    game.startVoting();

    // u2 và u3 vote treo cổ Idiot
    game.submitAction({ userId: 'u2', roleId: 'VILLAGER', type: 'DAY_VOTE', targetId: 'u1', nightNumber: 1, phase: 'VOTING' });
    game.submitAction({ userId: 'u3', roleId: 'VILLAGER', type: 'DAY_VOTE', targetId: 'u1', nightNumber: 1, phase: 'VOTING' });

    const lynchRes = game.resolveVotingPhase();

    expect(lynchRes.idiotSurvived).toBe(true);
    expect(game.players.get('u1')?.isAlive).toBe(true);
    expect(game.players.get('u1')?.canVote).toBe(false);
    expect(game.players.get('u1')?.skills.idiotRevealed).toBe(true);

    // Lần 2 bị treo cổ thì chết thật
    game.startVoting();
    game.submitAction({ userId: 'u2', roleId: 'VILLAGER', type: 'DAY_VOTE', targetId: 'u1', nightNumber: 1, phase: 'VOTING' });
    game.submitAction({ userId: 'u3', roleId: 'VILLAGER', type: 'DAY_VOTE', targetId: 'u1', nightNumber: 1, phase: 'VOTING' });
    const secondLynch = game.resolveVotingPhase();

    expect(secondLynch.idiotSurvived).toBe(false);
    expect(game.players.get('u1')?.isAlive).toBe(false);
  });

  it('Thợ săn (Hunter): Bị treo cổ ban ngày được bắn một người còn sống', () => {
    const game = new WerewolfGame('game-hunter', 'g1', 'c1', 'h1');
    game.addPlayer('h1', 'Thợ săn');
    game.addPlayer('u2', 'Dân');
    game.addPlayer('w1', 'Sói');
    game.addPlayer('u3', 'Dân 2');

    game.players.get('h1')!.roleId = 'HUNTER';
    game.players.get('h1')!.originalRoleId = 'HUNTER';
    game.players.get('w1')!.roleId = 'WEREWOLF';
    game.players.get('w1')!.originalRoleId = 'WEREWOLF';
    game.players.get('w1')!.faction = 'WEREWOLF';

    game.startVoting();
    game.submitAction({ userId: 'u2', roleId: 'VILLAGER', type: 'DAY_VOTE', targetId: 'h1', nightNumber: 1, phase: 'VOTING' });
    game.submitAction({ userId: 'w1', roleId: 'WEREWOLF', type: 'DAY_VOTE', targetId: 'h1', nightNumber: 1, phase: 'VOTING' });

    const res = game.resolveVotingPhase();
    expect(res.lynchedPlayer?.id).toBe('h1');
    expect(game.pendingHunterId).toBe('h1');

    // Thợ săn khai hỏa bắn chết Sói
    const shotRes = game.handleHunterShot('w1');
    expect(shotRes.success).toBe(true);
    expect(game.players.get('w1')?.isAlive).toBe(false);
    expect(game.players.get('w1')?.deathReason).toBe('HUNTER_SHOT');
    expect(game.pendingHunterId).toBe(null);
  });

  it('Thần tình yêu (Cupid): Ghép đôi đêm 1 và chết vì đau lòng (Heartbreak)', () => {
    const game = new WerewolfGame('game-cupid', 'g1', 'c1', 'h1');
    game.addPlayer('cupid', 'Thần tình yêu');
    game.addPlayer('lover1', 'Người yêu 1');
    game.addPlayer('lover2', 'Người yêu 2');
    game.addPlayer('wolf', 'Sói');

    game.players.get('cupid')!.roleId = 'CUPID';
    game.players.get('lover1')!.roleId = 'VILLAGER';
    game.players.get('lover2')!.roleId = 'BODYGUARD';
    game.players.get('wolf')!.roleId = 'WEREWOLF';
    game.players.get('wolf')!.faction = 'WEREWOLF';

    game.startNight(); // Đêm 1
    // Thần tình yêu ghép đôi lover1 và lover2
    game.submitAction({
      userId: 'cupid',
      roleId: 'CUPID',
      type: 'CUPID_LINK',
      targetId: 'lover1',
      secondaryTargetId: 'lover2',
      nightNumber: 1,
      phase: 'NIGHT',
    });

    // Sói cắn lover1
    game.submitAction({
      userId: 'wolf',
      roleId: 'WEREWOLF',
      type: 'WOLF_VOTE',
      targetId: 'lover1',
      nightNumber: 1,
      phase: 'NIGHT',
    });

    const dawnResult = game.resolveNightPhase();

    expect(game.players.get('lover1')?.loverId).toBe('lover2');
    expect(game.players.get('lover2')?.loverId).toBe('lover1');

    // Cả 2 đều phải chết: lover1 chết vì sói cắn, lover2 chết vì đau lòng
    expect(game.players.get('lover1')?.isAlive).toBe(false);
    expect(game.players.get('lover2')?.isAlive).toBe(false);
    expect(game.players.get('lover2')?.deathReason).toBe('HEARTBREAK');
    expect(dawnResult.deaths).toHaveLength(2);
  });

  it('Kẻ chán đời (Tanner): Thắng độc lập nếu bị treo cổ, chết ban đêm không thắng', () => {
    const game = new WerewolfGame('game-tanner', 'g1', 'c1', 'h1');
    game.addPlayer('tanner', 'Kẻ chán đời');
    game.addPlayer('u1', 'Dân 1');
    game.addPlayer('u2', 'Dân 2');
    game.addPlayer('wolf', 'Sói');

    game.players.get('tanner')!.roleId = 'TANNER';
    game.players.get('tanner')!.originalRoleId = 'TANNER';
    game.players.get('tanner')!.faction = 'SOLO';
    game.players.get('wolf')!.roleId = 'WEREWOLF';
    game.players.get('wolf')!.faction = 'WEREWOLF';

    // TH1: Treo cổ ban ngày
    game.startVoting();
    game.submitAction({ userId: 'u1', roleId: 'VILLAGER', type: 'DAY_VOTE', targetId: 'tanner', nightNumber: 1, phase: 'VOTING' });
    game.submitAction({ userId: 'u2', roleId: 'VILLAGER', type: 'DAY_VOTE', targetId: 'tanner', nightNumber: 1, phase: 'VOTING' });

    const lynchRes = game.resolveVotingPhase();
    expect(lynchRes.tannerWon).toBe(true);

    const winRes = game.checkWinCondition();
    expect(winRes.winner).toBe('SOLO');
    expect(winRes.winnerRoleId).toBe('TANNER');
    expect(winRes.winnerPlayerIds).toContain('tanner');
  });
});
