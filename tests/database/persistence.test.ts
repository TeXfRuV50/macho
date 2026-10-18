import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from '../../src/database/database';
import { WerewolfGame } from '../../src/engine/game';
import fs from 'node:fs';

describe('Database & Persistence', () => {
  const testDbPath = './test_werewolf.db';
  let db: DatabaseManager;

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new DatabaseManager(testDbPath);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('lưu game và phục hồi chính xác (Hydration) từ SQLite', () => {
    const game = new WerewolfGame('game-persist-1', 'guild-100', 'channel-200', 'host-300');
    game.addPlayer('u1', 'Người chơi 1');
    game.addPlayer('u2', 'Người chơi 2');

    const p1 = game.players.get('u1')!;
    p1.roleId = 'WITCH';
    p1.originalRoleId = 'WITCH';
    p1.skills.witchHealRemaining = 0;
    p1.skills.witchPoisonRemaining = 1;

    const p2 = game.players.get('u2')!;
    p2.roleId = 'WEREWOLF';
    p2.faction = 'WEREWOLF';
    p2.isAlive = false;
    p2.deathReason = 'WOLF_BITE';
    p2.deathNight = 1;

    game.phase = 'NIGHT';
    game.nightNumber = 2;
    game.activeBerserkPierce = true;

    // Lưu vào database
    db.saveGame(game);

    // Đọc lại từ database
    const loadedGame = db.getGame('game-persist-1');
    expect(loadedGame).not.toBeNull();
    expect(loadedGame?.id).toBe('game-persist-1');
    expect(loadedGame?.guildId).toBe('guild-100');
    expect(loadedGame?.phase).toBe('NIGHT');
    expect(loadedGame?.nightNumber).toBe(2);
    expect(loadedGame?.activeBerserkPierce).toBe(true);

    const loadedP1 = loadedGame?.players.get('u1')!;
    expect(loadedP1).toBeDefined();
    expect(loadedP1.roleId).toBe('WITCH');
    expect(loadedP1.skills.witchHealRemaining).toBe(0);
    expect(loadedP1.skills.witchPoisonRemaining).toBe(1);

    const loadedP2 = loadedGame?.players.get('u2')!;
    expect(loadedP2).toBeDefined();
    expect(loadedP2.isAlive).toBe(false);
    expect(loadedP2.deathReason).toBe('WOLF_BITE');
  });

  it('phục hồi toàn bộ ván đang hoạt động khi bot khởi động lại (Reboot Recovery)', () => {
    const game1 = new WerewolfGame('g1', 'guild-1', 'ch-1', 'host-1');
    game1.phase = 'DISCUSSION';
    db.saveGame(game1);

    const game2 = new WerewolfGame('g2', 'guild-1', 'ch-2', 'host-2');
    game2.phase = 'FINISHED'; // Đã kết thúc -> không tải lại
    db.saveGame(game2);

    const activeGames = db.getAllActiveGames();
    expect(activeGames).toHaveLength(1);
    expect(activeGames[0].id).toBe('g1');
  });

  it('lưu và truy xuất preset cấu hình theo server', () => {
    const config = {
      roles: { WEREWOLF: 2, VILLAGER: 3 },
      timers: { roleConfirmSec: 20, nightSec: 30, dawnSec: 10, discussionSec: 60, votingSec: 30, hunterShotSec: 20 },
      rules: {
        witchCanSelfHealFirstNightOnly: true,
        witchCanSelfHealAlways: false,
        bodyguardCanProtectSelf: true,
        hunterCanShootIfPoisoned: false,
        revealRoleOnDeath: true,
        tieVoteAction: 'SKIP' as const,
        wolfTieAction: 'NO_KILL' as const,
        allowLoversWin: true,
      },
    };

    db.savePreset('guild-test', 'Preset Nhanh', 'Preset chơi tốc độ cao', config, 'admin-user');

    const loaded = db.getPreset('guild-test', 'Preset Nhanh');
    expect(loaded).not.toBeNull();
    expect(loaded?.name).toBe('Preset Nhanh');
    expect(loaded?.config.roles.WEREWOLF).toBe(2);

    const guildPresets = db.getGuildPresets('guild-test');
    expect(guildPresets).toHaveLength(1);
  });
});
