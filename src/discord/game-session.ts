import {
  Client,
  Guild,
  Message,
  TextChannel,
} from 'discord.js';
import { WerewolfGame } from '../engine/game';
import { DatabaseManager } from '../database/database';
import { DmManager } from './dm-manager';
import { WerewolfEmbeds } from './embeds';
import { WerewolfComponents } from './components';
import { getRoleInfo } from '../engine/roles';
import { GameWinResult, Player } from '../engine/types';
import { WerewolfBotAi } from '../engine/bot-ai';

export class GameSession {
  public readonly game: WerewolfGame;
  public readonly db: DatabaseManager;
  public readonly dmManager: DmManager;
  public readonly client: Client;

  public mainMessageId: string | null = null;
  private timerHandle: NodeJS.Timeout | null = null;
  private watchdogHandle: NodeJS.Timeout | null = null;
  private botChatTimers: NodeJS.Timeout[] = [];
  private isProcessingPhaseTransition: boolean = false;

  constructor(game: WerewolfGame, db: DatabaseManager, dmManager: DmManager, client: Client) {
    this.game = game;
    this.db = db;
    this.dmManager = dmManager;
    this.client = client;
    this.startWatchdog();
  }

  public async getChannel(): Promise<TextChannel | null> {
    try {
      const channel = await this.client.channels.fetch(this.game.channelId);
      if (channel && channel.isTextBased() && !channel.isDMBased()) {
        return channel as TextChannel;
      }
      return null;
    } catch {
      return null;
    }
  }

  public async getGuild(): Promise<Guild | null> {
    try {
      return await this.client.guilds.fetch(this.game.guildId);
    } catch {
      return null;
    }
  }

  /**
   * Cập nhật tin nhắn bảng điều khiển chính trên kênh
   */
  public async updateMainMessage(options: {
    embeds?: any[];
    components?: any[];
    content?: string | null;
  }): Promise<void> {
    const channel = await this.getChannel();
    if (!channel) return;

    try {
      if (this.mainMessageId) {
        try {
          const msg = await channel.messages.fetch(this.mainMessageId);
          if (msg && typeof msg.edit === 'function') {
            await msg.edit({
              content: options.content !== undefined ? options.content : undefined,
              embeds: options.embeds || [],
              components: options.components || [],
            });
            return;
          }
        } catch {
          // Tin nhắn cũ có thể đã bị xóa, tạo tin nhắn mới
        }
      }

      const newMsg = await channel.send({
        content: options.content || undefined,
        embeds: options.embeds || [],
        components: options.components || [],
      });
      if (newMsg && newMsg.id) {
        this.mainMessageId = newMsg.id;
      }
    } catch (err: any) {
      console.error(`[GameSession ${this.game.id}] Lỗi cập nhật tin nhắn chính:`, err?.message);
    }
  }

  /**
   * Gửi một tin nhắn mới làm bảng điều khiển chính ở đáy kênh (chống trôi tin nhắn sau thảo luận)
   * Đồng thời gỡ bỏ components ở tin nhắn cũ nếu có để tránh người chơi bấm nhầm nút cũ
   */
  public async postNewMainMessage(options: {
    embeds?: any[];
    components?: any[];
    content?: string;
  }): Promise<void> {
    const channel = await this.getChannel();
    if (!channel) return;

    try {
      if (this.mainMessageId) {
        try {
          const oldMsg = await channel.messages.fetch(this.mainMessageId);
          if (oldMsg && typeof oldMsg.edit === 'function') {
            await oldMsg.edit({ components: [] });
          }
        } catch {
          // Bỏ qua lỗi nếu tin cũ đã bị xóa hoặc không fetch được
        }
      }

      const newMsg = await channel.send({
        content: options.content || undefined,
        embeds: options.embeds || [],
        components: options.components || [],
      });
      if (newMsg && newMsg.id) {
        this.mainMessageId = newMsg.id;
      }
    } catch (err: any) {
      console.error(`[GameSession ${this.game.id}] Lỗi gửi tin nhắn chính mới:`, err?.message);
    }
  }

  /**
   * Kéo bảng bỏ phiếu xuống cuối kênh khi bị người chơi chat trôi tin nhắn
   */
  public async repostVotingMessage(): Promise<boolean> {
    if (this.game.phase !== 'VOTING') return false;

    const channel = await this.getChannel();
    if (!channel) return false;

    try {
      if (this.mainMessageId) {
        try {
          const oldMsg = await channel.messages.fetch(this.mainMessageId);
          if (oldMsg) {
            if (typeof oldMsg.delete === 'function') {
              await oldMsg.delete();
            } else if (typeof oldMsg.edit === 'function') {
              await oldMsg.edit({ components: [] });
            }
          }
        } catch {
          // Bỏ qua nếu không xóa được
        }
      }

      const votingControls = WerewolfComponents.buildVotingControls(this.game);
      const aliveVoters = Array.from(this.game.players.values()).filter((p) => p.isAlive && p.canVote);
      const voterPings = aliveVoters.map((p) => `<@${p.id}>`).join(' ');

      const newMsg = await channel.send({
        content:
          `🔔 **BIỂU QUYẾT TREO CỔ NGÀY ${this.game.dayNumber}**\n` +
          `👉 Mời dân làng tiếp tục bỏ phiếu: ${voterPings}`,
        embeds: [WerewolfEmbeds.buildVotingEmbed(this.game)],
        components: votingControls,
      });

      if (newMsg && newMsg.id) {
        this.mainMessageId = newMsg.id;
      }
      return true;
    } catch (err: any) {
      console.error(`[GameSession ${this.game.id}] Lỗi kéo bảng vote xuống:`, err?.message);
      return false;
    }
  }

