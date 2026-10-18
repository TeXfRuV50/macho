import { describe, it, expect } from 'vitest';
import { WerewolfGame } from '../../src/engine/game';

describe('Win Conditions & Priority Hierarchy', () => {
  it('Cặp đôi khác phe thắng khi là 2 người sống sót cuối cùng', () => {
    const game = new WerewolfGame('game-lovers-win', 'g1', 'c1', 'h1');
    game.addPlayer('wolf', 'Sói yêu Dân');
    game.addPlayer('villager', 'Dân yêu Sói');

    const pWolf = game.players.get('wolf')!;
    const pVil = game.players.get('villager')!;

    pWolf.roleId = 'WEREWOLF';
    pWolf.originalRoleId = 'WEREWOLF';
    pWolf.faction = 'WEREWOLF';
    pWolf.loverId = 'villager';

    pVil.roleId = 'VILLAGER';
    pVil.originalRoleId = 'VILLAGER';
    pVil.faction = 'VILLAGE';
    pVil.loverId = 'wolf';

    const win = game.checkWinCondition();
    expect(win.winner).toBe('LOVERS');
    expect(win.winnerPlayerIds).toEqual(['wolf', 'villager']);
  });

  it('Sói trắng thắng độc lập khi là người sống sót duy nhất', () => {
    const game = new WerewolfGame('game-ww-win', 'g1', 'c1', 'h1');
    game.addPlayer('ww', 'Sói trắng');
    game.addPlayer('deadWolf', 'Sói chết');
    game.addPlayer('deadVil', 'Dân chết');

    const ww = game.players.get('ww')!;
    ww.roleId = 'WHITE_WOLF';
    ww.faction = 'WEREWOLF';

    game.players.get('deadWolf')!.isAlive = false;
    game.players.get('deadVil')!.isAlive = false;

    const win = game.checkWinCondition();
    expect(win.winner).toBe('SOLO');
    expect(win.winnerRoleId).toBe('WHITE_WOLF');
    expect(win.winnerPlayerIds).toEqual(['ww']);
  });

  it('Phe Sói thắng khi số lượng Sói >= Dân làng', () => {
    const game = new WerewolfGame('game-wolves-win', 'g1', 'c1', 'h1');
    game.addPlayer('w1', 'Sói 1');
    game.addPlayer('w2', 'Sói 2');
    game.addPlayer('v1', 'Dân 1');

    game.players.get('w1')!.roleId = 'WEREWOLF';
    game.players.get('w1')!.faction = 'WEREWOLF';
    game.players.get('w2')!.roleId = 'WEREWOLF';
    game.players.get('w2')!.faction = 'WEREWOLF';
    game.players.get('v1')!.roleId = 'VILLAGER';
    game.players.get('v1')!.faction = 'VILLAGE';

    const win = game.checkWinCondition();
    expect(win.winner).toBe('WEREWOLF');
    expect(win.winnerPlayerIds).toEqual(['w1', 'w2']);
  });

  it('Phe Dân thắng khi toàn bộ Sói đã bị tiêu diệt', () => {
    const game = new WerewolfGame('game-village-win', 'g1', 'c1', 'h1');
    game.addPlayer('v1', 'Dân 1');
    game.addPlayer('v2', 'Dân 2');
    game.addPlayer('w1', 'Sói đã chết');

    game.players.get('v1')!.roleId = 'VILLAGER';
    game.players.get('v1')!.faction = 'VILLAGE';
    game.players.get('v2')!.roleId = 'SEER';
    game.players.get('v2')!.faction = 'VILLAGE';
    game.players.get('w1')!.roleId = 'WEREWOLF';
    game.players.get('w1')!.faction = 'WEREWOLF';
    game.players.get('w1')!.isAlive = false;

    const win = game.checkWinCondition();
    expect(win.winner).toBe('VILLAGE');
    expect(win.winnerPlayerIds).toEqual(['v1', 'v2']);
  });

  it('Hòa (DRAW) khi toàn bộ người chơi đều chết', () => {
    const game = new WerewolfGame('game-draw', 'g1', 'c1', 'h1');
    game.addPlayer('p1', 'Người 1');
    game.addPlayer('p2', 'Người 2');

    game.players.get('p1')!.isAlive = false;
    game.players.get('p2')!.isAlive = false;

    const win = game.checkWinCondition();
    expect(win.winner).toBe('DRAW');
  });
});
