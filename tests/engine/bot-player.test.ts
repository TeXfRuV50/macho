import { describe, it, expect, beforeEach } from 'vitest';
import { WerewolfGame } from '../../src/engine/game';
import { WerewolfBotAi } from '../../src/engine/bot-ai';
import { DEFAULT_CONFIG, PRESET_ADVANCED } from '../../src/engine/presets';

describe('Bot Players & AI Automation Tests', () => {
  let game: WerewolfGame;

  beforeEach(() => {
    game = new WerewolfGame('game-bot-1', 'guild-1', 'channel-1', 'host-1');
  });

  describe('Thêm & Quản lý Bot trong Sảnh chờ', () => {
    it('thêm bot thành công với tên tự động', () => {
      game.addPlayer('host-1', 'Chủ Phòng');
      const res = game.addBotPlayer();
      expect(res.success).toBe(true);
      expect(res.botId).toBe('bot_1');
      expect(game.players.size).toBe(2);

      const bot = game.players.get('bot_1')!;
      expect(bot.isBot).toBe(true);
      expect(bot.hasConfirmedRole).toBe(true);
    });

    it('fillBots tự động điền đủ số lượng tối thiểu (4 người)', () => {
      game.addPlayer('host-1', 'Chủ Phòng');
      expect(game.players.size).toBe(1);

      const res = game.fillBots();
      expect(res.success).toBe(true);
      expect(res.addedCount).toBe(3);
      expect(game.players.size).toBe(4);

      // Thử fill lại khi đã đủ 4 người
      const res2 = game.fillBots();
      expect(res2.addedCount).toBe(0);
      expect(game.players.size).toBe(4);
    });

    it('fillBots với số lượng mục tiêu tùy chỉnh (ví dụ 6 người)', () => {
      game.addPlayer('host-1', 'Chủ Phòng');
      const res = game.fillBots(6);
      expect(res.success).toBe(true);
      expect(res.addedCount).toBe(5);
      expect(game.players.size).toBe(6);
    });

    it('fillBots tự động điền đủ số vai đặc biệt nếu preset yêu cầu nhiều người', () => {
      game.addPlayer('host-1', 'Chủ Phòng');
      game.setConfig(PRESET_ADVANCED.config); // 13 vai

      const res = game.fillBots();
      expect(res.success).toBe(true);
      expect(game.players.size).toBeGreaterThanOrEqual(13);
    });

    it('xóa bot gần nhất (removeBotPlayer)', () => {
      game.addPlayer('host-1', 'Chủ Phòng');
      game.addBotPlayer();
      game.addBotPlayer();
      expect(game.players.size).toBe(3);

      const res = game.removeBotPlayer();
      expect(res.success).toBe(true);
      expect(game.players.size).toBe(2);
    });

    it('xóa toàn bộ bot (clearBots)', () => {
      game.addPlayer('host-1', 'Chủ Phòng');
      game.fillBots(5);
      expect(game.players.size).toBe(5);

      const res = game.clearBots();
      expect(res.success).toBe(true);
      expect(res.removedCount).toBe(4);
      expect(game.players.size).toBe(1);
      expect(game.players.has('host-1')).toBe(true);
    });
  });

  describe('Tự động hóa hành vi Bot trong Game', () => {
    it('Bot tự động xác nhận vai ngay khi chia vai (ROLE_DISTRIBUTION)', () => {
      game.addPlayer('host-1', 'Chủ Phòng');
      game.fillBots(4);

      const res = game.startGame();
      expect(res.success).toBe(true);
      expect(game.phase).toBe('ROLE_DISTRIBUTION');

      const bots = Array.from(game.players.values()).filter((p) => p.isBot);
      for (const b of bots) {
        expect(b.hasConfirmedRole).toBe(true);
      }
    });

    it('Bot tự động thực hiện hành vi ban đêm (NIGHT) hợp lệ', () => {
      game.setConfig({
        ...DEFAULT_CONFIG,
        roles: {
          WEREWOLF: 1,
          SEER: 1,
          BODYGUARD: 1,
          VILLAGER: 1,
        },
      });

      // Tạo trận 4 bot để kiểm tra toàn bộ AI ban đêm
      game.addPlayer('bot_1', 'Bot 1', true);
      game.addPlayer('bot_2', 'Bot 2', true);
      game.addPlayer('bot_3', 'Bot 3', true);
      game.addPlayer('bot_4', 'Bot 4', true);

      game.startGame();
      game.startNight();

      const { actionsSubmitted } = WerewolfBotAi.performNightActions(game);
      expect(actionsSubmitted).toBeGreaterThanOrEqual(1);

      // Ít nhất sói bot phải có vote cắn
      const wolfVote = game.currentPhaseActions.find((a) => a.type === 'WOLF_VOTE');
      expect(wolfVote).toBeDefined();
      expect(wolfVote?.targetId).toBeDefined();
    });

    it('Bot tự động biểu quyết ban ngày (VOTING)', () => {
      game.addPlayer('bot_1', 'Bot 1', true);
      game.addPlayer('bot_2', 'Bot 2', true);
      game.addPlayer('bot_3', 'Bot 3', true);
      game.addPlayer('bot_4', 'Bot 4', true);

      game.startGame();
      game.startDiscussion();
      game.startVoting();

      const { votesSubmitted } = WerewolfBotAi.performDayVotes(game);
      expect(votesSubmitted).toBe(4);

      // Cả 4 bot đều đã đưa ra vote (DAY_VOTE hoặc DAY_VOTE_SKIP)
      const dayVotes = game.currentPhaseActions.filter((a) => a.type === 'DAY_VOTE' || a.type === 'DAY_VOTE_SKIP');
      expect(dayVotes.length).toBe(4);
    });

    it('Bot Thợ săn tự động nổ súng trả thù khi tử trận', () => {
      game.addPlayer('bot_hunter', 'Bot Thợ Săn', true);
      game.addPlayer('bot_wolf', 'Bot Sói', true);
      game.addPlayer('bot_villager', 'Bot Dân Làng', true);

      const hunter = game.players.get('bot_hunter')!;
      hunter.roleId = 'HUNTER';
      hunter.originalRoleId = 'HUNTER';
      hunter.isAlive = false;

      const shotTarget = WerewolfBotAi.performHunterShot(game, 'bot_hunter');
      expect(shotTarget).not.toBeNull();
      expect(shotTarget?.isAlive).toBe(false);
      expect(shotTarget?.deathReason).toBe('HUNTER_SHOT');
    });

    it('Một ván đấu giữa 1 người thật và 3 bot diễn ra trơn tru từ đầu đến cuối', () => {
      game.addPlayer('real_host', 'Người Chơi Thật');
      game.fillBots(4);

      // 1. Start game
      const startRes = game.startGame();
      expect(startRes.success).toBe(true);

      // 2. Real host confirms role
      const confirmRes = game.confirmRole('real_host');
      expect(confirmRes.allConfirmed).toBe(true); // 3 bots đã auto-confirm

      // 3. Night phase
      game.startNight();
      WerewolfBotAi.performNightActions(game);
      const dawnResult = game.resolveNightPhase();
      expect(dawnResult).toBeDefined();

      // 4. Discussion & Voting
      game.startDiscussion();
      game.startVoting();
      WerewolfBotAi.performDayVotes(game);

      // Real host votes
      const aliveNonHost = Array.from(game.players.values()).find((p) => p.isAlive && p.id !== 'real_host');
      if (aliveNonHost) {
        game.submitAction({
          userId: 'real_host',
          roleId: game.players.get('real_host')!.roleId,
          type: 'DAY_VOTE',
          targetId: aliveNonHost.id,
          nightNumber: game.nightNumber,
          phase: 'VOTING',
        });
      }

      const voteRes = game.resolveVotingPhase();
      expect(voteRes).toBeDefined();
    });

    describe('Trò chuyện sinh động của Bot (Discussion & Voting Chat)', () => {
      it('Bot Tiên tri soi ra Sói thì tố giác rõ tên Sói trong pha thảo luận', () => {
        game.addPlayer('bot_seer', 'Bot Tiên Tri', true);
        game.addPlayer('bot_wolf', 'Bot Sói Ca', true);
        game.addPlayer('bot_villager', 'Bot Dân Lành', true);

        const seer = game.players.get('bot_seer')!;
        seer.roleId = 'SEER';
        seer.originalRoleId = 'SEER';

        const wolf = game.players.get('bot_wolf')!;
        wolf.roleId = 'WEREWOLF';
        wolf.originalRoleId = 'WEREWOLF';
        wolf.faction = 'WEREWOLF';

        game.startNight();
        // Tiên tri soi Bot Sói Ca
        game.submitAction({
          userId: 'bot_seer',
          roleId: 'SEER',
          type: 'SEER_INVESTIGATE',
          targetId: 'bot_wolf',
          nightNumber: 1,
          phase: 'NIGHT',
        });

        game.startDiscussion();
        const chatList = WerewolfBotAi.generateDiscussionChat(game);

        expect(chatList.length).toBeGreaterThanOrEqual(1);
        const seerMsg = chatList.find((m) => m.botId === 'bot_seer');
        expect(seerMsg).toBeDefined();
        expect(seerMsg?.text).toContain('Bot Sói Ca');
        expect(seerMsg?.text).toMatch(/SÓI|Ma Sói/);
      });

      it('Bot Ma Sói giả làm Dân làng chân chính trong pha thảo luận', () => {
        game.addPlayer('bot_wolf', 'Bot Sói Ẩn Danh', true);
        game.addPlayer('user_an', 'An (Dân)');
        game.addPlayer('user_binh', 'Bình (Dân)');

        const wolf = game.players.get('bot_wolf')!;
        wolf.roleId = 'WEREWOLF';
        wolf.originalRoleId = 'WEREWOLF';
        wolf.faction = 'WEREWOLF';

        game.startDiscussion();
        const chatList = WerewolfBotAi.generateDiscussionChat(game);

        const wolfMsg = chatList.find((m) => m.botId === 'bot_wolf');
        expect(wolfMsg).toBeDefined();
        // Sói giả làm dân hoặc nghi ngờ người khác
        expect(wolfMsg?.text).toMatch(/Dân làng|khả nghi|Sói|bầy Sói/);
      });

      it('Bot Kẻ chán đời khiêu khích để được treo cổ', () => {
        game.addPlayer('bot_tanner', 'Bot Chán Đời', true);
        game.addPlayer('u2', 'Người Chơi 2');

        const tanner = game.players.get('bot_tanner')!;
        tanner.roleId = 'TANNER';
        tanner.originalRoleId = 'TANNER';
        tanner.faction = 'SOLO';

        game.startDiscussion();
        const chatList = WerewolfBotAi.generateDiscussionChat(game);

        const tannerMsg = chatList.find((m) => m.botId === 'bot_tanner');
        expect(tannerMsg).toBeDefined();
        expect(tannerMsg?.text).toMatch(/treo cổ|chán|Ma Sói|vote/);
      });

      it('Bot bỏ phiếu bí mật và không làm lộ mục tiêu đã vote (Secret voting comments)', () => {
        game.addPlayer('bot_voter', 'Bot Bỏ Phiếu', true);
        game.addPlayer('u_target', 'Mục Tiêu');

        game.startVoting();
        game.submitAction({
          userId: 'bot_voter',
          roleId: 'VILLAGER',
          type: 'DAY_VOTE',
          targetId: 'u_target',
          nightNumber: 1,
          phase: 'VOTING',
        });

        const comments = WerewolfBotAi.generateVotingComments(game);
        expect(comments.length).toBe(1);
        expect(comments[0].botName).toBe('Bot Bỏ Phiếu');
        // Giữ bí mật tuyệt đối: không được chứa tên người bị vote
        expect(comments[0].text).not.toContain('Mục Tiêu');
        expect(comments[0].text).toMatch(/bỏ phiếu|lá phiếu|vote/);
      });

      it('Bot bắt đầu thảo luận sớm không bị trễ quá lâu (Discussion delay <= 2s)', () => {
        game.addPlayer('bot_villager', 'Bot Dân Làng', true);
        game.addPlayer('u1', 'Người Chơi 1');

        game.startDiscussion();
        const chatList = WerewolfBotAi.generateDiscussionChat(game);
        expect(chatList.length).toBeGreaterThan(0);
        // Tin nhắn đầu tiên phải xuất hiện sớm (delay <= 2s)
        expect(chatList[0].delaySec).toBeLessThanOrEqual(2);
      });
    });
  });
});