  /**
   * Kéo bảng đêm xuống cuối kênh để người chơi dễ bấm kỹ năng
   */
  public async repostNightMessage(): Promise<boolean> {
    if (this.game.phase !== 'NIGHT') return false;

    const channel = await this.getChannel();
    if (!channel) return false;

    try {
      if (this.mainMessageId) {
        try {
          const oldMsg = await channel.messages.fetch(this.mainMessageId);
          if (oldMsg) {
            if (typeof oldMsg.delete === 'function') {
              await oldMsg.delete();
            } else if (typeof oldMsg.edit === 'function') {
              await oldMsg.edit({ components: [] });
            }
          }
        } catch {}
      }

      const newMsg = await channel.send({
        embeds: [WerewolfEmbeds.buildNightEmbed(this.game)],
        components: WerewolfComponents.buildNightControls(this.game),
      });

      if (newMsg && newMsg.id) {
        this.mainMessageId = newMsg.id;
      }
      return true;
    } catch (err: any) {
      console.error(`[GameSession ${this.game.id}] Lỗi kéo bảng đêm xuống:`, err?.message);
      return false;
    }
  }

  /**
   * Bắt đầu ván đấu: Chia vai bí mật và gửi DM cho từng người
   */
  public async start(): Promise<{ success: boolean; message: string }> {
    if (this.game.players.size < 4) {
      return {
        success: false,
        message: `Cần tối thiểu 4 người chơi để bắt đầu trận Ma Sói. Hiện tại đang có ${this.game.players.size} người.`,
      };
    }

    const startResult = this.game.startGame();
    if (!startResult.success) {
      return startResult;
    }

    this.db.saveGame(this.game);
    const channel = await this.getChannel();
    const guild = await this.getGuild();

    if (!channel || !guild) {
      return { success: false, message: 'Không thể truy cập kênh hoặc máy chủ Discord.' };
    }

    // Cập nhật bảng điều khiển chính sang giai đoạn phát vai
    await this.updateMainMessage({
      embeds: [WerewolfEmbeds.buildRoleDistributionEmbed(this.game)],
      components: WerewolfComponents.buildRoleDistributionControls(this.game),
    });

    // Gửi vai bí mật riêng tư cho từng người
    let failedCount = 0;
    for (const player of this.game.players.values()) {
      if (player.isBot) continue;

      const roleInfo = getRoleInfo(player.roleId, this.game.customRoles);
      const roleEmbed = WerewolfEmbeds.buildPrivateRoleEmbed(player, roleInfo);
      const confirmRow = WerewolfComponents.buildRoleConfirmButton(this.game.id, player.id);

      const sendRes = await this.dmManager.sendPrivate(
        this.client,
        guild,
        channel,
        player,
        {
          embeds: [roleEmbed],
          components: [confirmRow],
        },
        this.game.id
      );

      if (!sendRes.success) {
        failedCount++;
        this.game.log(`Lỗi gửi tin bí mật cho ${player.name}: ${sendRes.error}`);
      }
    }

    if (failedCount > 0) {
      await channel.send(
        `⚠️ **Chú ý:** Có **${failedCount}** người chơi không nhận được tin nhắn riêng do chặn DM và không cấp quyền tạo phòng riêng. Ván đấu tạm dừng. Hãy kiểm tra Cài đặt người dùng -> Quyền riêng tư -> Cho phép DM, sau đó chủ phòng dùng \`/resume\`!`
      );
      this.game.pause();
      this.db.saveGame(this.game);
      return { success: true, message: 'Đã phát vai nhưng có người bị chặn DM, tạm dừng ván.' };
    }

    // Kiểm tra nếu tất cả người chơi đã xác nhận vai (ví dụ: chỉ có bot hoặc ai cũng đã confirm)
    const allConfirmed = Array.from(this.game.players.values()).every((p) => p.hasConfirmedRole);
    if (allConfirmed) {
      this.clearPhaseTimer();
      await this.advanceToNight();
      return { success: true, message: 'Tất cả người chơi đã sẵn sàng, bắt đầu ngay Đêm 1!' };
    }

    const remainingMs = Math.max(1000, this.game.phaseDeadline - Date.now());
    this.schedulePhaseTimer(remainingMs, () => {
      this.advanceToNight();
    });

    return { success: true, message: 'Đã bắt đầu phát vai thành công!' };
  }

  /**
   * Xử lý khi người chơi bấm nút xác nhận vai
   */
  public async handleRoleConfirm(userId: string): Promise<void> {
    const { success, allConfirmed } = this.game.confirmRole(userId);
    if (!success) return;

    this.db.saveGame(this.game);

    await this.updateMainMessage({
      embeds: [WerewolfEmbeds.buildRoleDistributionEmbed(this.game)],
      components: WerewolfComponents.buildRoleDistributionControls(this.game),
    });

    if (allConfirmed) {
      this.clearPhaseTimer();
      await this.advanceToNight();
    }
  }

