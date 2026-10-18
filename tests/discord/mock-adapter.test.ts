import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InteractionHandler } from '../../src/discord/interaction-handler';
import { DatabaseManager } from '../../src/database/database';
import { DmManager } from '../../src/discord/dm-manager';
import { WerewolfGame } from '../../src/engine/game';
import { GameSession } from '../../src/discord/game-session';
import { buildCustomId } from '../../src/discord/types';
import { WerewolfComponents } from '../../src/discord/components';
import { WerewolfEmbeds } from '../../src/discord/embeds';
import fs from 'node:fs';

describe('Discord Mock Adapter & Security Integration Tests', () => {
  const testDbPath = './test_adapter.db';
  let db: DatabaseManager;
  let dmManager: DmManager;
  let handler: InteractionHandler;

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    db = new DatabaseManager(testDbPath);
    dmManager = new DmManager();
    handler = new InteractionHandler(db, dmManager);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  function createMockButtonInteraction(customId: string, userId: string, displayName: string = 'User') {
    let replyPayload: any = null;
    let deferred = false;

    return {
      customId,
      user: { id: userId, username: displayName, displayName },
      member: { displayName },
      isChatInputCommand: () => false,
      isButton: () => true,
      isStringSelectMenu: () => false,
      isModalSubmit: () => false,
      isRepliable: () => true,
      replied: false,
      deferred,
      reply: vi.fn(async (options: any) => {
        replyPayload = options;
        return { id: 'mock-reply-id' };
      }),
      deferReply: vi.fn(async (options: any) => {
        deferred = true;
      }),
      editReply: vi.fn(async (options: any) => {
        replyPayload = options;
      }),
      update: vi.fn(async (options: any) => {
        replyPayload = options;
      }),
      getReply: () => replyPayload,
    } as any;
  }

  function createMockSelectInteraction(customId: string, userId: string, values: string[]) {
    let replyPayload: any = null;

    return {
      customId,
      user: { id: userId, username: 'User', displayName: 'User' },
      values,
      isChatInputCommand: () => false,
      isButton: () => false,
      isStringSelectMenu: () => true,
      isModalSubmit: () => false,
      isRepliable: () => true,
      replied: false,
      deferred: false,
      reply: vi.fn(async (options: any) => {
        replyPayload = options;
      }),
      update: vi.fn(async (options: any) => {
        replyPayload = options;
      }),
      getReply: () => replyPayload,
    } as any;
  }

  it('Người khác không thể bấm nút riêng của người chơi khác (Unauthorized check)', async () => {
    const game = new WerewolfGame('game-sec-1', 'guild-1', 'ch-1', 'host-1');
    game.addPlayer('user-alice', 'Alice');
    game.addPlayer('user-bob', 'Bob');

    const session = new GameSession(game, db, dmManager, {} as any);
    handler.registerSession(session);

    // Nút dành riêng cho Alice (targetUserId = 'user-alice')
    const buttonCustomId = buildCustomId(game.id, 'LOBBY', 'confirm_role', 'user-alice');

    // Bob cố tình bấm vào nút của Alice
    const mockBobInteraction = createMockButtonInteraction(buttonCustomId, 'user-bob', 'Bob');
    await handler.handleInteraction(mockBobInteraction);

    expect(mockBobInteraction.reply).toHaveBeenCalled();
    const reply = mockBobInteraction.getReply();
    expect(reply.ephemeral).toBe(true);
    expect(reply.content).toContain('Đây là nút riêng dành cho người chơi khác');
  });

  it('Nút cũ của pha trước bị từ chối nếu pha game đã thay đổi (Outdated phase check)', async () => {
    const game = new WerewolfGame('game-phase-1', 'guild-1', 'ch-1', 'host-1');
    game.addPlayer('u1', 'User 1');
    game.phase = 'VOTING'; // Game đang ở pha VOTING

    const session = new GameSession(game, db, dmManager, {} as any);
    handler.registerSession(session);

    // Người dùng bấm nút từ pha NIGHT cũ
    const nightButtonId = buildCustomId(game.id, 'NIGHT', 'wolf_vote', 'u1');
    const mockInteraction = createMockButtonInteraction(nightButtonId, 'u1');
    await handler.handleInteraction(mockInteraction);

    const reply = mockInteraction.getReply();
    expect(reply.content).toContain('Thao tác đã quá hạn hoặc không thuộc pha hiện tại');
  });

  it('Thao tác lặp (chống spam) được chặn an toàn', async () => {
    const game = new WerewolfGame('game-repeat-1', 'guild-1', 'ch-1', 'host-1');
    game.addPlayer('u1', 'User 1');

    const session = new GameSession(game, db, dmManager, {} as any);
    handler.registerSession(session);

    // u1 cố tình bấm Tham gia lần nữa
    const joinButtonId = buildCustomId(game.id, 'LOBBY', 'join', 'all');
    const mockJoin = createMockButtonInteraction(joinButtonId, 'u1');
    await handler.handleInteraction(mockJoin);

    const reply = mockJoin.getReply();
    expect(reply.content).toContain('đã có tên trong phòng chờ');
  });

  it('Hai trận độc lập ở hai kênh khác nhau hoàn toàn tách biệt', async () => {
    const gameA = new WerewolfGame('game-A', 'guild-1', 'channel-A', 'host-A');
    gameA.addPlayer('pA1', 'Player A1');

    const gameB = new WerewolfGame('game-B', 'guild-1', 'channel-B', 'host-B');
    gameB.addPlayer('pB1', 'Player B1');

    const sessionA = new GameSession(gameA, db, dmManager, {} as any);
    const sessionB = new GameSession(gameB, db, dmManager, {} as any);

    handler.registerSession(sessionA);
    handler.registerSession(sessionB);

    // Thao tác trên kênh A không ảnh hưởng tới kênh B
    expect(handler.getSession('channel-A')?.game.id).toBe('game-A');
    expect(handler.getSession('channel-B')?.game.id).toBe('game-B');
    expect(gameA.players.has('pB1')).toBe(false);
    expect(gameB.players.has('pA1')).toBe(false);
  });

  it('Hỗ trợ danh sách trên 25 người chơi bằng cách phân trang Select Menu hợp lệ', () => {
    const game = new WerewolfGame('game-30-players', 'g1', 'c1', 'h1');
    for (let i = 1; i <= 30; i++) {
      game.addPlayer(`u${i}`, `Player ${i}`);
    }

    const controls = WerewolfComponents.buildVotingControls(game);

    // controls có ít nhất 2 ActionRow select menus (vì 30 người > 25) + 1 button row
    expect(controls.length).toBeGreaterThanOrEqual(3);

    // Hàng 1 có 25 options, Hàng 2 có 5 options
    const select1 = (controls[0].toJSON() as any).components[0];
    const select2 = (controls[1].toJSON() as any).components[0];

    expect(select1.options.length).toBe(25);
    expect(select2.options.length).toBe(5);
  });

  it('Khởi động lại không mất trạng thái và xử lý deadline đã qua một cách idempotent', async () => {
    const game = new WerewolfGame('game-recover-1', 'guild-1', 'channel-1', 'host-1');
    game.addPlayer('u1', 'User 1');
    game.addPlayer('u2', 'User 2');
    game.phase = 'DISCUSSION';
    // Hạn chót đã trôi qua 10 giây trước
    game.phaseDeadline = Date.now() - 10000;

    db.saveGame(game);

    // Giả lập bot reboot: load từ database
    const recoveredGame = db.getGame('game-recover-1')!;
    const mockClient = {
      channels: {
        fetch: vi.fn(async () => ({
          isTextBased: () => true,
          isDMBased: () => false,
          messages: { fetch: vi.fn() },
          send: vi.fn(async () => ({ id: 'new-msg' })),
        })),
      },
      guilds: {
        fetch: vi.fn(async () => ({})),
      },
    } as any;

    const recoveredSession = new GameSession(recoveredGame, db, dmManager, mockClient);
    const advanceSpy = vi.spyOn(recoveredSession, 'advanceToVoting');

    await recoveredSession.checkExpiredDeadline();

    // advanceToVoting đã được gọi để xử lý deadline trôi qua
    expect(advanceSpy).toHaveBeenCalledTimes(1);

    // Gọi lần 2 không bị kích hoạt lại nếu đã xử lý
    recoveredGame.phase = 'VOTING';
    recoveredGame.phaseDeadline = Date.now() + 60000; // deadline mới trong tương lai
    const advanceResolutionSpy = vi.spyOn(recoveredSession, 'advanceToResolution');
    await recoveredSession.checkExpiredDeadline();
    expect(advanceResolutionSpy).not.toHaveBeenCalled();
  });

  describe('Kiểm tra chặn bypass điều kiện tối thiểu 4 người chơi qua Button, Command, Preset', () => {
    it('Nút Bắt đầu bị vô hiệu hóa khi phòng dưới 4 người và kích hoạt cảnh báo nếu bấm', async () => {
      const game = new WerewolfGame('game-min4-1', 'guild-1', 'ch-1', 'host-1');
      game.addPlayer('host-1', 'Host');
      game.addPlayer('u2', 'Player 2'); // 2 người

      // Kiểm tra component UI
      const controls = WerewolfComponents.buildLobbyControls(game);
      const startBtn = (controls[0].toJSON() as any).components[2];
      expect(startBtn.disabled).toBe(true);
      expect(startBtn.label).toContain('Cần ≥ 4 người');

      // Giả lập tương tác nút bấm cố tình bypass
      const session = new GameSession(game, db, dmManager, {} as any);
      handler.registerSession(session);

      const startButtonId = buildCustomId(game.id, 'LOBBY', 'start', 'host-1');
      const mockStart = createMockButtonInteraction(startButtonId, 'host-1', 'Host');
      await handler.handleInteraction(mockStart);

      const reply = mockStart.getReply();
      expect(reply.ephemeral).toBe(true);
      expect(reply.content).toBe('Cần tối thiểu 4 người chơi để bắt đầu trận Ma Sói. Hiện tại đang có 2 người.');
    });

    it('Nút Bắt đầu được kích hoạt khi phòng đạt đủ 4 người chơi', () => {
      const game = new WerewolfGame('game-min4-2', 'guild-1', 'ch-1', 'host-1');
      game.addPlayer('host-1', 'Host');
      game.addPlayer('u2', 'Player 2');
      game.addPlayer('u3', 'Player 3');
      game.addPlayer('u4', 'Player 4'); // 4 người

      const controls = WerewolfComponents.buildLobbyControls(game);
      const startBtn = (controls[0].toJSON() as any).components[2];
      expect(startBtn.disabled).toBe(false);
      expect(startBtn.label).toBe('Bắt đầu ván');
    });

    it('Lệnh /start từ chối bắt đầu nếu sảnh đang có dưới 4 người', async () => {
      const game = new WerewolfGame('game-min4-cmd', 'guild-1', 'ch-cmd', 'host-1');
      game.addPlayer('host-1', 'Host');
      game.addPlayer('u2', 'Player 2');
      game.addPlayer('u3', 'Player 3'); // 3 người

      const session = new GameSession(game, db, dmManager, {} as any);
      handler.registerSession(session);

      let replyPayload: any = null;
      const mockChatInput = {
        commandName: 'start',
        channelId: 'ch-cmd',
        guildId: 'guild-1',
        user: { id: 'host-1', username: 'Host' },
        isChatInputCommand: () => true,
        isButton: () => false,
        isStringSelectMenu: () => false,
        isModalSubmit: () => false,
        isRepliable: () => true,
        replied: false,
        reply: vi.fn(async (options: any) => {
          replyPayload = options;
        }),
      } as any;

      await handler.handleInteraction(mockChatInput);

      expect(replyPayload.content).toBe('Cần tối thiểu 4 người chơi để bắt đầu trận Ma Sói. Hiện tại đang có 3 người.');
    });

    it('Tự cân bằng và Preset Save từ chối cấu hình dưới 4 người', async () => {
      const game = new WerewolfGame('game-min4-cfg', 'guild-1', 'ch-cfg', 'host-1');
      game.addPlayer('host-1', 'Host'); // 1 người

      const session = new GameSession(game, db, dmManager, {} as any);
      handler.registerSession(session);

      // 1. Nút auto_balance khi có 1 người
      const autoBalanceId = buildCustomId(game.id, 'CONFIG', 'auto_balance', 'host-1');
      const mockAutoBalance = createMockButtonInteraction(autoBalanceId, 'host-1', 'Host');
      await handler.handleInteraction(mockAutoBalance);

      expect(mockAutoBalance.getReply().content).toBe(
        'Cần tối thiểu 4 người chơi để bắt đầu trận Ma Sói. Hiện tại đang có 1 người.'
      );

      // 2. /preset save khi cấu hình dưới 4 vai
      game.config.roles = { WEREWOLF: 1, VILLAGER: 2 }; // 3 vai
      let presetReply: any = null;
      const mockPresetSave = {
        commandName: 'preset',
        channelId: 'ch-cfg',
        guildId: 'guild-1',
        user: { id: 'host-1', username: 'Host' },
        options: {
          getSubcommand: () => 'save',
          getString: (name: string) => (name === 'name' ? 'test-preset' : 'desc'),
        },
        isChatInputCommand: () => true,
        isButton: () => false,
        isStringSelectMenu: () => false,
        isModalSubmit: () => false,
        isRepliable: () => true,
        replied: false,
        reply: vi.fn(async (options: any) => {
          presetReply = options;
        }),
      } as any;

      await handler.handleInteraction(mockPresetSave);
      expect(presetReply.content).toContain('Cần tối thiểu 4 người chơi để lưu cấu hình Ma Sói');
    });
  });

  describe('Kiểm tra chống trôi bảng biểu quyết sau thảo luận (postNewMainMessage, repost_vote, /vote, live progress)', () => {
    it('WerewolfComponents.buildVotingControls có nút Bỏ phiếu trắng và nút Kéo bảng vote xuống', () => {
      const game = new WerewolfGame('game-vote-ui', 'guild-1', 'ch-1', 'host-1');
      game.addPlayer('u1', 'User 1');
      game.addPlayer('u2', 'User 2');
      game.addPlayer('u3', 'User 3');
      game.addPlayer('u4', 'User 4');

      const controls = WerewolfComponents.buildVotingControls(game);
      expect(controls.length).toBeGreaterThanOrEqual(2); // Select menu + Button row
      const buttonRow = controls[controls.length - 1].toJSON() as any;
      expect(buttonRow.components.length).toBe(2);
      expect(buttonRow.components[0].custom_id).toContain('skip_vote');
      expect(buttonRow.components[1].custom_id).toContain('repost_vote');
      expect(buttonRow.components[1].label).toBe('Kéo bảng vote xuống');
    });

    it('WerewolfEmbeds.buildVotingEmbed hiển thị đúng tiến độ X/Y và icon trạng thái ✅/⏳', () => {
      const game = new WerewolfGame('game-embed-test', 'guild-1', 'ch-1', 'host-1');
      game.addPlayer('u1', 'An');
      game.addPlayer('u2', 'Bình');
      game.addPlayer('u3', 'Chi');
      game.addPlayer('u4', 'Dũng');
      game.startGame();
      game.startVoting();

      // Lúc đầu chưa ai vote
      const embedInitial = WerewolfEmbeds.buildVotingEmbed(game);
      const descInitial = (embedInitial.toJSON() as any).description;
      expect(descInitial).toContain('0/4');

      // u1 bỏ phiếu treo cổ u2
      game.submitAction({ userId: 'u1', roleId: 'VILLAGER', type: 'DAY_VOTE', targetId: 'u2', nightNumber: 1, phase: 'VOTING' });
      const embedAfter1 = WerewolfEmbeds.buildVotingEmbed(game);
      const descAfter1 = (embedAfter1.toJSON() as any).description;
      expect(descAfter1).toContain('1/4');
      const fieldsAfter1 = (embedAfter1.toJSON() as any).fields;
      expect(fieldsAfter1[0].value).toContain('✅ <@u1>');
      expect(fieldsAfter1[0].value).toContain('⏳ <@u2>');

      // u1 đổi sang bỏ phiếu trắng (skip_vote) -> không bị tính 2 lần
      game.submitAction({ userId: 'u1', roleId: 'VILLAGER', type: 'DAY_VOTE_SKIP', nightNumber: 1, phase: 'VOTING' });
      const embedAfterSkip = WerewolfEmbeds.buildVotingEmbed(game);
      const descAfterSkip = (embedAfterSkip.toJSON() as any).description;
      expect(descAfterSkip).toContain('1/4');
      expect(game.currentPhaseActions.length).toBe(1);
    });

    it('advanceToVoting gửi tin nhắn mới ở cuối kênh (chống trôi) và tag các cử tri còn sống', async () => {
      const game = new WerewolfGame('game-vote-msg', 'guild-1', 'ch-vote', 'host-1');
      game.addPlayer('u1', 'An');
      game.addPlayer('u2', 'Bình');
      game.addPlayer('u3', 'Chi');
      game.addPlayer('u4', 'Dũng');
      game.startGame();

      let sentPayload: any = null;
      const mockChannel = {
        isTextBased: () => true,
        isDMBased: () => false,
        messages: { fetch: vi.fn(async () => null) },
        send: vi.fn(async (options: any) => {
          sentPayload = options;
          return { id: 'vote-main-msg-1', edit: vi.fn(), delete: vi.fn() };
        }),
      };

      const mockClient = {
        channels: { fetch: vi.fn(async () => mockChannel) },
        guilds: { fetch: vi.fn(async () => ({})) },
      } as any;

      const session = new GameSession(game, db, dmManager, mockClient);
      session.mainMessageId = 'old-discussion-msg-id';

      await session.advanceToVoting();

      // Đã gửi tin nhắn mới xuống đáy kênh
      expect(mockChannel.send).toHaveBeenCalled();
      expect(session.mainMessageId).toBe('vote-main-msg-1');
      expect(sentPayload.content).toContain('HẾT GIỜ THẢO LUẬN! ĐÃ ĐẾN GIỜ BIỂU QUYẾT TREO CỔ');
      expect(sentPayload.content).toContain('<@u1>');
      expect(sentPayload.content).toContain('<@u4>');
    });

    it('Nút repost_vote và lệnh /vote kéo bảng biểu quyết xuống cuối kênh', async () => {
      const game = new WerewolfGame('game-repost-test', 'guild-1', 'ch-repost', 'host-1');
      game.addPlayer('u1', 'An');
      game.addPlayer('u2', 'Bình');
      game.addPlayer('u3', 'Chi');
      game.addPlayer('u4', 'Dũng');
      game.startGame();
      game.startVoting();

      const oldDeleteMock = vi.fn();
      const mockChannel = {
        isTextBased: () => true,
        isDMBased: () => false,
        messages: {
          fetch: vi.fn(async () => ({
            delete: oldDeleteMock,
            edit: vi.fn(),
          })),
        },
        send: vi.fn(async () => ({ id: 'new-vote-bottom-msg', edit: vi.fn(), delete: vi.fn() })),
      };

      const mockClient = {
        channels: { fetch: vi.fn(async () => mockChannel) },
        guilds: { fetch: vi.fn(async () => ({})) },
      } as any;

      const session = new GameSession(game, db, dmManager, mockClient);
      session.mainMessageId = 'initial-vote-msg';
      handler.registerSession(session);

      // 1. Test nút repost_vote
      const repostCustomId = buildCustomId(game.id, 'VOTING', 'repost_vote', 'all');
      const mockBtn = createMockButtonInteraction(repostCustomId, 'u1', 'An');
      await handler.handleInteraction(mockBtn);

      expect(mockBtn.getReply().content).toContain('Đã kéo bảng biểu quyết treo cổ xuống cuối kênh');
      expect(oldDeleteMock).toHaveBeenCalled();
      expect(session.mainMessageId).toBe('new-vote-bottom-msg');

      // 2. Test lệnh /vote
      let voteCmdReply: any = null;
      const mockVoteCmd = {
        commandName: 'vote',
        channelId: 'ch-repost',
        guildId: 'guild-1',
        user: { id: 'u2', username: 'Bình' },
        isChatInputCommand: () => true,
        isButton: () => false,
        isStringSelectMenu: () => false,
        isModalSubmit: () => false,
        isRepliable: () => true,
        replied: false,
        reply: vi.fn(async (options: any) => {
          voteCmdReply = options;
        }),
      } as any;

      await handler.handleInteraction(mockVoteCmd);
      expect(voteCmdReply.content).toContain('Đã kéo bảng biểu quyết treo cổ xuống cuối kênh');

      // 3. Test /vote khi game KHÔNG ở pha VOTING
      game.phase = 'DISCUSSION';
      await handler.handleInteraction(mockVoteCmd);
      expect(voteCmdReply.content).toContain('Hiện không phải thời gian biểu quyết treo cổ');
    });
  });

  describe('Kiểm tra khóa chat người đã chết và khóa kênh ban đêm (Channel Overwrites & handleMessage)', () => {
    it('syncDeadPlayersChatPermissions khóa SendMessages: false đối với người đã chết', async () => {
      const game = new WerewolfGame('game-lock-dead', 'guild-1', 'ch-lock', 'host-1');
      game.addPlayer('u1', 'Sống');
      game.addPlayer('u2', 'Đã chết');
      game.addPlayer('u3', 'Còn sống');
      game.addPlayer('u4', 'Còn sống 2');
      game.startGame();

      // Cho u2 chết
      game.players.get('u2')!.isAlive = false;

      const editOverwriteMock = vi.fn();
      const deleteOverwriteMock = vi.fn();

      const mockChannel = {
        isTextBased: () => true,
        isDMBased: () => false,
        permissionOverwrites: {
          edit: editOverwriteMock,
          delete: deleteOverwriteMock,
        },
      };

      const mockClient = {
        channels: { fetch: vi.fn(async () => mockChannel) },
        guilds: { fetch: vi.fn(async () => ({ roles: { everyone: { id: 'everyone-role' } } })) },
      } as any;

      const session = new GameSession(game, db, dmManager, mockClient);

      // Đồng bộ khóa chat
      await session.syncDeadPlayersChatPermissions();

      // Chỉ có u2 bị gọi edit overwrite khóa chat
      expect(editOverwriteMock).toHaveBeenCalledWith(
        'u2',
        { SendMessages: false },
        expect.objectContaining({ reason: expect.stringContaining('đã tử trận') })
      );
      expect(editOverwriteMock).not.toHaveBeenCalledWith('u1', expect.anything(), expect.anything());

      // Phục hồi quyền khi ván kết thúc
      await session.restoreAllChannelPermissions();
      expect(deleteOverwriteMock).toHaveBeenCalledWith('u2', expect.anything());
    });

    it('lockChannelForNight và unlockChannelForDay khóa/mở kênh cho @everyone', async () => {
      const game = new WerewolfGame('game-lock-night', 'guild-1', 'ch-lock-night', 'host-1');
      game.addPlayer('u1', 'User 1');
      game.addPlayer('u2', 'User 2');
      game.addPlayer('u3', 'User 3');
      game.addPlayer('u4', 'User 4');

      const editOverwriteMock = vi.fn();
      const mockChannel = {
        isTextBased: () => true,
        isDMBased: () => false,
        permissionOverwrites: { edit: editOverwriteMock },
      };

      const mockClient = {
        channels: { fetch: vi.fn(async () => mockChannel) },
        guilds: { fetch: vi.fn(async () => ({ roles: { everyone: { id: 'role-everyone-123' } } })) },
      } as any;

      const session = new GameSession(game, db, dmManager, mockClient);

      // 1. Khóa ban đêm
      await session.lockChannelForNight();
      expect(editOverwriteMock).toHaveBeenCalledWith(
        { id: 'role-everyone-123' },
        { SendMessages: false },
        expect.anything()
      );

      // 2. Mở ban ngày
      await session.unlockChannelForDay();
      expect(editOverwriteMock).toHaveBeenCalledWith(
        { id: 'role-everyone-123' },
        { SendMessages: null },
        expect.anything()
      );
    });

    it('handleMessage xóa tin nhắn và gửi cảnh báo khi người chết nhắn tin hoặc chat ban đêm', async () => {
      const game = new WerewolfGame('game-msg-guard', 'guild-1', 'ch-guard', 'host-1');
      game.addPlayer('u1', 'Alive 1');
      game.addPlayer('u2', 'Dead Guy');
      game.addPlayer('u3', 'Alive 2');
      game.addPlayer('u4', 'Alive 3');
      game.startGame();
      game.phase = 'DISCUSSION';

      // u2 đã tử trận
      game.players.get('u2')!.isAlive = false;

      const session = new GameSession(game, db, dmManager, {} as any);
      handler.registerSession(session);

      // 1. Người chết (u2) gửi tin nhắn trong pha thảo luận -> bị xóa và gửi cảnh báo
      const deleteMock1 = vi.fn();
      const sendMock1 = vi.fn(async () => ({ delete: vi.fn() }));
      const mockDeadMessage = {
        author: { id: 'u2', bot: false },
        channelId: 'ch-guard',
        channel: { send: sendMock1 },
        delete: deleteMock1,
      } as any;

      await handler.handleMessage(mockDeadMessage);
      expect(deleteMock1).toHaveBeenCalled();
      expect(sendMock1).toHaveBeenCalledWith(expect.objectContaining({
        content: expect.stringContaining('bạn đã tử trận nên không thể nhắn tin'),
      }));

      // 2. Người sống (u1) gửi tin nhắn trong pha thảo luận -> bình thường (không bị xóa)
      const deleteMock2 = vi.fn();
      const sendMock2 = vi.fn();
      const mockAliveMessage = {
        author: { id: 'u1', bot: false },
        channelId: 'ch-guard',
        channel: { send: sendMock2 },
        delete: deleteMock2,
      } as any;

      await handler.handleMessage(mockAliveMessage);
      expect(deleteMock2).not.toHaveBeenCalled();
      expect(sendMock2).not.toHaveBeenCalled();

      // 3. Người sống (u1) gửi tin nhắn khi trời đang là ban đêm (NIGHT) -> bị xóa và nhắc nhở
      game.phase = 'NIGHT';
      const deleteMock3 = vi.fn();
      const sendMock3 = vi.fn(async () => ({ delete: vi.fn() }));
      const mockNightMessage = {
        author: { id: 'u1', bot: false },
        channelId: 'ch-guard',
        channel: { send: sendMock3 },
        delete: deleteMock3,
      } as any;

      await handler.handleMessage(mockNightMessage);
      expect(deleteMock3).toHaveBeenCalled();
      expect(sendMock3).toHaveBeenCalledWith(expect.objectContaining({
        content: expect.stringContaining('trời đang là ban đêm! Cả làng đang ngủ say'),
      }));
    });
  });
});


