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
import { GameConfig, RoleId } from '../engine/types';
import { buildCustomId } from './types';
import { getRoleInfo, IMPLEMENTED_ROLE_IDS, RoleInfo } from '../engine/roles';

export const ROLE_EMOJIS: Record<string, string> = {
  ALPHA_WOLF: '👑',
  WEREWOLF: '🐺',
  WOLF_SEER: '👁️',
  DEMON_WOLF: '🩸',
  BERSERK_WOLF: '⚡',
  WHITE_WOLF: '🐺',
  SEER: '🔮',
  BODYGUARD: '🛡️',
  DOCTOR: '🩺',
  DETECTIVE: '🔍',
  GUNNER: '🔫',
  WITCH: '🧪',
  HUNTER: '🎯',
  CUPID: '💘',
  IDIOT: '🤡',
  VILLAGER: '🌾',
  FOOL: '🃏',
  TANNER: '🎭',
  SERIAL_KILLER: '🔪',
};

export const ORDERED_CONFIG_ROLES: RoleId[] = [
  'WEREWOLF',
  'ALPHA_WOLF',
  'SEER',
  'BODYGUARD',
  'VILLAGER',
  'WITCH',
  'HUNTER',
  'DOCTOR',
  'DETECTIVE',
  'GUNNER',
  'WOLF_SEER',
  'SERIAL_KILLER',
  'FOOL',
  'CUPID',
  'IDIOT',
  'DEMON_WOLF',
  'BERSERK_WOLF',
  'WHITE_WOLF',
  'TANNER',
];

export class ConfigUi {
  /**
   * Tạo Embed hiển thị danh sách vai trò dạng bảng với các thông tin số lượng
   */
  public static buildRoleTableEmbed(
    config: GameConfig,
    customRoles: Record<string, RoleInfo> = {},
    playerCount: number = 0,
    page: number = 0
  ): EmbedBuilder {
    const totalRoles = Object.values(config.roles).reduce((a, b) => a + b, 0);

    const allRoles = [
      ...ORDERED_CONFIG_ROLES,
      ...Object.keys(customRoles).filter((id) => !ORDERED_CONFIG_ROLES.includes(id as any)),
    ];

    const pageSize = 3;
    const totalPages = Math.max(1, Math.ceil(allRoles.length / pageSize));
    const safePage = Math.max(0, Math.min(totalPages - 1, page));

    // Danh sách các vai đang được bật (số lượng > 0)
    const activeRoles = Object.entries(config.roles)
      .filter(([_, count]) => count > 0)
      .map(([roleId, count]) => {
        const info = getRoleInfo(roleId as RoleId, customRoles);
        const emoji = ROLE_EMOJIS[roleId] || '🎭';
        return `${emoji} **${info.name}**: \`${count}\``;
      });

    const isMatch = totalRoles === playerCount && playerCount > 0;
    let statusText = '';
    if (playerCount > 0) {
      if (isMatch) {
        statusText = `✅ **Đã xếp đủ ${totalRoles}/${playerCount} vai! Sẵn sàng xuất phát.**`;
      } else if (totalRoles < playerCount) {
        statusText = `⚠️ **Đang thiếu ${playerCount - totalRoles} vai** (${totalRoles}/${playerCount}) — Bấm nút **"⚖️ Tự cân bằng"** để tự động thêm Dân làng.`;
      } else {
        statusText = `⚠️ **Đang thừa ${totalRoles - playerCount} vai** (${totalRoles}/${playerCount}) — Hãy giảm bớt vai hoặc thêm người chơi.`;
      }
    } else {
      statusText = `📊 Tổng số vai đã xếp: **${totalRoles}** vai.`;
    }

    const embed = new EmbedBuilder()
      .setColor(isMatch ? 0x2ecc71 : 0xe67e22)
      .setTitle('🎭 BẢNG CHỈNH SỐ LƯỢNG VAI TRÒ (+ / -)')
      .setDescription(
        `Bấm **[ ➖ ]** hoặc **[ ➕ ]** ở hai bên của mỗi vai để tăng/giảm số lượng.\n` +
        `Số lượng hiện tại hiển thị ở giữa hai dấu trừ và cộng.\n\n` +
        `${statusText}\n` +
        `📄 **Trang:** ${safePage + 1}/${totalPages}`
      );

    if (activeRoles.length > 0) {
      embed.addFields({
        name: `📋 Đội hình vai đang chọn (${totalRoles} vai)`,
        value: activeRoles.join('   •   '),
        inline: false,
      });
    } else {
      embed.addFields({
        name: '📋 Đội hình vai đang chọn',
        value: '_Chưa có vai nào được kích hoạt. Hãy bấm nút [+] bên dưới để thêm vai!_',
        inline: false,
      });
    }

    embed.setFooter({
      text: 'Dùng các nút ◀️ / ▶️ để chuyển trang. Bấm "Cài đặt khác" để chỉnh thời gian & luật.',
    });

    return embed;
  }