  /**
   * Chuyển sang Đêm (NIGHT)
   */
  public async advanceToNight(): Promise<void> {
    if (this.isProcessingPhaseTransition) return;
    this.isProcessingPhaseTransition = true;
    this.clearPhaseTimer();

    try {
      this.game.startNight();
      this.db.saveGame(this.game);

      const channel = await this.getChannel();
      const guild = await this.getGuild();
      if (!channel || !guild) return;

      await this.postNewMainMessage({
        embeds: [WerewolfEmbeds.buildNightEmbed(this.game)],
        components: WerewolfComponents.buildNightControls(this.game),
      });

      // Khóa chat ban đêm cho cả làng và khóa chat riêng cho người đã chết
      await this.lockChannelForNight();
      await this.syncDeadPlayersChatPermissions();

      // Kích hoạt tự động hóa kỹ năng đêm cho Bot
      WerewolfBotAi.performNightActions(this.game);
      this.db.saveGame(this.game);

      const remainingMs = Math.max(1000, this.game.phaseDeadline - Date.now());
      this.schedulePhaseTimer(remainingMs, () => {
        this.advanceToDawn();
      });
    } finally {
      this.isProcessingPhaseTransition = false;
    }
  }

  /**
   * Gửi gọi dậy riêng cho từng vai thức dậy trong đêm
   */
  private async dispatchNightCalls(guild: Guild, channel: TextChannel): Promise<void> {
    const alivePlayers = Array.from(this.game.players.values()).filter((p) => p.isAlive);

    // 1. Thần tình yêu (Đêm 1)
    if (this.game.nightNumber === 1) {
      const cupid = alivePlayers.find((p) => p.roleId === 'CUPID');
      if (cupid && !cupid.isBot) {
        const cupidMenus = WerewolfComponents.buildCupidMenu(this.game, cupid.id);
        await this.dmManager.sendPrivate(
          this.client,
          guild,
          channel,
          cupid,
          {
            content: '💘 **[THẦN TÌNH YÊU]** Hãy chọn 2 người chơi để kết duyên thành Cặp đôi trong ván này:',
            components: cupidMenus,
          },
          this.game.id
        );
      }
    }

    // 2. Bảo vệ
    const bodyguard = alivePlayers.find((p) => p.roleId === 'BODYGUARD');
    if (bodyguard && !bodyguard.isBot) {
      const bgMenus = WerewolfComponents.buildBodyguardMenu(this.game, bodyguard);
      await this.dmManager.sendPrivate(
        this.client,
        guild,
        channel,
        bodyguard,
        {
          content: '🛡️ **[BẢO VỆ]** Hãy chọn một người để che chở khỏi nanh vuốt Sói đêm nay:',
          components: bgMenus,
        },
        this.game.id
      );
    }

    // 3. Tiên tri
    const seer = alivePlayers.find((p) => p.roleId === 'SEER');
    if (seer && !seer.isBot) {
      const seerMenus = WerewolfComponents.buildSeerMenu(this.game, seer.id);
      await this.dmManager.sendPrivate(
        this.client,
        guild,
        channel,
        seer,
        {
          content: '🔮 **[TIÊN TRI]** Hãy chọn một người bạn muốn soi chân tướng trong đêm nay:',
          components: seerMenus,
        },
        this.game.id
      );
    }

    // 4. Bầy Sói (Bao gồm Sói thường, Sói quỷ, Sói cuồng nộ, Sói trắng)
    const wolves = alivePlayers.filter((p) => p.faction === 'WEREWOLF');

    for (const wolf of wolves) {
      if (wolf.isBot) continue;

      // SỬA: Sói trắng không lộ role và các sói chỉ ghi mỗi chữ sói khi làm đồng đội
      const wolfNames = wolves
        .map((w) => {
          if (w.id === wolf.id) {
            return w.isBot
              ? `• 🤖 ${w.name} *(Bot)* - 🐺 ${getRoleInfo(w.roleId, this.game.customRoles).name} *(Bạn)*`
              : `• <@${w.id}> (${w.name}) - 🐺 ${getRoleInfo(w.roleId, this.game.customRoles).name} *(Bạn)*`;
          } else {
            return w.isBot
              ? `• 🤖 ${w.name} *(Bot)* - 🐺 Sói`
              : `• <@${w.id}> (${w.name}) - 🐺 Sói`;
          }
        })
        .join('\n');

      const wolfMenus = WerewolfComponents.buildWolfBiteMenu(this.game, wolf.id);
      await this.dmManager.sendPrivate(
        this.client,
        guild,
        channel,
        wolf,
        {
          content:
            `🐺 **[BẦY MA SÓI]**\n` +
            `Đồng đội bầy đàn của bạn:\n${wolfNames}\n\n` +
            `Hãy chọn mục tiêu cắn xé đêm nay:`,
          components: wolfMenus,
        },
        this.game.id
      );
    }

    // 5. Phù thủy
    const witch = alivePlayers.find((p) => p.roleId === 'WITCH');
    if (witch && !witch.isBot) {
      // Phù thủy nhận thông báo kiểm tra bình thuốc
      const witchControls = WerewolfComponents.buildWitchControls(this.game, witch, null);
      await this.dmManager.sendPrivate(
        this.client,
        guild,
        channel,
        witch,
        {
          content:
            `🧪 **[PHÙ THỦY]**\n` +
            `Bình cứu còn lại: **${witch.skills.witchHealRemaining}** | Bình độc còn lại: **${witch.skills.witchPoisonRemaining}**\n` +
            `Bạn có muốn dùng bình độc lên ai đêm nay không?`,
          components: witchControls,
        },
        this.game.id
      );
    }

    // 6. Sói trắng (Đêm chẵn >= 2)
    if (this.game.nightNumber >= 2 && this.game.nightNumber % 2 === 0) {
      const whiteWolf = alivePlayers.find((p) => p.roleId === 'WHITE_WOLF');
      if (whiteWolf && !whiteWolf.isBot) {
        const wwMenus = WerewolfComponents.buildWhiteWolfMenu(this.game, whiteWolf.id);
        if (wwMenus.length > 0) {
          await this.dmManager.sendPrivate(
            this.client,
            guild,
            channel,
            whiteWolf,
            {
              content: `🐺 **[SÓI TRẮNG]** Đêm nay bạn được bí mật giết một con Sói khác trong bầy:`,
              components: wwMenus,
            },
            this.game.id
          );
        }
      }
    }

    // 7. Bác sĩ (Doctor - Werewolf Online)
    const doctor = alivePlayers.find((p) => p.roleId === 'DOCTOR');
    if (doctor && !doctor.isBot) {
      const docMenus = WerewolfComponents.buildDoctorMenu(this.game, doctor);
      await this.dmManager.sendPrivate(
        this.client,
        guild,
        channel,
        doctor,
        {
          content: '🩺 **[BÁC SĨ]** Hãy chọn một người chơi để cứu chữa/bảo vệ đêm nay:',
          components: docMenus,
        },
        this.game.id
      );
    }

    // 8. Thám tử (Detective - Werewolf Online)
    const detective = alivePlayers.find((p) => p.roleId === 'DETECTIVE');
    if (detective && !detective.isBot) {
      const detMenus = WerewolfComponents.buildDetectiveMenu(this.game, detective.id);
      await this.dmManager.sendPrivate(
        this.client,
        guild,
        channel,
        detective,
        {
          content: '🔍 **[THÁM TỬ]** Hãy chọn đúng 2 người chơi để đối chiếu xem họ **CÙNG PHE** hay **KHÁC PHE**:',
          components: detMenus,
        },
        this.game.id
      );
    }

    // 9. Sói tiên tri (Wolf Seer - Werewolf Online)
    const wolfSeer = alivePlayers.find((p) => p.roleId === 'WOLF_SEER');
    const aliveWolves = alivePlayers.filter((p) => p.faction === 'WEREWOLF');
    if (wolfSeer && !wolfSeer.isBot) {
      if (aliveWolves.length > 1) {
        const wsMenus = WerewolfComponents.buildWolfSeerMenu(this.game, wolfSeer.id);
        await this.dmManager.sendPrivate(
          this.client,
          guild,
          channel,
          wolfSeer,
          {
            content: '👁️ **[SÓI TIÊN TRI]** Hãy chọn một người chơi để soi ra **chính xác vai trò** của họ:',
            components: wsMenus,
          },
          this.game.id
        );
      } else {
        await this.dmManager.sendPrivate(
          this.client,
          guild,
          channel,
          wolfSeer,
          {
            content: '👁️ **[SÓI TIÊN TRI]** Bạn là con sói duy nhất còn sống trong bầy! Kỹ năng soi vai trò đã bị vô hiệu hóa.',
          },
          this.game.id
        );
      }
    }

    // 10. Kẻ sát nhân (Serial Killer - Werewolf Online)
    const serialKiller = alivePlayers.find((p) => p.roleId === 'SERIAL_KILLER');
    if (serialKiller && !serialKiller.isBot) {
      const skMenus = WerewolfComponents.buildSerialKillerMenu(this.game, serialKiller.id);
      await this.dmManager.sendPrivate(
        this.client,
        guild,
        channel,
        serialKiller,
        {
          content: '🔪 **[KẺ SÁT NHÂN]** Hãy chọn một người chơi để ra tay hạ sát đêm nay:',
          components: skMenus,
        },
        this.game.id
      );
    }
  }

