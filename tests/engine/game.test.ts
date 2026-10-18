import { describe, it, expect, beforeEach } from 'vitest';
import { WerewolfGame } from '../../src/engine/game';
import { DEFAULT_CONFIG } from '../../src/engine/presets';
import { WerewolfEmbeds } from '../../src/discord/embeds';

describe('WerewolfGame Engine Core & Lobby', () => {
  let game: WerewolfGame;

  beforeEach(() => {
    game = new WerewolfGame('game-1', 'guild-1', 'channel-1', 'host-1');
  });

  it('khởi tạo game ở trạng thái LOBBY', () => {
    expect(game.phase).toBe('LOBBY');
    expect(game.players.size).toBe(0);
    expect(game.nightNumber).toBe(0);
    expect(game.dayNumber).toBe(0);
  });

  it('cho phép thêm người chơi và chặn trùng lặp', () => {
    const res1 = game.addPlayer('u1', 'An');
    expect(res1.success).toBe(true);
    expect(game.players.size).toBe(1);

    const res2 = game.addPlayer('u1', 'An');
    expect(res2.success).toBe(false);
    expect(res2.message).toContain('đã có tên trong phòng chờ');
    expect(game.players.size).toBe(1);
  });

  it('cho phép xóa người chơi khỏi sảnh chờ', () => {
    game.addPlayer('u1', 'An');
    game.addPlayer('u2', 'Bình');
    expect(game.players.size).toBe(2);

    const res = game.removePlayer('u1');
    expect(res.success).toBe(true);
    expect(game.players.size).toBe(1);
    expect(game.players.has('u1')).toBe(false);
  });

  describe('Kiểm tra điều kiện tối thiểu 4 người chơi (0, 1, 3, 4 và >4)', () => {
    it('chặn bắt đầu ván khi có 0 người chơi', () => {
      const res = game.startGame();
      expect(res.success).toBe(false);
      expect(res.message).toBe('Cần tối thiểu 4 người chơi để bắt đầu trận Ma Sói. Hiện tại đang có 0 người.');
    });

    it('chặn bắt đầu ván khi có 1 người chơi', () => {
      game.addPlayer('u1', 'An');
      const res = game.startGame();
      expect(res.success).toBe(false);
      expect(res.message).toBe('Cần tối thiểu 4 người chơi để bắt đầu trận Ma Sói. Hiện tại đang có 1 người.');
    });

    it('chặn bắt đầu ván khi có 3 người chơi', () => {
      game.addPlayer('u1', 'An');
      game.addPlayer('u2', 'Bình');
      game.addPlayer('u3', 'Chi');
      const res = game.startGame();
      expect(res.success).toBe(false);
      expect(res.message).toBe('Cần tối thiểu 4 người chơi để bắt đầu trận Ma Sói. Hiện tại đang có 3 người.');
    });

    it('cho phép bắt đầu ván khi có đúng 4 người chơi và đội hình hợp lệ', () => {
      game.setConfig({
        ...DEFAULT_CONFIG,
        roles: {
          WEREWOLF: 1,
          SEER: 1,
          BODYGUARD: 1,
          VILLAGER: 1,
        },
      });

      game.addPlayer('u1', 'An');
      game.addPlayer('u2', 'Bình');
      game.addPlayer('u3', 'Chi');
      game.addPlayer('u4', 'Dũng');

      const res = game.startGame();
      expect(res.success).toBe(true);
      expect(game.phase).toBe('ROLE_DISTRIBUTION');
      expect(game.players.size).toBe(4);
    });

    it('cho phép bắt đầu ván khi có nhiều hơn 4 người chơi (5 người)', () => {
      game.setConfig({
        ...DEFAULT_CONFIG,
        roles: {
          WEREWOLF: 1,
          SEER: 1,
          BODYGUARD: 1,
          VILLAGER: 2,
        },
      });

      game.addPlayer('u1', 'An');
      game.addPlayer('u2', 'Bình');
      game.addPlayer('u3', 'Chi');
      game.addPlayer('u4', 'Dũng');
      game.addPlayer('u5', 'Huy');

      const res = game.startGame();
      expect(res.success).toBe(true);
      expect(game.phase).toBe('ROLE_DISTRIBUTION');
      expect(game.players.size).toBe(5);
    });

    it('từ chối cấu hình có dưới 4 vai qua setConfig', () => {
      const res = game.setConfig({
        ...DEFAULT_CONFIG,
        roles: {
          WEREWOLF: 1,
          VILLAGER: 2, // 3 vai
        },
      });
      expect(res.success).toBe(false);
      expect(res.message).toContain('Cần tối thiểu 4 người chơi để lưu hoặc áp dụng cấu hình Ma Sói');
    });

    it('tự động cân bằng số vai khớp với số người khi có từ 4 người chơi với cấu hình mặc định', () => {
      const defaultGame = new WerewolfGame('auto-balance-game', 'g1', 'c1', 'h1');
      defaultGame.addPlayer('p1', 'Player 1');
      defaultGame.addPlayer('p2', 'Player 2');
      defaultGame.addPlayer('p3', 'Player 3');
      defaultGame.addPlayer('p4', 'Player 4');

      // Khởi động không cần chỉnh sửa thủ công, game tự khớp 4 vai với 4 người
      const res = defaultGame.startGame();
      expect(res.success).toBe(true);
      expect(defaultGame.phase).toBe('ROLE_DISTRIBUTION');
      const totalRoles = Object.values(defaultGame.config.roles).reduce((a, b) => a + b, 0);
      expect(totalRoles).toBe(4);
    });
  });

  it('xáo và phân vai đúng số lượng khi cấu hình hợp lệ', () => {
    // Cấu hình 4 người: 1 Sói, 1 Tiên tri, 1 Bảo vệ, 1 Dân
    game.setConfig({
      ...DEFAULT_CONFIG,
      roles: {
        WEREWOLF: 1,
        SEER: 1,
        BODYGUARD: 1,
        VILLAGER: 1,
      },
    });

    game.addPlayer('u1', 'An');
    game.addPlayer('u2', 'Bình');
    game.addPlayer('u3', 'Chi');
    game.addPlayer('u4', 'Dũng');

    const res = game.startGame();
    expect(res.success).toBe(true);
    expect(game.phase).toBe('ROLE_DISTRIBUTION');

    // Kiểm tra tất cả người chơi đều có vai
    const assignedRoles = Array.from(game.players.values()).map((p) => p.roleId);
    expect(assignedRoles).toHaveLength(4);
    expect(assignedRoles).toContain('WEREWOLF');
    expect(assignedRoles).toContain('SEER');
    expect(assignedRoles).toContain('BODYGUARD');
    expect(assignedRoles).toContain('VILLAGER');
  });

  it('hỗ trợ xác nhận vai bí mật và kiểm tra tất cả đã sẵn sàng', () => {
    game.setConfig({
      ...DEFAULT_CONFIG,
      roles: { WEREWOLF: 1, SEER: 1, BODYGUARD: 1, VILLAGER: 1 },
    });
    game.addPlayer('u1', 'An');
    game.addPlayer('u2', 'Bình');
    game.addPlayer('u3', 'Chi');
    game.addPlayer('u4', 'Dũng');
    game.startGame();

    expect(game.confirmRole('u1').allConfirmed).toBe(false);
    expect(game.confirmRole('u2').allConfirmed).toBe(false);
    expect(game.confirmRole('u3').allConfirmed).toBe(false);
    expect(game.confirmRole('u4').allConfirmed).toBe(true);
  });

  it('hỗ trợ tạm dừng, tiếp tục và hủy trận', () => {
    game.addPlayer('u1', 'An');
    game.addPlayer('u2', 'Bình');

    const pauseRes = game.pause();
    expect(pauseRes.success).toBe(true);
    expect(game.phase).toBe('PAUSED');

    const resumeRes = game.resume();
    expect(resumeRes.success).toBe(true);
    expect(game.phase).toBe('LOBBY');

    const cancelRes = game.cancel('Người chơi bận');
    expect(cancelRes.success).toBe(true);
    expect(game.phase).toBe('CANCELLED');
  });

  it('mặc định không công bố vai khi chết/treo cổ (revealRoleOnDeath = false)', () => {
    expect(game.config.rules.revealRoleOnDeath).toBe(false);

    game.addPlayer('u1', 'An');
    game.addPlayer('u2', 'Bình');
    game.addPlayer('u3', 'Chi');
    game.addPlayer('u4', 'Dũng');
    game.startGame();

    // Biểu quyết treo cổ u1
    game.startVoting();
    game.submitAction({ userId: 'u2', roleId: 'VILLAGER', type: 'DAY_VOTE', targetId: 'u1', nightNumber: 1, phase: 'VOTING' });
    game.submitAction({ userId: 'u3', roleId: 'VILLAGER', type: 'DAY_VOTE', targetId: 'u1', nightNumber: 1, phase: 'VOTING' });
    const lynchResult = game.resolveVotingPhase();

    expect(lynchResult.lynchedPlayer?.id).toBe('u1');
    const embed = WerewolfEmbeds.buildResolutionEmbed(game, lynchResult);
    const desc = (embed.toJSON() as any).description;
    expect(desc).not.toContain('Vai trò thực sự');
  });
});
