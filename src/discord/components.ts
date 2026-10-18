import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { WerewolfGame } from '../engine/game';
import { Player } from '../engine/types';
import { buildCustomId, paginateOptions } from './types';

export class WerewolfComponents {
  /**
   * Bộ nút điều khiển tại Sảnh chờ (Lobby)
   */
  public static buildLobbyControls(game: WerewolfGame): ActionRowBuilder<ButtonBuilder>[] {
    const canStart = game.players.size >= 4;

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildCustomId(game.id, 'LOBBY', 'join', 'all'))
        .setLabel('Tham gia')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✋'),
      new ButtonBuilder()
        .setCustomId(buildCustomId(game.id, 'LOBBY', 'leave', 'all'))
        .setLabel('Rời sảnh')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🚪'),
      new ButtonBuilder()
        .setCustomId(buildCustomId(game.id, 'LOBBY', 'start', game.hostId))
        .setLabel(canStart ? 'Bắt đầu ván' : 'Bắt đầu (Cần ≥ 4 người)')
        .setStyle(canStart ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setEmoji(canStart ? '🚀' : '⏳')
        .setDisabled(!canStart),
      new ButtonBuilder()
        .setCustomId(buildCustomId(game.id, 'LOBBY', 'custom_menu', game.hostId))
        .setLabel('Tùy chỉnh (/custom)')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⚙️')
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildCustomId(game.id, 'LOBBY', 'preset_basic', game.hostId))
        .setLabel('Preset Cơ bản')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(buildCustomId(game.id, 'LOBBY', 'preset_advanced', game.hostId))
        .setLabel('Preset Nâng cao')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(buildCustomId(game.id, 'LOBBY', 'stop_prompt', game.hostId))
        .setLabel('Hủy phòng')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🛑')
    );

    return [row1, row2];
  }

  /**
   * Nút xác nhận đã nhận và hiểu vai trò bí mật
   */
  public static buildRoleConfirmButton(gameId: string, userId: string): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildCustomId(gameId, 'ROLE_DISTRIBUTION', 'confirm_role', userId))
        .setLabel('Đã hiểu vai trò & Sẵn sàng')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')
    );
  }

  /**
   * Menu chọn mục tiêu soi của Tiên tri
   */
  public static buildSeerMenu(game: WerewolfGame, seerId: string): ActionRowBuilder<StringSelectMenuBuilder>[] {
    const targets = Array.from(game.players.values()).filter((p) => p.isAlive && p.id !== seerId);
    const pages = paginateOptions(targets, 25);
    const rows: ActionRowBuilder<StringSelectMenuBuilder>[] = [];

    pages.forEach((pageTargets, idx) => {
      const select = new StringSelectMenuBuilder()
        .setCustomId(buildCustomId(game.id, 'NIGHT', 'seer_target', seerId, `page_${idx}`))
        .setPlaceholder(pages.length > 1 ? `Chọn người để soi (Trang ${idx + 1}/${pages.length})` : 'Chọn người để soi chân tướng...');

      select.addOptions(
        pageTargets.map((p) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`${p.name}`)
            .setDescription(`ID: ${p.id}`)
            .setValue(p.id)
            .setEmoji('🔮')
        )
      );
      rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select));
    });

    return rows;
  }

  /**
   * Menu chọn mục tiêu bảo vệ của Bảo vệ
   */
  public static buildBodyguardMenu(
    game: WerewolfGame,
    bgPlayer: Player
  ): ActionRowBuilder<StringSelectMenuBuilder>[] {
    const targets = Array.from(game.players.values()).filter((p) => {
      if (!p.isAlive) return false;
      if (p.id === bgPlayer.id && !game.config.rules.bodyguardCanProtectSelf) return false;
      if (p.id === bgPlayer.skills.lastProtectedTargetId) return false;
      return true;
    });

    const pages = paginateOptions(targets, 25);
    const rows: ActionRowBuilder<StringSelectMenuBuilder>[] = [];

    pages.forEach((pageTargets, idx) => {
      const select = new StringSelectMenuBuilder()
        .setCustomId(buildCustomId(game.id, 'NIGHT', 'bg_target', bgPlayer.id, `page_${idx}`))
        .setPlaceholder('Chọn người để bảo vệ đêm nay...');

      select.addOptions(
        pageTargets.map((p) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`${p.name}${p.id === bgPlayer.id ? ' (Bản thân)' : ''}`)
            .setValue(p.id)
            .setEmoji('🛡️')
        )
      );
      rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select));
    });

    return rows;
  }

  /**
   * Menu chọn mục tiêu cắn của Bầy sói
   */
  public static buildWolfBiteMenu(game: WerewolfGame, wolfId: string): ActionRowBuilder<StringSelectMenuBuilder>[] {
    // Sói chọn cắn người còn sống không thuộc phe Sói (hoặc bất kỳ ai còn sống)
    const targets = Array.from(game.players.values()).filter((p) => p.isAlive && p.id !== wolfId);
    const pages = paginateOptions(targets, 25);
    const rows: ActionRowBuilder<StringSelectMenuBuilder>[] = [];

    pages.forEach((pageTargets, idx) => {
      const select = new StringSelectMenuBuilder()
        .setCustomId(buildCustomId(game.id, 'NIGHT', 'wolf_vote_target', wolfId, `page_${idx}`))
        .setPlaceholder('Bỏ phiếu cắn xé nạn nhân đêm nay...');

      select.addOptions(
        pageTargets.map((p) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`${p.name}`)
            .setValue(p.id)
            .setEmoji('🩸')
        )
      );
      rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select));
    });

    return rows;
  }

  /**
   * Điều khiển của Phù thủy: Nút Cứu, Menu Độc, Nút Bỏ qua
   */
  public static buildWitchControls(
    game: WerewolfGame,
    witchPlayer: Player,
    wolfVictimPlayer: Player | null
  ): (ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>)[] {
    const controls: (ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>)[] = [];

    const buttonRow = new ActionRowBuilder<ButtonBuilder>();

    // Nút cứu nạn nhân
    const canHeal =
      witchPlayer.skills.witchHealRemaining > 0 &&
      wolfVictimPlayer !== null &&
      (wolfVictimPlayer.id !== witchPlayer.id || game.config.rules.witchCanSelfHealAlways);

    buttonRow.addComponents(
      new ButtonBuilder()
        .setCustomId(buildCustomId(game.id, 'NIGHT', 'witch_heal', witchPlayer.id))
        .setLabel(wolfVictimPlayer ? `Cứu ${wolfVictimPlayer.name}` : 'Không có ai bị cắn')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🧪')
        .setDisabled(!canHeal),
      new ButtonBuilder()
        .setCustomId(buildCustomId(game.id, 'NIGHT', 'witch_pass', witchPlayer.id))
        .setLabel('Không làm gì (Bỏ qua)')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⏩')
    );

    controls.push(buttonRow);

    // Menu hạ độc nếu còn bình độc
    if (witchPlayer.skills.witchPoisonRemaining > 0) {
      const poisonTargets = Array.from(game.players.values()).filter((p) => p.isAlive && p.id !== witchPlayer.id);
      const pages = paginateOptions(poisonTargets, 25);

      pages.forEach((pageTargets, idx) => {
        const select = new StringSelectMenuBuilder()
          .setCustomId(buildCustomId(game.id, 'NIGHT', 'witch_poison_target', witchPlayer.id, `page_${idx}`))
          .setPlaceholder('Dùng bình Độc lên một người (Tùy chọn)...');

        select.addOptions(
          pageTargets.map((p) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(`Đầu độc: ${p.name}`)
              .setValue(p.id)
              .setEmoji('☠️')
          )
        );
        controls.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select));
      });
    }

    return controls;
  }

  /**
   * Menu Sói trắng chọn giết đồng loại (Đêm chẵn >= 2)
   */
  public static buildWhiteWolfMenu(game: WerewolfGame, whiteWolfId: string): ActionRowBuilder<StringSelectMenuBuilder>[] {
    const wolfTargets = Array.from(game.players.values()).filter(
      (p) => p.isAlive && p.faction === 'WEREWOLF' && p.id !== whiteWolfId
    );

    if (wolfTargets.length === 0) return [];

    const select = new StringSelectMenuBuilder()
      .setCustomId(buildCustomId(game.id, 'NIGHT', 'white_wolf_target', whiteWolfId))
      .setPlaceholder('Bí mật giết một con Sói khác trong bầy...');

    select.addOptions(
      wolfTargets.map((p) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`Giết: ${p.name}`)
          .setValue(p.id)
          .setEmoji('🐺')
      )
    );

    return [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)];
  }

  /**
   * Menu Thần tình yêu ghép đôi (Đêm 1)
   */
  public static buildCupidMenu(game: WerewolfGame, cupidId: string): ActionRowBuilder<StringSelectMenuBuilder>[] {
    const alivePlayers = Array.from(game.players.values()).filter((p) => p.isAlive);
    const pages = paginateOptions(alivePlayers, 25);
    const rows: ActionRowBuilder<StringSelectMenuBuilder>[] = [];

    pages.forEach((pageTargets, idx) => {
      const select = new StringSelectMenuBuilder()
        .setCustomId(buildCustomId(game.id, 'NIGHT', 'cupid_pair', cupidId, `page_${idx}`))
        .setPlaceholder('Chọn đúng 2 người để kết đôi...')
        .setMinValues(2)
        .setMaxValues(2);

      select.addOptions(
        pageTargets.map((p) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`${p.name}`)
            .setValue(p.id)
            .setEmoji('💘')
        )
      );
      rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select));
    });

    return rows;
  }

  /**
   * Menu Biểu quyết treo cổ ban ngày
   */
  public static buildVotingControls(game: WerewolfGame): (ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>)[] {
    const alivePlayers = Array.from(game.players.values()).filter((p) => p.isAlive);
    const pages = paginateOptions(alivePlayers, 25);
    const controls: (ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>)[] = [];

    pages.forEach((pageTargets, idx) => {
      const select = new StringSelectMenuBuilder()
        .setCustomId(buildCustomId(game.id, 'VOTING', 'cast_vote', 'all', `page_${idx}`))
        .setPlaceholder(pages.length > 1 ? `Bỏ phiếu treo cổ (Trang ${idx + 1}/${pages.length})` : 'Chọn người bạn muốn treo cổ...');

      select.addOptions(
        pageTargets.map((p) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`Treo cổ: ${p.name}`)
            .setValue(p.id)
            .setEmoji('⚖️')
        )
      );
      controls.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select));
    });

    // Nút Bỏ qua (Bỏ phiếu trắng) và Nút Kéo bảng vote xuống đáy kênh
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildCustomId(game.id, 'VOTING', 'skip_vote', 'all'))
        .setLabel('Bỏ phiếu trắng / Bỏ qua')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🏳️'),
      new ButtonBuilder()
        .setCustomId(buildCustomId(game.id, 'VOTING', 'repost_vote', 'all'))
        .setLabel('Kéo bảng vote xuống')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔄')
    );
    controls.push(buttonRow);

    return controls;
  }

  /**
   * Menu Thợ săn bắn trả thù
   */
  public static buildHunterShotMenu(game: WerewolfGame, hunterId: string): ActionRowBuilder<StringSelectMenuBuilder>[] {
    const aliveTargets = Array.from(game.players.values()).filter((p) => p.isAlive && p.id !== hunterId);
    const pages = paginateOptions(aliveTargets, 25);
    const rows: ActionRowBuilder<StringSelectMenuBuilder>[] = [];

    pages.forEach((pageTargets, idx) => {
      const select = new StringSelectMenuBuilder()
        .setCustomId(buildCustomId(game.id, 'HUNTER', 'shot_target', hunterId, `page_${idx}`))
        .setPlaceholder('Chọn người để nổ phát súng cuối cùng...');

      select.addOptions(
        pageTargets.map((p) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`Bắn gục: ${p.name}`)
            .setValue(p.id)
            .setEmoji('🎯')
        )
      );
      rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select));
    });

    return rows;
  }

  /**
   * Nút xác nhận hủy trận đấu
   */
  public static buildStopConfirmation(gameId: string, hostId: string): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildCustomId(gameId, 'LOBBY', 'confirm_stop', hostId))
        .setLabel('Xác nhận Dừng Trận')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('⚠️'),
      new ButtonBuilder()
        .setCustomId(buildCustomId(gameId, 'LOBBY', 'cancel_stop', hostId))
        .setLabel('Quay lại')
        .setStyle(ButtonStyle.Secondary)
    );
  }
}