  /**
   * Chuyển sang Bình minh (DAWN) & Xử lý đêm
   */
  public async advanceToDawn(): Promise<void> {
    if (this.isProcessingPhaseTransition) return;
    this.isProcessingPhaseTransition = true;
    this.clearPhaseTimer();

    try {
      const dawnResult = this.game.resolveNightPhase();
      this.db.saveGame(this.game);

      const channel = await this.getChannel();
      const guild = await this.getGuild();
      if (!channel || !guild) return;

      // Gửi kết quả soi riêng cho Tiên tri nếu có
      for (const inv of dawnResult.investigationResults) {
        const seerPlayer = this.game.players.get(inv.seerId);
        const targetPlayer = this.game.players.get(inv.targetId);
        if (seerPlayer && targetPlayer && !seerPlayer.isBot) {
          const resultText = inv.isSilenced
            ? `⚡ **Kỹ năng soi của bạn đã bị Sói Cuồng Nộ phế bỏ đêm nay nên không thu thập được thông tin!**`
            : inv.isWolf
            ? `🐺 **Mục tiêu <@${targetPlayer.id}> (${targetPlayer.name}) THUỘC PHE MA SÓI!**`
            : `🌾 **Mục tiêu <@${targetPlayer.id}> (${targetPlayer.name}) KHÔNG PHẢI là Ma Sói!**`;

          await this.dmManager.sendPrivate(
            this.client,
            guild,
            channel,
            seerPlayer,
            { content: `🔮 **[KẾT QUẢ SOI ĐÊM ${this.game.nightNumber}]**\n${resultText}` },
            this.game.id
          );
        }
      }

      // Gửi kết quả điều tra riêng cho Thám tử nếu có (Detective - Werewolf Online)
      for (const det of dawnResult.detectiveResults || []) {
        const detPlayer = this.game.players.get(det.detectiveId);
        const p1 = this.game.players.get(det.target1Id);
        const p2 = this.game.players.get(det.target2Id);
        if (detPlayer && p1 && p2 && !detPlayer.isBot) {
          const resultText = det.isSilenced
            ? `⚡ **Kỹ năng điều tra của bạn đã bị Sói Cuồng Nộ phế bỏ đêm nay nên không có kết quả!**`
            : det.isSameTeam
            ? `⚖️ **${p1.name}** và **${p2.name}** thuộc **CÙNG MỘT PHE**!`
            : `⚡ **${p1.name}** và **${p2.name}** thuộc **HAI PHE KHÁC NHAU**!`;

          await this.dmManager.sendPrivate(
            this.client,
            guild,
            channel,
            detPlayer,
            { content: `🔍 **[KẾT QUẢ ĐIỀU TRA ĐÊM ${this.game.nightNumber}]**\n${resultText}` },
            this.game.id
          );
        }
      }

      // Gửi thông báo cho người chơi bị Sói Cuồng Nộ phế kỹ năng
      if (dawnResult.silencedUserId) {
        const silencedPlayer = this.game.players.get(dawnResult.silencedUserId);
        if (
          silencedPlayer &&
          !silencedPlayer.isBot &&
          silencedPlayer.roleId !== 'SEER' &&
          silencedPlayer.roleId !== 'DETECTIVE'
        ) {
          await this.dmManager.sendPrivate(
            this.client,
            guild,
            channel,
            silencedPlayer,
            {
              content: `⚡ **[BÌNH MINH - ĐÊM ${this.game.nightNumber}]**\nBạn đã bị **Sói Cuồng Nộ** phế bỏ toàn bộ kỹ năng trong đêm qua! Mọi hành động của bạn không có hiệu lực.`,
            },
            this.game.id
          );
        }
      }

      // Gửi kết quả soi vai riêng cho Sói Tiên Tri nếu có (Wolf Seer - Werewolf Online)
      for (const ws of dawnResult.wolfSeerResults || []) {
        const wsPlayer = this.game.players.get(ws.wolfSeerId);
        const target = this.game.players.get(ws.targetId);
        if (wsPlayer && target && !wsPlayer.isBot) {
          const targetRole = getRoleInfo(target.roleId, this.game.customRoles);
          await this.dmManager.sendPrivate(
            this.client,
            guild,
            channel,
            wsPlayer,
            {
              content: `👁️ **[KẾT QUẢ SOI VAI ĐÊM ${this.game.nightNumber}]**\nMục tiêu **<@${target.id}> (${target.name})** chính là: **${targetRole.name}** (${targetRole.faction === 'WEREWOLF' ? 'Phe Sói' : targetRole.faction === 'VILLAGE' ? 'Phe Dân' : 'Phe Độc lập'})!`,
            },
            this.game.id
          );
        }
      }

      // Thông báo cho người bị Sói quỷ chuyển hóa (Infected)
      if (dawnResult.newWerewolfId) {
        const infected = this.game.players.get(dawnResult.newWerewolfId);
        if (infected && !infected.isBot) {
          await this.dmManager.sendPrivate(
            this.client,
            guild,
            channel,
            infected,
            {
              content:
                `🩸 **[BẠN ĐÃ BỊ THA HÓA!]**\n` +
                `Sói quỷ đã biến bạn thành Ma Sói! Bạn đã mất đi kỹ năng cũ và chính thức gia nhập Phe Ma Sói!`,
            },
            this.game.id
          );
        }
      }

      // Thông báo cho Cặp đôi nếu vừa được Thần tình yêu se duyên ở Đêm 1
      if (this.game.nightNumber === 1) {
        const lovers = Array.from(this.game.players.values()).filter((p) => p.loverId);
        if (lovers.length === 2) {
          const [l1, l2] = lovers;
          if (!l1.isBot) {
            await this.dmManager.sendPrivate(
              this.client,
              guild,
              channel,
              l1,
              { content: `💘 **[CẶP ĐÔI ĐỊNH MỆNH]** Bạn và <@${l2.id}> (${l2.name}) đã được gắn kết trái tim yêu thương!` },
              this.game.id
            );
          }
          if (!l2.isBot) {
            await this.dmManager.sendPrivate(
              this.client,
              guild,
              channel,
              l2,
              { content: `💘 **[CẶP ĐÔI ĐỊNH MỆNH]** Bạn và <@${l1.id}> (${l1.name}) đã được gắn kết trái tim yêu thương!` },
              this.game.id
            );
          }
        }
      }

      // Cập nhật thông báo bình minh ra kênh chung ở cuối kênh
      await this.postNewMainMessage({
        embeds: [WerewolfEmbeds.buildDawnEmbed(this.game, dawnResult)],
        components: WerewolfComponents.buildDawnControls(this.game, dawnResult),
      });

      // Đồng bộ khóa chat cho những người tử trận trong đêm
      await this.syncDeadPlayersChatPermissions();

      // Nếu có Thợ săn tử trận cần bắn súng trả thù
      if (dawnResult.hunterTriggeredId) {
        const hunter = this.game.players.get(dawnResult.hunterTriggeredId);
        if (hunter) {
          if (hunter.isBot) {
            const shot = WerewolfBotAi.performHunterShot(this.game, hunter.id);
            if (shot) {
              await channel.send(`🎯 **[PHÁT SÚNG THỢ SĂN]** Thợ săn **${hunter.name}** trước khi trút hơi thở cuối cùng đã nổ súng bắn gục **${shot.name}**!`);
            }
          } else {
            const hunterMenus = WerewolfComponents.buildHunterShotMenu(this.game, hunter.id);
            await this.dmManager.sendPrivate(
              this.client,
              guild,
              channel,
              hunter,
              {
                content: '🎯 **[PHÁT SÚNG THỢ SĂN]** Bạn đã chết nhưng kịp rút súng! Hãy chọn một người để bắn trả thù:',
                components: hunterMenus,
              },
              this.game.id
            );
          }
        }
      }

      // Kiểm tra Thắng/Thua
      const winCheck = this.game.checkWinCondition();
      if (winCheck.winner !== 'NONE') {
        await this.finishGame(winCheck);
        return;
      }

      const remainingMs = Math.max(1000, this.game.phaseDeadline - Date.now());
      this.schedulePhaseTimer(remainingMs, () => {
        this.advanceToDiscussion();
      });
    } finally {
      this.isProcessingPhaseTransition = false;
    }
  }

