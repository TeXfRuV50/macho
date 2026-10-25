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
        replyPayload = {
          ...options,
          ephemeral: options.ephemeral ?? (options.flags === 64),
        };
        return { id: 'mock-reply-id' };
      }),
      deferReply: vi.fn(async (options: any) => {
        deferred = true;
      }),
      editReply: vi.fn(async (options: any) => {
        replyPayload = {
          ...options,
          ephemeral: options.ephemeral ?? (options.flags === 64),
        };
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
        replyPayload = {
          ...options,
          ephemeral: options.ephemeral ?? (options.flags === 64),
        };
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

  describe('Kiểm tra nút bấm & Slash Command quản lý Bot trong sảnh chờ', () => {
    it('Nút "+1 Bot" và "Điền đủ Bot" hoạt động chính xác qua Discord interaction', async () => {
      const game = new WerewolfGame('game-bot-btn', 'guild-1', 'ch-bot-btn', 'host-1');
      game.addPlayer('host-1', 'Host');

      const session = new GameSession(game, db, dmManager, {} as any);
      handler.registerSession(session);

      // 1. Host bấm nút "+1 Bot"
      const addBotCustomId = buildCustomId(game.id, 'LOBBY', 'add_bot', 'host-1');
      const mockAddBtn = createMockButtonInteraction(addBotCustomId, 'host-1', 'Host');
      await handler.handleInteraction(mockAddBtn);

      expect(game.players.size).toBe(2);
      expect(mockAddBtn.getReply().content).toContain('Đã thêm');

      // 2. Host bấm nút "Điền đủ Bot" (fill_bots)
      const fillBotsCustomId = buildCustomId(game.id, 'LOBBY', 'fill_bots', 'host-1');
      const mockFillBtn = createMockButtonInteraction(fillBotsCustomId, 'host-1', 'Host');
      await handler.handleInteraction(mockFillBtn);

      expect(game.players.size).toBe(4);
      expect(mockFillBtn.getReply().content).toContain('Đã tự động thêm');

      // 3. Host bấm nút "Xóa Bot" (clear_bots)
      const clearBotsCustomId = buildCustomId(game.id, 'LOBBY', 'clear_bots', 'host-1');
      const mockClearBtn = createMockButtonInteraction(clearBotsCustomId, 'host-1', 'Host');
      await handler.handleInteraction(mockClearBtn);

      expect(game.players.size).toBe(1);
      expect(game.players.has('host-1')).toBe(true);
    });

    it('Lệnh /addbot và /fillbots thêm bot đúng số lượng yêu cầu', async () => {
      const game = new WerewolfGame('game-bot-cmd', 'guild-1', 'ch-bot-cmd', 'host-1');
      game.addPlayer('host-1', 'Host');

      const session = new GameSession(game, db, dmManager, {} as any);
      handler.registerSession(session);

      // 1. /addbot count: 2
      let reply1: any = null;
      const mockAddCmd = {
        commandName: 'addbot',
        channelId: 'ch-bot-cmd',
        guildId: 'guild-1',
        user: { id: 'host-1', username: 'Host' },
        options: { getInteger: (name: string) => (name === 'count' ? 2 : null) },
        isChatInputCommand: () => true,
        isButton: () => false,
        isStringSelectMenu: () => false,
        isModalSubmit: () => false,
        isRepliable: () => true,
        replied: false,
        reply: vi.fn(async (options: any) => { reply1 = options; }),
      } as any;

      await handler.handleInteraction(mockAddCmd);
      expect(game.players.size).toBe(3);
      expect(reply1.content).toContain('Đã thêm **2** bot');

      // 2. /fillbots target: 5
      let reply2: any = null;
      const mockFillCmd = {
        commandName: 'fillbots',
        channelId: 'ch-bot-cmd',
        guildId: 'guild-1',
        user: { id: 'host-1', username: 'Host' },
        options: { getInteger: (name: string) => (name === 'target' ? 5 : null) },
        isChatInputCommand: () => true,
        isButton: () => false,
        isStringSelectMenu: () => false,
        isModalSubmit: () => false,
        isRepliable: () => true,
        replied: false,
        reply: vi.fn(async (options: any) => { reply2 = options; }),
      } as any;

      await handler.handleInteraction(mockFillCmd);
      expect(game.players.size).toBe(5);
      expect(reply2.content).toContain('Đã tự động thêm 2 bot');
    });

    it('Bot chat thảo luận trong DISCUSSION không bị schedulePhaseTimer xóa nhầm timers', async () => {
      vi.useFakeTimers();
      try {
        const game = new WerewolfGame('game-bot-disc', 'guild-1', 'ch-bot-disc', 'host-1');
        game.addPlayer('host-1', 'Người Chơi', false);
        game.addBotPlayer('Bot Tèo');
        game.addBotPlayer('Bot Tí');
        game.addBotPlayer('Bot Mít');

        const sentMessages: string[] = [];
        const mockChannel = {
          isTextBased: () => true,
          isDMBased: () => false,
          send: vi.fn(async (payload: any) => {
            if (typeof payload === 'string') {
              sentMessages.push(payload);
            } else if (payload?.content) {
              sentMessages.push(payload.content);
            }
            return { id: 'msg-id', edit: vi.fn() };
          }),
          messages: {
            fetch: vi.fn(async () => ({ edit: vi.fn(), delete: vi.fn() })),
          },
          permissionOverwrites: {
            edit: vi.fn(async () => {}),
          },
        };

        const mockClient = {
          channels: {
            fetch: vi.fn(async () => mockChannel),
          },
          guilds: {
            fetch: vi.fn(async () => ({ roles: { everyone: { id: 'everyone-id' } } })),
          },
        } as any;

        const session = new GameSession(game, db, dmManager, mockClient);

        // Kích hoạt advanceToDiscussion
        await session.advanceToDiscussion();

        // Kiểm tra xem botChatTimers có được giữ lại (không bị clearPhaseTimer xóa sạch ngay)
        expect((session as any).botChatTimers.length).toBeGreaterThan(0);

        // Chờ các timer đầu tiên kích hoạt
        await vi.advanceTimersByTimeAsync(3000);

        // Ít nhất 1 bot đã chat vào kênh thảo luận!
        const botChatFound = sentMessages.some((msg) => msg.includes('🤖') && msg.includes('💬'));
        expect(botChatFound).toBe(true);

        // Dọn dẹp session
        session.clearBotChatTimers();
        session.clearPhaseTimer();
      } finally {
        vi.useRealTimers();
      }
    });

    it('Bot bỏ phiếu treo cổ trong VOTING giữ bí mật, không làm lộ mục tiêu trên kênh', async () => {
      const game = new WerewolfGame('game-bot-vote-sec', 'guild-1', 'ch-bot-vote-sec', 'host-1');
      game.addPlayer('host-1', 'Người Chơi', false);
      game.addBotPlayer('Bot Sói');
      game.addBotPlayer('Bot Dân');
      game.addBotPlayer('Bot Tiên Tri');

      const sentMessages: string[] = [];
      const mockChannel = {
        isTextBased: () => true,
        isDMBased: () => false,
        send: vi.fn(async (payload: any) => {
          if (typeof payload === 'string') {
            sentMessages.push(payload);
          } else if (payload?.content) {
            sentMessages.push(payload.content);
          }
          return { id: 'msg-id', edit: vi.fn() };
        }),
        messages: {
          fetch: vi.fn(async () => ({ edit: vi.fn(), delete: vi.fn() })),
        },
        permissionOverwrites: {
          edit: vi.fn(async () => {}),
        },
      };

      const mockClient = {
        channels: {
          fetch: vi.fn(async () => mockChannel),
        },
        guilds: {
          fetch: vi.fn(async () => ({ roles: { everyone: { id: 'everyone-id' } } })),
        },
      } as any;

      const session = new GameSession(game, db, dmManager, mockClient);

      await session.advanceToVoting();

      // Kiểm tra tất cả tin nhắn gửi ra trong kênh khi tiến hành vote
      for (const msg of sentMessages) {
        // Tuyệt đối không có tin nhắn nào làm lộ mục tiêu bot vote ai (ví dụ: "treo cổ Người Chơi", "chốt 1 phiếu treo cổ")
        expect(msg).not.toMatch(/treo cổ \*\*.*\*\*/i);
      }

      session.clearBotChatTimers();
      session.clearPhaseTimer();
    });
  });

  describe('Thực hiện chức năng tại kênh chơi (Ephemeral In-Channel Skills)', () => {
    it('Bấm "Dùng kỹ năng đêm" khi là Tiên tri: trả về menu soi riêng tư (ephemeral: true)', async () => {
      const game = new WerewolfGame('game-night-seer', 'guild-1', 'ch-1', 'host-1');
      game.addPlayer('seer-1', 'Tiên tri');
      game.addPlayer('u2', 'Dân 1');
      game.addPlayer('u3', 'Sói');
      game.players.get('seer-1')!.roleId = 'SEER';
      game.phase = 'NIGHT';

      const session = new GameSession(game, db, dmManager, {} as any);
      handler.registerSession(session);

      const skillBtnId = buildCustomId(game.id, 'NIGHT', 'use_night_skill', 'all');
      const mockInteraction = createMockButtonInteraction(skillBtnId, 'seer-1');
      await handler.handleInteraction(mockInteraction);

      const reply = mockInteraction.getReply();
      expect(reply.ephemeral).toBe(true);
      expect(reply.content).toContain('TIÊN TRI');
      expect(reply.components).toBeDefined();
      expect(reply.components.length).toBeGreaterThan(0);
    });

    it('Bấm "Dùng kỹ năng đêm" khi là Sói: trả về danh sách bầy sói & menu cắn riêng tư', async () => {
      const game = new WerewolfGame('game-night-wolf', 'guild-1', 'ch-1', 'host-1');
      game.addPlayer('wolf-1', 'Sói 1');
      game.addPlayer('wolf-2', 'Sói 2');
      game.addPlayer('v1', 'Dân');
      game.players.get('wolf-1')!.roleId = 'WEREWOLF';
      game.players.get('wolf-1')!.faction = 'WEREWOLF';
      game.players.get('wolf-2')!.roleId = 'WEREWOLF';
      game.players.get('wolf-2')!.faction = 'WEREWOLF';
      game.phase = 'NIGHT';

      const session = new GameSession(game, db, dmManager, {} as any);
      handler.registerSession(session);

      const skillBtnId = buildCustomId(game.id, 'NIGHT', 'use_night_skill', 'all');
      const mockInteraction = createMockButtonInteraction(skillBtnId, 'wolf-1');
      await handler.handleInteraction(mockInteraction);

      const reply = mockInteraction.getReply();
      expect(reply.ephemeral).toBe(true);
      expect(reply.content).toContain('BẦY MA SÓI');
      expect(reply.content).toContain('Sói 2'); // Hiển thị đồng đội bầy sói
      expect(reply.components).toBeDefined();
    });

    it('Bấm "Dùng kỹ năng đêm" khi là Dân làng: thông báo không có kỹ năng đêm và ngủ say', async () => {
      const game = new WerewolfGame('game-night-vill', 'guild-1', 'ch-1', 'host-1');
      game.addPlayer('vill-1', 'Dân làng');
      game.players.get('vill-1')!.roleId = 'VILLAGER';
      game.phase = 'NIGHT';

      const session = new GameSession(game, db, dmManager, {} as any);
      handler.registerSession(session);

      const skillBtnId = buildCustomId(game.id, 'NIGHT', 'use_night_skill', 'all');
      const mockInteraction = createMockButtonInteraction(skillBtnId, 'vill-1');
      await handler.handleInteraction(mockInteraction);

      const reply = mockInteraction.getReply();
      expect(reply.ephemeral).toBe(true);
      expect(reply.content).toContain('Bạn không có kỹ năng hành động trong ban đêm');
    });

    it('Xạ thủ bấm "Xạ thủ nổ súng" trong pha Thảo luận: trả về menu nổ súng riêng tư', async () => {
      const game = new WerewolfGame('game-gunner-btn', 'guild-1', 'ch-1', 'host-1');
      game.addPlayer('gunner-1', 'Xạ thủ');
      game.addPlayer('u2', 'Dân 1');
      game.players.get('gunner-1')!.roleId = 'GUNNER';
      game.players.get('gunner-1')!.skills.gunnerBulletsRemaining = 2;
      game.phase = 'DISCUSSION';

      const session = new GameSession(game, db, dmManager, {} as any);
      handler.registerSession(session);

      const shootBtnId = buildCustomId(game.id, 'DISCUSSION', 'gunner_shoot_btn', 'all');
      const mockInteraction = createMockButtonInteraction(shootBtnId, 'gunner-1');
      await handler.handleInteraction(mockInteraction);

      const reply = mockInteraction.getReply();
      expect(reply.ephemeral).toBe(true);
      expect(reply.content).toContain('XẠ THỦ');
      expect(reply.content).toContain('viên đạn bạc');
      expect(reply.content).toContain('**2**');
      expect(reply.components).toBeDefined();
    });

    it('Người chơi không phải Xạ thủ bấm nút nổ súng bị từ chối riêng tư', async () => {
      const game = new WerewolfGame('game-not-gunner', 'guild-1', 'ch-1', 'host-1');
      game.addPlayer('vill-1', 'Dân làng');
      game.players.get('vill-1')!.roleId = 'VILLAGER';
      game.phase = 'DISCUSSION';

      const session = new GameSession(game, db, dmManager, {} as any);
      handler.registerSession(session);

      const shootBtnId = buildCustomId(game.id, 'DISCUSSION', 'gunner_shoot_btn', 'all');
      const mockInteraction = createMockButtonInteraction(shootBtnId, 'vill-1');
      await handler.handleInteraction(mockInteraction);

      const reply = mockInteraction.getReply();
      expect(reply.ephemeral).toBe(true);
      expect(reply.content).toContain('Bạn không phải là Xạ thủ');
    });

    it('Sói trắng không lộ role với sói khác và các đồng đội sói chỉ ghi mỗi chữ Sói', async () => {
      const game = new WerewolfGame('game-wolf-mask', 'guild-1', 'ch-1', 'host-1');
      game.addPlayer('w-normal', 'Người chơi 1');
      game.addPlayer('w-white', 'Người chơi 2');
      game.addPlayer('w-seer', 'Người chơi 3');
      game.addPlayer('vill-1', 'Dân 1');

      game.players.get('w-normal')!.roleId = 'WEREWOLF';
      game.players.get('w-normal')!.faction = 'WEREWOLF';

      game.players.get('w-white')!.roleId = 'WHITE_WOLF';
      game.players.get('w-white')!.faction = 'WEREWOLF';

      game.players.get('w-seer')!.roleId = 'WOLF_SEER';
      game.players.get('w-seer')!.faction = 'WEREWOLF';

      game.players.get('vill-1')!.roleId = 'VILLAGER';
      game.players.get('vill-1')!.faction = 'VILLAGE';

      game.phase = 'NIGHT';
      game.nightNumber = 1;

      // w-normal bấm dùng kỹ năng đêm
      const skillRes = WerewolfComponents.buildPlayerNightSkillResponse(game, game.players.get('w-normal')!);
      // Người xem thấy chính mình có vai thật và (Bạn)
      expect(skillRes.content).toContain('Sói thường');
      expect(skillRes.content).toContain('(Bạn)');

      // Nhưng đối với w-white và w-seer, chỉ ghi là 🐺 Sói! Tuyệt đối không lộ Sói Trắng hay Sói Tiên Tri
      expect(skillRes.content).not.toContain('Sói Trắng');
      expect(skillRes.content).not.toContain('Sói trắng');
      expect(skillRes.content).not.toContain('Sói Tiên Tri');
      expect(skillRes.content).not.toContain('Sói tiên tri');
      expect(skillRes.content).toContain('• <@w-white> (**Người chơi 2**) - 🐺 Sói');
      expect(skillRes.content).toContain('• <@w-seer> (**Người chơi 3**) - 🐺 Sói');
    });

    it('Bầy sói hiển thị số lượng vote mà các con sói khác đang chọn trên bảng và menu', async () => {
      const game = new WerewolfGame('game-wolf-tally', 'guild-1', 'ch-1', 'host-1');
      game.addPlayer('wolf-1', 'Sói 1');
      game.addPlayer('wolf-2', 'Sói 2');
      game.addPlayer('vill-1', 'Dân 1');
      game.addPlayer('vill-2', 'Dân 2');

      game.players.get('wolf-1')!.roleId = 'WEREWOLF';
      game.players.get('wolf-1')!.faction = 'WEREWOLF';
      game.players.get('wolf-2')!.roleId = 'WEREWOLF';
      game.players.get('wolf-2')!.faction = 'WEREWOLF';
      game.players.get('vill-1')!.roleId = 'VILLAGER';
      game.players.get('vill-1')!.faction = 'VILLAGE';
      game.players.get('vill-2')!.roleId = 'VILLAGER';
      game.players.get('vill-2')!.faction = 'VILLAGE';

      game.phase = 'NIGHT';
      game.nightNumber = 1;

      // wolf-1 vote cắn vill-1
      game.submitAction({
        userId: 'wolf-1',
        roleId: 'WEREWOLF',
        type: 'WOLF_VOTE',
        targetId: 'vill-1',
        nightNumber: 1,
        phase: 'NIGHT',
      });

      // wolf-2 kiểm tra kỹ năng đêm
      const skillRes2 = WerewolfComponents.buildPlayerNightSkillResponse(game, game.players.get('wolf-2')!);
      // Bảng hiển thị Dân 1 đang nhận 1 phiếu
      expect(skillRes2.content).toContain('Dân 1');
      expect(skillRes2.content).toContain('1** phiếu');

      // Trong menu chọn của wolf-2, Dân 1 có badge [1 phiếu]
      const biteMenuRow = (skillRes2.components[0].toJSON() as any).components[0];
      const optVill1 = biteMenuRow.options.find((o: any) => o.value === 'vill-1');
      expect(optVill1.label).toContain('[1 phiếu]');
      expect(optVill1.description).toContain('1 phiếu cắn từ bầy sói');
    });

    it('Nút "Thêm tất cả vai" tại Sảnh chờ và Bảng chỉnh vai thêm toàn bộ vai vào ván đấu', async () => {
      const game = new WerewolfGame('game-add-all-roles', 'guild-1', 'ch-1', 'host-1');
      game.addPlayer('host-1', 'Chủ phòng');
      game.addPlayer('p2', 'Người 2');
      game.addPlayer('p3', 'Người 3');
      game.addPlayer('p4', 'Người 4');

      // Ban đầu chỉ có 2 sói 1 tiên tri
      game.config.roles = { WEREWOLF: 2, SEER: 1 };

      const session = new GameSession(game, db, dmManager, {} as any);
      handler.registerSession(session);

      // 1. Chủ phòng bấm nút "Thêm tất cả vai" từ sảnh chờ
      const addAllLobbyBtnId = buildCustomId(game.id, 'LOBBY', 'add_all_roles', 'host-1');
      const mockInteraction = createMockButtonInteraction(addAllLobbyBtnId, 'host-1');
      await handler.handleInteraction(mockInteraction);

      expect(mockInteraction.getReply().content).toContain('Đã thêm tất cả các vai trò');

      // Kiểm tra tất cả các vai chuẩn đều có số lượng >= 1
      expect(game.config.roles['WEREWOLF']).toBe(2);
      expect(game.config.roles['ALPHA_WOLF']).toBe(1);
      expect(game.config.roles['SEER']).toBe(1);
      expect(game.config.roles['BODYGUARD']).toBe(1);
      expect(game.config.roles['WITCH']).toBe(1);
      expect(game.config.roles['HUNTER']).toBe(1);
      expect(game.config.roles['DOCTOR']).toBe(1);
      expect(game.config.roles['GUNNER']).toBe(1);
      expect(game.config.roles['DETECTIVE']).toBe(1);
      expect(game.config.roles['WHITE_WOLF']).toBe(1);
      expect(game.config.roles['SERIAL_KILLER']).toBe(1);

      // Tổng số lượng vai trò được cấu hình phải >= 19
      const totalRoles = Object.values(game.config.roles).reduce((a, b) => a + b, 0);
      expect(totalRoles).toBeGreaterThanOrEqual(19);

      // 2. Người khác không phải chủ phòng bấm nút bị từ chối
      const mockStranger = createMockButtonInteraction(addAllLobbyBtnId, 'p2');
      await handler.handleInteraction(mockStranger);
      expect(mockStranger.getReply().content).toContain('Đây là nút riêng dành cho người chơi khác');
    });

    it('Lệnh /addallroles thêm tất cả các vai trò vào ván đấu', async () => {
      const game = new WerewolfGame('game-cmd-all-roles', 'guild-1', 'ch-1', 'host-1');
      game.addPlayer('host-1', 'Chủ phòng');
      game.config.roles = {};

      const session = new GameSession(game, db, dmManager, {} as any);
      handler.registerSession(session);

      let replyPayload: any = null;
      const mockCommandInteraction: any = {
        isChatInputCommand: () => true,
        isButton: () => false,
        isStringSelectMenu: () => false,
        isModalSubmit: () => false,
        isRepliable: () => true,
        replied: false,
        deferred: false,
        commandName: 'addallroles',
        guildId: 'guild-1',
        channelId: 'ch-1',
        user: { id: 'host-1', username: 'Host' },
        reply: vi.fn(async (payload: any) => {
          replyPayload = payload;
        }),
      };

      await handler.handleInteraction(mockCommandInteraction);
      expect(replyPayload.content).toContain('Đã thêm tất cả các vai trò');
      expect(game.config.roles['ALPHA_WOLF']).toBe(1);
      expect(game.config.roles['DOCTOR']).toBe(1);
      expect(game.config.roles['WHITE_WOLF']).toBe(1);
    });

    it('Sói Quỷ tương tác chuyển đổi chế độ Lây lan vs Cắn chết qua button interaction', async () => {
      const game = new WerewolfGame('game-demon-ui', 'guild-1', 'ch-1', 'host-1');
      game.addPlayer('demon-1', 'Sói Quỷ');
      game.addPlayer('v1', 'Dân 1');
      game.addPlayer('v2', 'Dân 2');
      game.addPlayer('v3', 'Dân 3');

      const demon = game.players.get('demon-1')!;
      demon.roleId = 'DEMON_WOLF';
      demon.faction = 'WEREWOLF';
      demon.skills.demonWolfInfectRemaining = 1;
      demon.skills.demonWolfMode = 'KILL';
      game.phase = 'NIGHT';

      const session = new GameSession(game, db, dmManager, {} as any);
      handler.registerSession(session);

      // Bấm nút chuyển sang Lây lan
      const infectBtnId = buildCustomId(game.id, 'NIGHT', 'demon_mode_infect', 'demon-1');
      const mockInfectBtn = createMockButtonInteraction(infectBtnId, 'demon-1');
      await handler.handleInteraction(mockInfectBtn);

      expect(demon.skills.demonWolfMode).toBe('INFECT');
      expect(mockInfectBtn.getReply().content).toContain('Lây lan thành Sói');

      // Bấm nút chuyển sang Cắn chết
      const killBtnId = buildCustomId(game.id, 'NIGHT', 'demon_mode_kill', 'demon-1');
      const mockKillBtn = createMockButtonInteraction(killBtnId, 'demon-1');
      await handler.handleInteraction(mockKillBtn);

      expect(demon.skills.demonWolfMode).toBe('KILL');
      expect(mockKillBtn.getReply().content).toContain('Cắn chết');
    });

    it('Sói Cuồng Nộ chọn phế kỹ năng qua select menu interaction', async () => {
      const game = new WerewolfGame('game-berserk-ui', 'guild-1', 'ch-1', 'host-1');
      game.addPlayer('berserk-1', 'Sói Cuồng Nộ');
      game.addPlayer('deadWolf', 'Sói Chết');
      game.addPlayer('seer-1', 'Tiên Tri');
      game.addPlayer('v1', 'Dân 1');

      game.players.get('berserk-1')!.roleId = 'BERSERK_WOLF';
      game.players.get('berserk-1')!.faction = 'WEREWOLF';
      game.players.get('deadWolf')!.roleId = 'WEREWOLF';
      game.players.get('deadWolf')!.faction = 'WEREWOLF';
      game.players.get('deadWolf')!.isAlive = false;
      game.players.get('seer-1')!.roleId = 'SEER';
      game.phase = 'NIGHT';

      const session = new GameSession(game, db, dmManager, {} as any);
      handler.registerSession(session);

      const disableMenuId = buildCustomId(game.id, 'NIGHT', 'berserk_disable_target', 'berserk-1');
      const mockSelect = createMockSelectInteraction(disableMenuId, 'berserk-1', ['seer-1']);
      await handler.handleInteraction(mockSelect);

      const disableAction = game.currentPhaseActions.find((a) => a.type === 'BERSERK_DISABLE');
      expect(disableAction).toBeDefined();
      expect(disableAction?.targetId).toBe('seer-1');
      expect(mockSelect.getReply().content).toContain('phế kỹ năng');
    });

    it('Sói Trắng chọn cắn Dân làng qua select menu interaction', async () => {
      const game = new WerewolfGame('game-ww-ui', 'guild-1', 'ch-1', 'host-1');
      game.addPlayer('ww-1', 'Sói Trắng');
      game.addPlayer('wolf-2', 'Sói 2');
      game.addPlayer('v1', 'Dân 1');
      game.addPlayer('v2', 'Dân 2');

      game.players.get('ww-1')!.roleId = 'WHITE_WOLF';
      game.players.get('ww-1')!.faction = 'WEREWOLF';
      game.players.get('wolf-2')!.roleId = 'WEREWOLF';
      game.players.get('wolf-2')!.faction = 'WEREWOLF';
      game.nightNumber = 2;
      game.phase = 'NIGHT';

      const session = new GameSession(game, db, dmManager, {} as any);
      handler.registerSession(session);

      const wwMenuId = buildCustomId(game.id, 'NIGHT', 'white_wolf_target', 'ww-1');
      const mockSelect = createMockSelectInteraction(wwMenuId, 'ww-1', ['v1']);
      await handler.handleInteraction(mockSelect);

      const wwAction = game.currentPhaseActions.find((a) => a.type === 'WHITE_WOLF_KILL');
      expect(wwAction).toBeDefined();
      expect(wwAction?.targetId).toBe('v1');
    });

    it('Menu cắn bầy Sói loại trừ hoàn toàn các đồng đội Sói', () => {
      const game = new WerewolfGame('game-wolf-menu', 'guild-1', 'ch-1', 'host-1');
      game.addPlayer('w1', 'Sói 1');
      game.addPlayer('w2', 'Sói 2');
      game.addPlayer('ww', 'Sói Trắng');
      game.addPlayer('v1', 'Dân 1');
      game.addPlayer('v2', 'Dân 2');

      game.players.get('w1')!.roleId = 'WEREWOLF';
      game.players.get('w1')!.faction = 'WEREWOLF';
      game.players.get('w2')!.roleId = 'DEMON_WOLF';
      game.players.get('w2')!.faction = 'WEREWOLF';
      game.players.get('ww')!.roleId = 'WHITE_WOLF';
      game.players.get('ww')!.faction = 'WEREWOLF';

      const biteMenuRows = WerewolfComponents.buildWolfBiteMenu(game, 'w1');
      expect(biteMenuRows.length).toBeGreaterThan(0);

      const selectMenu = biteMenuRows[0].components[0] as any;
      const optionValues = selectMenu.options.map((opt: any) => opt.data.value);

      // Chỉ có Dân làng v1 và v2, không có w1, w2, ww
      expect(optionValues).toContain('v1');
      expect(optionValues).toContain('v2');
      expect(optionValues).not.toContain('w1');
      expect(optionValues).not.toContain('w2');
      expect(optionValues).not.toContain('ww');
    });

    it('Watchdog tự động chuyển từ VOTING sang RESOLUTION khi quá hạn chót mà không bị treo', async () => {
      const db = new DatabaseManager(':memory:');
      const dmManager = new DmManager();
      const game = new WerewolfGame('game-watchdog-test', 'guild-1', 'ch-wd', 'host-1');
      game.addPlayer('p1', 'Người Chơi 1');
      game.addPlayer('p2', 'Người Chơi 2');
      game.addPlayer('p3', 'Người Chơi 3');
      game.addPlayer('p4', 'Người Chơi 4');
      game.players.get('p1')!.roleId = 'WEREWOLF';
      game.players.get('p1')!.faction = 'WEREWOLF';
      game.players.get('p2')!.roleId = 'VILLAGER';
      game.players.get('p2')!.faction = 'VILLAGE';
      game.players.get('p3')!.roleId = 'VILLAGER';
      game.players.get('p3')!.faction = 'VILLAGE';
      game.players.get('p4')!.roleId = 'SEER';
      game.players.get('p4')!.faction = 'VILLAGE';
      game.phase = 'VOTING';
      // Đặt hạn chót đã trôi qua
      game.phaseDeadline = Date.now() - 5000;

      const mockChannel = {
        isTextBased: () => true,
        isDMBased: () => false,
        send: vi.fn(async () => ({ id: 'new-msg', edit: vi.fn() })),
        messages: {
          fetch: vi.fn(async () => ({ edit: vi.fn(), delete: vi.fn() })),
        },
        permissionOverwrites: {
          edit: vi.fn(async () => {}),
        },
      };

      const mockClient = {
        channels: { fetch: vi.fn(async () => mockChannel) },
        guilds: { fetch: vi.fn(async () => ({ roles: { everyone: { id: 'everyone' } } })) },
      } as any;

      const session = new GameSession(game, db, dmManager, mockClient);

      // Kích hoạt checkExpiredDeadline
      await session.checkExpiredDeadline();

      expect(game.phase).toBe('RESOLUTION');
      session.stopWatchdog();
      db.close();
    });

    it('Tương tác bỏ phiếu skip_vote được phản hồi an toàn và ghi nhận phiếu', async () => {
      const db = new DatabaseManager(':memory:');
      const dmManager = new DmManager();
      const handler = new InteractionHandler(db, dmManager);

      const game = new WerewolfGame('game-defer-vote', 'guild-1', 'ch-defer', 'host-1');
      game.addPlayer('u1', 'User 1');
      game.addPlayer('u2', 'User 2');
      game.addPlayer('u3', 'User 3');
      game.addPlayer('u4', 'User 4');
      game.players.get('u1')!.roleId = 'VILLAGER';
      game.players.get('u2')!.roleId = 'VILLAGER';
      game.players.get('u3')!.roleId = 'VILLAGER';
      game.players.get('u4')!.roleId = 'WEREWOLF';
      game.phase = 'VOTING';

      const mockChannel = {
        isTextBased: () => true,
        isDMBased: () => false,
        send: vi.fn(async () => ({ id: 'msg-defer', edit: vi.fn() })),
        messages: { fetch: vi.fn(async () => ({ edit: vi.fn() })) },
      };

      const mockClient = {
        channels: { fetch: vi.fn(async () => mockChannel) },
      } as any;

      const session = new GameSession(game, db, dmManager, mockClient);
      handler.registerSession(session);

      let replyContent = '';

      const mockButton = {
        customId: `ww:game-defer-vote:VOTING:skip_vote:all`,
        user: { id: 'u1', username: 'User 1' },
        member: { displayName: 'User 1' },
        isButton: () => true,
        isStringSelectMenu: () => false,
        isChatInputCommand: () => false,
        isModalSubmit: () => false,
        isRepliable: () => true,
        deferred: false,
        replied: false,
        deferReply: vi.fn(async () => {
          mockButton.deferred = true;
        }),
        editReply: vi.fn(async (opts: any) => {
          replyContent = opts.content;
        }),
        reply: vi.fn(async (opts: any) => {
          replyContent = opts.content;
        }),
      } as any;

      await handler.handleInteraction(mockButton);

      expect(replyContent).toContain('Bạn đã chọn bỏ phiếu trắng');

      session.stopWatchdog();
      db.close();
    });

    it('Nút role_inc, role_dec, role_page thực hiện interaction.update mà không bị kẹt deferReply', async () => {
      const db = new DatabaseManager(':memory:');
      const dmManager = new DmManager();
      const handler = new InteractionHandler(db, dmManager);

      const game = new WerewolfGame('game-table-update', 'guild-1', 'ch-table', 'host-1');
      game.addPlayer('host-1', 'Host User');
      game.phase = 'LOBBY';

      const mockChannel = {
        isTextBased: () => true,
        isDMBased: () => false,
        send: vi.fn(async () => ({ id: 'msg-tbl', edit: vi.fn() })),
        messages: { fetch: vi.fn(async () => ({ edit: vi.fn() })) },
      };

      const mockClient = {
        channels: { fetch: vi.fn(async () => mockChannel) },
      } as any;

      const session = new GameSession(game, db, dmManager, mockClient);
      handler.registerSession(session);

      let updatedPayload: any = null;
      const mockIncButton = {
        customId: buildCustomId(game.id, 'CONFIG', 'role_inc', 'host-1', 'SEER:0'),
        user: { id: 'host-1', username: 'Host User' },
        member: { displayName: 'Host User' },
        isButton: () => true,
        isStringSelectMenu: () => false,
        isChatInputCommand: () => false,
        isModalSubmit: () => false,
        isRepliable: () => true,
        deferred: false,
        replied: false,
        deferReply: vi.fn(),
        update: vi.fn(async (opts: any) => {
          updatedPayload = opts;
        }),
        reply: vi.fn(),
      } as any;

      await handler.handleInteraction(mockIncButton);

      expect(mockIncButton.deferReply).not.toHaveBeenCalled();
      expect(mockIncButton.update).toHaveBeenCalled();
      expect(game.config.roles.SEER).toBeGreaterThanOrEqual(1);

      session.stopWatchdog();
      db.close();
    });
  });
});


