import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { GameConfig } from '../engine/types';
import { buildCustomId } from './types';
import { getRoleInfo, IMPLEMENTED_ROLE_IDS } from '../engine/roles';

export class ConfigUi {
  /**
   * Tạo Embed tóm tắt cấu hình hiện tại
   */
  public static buildConfigSummaryEmbed(config: GameConfig, playerCount: number): EmbedBuilder {
    const rolesList = Object.entries(config.roles)
      .filter(([_, count]) => count > 0)
      .map(([roleId, count]) => `• **${getRoleInfo(roleId).name}**: ${count}`)
      .join('\n');

    const totalRoles = Object.values(config.roles).reduce((a, b) => a + b, 0);

    return new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle('⚙️ BẢNG TÙY CHỈNH CẤU HÌNH PHÒNG CHƠI')
      .setDescription('Chủ phòng có thể chỉnh sửa số lượng từng vai, thời gian và luật chơi bên dưới.')
      .addFields(
        {
          name: `🎭 Đội hình vai trò (${totalRoles} vai / ${playerCount} người)`,
          value: rolesList || '_Chưa có vai nào_',
          inline: false,
        },
        {
          name: '⏱️ Thời lượng',
          value:
            `• Xác nhận vai: ${config.timers.roleConfirmSec}s\n` +
            `• Đêm: ${config.timers.nightSec}s\n` +
            `• Thảo luận: ${config.timers.discussionSec}s\n` +
            `• Biểu quyết: ${config.timers.votingSec}s`,
          inline: true,
        },
        {
          name: '📜 Luật chơi',
          value:
            `• Công bố vai khi chết: ${config.rules.revealRoleOnDeath ? 'Bật' : 'Tắt (Mặc định)'}\n` +
            `• Bảo vệ tự che chở: ${config.rules.bodyguardCanProtectSelf ? 'Cho phép' : 'Cấm'}\n` +
            `• Phù thủy tự cứu: ${config.rules.witchCanSelfHealAlways ? 'Mọi đêm' : 'Chỉ Đêm 1'}\n` +
            `• Thợ săn trúng độc được bắn: ${config.rules.hunterCanShootIfPoisoned ? 'Có' : 'Không'}\n` +
            `• Hòa phiếu: ${config.rules.tieVoteAction === 'REVOTE_ONCE' ? 'Bỏ phiếu lại 1 lần' : 'Bỏ qua'}`,
          inline: true,
        }
      )
      .setFooter({ text: 'Khi trận đấu bắt đầu, toàn bộ cấu hình sẽ bị KHÓA chặt chẽ.' });
  }

  /**
   * Bộ nút & menu điều khiển cấu hình
   */
  public static buildConfigControls(gameId: string, hostId: string): (ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>)[] {
    // Menu chọn vai để tăng/giảm số lượng
    const roleSelect = new StringSelectMenuBuilder()
      .setCustomId(buildCustomId(gameId, 'CONFIG', 'select_role_to_edit', hostId))
      .setPlaceholder('Chọn một vai để chỉnh số lượng (+/-)...');

    for (const roleId of IMPLEMENTED_ROLE_IDS) {
      const info = getRoleInfo(roleId);
      roleSelect.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(info.name)
          .setValue(roleId)
          .setDescription(`Phe: ${info.faction}`)
      );
    }

    const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(roleSelect);

    // Hàng nút điều chỉnh
    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildCustomId(gameId, 'CONFIG', 'auto_balance', hostId))
        .setLabel('Tự cân bằng Dân làng')
        .setStyle(ButtonStyle.Success)
        .setEmoji('⚖️'),
      new ButtonBuilder()
        .setCustomId(buildCustomId(gameId, 'CONFIG', 'open_timer_modal', hostId))
        .setLabel('Chỉnh thời gian')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⏱️'),
      new ButtonBuilder()
        .setCustomId(buildCustomId(gameId, 'CONFIG', 'toggle_reveal_role', hostId))
        .setLabel('Bật/Tắt Lộ vai khi chết')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('👁️'),
      new ButtonBuilder()
        .setCustomId(buildCustomId(gameId, 'CONFIG', 'open_custom_role_modal', hostId))
        .setLabel('Tạo vai mới')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✨')
    );

    return [row1, row2];
  }

  /**
   * Modal chỉnh sửa thời gian
   */
  public static buildTimerModal(gameId: string): ModalBuilder {
    return new ModalBuilder()
      .setCustomId(`modal:timer:${gameId}`)
      .setTitle('Điều chỉnh thời gian (giây)')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('night_sec')
            .setLabel('Thời gian Đêm (15 - 180s)')
            .setStyle(TextInputStyle.Short)
            .setValue('45')
            .setRequired(true)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('discussion_sec')
            .setLabel('Thời gian Thảo luận (20 - 300s)')
            .setStyle(TextInputStyle.Short)
            .setValue('90')
            .setRequired(true)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('voting_sec')
            .setLabel('Thời gian Biểu quyết (15 - 120s)')
            .setStyle(TextInputStyle.Short)
            .setValue('40')
            .setRequired(true)
        )
      );
  }

  /**
   * Modal tạo vai mới an toàn (Schema-backed)
   */
  public static buildCustomRoleModal(gameId: string): ModalBuilder {
    return new ModalBuilder()
      .setCustomId(`modal:custom_role:${gameId}`)
      .setTitle('Tạo vai trò tùy chỉnh mới')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('role_id')
            .setLabel('Mã vai (Chữ hoa & số, VD: GHOST_HUNTER)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('GHOST_HUNTER')
            .setRequired(true)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('role_name')
            .setLabel('Tên hiển thị của vai')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Thợ bắt ma')
            .setRequired(true)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('role_desc')
            .setLabel('Mô tả vai')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Mô tả ngắn gọn về vai trò này...')
            .setRequired(true)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('role_skill')
            .setLabel('Loại kỹ năng: INVESTIGATE/PROTECT/KILL/NONE')
            .setStyle(TextInputStyle.Short)
            .setValue('INVESTIGATE')
            .setRequired(true)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('role_faction')
            .setLabel('Phe: VILLAGE / WEREWOLF / SOLO')
            .setStyle(TextInputStyle.Short)
            .setValue('VILLAGE')
            .setRequired(true)
        )
      );
  }
}