  /**
   * Chuyển sang Thảo luận (DISCUSSION)
   */
  public async advanceToDiscussion(): Promise<void> {
    if (this.isProcessingPhaseTransition) return;
    this.isProcessingPhaseTransition = true;
    this.clearPhaseTimer();

    try {
      this.game.startDiscussion();
      this.db.saveGame(this.game);

      await this.postNewMainMessage({
        embeds: [WerewolfEmbeds.buildDiscussionEmbed(this.game)],
        components: WerewolfComponents.buildDiscussionControls(this.game),
      });

      // Mở lại kênh cho dân làng thảo luận, đồng thời khóa riêng người chết
      await this.unlockChannelForDay();
      await this.syncDeadPlayersChatPermissions();

      const guild = await this.getGuild();
      const channel = await this.getChannel();

      // Gửi quyền nổ súng cho Xạ thủ nếu còn đạn (Gunner - Werewolf Online)
      if (guild && channel) {
        const gunners = Array.from(this.game.players.values()).filter(
          (p) => p.isAlive && p.roleId === 'GUNNER' && (p.skills.gunnerBulletsRemaining ?? 0) > 0
        );
        for (const gunner of gunners) {
          if (!gunner.isBot) {
            const gunnerMenus = WerewolfComponents.buildGunnerMenu(this.game, gunner);
            if (gunnerMenus.length > 0) {
              await this.dmManager.sendPrivate(
                this.client,
                guild,
                channel,
                gunner,
                {
                  content: `🔫 **[XẠ THỦ]** Đã đến ban ngày! Bạn đang có **${gunner.skills.gunnerBulletsRemaining}** viên đạn bạc. Bạn có thể nổ súng bắn hạ một người bất kỳ ngay trong lúc thảo luận:`,
                  components: gunnerMenus,
                },
                this.game.id
              );
            }
          }
        }
      }

      // Kích hoạt Bot trò chuyện sinh động trong pha thảo luận
      this.clearBotChatTimers();
      const chatMessages = WerewolfBotAi.generateDiscussionChat(this.game);
      if (channel && chatMessages.length > 0) {
        for (const item of chatMessages) {
          const t = setTimeout(async () => {
            if (this.game.phase !== 'DISCUSSION') return;
            try {
              await channel.send(`💬 🤖 **${item.botName}**: ${item.text}`);
            } catch (err: any) {
              console.error(`[BotChat Error] Không thể gửi tin nhắn của ${item.botName}:`, err?.message);
            }
          }, item.delaySec * 1000);
          this.botChatTimers.push(t);
        }
      }

      const remainingMs = Math.max(1000, this.game.phaseDeadline - Date.now());
      this.schedulePhaseTimer(remainingMs, () => {
        this.advanceToVoting();
      });
    } finally {
      this.isProcessingPhaseTransition = false;
    }
  }