  /**
   * Bộ nút điều chỉnh số lượng vai trò dạng bảng: mỗi hàng có nút [ - ] [ Tên: Số lượng ] [ + ]
   */
  public static buildRoleTableControls(
    gameId: string,
    hostId: string,
    config: GameConfig,
    customRoles: Record<string, RoleInfo> = {},
    page: number = 0
  ): ActionRowBuilder<ButtonBuilder>[] {
    const allRoles = [
      ...ORDERED_CONFIG_ROLES,
      ...Object.keys(customRoles).filter((id) => !ORDERED_CONFIG_ROLES.includes(id as any)),
    ];

    const pageSize = 3;
    const totalPages = Math.max(1, Math.ceil(allRoles.length / pageSize));
    const safePage = Math.max(0, Math.min(totalPages - 1, page));
    const pageRoles = allRoles.slice(safePage * pageSize, (safePage + 1) * pageSize);

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];

    // Mỗi vai 1 hàng gồm: [ ➖ ] [ Tên: Số lượng ] [ ➕ ]
    for (const roleId of pageRoles) {
      const info = getRoleInfo(roleId as RoleId, customRoles);
      const count = config.roles[roleId] || 0;
      const emoji = ROLE_EMOJIS[roleId] || '🎭';

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(buildCustomId(gameId, 'CONFIG', 'role_dec', hostId, `${roleId}:${safePage}`))
          .setLabel('➖')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(count <= 0),
        new ButtonBuilder()
          .setCustomId(buildCustomId(gameId, 'CONFIG', 'role_noop', hostId, `${roleId}:${safePage}`))
          .setLabel(`${emoji} ${info.name}: ${count}`)
          .setStyle(count > 0 ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(buildCustomId(gameId, 'CONFIG', 'role_inc', hostId, `${roleId}:${safePage}`))
          .setLabel('➕')
          .setStyle(ButtonStyle.Success)
          .setDisabled(count >= 25)
      );

      rows.push(row);
    }

    // Hàng thứ 4: Các nút chức năng (Thêm tất cả vai, Tự cân bằng, Cài đặt khác)
    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildCustomId(gameId, 'CONFIG', 'add_all_roles', hostId, `${safePage}`))
        .setLabel('⚡ Thêm tất cả vai')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(buildCustomId(gameId, 'CONFIG', 'auto_balance_table', hostId, `${safePage}`))
        .setLabel('⚖️ Tự cân bằng')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(buildCustomId(gameId, 'CONFIG', 'main_config_menu', hostId))
        .setLabel('⚙️ Cài đặt khác')
        .setStyle(ButtonStyle.Secondary)
    );
    rows.push(actionRow);

    // Hàng thứ 5: Điều hướng phân trang
    const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildCustomId(gameId, 'CONFIG', 'role_page', hostId, `${safePage - 1}`))
        .setLabel('◀️ Trước')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(safePage <= 0),
      new ButtonBuilder()
        .setCustomId(buildCustomId(gameId, 'CONFIG', 'role_page_info', hostId, `${safePage}`))
        .setLabel(`${safePage + 1}/${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(buildCustomId(gameId, 'CONFIG', 'role_page', hostId, `${safePage + 1}`))
        .setLabel('Tiếp ▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(safePage >= totalPages - 1)
    );

    rows.push(navRow);
    return rows;
  }

  /**
   * Tạo Embed tóm tắt cấu hình hiện tại
   */
  public static buildConfigSummaryEmbed(config: GameConfig, playerCount: number): EmbedBuilder {
    const rolesList = Object.entries(config.roles)
      .filter(([_, count]) => count > 0)
      .map(([roleId, count]) => `• **${getRoleInfo(roleId as RoleId).name}**: ${count}`)
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
   * Bộ nút & menu điều khiển cấu hình tổng quát
   */
  public static buildConfigControls(gameId: string, hostId: string): (ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>)[] {
    const roleSelect = new StringSelectMenuBuilder()
      .setCustomId(buildCustomId(gameId, 'CONFIG', 'select_role_to_edit', hostId))
      .setPlaceholder('Chọn nhanh một vai để tăng số lượng (+1)...');

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

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildCustomId(gameId, 'CONFIG', 'open_role_table', hostId))
        .setLabel('Bảng chỉnh vai (+/-)')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎭'),
      new ButtonBuilder()
        .setCustomId(buildCustomId(gameId, 'CONFIG', 'auto_balance', hostId))
        .setLabel('Tự cân bằng Dân')
        .setStyle(ButtonStyle.Success)
        .setEmoji('⚖️'),
      new ButtonBuilder()
        .setCustomId(buildCustomId(gameId, 'CONFIG', 'open_timer_modal', hostId))
        .setLabel('Chỉnh thời gian')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⏱️'),
      new ButtonBuilder()
        .setCustomId(buildCustomId(gameId, 'CONFIG', 'toggle_reveal_role', hostId))
        .setLabel('Lộ vai khi chết')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('👁️'),
      new ButtonBuilder()
        .setCustomId(buildCustomId(gameId, 'CONFIG', 'open_custom_role_modal', hostId))
        .setLabel('Tạo vai mới')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✨')
    );

    const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildCustomId(gameId, 'CONFIG', 'add_all_roles', hostId))
        .setLabel('⚡ Thêm tất cả vai')
        .setStyle(ButtonStyle.Success)
    );

    return [row1, row2, row3];
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