  /**
   * Chuyển sang Biểu quyết treo cổ (VOTING)
   */
  public async advanceToVoting(): Promise<void> {
    if (this.isProcessingPhaseTransition) return;
    this.isProcessingPhaseTransition = true;
    this.clearPhaseTimer();
    this.clearBotChatTimers();

    try {
      this.game.startVoting();
      this.db.saveGame(this.game);

      // Tự động bỏ phiếu cho các người chơi Bot
      WerewolfBotAi.performDayVotes(this.game);
      this.db.saveGame(this.game);

      const votingControls = WerewolfComponents.buildVotingControls(this.game);
      const aliveVoters = Array.from(this.game.players.values()).filter((p) => p.isAlive && p.canVote);
      const humanVoters = aliveVoters.filter((p) => !p.isBot);
      const voterPings = humanVoters.length > 0
        ? humanVoters.map((p) => `<@${p.id}>`).join(' ')
        : '_(Tất cả cử tri là bot ảo)_';

      // Gửi tin nhắn mới tinh ở cuối kênh để không bị trôi sau khi thảo luận dài
      await this.postNewMainMessage({
        content:
          `🔔 **HẾT GIỜ THẢO LUẬN! ĐÃ ĐẾN GIỜ BIỂU QUYẾT TREO CỔ NGÀY ${this.game.dayNumber}!**\n` +
          `👉 Mời dân làng tập trung bỏ phiếu: ${voterPings}`,
        embeds: [WerewolfEmbeds.buildVotingEmbed(this.game)],
        components: votingControls,
      });

      // Phát ngôn bỏ phiếu của Bot trong kênh (nếu có)
      const voteComments = WerewolfBotAi.generateVotingComments(this.game);
      if (voteComments.length > 0) {
        const channel = await this.getChannel();
        if (channel) {
          for (const vc of voteComments) {
            try {
              await channel.send(`🗳️ 🤖 **${vc.botName}**: ${vc.text}`);
            } catch {}
          }
        }
      }

      // Nếu tất cả người chơi còn sống đã bỏ phiếu (ví dụ: chỉ có bot)
      const votes = this.game.currentPhaseActions.filter((a) => a.type === 'DAY_VOTE' || a.type === 'DAY_VOTE_SKIP');
      const votedUserIds = new Set(votes.map((v) => v.userId));

      if (votedUserIds.size >= aliveVoters.length) {
        this.schedulePhaseTimer(1500, () => {
          this.advanceToResolution();
        });
        return;
      }

      const remainingMs = Math.max(1000, this.game.phaseDeadline - Date.now());
      this.schedulePhaseTimer(remainingMs, () => {
        this.advanceToResolution();
      });
    } finally {
      this.isProcessingPhaseTransition = false;
    }
  }

  /**
   * Chốt biểu quyết và công bố kết quả (RESOLUTION)
   */
  public async advanceToResolution(): Promise<void> {
    if (this.isProcessingPhaseTransition) return;
    this.isProcessingPhaseTransition = true;
    this.clearPhaseTimer();

    try {
      const result = this.game.resolveVotingPhase();
      this.db.saveGame(this.game);

      await this.updateMainMessage({
        content: null,
        embeds: [WerewolfEmbeds.buildResolutionEmbed(this.game, result)],
        components: WerewolfComponents.buildResolutionControls(this.game, result),
      });

      // Khóa chat người vừa bị treo cổ (hoặc người yêu chết theo)
      await this.syncDeadPlayersChatPermissions();

      // Nếu có Thợ săn tử trận cần bắn súng trả thù
      if (result.hunterTriggeredId) {
        const hunter = this.game.players.get(result.hunterTriggeredId);
        if (hunter) {
          if (hunter.isBot) {
            const shot = WerewolfBotAi.performHunterShot(this.game, hunter.id);
            const channel = await this.getChannel();
            if (shot && channel) {
              await channel.send(`🎯 **[PHÁT SÚNG THỢ SĂN]** Thợ săn **${hunter.name}** bị treo cổ đã nổ súng kéo theo **${shot.name}**!`);
            }
          }
        }
      }

      // Nếu hòa phiếu và được bỏ phiếu lại một lần
      if (result.revoteTriggered) {
        this.schedulePhaseTimer(5000, () => {
          this.advanceToVoting();
        });
        return;
      }

      // Kiểm tra Thắng/Thua
      const winCheck = this.game.checkWinCondition();
      if (winCheck.winner !== 'NONE') {
        await this.finishGame(winCheck);
        return;
      }

      // Chờ 8 giây để người chơi đọc kết quả treo cổ rồi vào Đêm tiếp theo
      this.schedulePhaseTimer(8000, () => {
        this.advanceToNight();
      });
    } finally {
      this.isProcessingPhaseTransition = false;
    }
  }

  /**
   * Kết thúc ván đấu
   */
  public async finishGame(winResult: GameWinResult): Promise<void> {
    this.stopWatchdog();
    this.clearPhaseTimer();
    this.clearBotChatTimers();
    this.game.phase = 'FINISHED';
    this.db.saveGame(this.game);

    await this.restoreAllChannelPermissions();

    await this.updateMainMessage({
      embeds: [WerewolfEmbeds.buildGameOverEmbed(this.game, winResult)],
      components: [],
    });

    const channel = await this.getChannel();
    if (channel) {
      await this.dmManager.cleanupThreads(channel, this.game.id);
    }
  }

  /**
   * Hủy ván đấu
   */
  public async cancelGame(reason: string = 'Đã hủy trận'): Promise<void> {
    this.stopWatchdog();
    this.clearPhaseTimer();
    this.clearBotChatTimers();
    this.game.cancel(reason);
    this.db.saveGame(this.game);

    await this.restoreAllChannelPermissions();

    await this.updateMainMessage({
      content: `🛑 **Ván đấu đã bị hủy:** ${reason}`,
      embeds: [],
      components: [],
    });

    const channel = await this.getChannel();
    if (channel) {
      await this.dmManager.cleanupThreads(channel, this.game.id);
    }
  }

  /**
   * Khóa quyền gửi tin nhắn đối với tất cả người chơi đã tử trận trong kênh ván chơi
   */
  public async syncDeadPlayersChatPermissions(): Promise<void> {
    const channel = await this.getChannel();
    if (!channel || !channel.permissionOverwrites || typeof channel.permissionOverwrites.edit !== 'function') return;

    for (const player of this.game.players.values()) {
      if (player.isBot) continue;
      if (!player.isAlive) {
        try {
          await channel.permissionOverwrites.edit(
            player.id,
            { SendMessages: false },
            { reason: `Ma Sói: Người chơi ${player.name} đã tử trận, khóa quyền chat trong kênh` }
          );
        } catch (err: any) {
          // Bỏ qua lỗi nếu bot thiếu quyền Manage Channels
        }
      }
    }
  }

  /**
   * Khóa kênh ban đêm để cả làng im lặng đi ngủ
   */
  public async lockChannelForNight(): Promise<void> {
    const channel = await this.getChannel();
    const guild = await this.getGuild();
    if (!channel || !guild || !channel.permissionOverwrites || typeof channel.permissionOverwrites.edit !== 'function') return;

    try {
      await channel.permissionOverwrites.edit(
        guild.roles.everyone,
        { SendMessages: false },
        { reason: 'Ma Sói: Ban đêm buông xuống, khóa kênh để cả làng đi ngủ' }
      );
    } catch (err: any) {
      // Bỏ qua lỗi nếu thiếu quyền
    }
  }

  /**
   * Mở lại kênh vào ban ngày cho người còn sống thảo luận
   */
  public async unlockChannelForDay(): Promise<void> {
    const channel = await this.getChannel();
    const guild = await this.getGuild();
    if (!channel || !guild || !channel.permissionOverwrites || typeof channel.permissionOverwrites.edit !== 'function') return;

    try {
      await channel.permissionOverwrites.edit(
        guild.roles.everyone,
        { SendMessages: null },
        { reason: 'Ma Sói: Trời đã sáng, mở lại kênh cho làng thảo luận' }
      );
    } catch (err: any) {
      // Bỏ qua lỗi nếu thiếu quyền
    }
  }

  /**
   * Phục hồi toàn bộ quyền chat của kênh khi ván đấu kết thúc hoặc bị hủy
   */
  public async restoreAllChannelPermissions(): Promise<void> {
    const channel = await this.getChannel();
    const guild = await this.getGuild();
    if (!channel || !channel.permissionOverwrites) return;

    if (guild && typeof channel.permissionOverwrites.edit === 'function') {
      try {
        await channel.permissionOverwrites.edit(
          guild.roles.everyone,
          { SendMessages: null },
          { reason: 'Ma Sói: Ván đấu kết thúc, phục hồi quyền chat cho cả server' }
        );
      } catch {}
    }

    if (typeof channel.permissionOverwrites.delete === 'function') {
      for (const player of this.game.players.values()) {
        if (player.isBot) continue;
        try {
          await channel.permissionOverwrites.delete(player.id, 'Ma Sói: Ván đấu kết thúc');
        } catch {}
      }
    }
  }

  /**
   * Đặt hẹn giờ chuyển pha
   */
  private schedulePhaseTimer(delayMs: number, callback: () => void): void {
    this.clearPhaseTimer();
    this.timerHandle = setTimeout(callback, Math.max(1000, delayMs));
  }

  public clearBotChatTimers(): void {
    for (const t of this.botChatTimers) {
      clearTimeout(t);
    }
    this.botChatTimers = [];
  }

  public clearPhaseTimer(): void {
    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }
  }

  /**
   * Watchdog định kỳ mỗi 1.5 giây kiểm tra hạn chót, đảm bảo game không bao giờ bị kẹt
   */
  public startWatchdog(): void {
    if (this.watchdogHandle) return;
    this.watchdogHandle = setInterval(async () => {
      if (
        this.game.phase === 'LOBBY' ||
        this.game.phase === 'FINISHED' ||
        this.game.phase === 'CANCELLED' ||
        this.game.phase === 'PAUSED'
      ) {
        return;
      }
      if (this.isProcessingPhaseTransition) return;

      const now = Date.now();
      if (this.game.phaseDeadline > 0 && now >= this.game.phaseDeadline) {
        try {
          if (this.game.phase === 'ROLE_DISTRIBUTION') {
            await this.advanceToNight();
          } else if (this.game.phase === 'NIGHT') {
            await this.advanceToDawn();
          } else if (this.game.phase === 'DAWN') {
            await this.advanceToDiscussion();
          } else if (this.game.phase === 'DISCUSSION') {
            await this.advanceToVoting();
          } else if (this.game.phase === 'VOTING') {
            await this.advanceToResolution();
          }
        } catch (err: any) {
          console.error(`[Watchdog Error] Lỗi tự động chuyển pha khi hết hạn ván ${this.game.id}:`, err?.message);
        }
      }
    }, 1500);
  }

  public stopWatchdog(): void {
    if (this.watchdogHandle) {
      clearInterval(this.watchdogHandle);
      this.watchdogHandle = null;
    }
  }

  /**
   * Kiểm tra hạn chót khi bot khởi động lại (Reboot Recovery)
   */
  public async checkExpiredDeadline(): Promise<void> {
    if (this.game.phase === 'FINISHED' || this.game.phase === 'CANCELLED' || this.game.phase === 'PAUSED') {
      return;
    }

    const now = Date.now();
    if (this.game.phaseDeadline > 0 && now >= this.game.phaseDeadline) {
      // Hạn chót đã trôi qua trong lúc bot offline -> giải quyết ngay
      if (this.game.phase === 'ROLE_DISTRIBUTION') {
        await this.advanceToNight();
      } else if (this.game.phase === 'NIGHT') {
        await this.advanceToDawn();
      } else if (this.game.phase === 'DAWN') {
        await this.advanceToDiscussion();
      } else if (this.game.phase === 'DISCUSSION') {
        await this.advanceToVoting();
      } else if (this.game.phase === 'VOTING') {
        await this.advanceToResolution();
      }
    } else if (this.game.phaseDeadline > now) {
      // Còn thời gian -> tiếp tục đếm ngược thời gian còn lại
      const remainingMs = this.game.phaseDeadline - now;
      if (this.game.phase === 'ROLE_DISTRIBUTION') {
        this.schedulePhaseTimer(remainingMs, () => this.advanceToNight());
      } else if (this.game.phase === 'NIGHT') {
        this.schedulePhaseTimer(remainingMs, () => this.advanceToDawn());
      } else if (this.game.phase === 'DAWN') {
        this.schedulePhaseTimer(remainingMs, () => this.advanceToDiscussion());
      } else if (this.game.phase === 'DISCUSSION') {
        this.schedulePhaseTimer(remainingMs, () => this.advanceToVoting());
      } else if (this.game.phase === 'VOTING') {
        this.schedulePhaseTimer(remainingMs, () => this.advanceToResolution());
      }
    }
  }
}
