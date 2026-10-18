import { EmbedBuilder } from 'discord.js';
import { WerewolfGame } from '../engine/game';
import { GameWinResult, NightResolutionResult, Player, RoleId } from '../engine/types';
import { getRoleInfo, RoleInfo, STANDARD_ROLES } from '../engine/roles';

export class WerewolfEmbeds {
  public static buildLobbyEmbed(game: WerewolfGame): EmbedBuilder {
    const players = Array.from(game.players.values());
    const playerList = players.length > 0
      ? players.map((p, idx) => `**${idx + 1}.** <@${p.id}> (${p.name})`).join('\n')
      : '_Chưa có người chơi nào tham gia._';

    const rolesSummary = Object.entries(game.config.roles)
      .filter(([_, count]) => count > 0)
      .map(([roleId, count]) => {
        const info = getRoleInfo(roleId as RoleId, game.customRoles);
        return `• **${info.name}**: ${count}`;
      })
      .join('\n');

    const totalRoles = Object.values(game.config.roles).reduce((a, b) => a + b, 0);

    const embed = new EmbedBuilder()
      .setColor(0x2f3136)
      .setTitle('🐺 SẢNH CHỜ MA SÓI - BẢNG ĐIỀU KHIỂN QUẢN TRÒ')
      .setDescription(
        `Chào mừng các bạn đến với làng Ma Sói! Hãy tham gia phòng và sẵn sàng cho một đêm đẫm máu.\n` +
        `Chủ phòng: <@${game.hostId}>\n` +
        `Kênh: <#${game.channelId}>`
      )
      .addFields(
        {
          name: `👥 Danh sách người chơi (${players.length} người / ${totalRoles} vai)`,
          value: playerList,
          inline: false,
        },
        {
          name: '📜 Đội hình vai trò dự kiến',
          value: rolesSummary || '_Chưa thiết lập vai_',
          inline: true,
        },
        {
          name: '⏱️ Thời lượng pha',
          value:
            `• Xác nhận vai: ${game.config.timers.roleConfirmSec}s\n` +
            `• Đêm: ${game.config.timers.nightSec}s\n` +
            `• Thảo luận: ${game.config.timers.discussionSec}s\n` +
            `• Bỏ phiếu: ${game.config.timers.votingSec}s`,
          inline: true,
        }
      );

    if (players.length < 4) {
      embed.addFields({
        name: '⚠️ Trạng thái phòng',
        value: `Cần tối thiểu 4 người chơi để bắt đầu trận Ma Sói. Hiện tại đang có **${players.length}** người.`,
        inline: false,
      });
    }

    embed
      .setFooter({ text: 'Bấm "Tham gia" để vào phòng. Cần tối thiểu 4 người để bắt đầu. Chỉ chủ phòng mới có thể bắt đầu hoặc sửa cấu hình.' })
      .setTimestamp();

    return embed;
  }

  public static buildRoleDistributionEmbed(game: WerewolfGame): EmbedBuilder {
    const confirmedCount = Array.from(game.players.values()).filter((p) => p.hasConfirmedRole).length;
    const totalCount = game.players.size;

    return new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🃏 ĐANG CHIA VAI BÍ MẬT')
      .setDescription(
        `Bot đã gửi tin nhắn riêng (DM) chứa vai trò, phe phái và kỹ năng bí mật cho từng người chơi.\n\n` +
        `⚠️ **Vui lòng kiểm tra hộp thư tin nhắn riêng (DM) với Bot và bấm "Đã hiểu vai" để xác nhận.**\n` +
        `Nếu bạn không nhận được tin nhắn, hãy kiểm tra quyền DM trong Cài đặt riêng tư của Discord.`
      )
      .addFields({
        name: 'Tiến độ xác nhận vai',
        value: `✅ Đã xác nhận: **${confirmedCount} / ${totalCount}** người chơi`,
      })
      .setFooter({ text: `Ván đấu sẽ tự động bắt đầu Đêm 1 khi tất cả đã xác nhận hoặc hết thời gian.` });
  }

  public static buildPrivateRoleEmbed(player: Player, roleInfo: RoleInfo, partnerPlayer?: Player): EmbedBuilder {
    const factionColor =
      player.faction === 'WEREWOLF' ? 0xe74c3c : player.faction === 'VILLAGE' ? 0x2ecc71 : 0x9b59b6;

    const embed = new EmbedBuilder()
      .setColor(factionColor)
      .setTitle(`🎭 VAI TRÒ BÍ MẬT CỦA BẠN: ${roleInfo.name.toUpperCase()}`)
      .setDescription(
        `**Phe:** ${player.faction === 'WEREWOLF' ? '🐺 Phe Sói' : player.faction === 'VILLAGE' ? '🌾 Phe Dân làng' : '🔮 Phe Độc lập'}\n` +
        `**Mô tả:** ${roleInfo.description}\n\n` +
        `**Kỹ năng:**\n${roleInfo.skillDescription}\n\n` +
        `**Điều kiện chiến thắng:**\n${roleInfo.winCondition}`
      );

    if (partnerPlayer) {
      embed.addFields({
        name: '💘 Trái tim kết duyên (Cặp đôi)',
        value: `Bạn và <@${partnerPlayer.id}> (${partnerPlayer.name}) đã được Thần tình yêu se duyên! Nếu một người chết, người kia sẽ chết theo vì đau lòng.`,
      });
    }

    embed.setFooter({ text: 'Bấm nút "Đã hiểu vai" bên dưới để hoàn tất xác nhận.' });
    return embed;
  }

  public static buildNightEmbed(game: WerewolfGame): EmbedBuilder {
    const alivePlayers = Array.from(game.players.values()).filter((p) => p.isAlive);

    return new EmbedBuilder()
      .setColor(0x1a1c23)
      .setTitle(`🌙 ĐÊM THỨ ${game.nightNumber} ĐÃ BUÔNG XUỐNG...`)
      .setDescription(
        `Màn đêm u tối bao phủ ngôi làng. Mọi người đều chìm sâu vào giấc ngủ.\n` +
        `Những kẻ mang kỹ năng ban đêm hãy kiểm tra tin nhắn riêng để nhận nhiệm vụ!\n\n` +
        `⏳ **Thời gian còn lại:** <t:${Math.floor(game.phaseDeadline / 1000)}:R>`
      )
      .addFields({
        name: `👥 Người còn sống (${alivePlayers.length})`,
        value: alivePlayers.map((p) => `• <@${p.id}>`).join(' ') || '_Không có ai_',
      })
      .setFooter({ text: 'Quản trò đang bí mật gọi các vai thức dậy...' });
  }

  public static buildDawnEmbed(game: WerewolfGame, result: NightResolutionResult): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle(`🌅 BÌNH MINH NGÀY THỨ ${game.nightNumber}`)
      .setTimestamp();

    if (result.deaths.length === 0) {
      embed.setDescription('Tiếng chuông nhà thờ vang lên đón chào bình minh. Đêm qua là một đêm bình yên, không ai bị giết hại!');
    } else {
      const deathLines = result.deaths.map((d) => {
        let reasonText = 'bị sát hại một cách dã man';
        if (d.reason === 'WITCH_POISON') reasonText = 'chết vì trúng độc dược';
        else if (d.reason === 'WHITE_WOLF') reasonText = 'bị xé xác bí ẩn';
        else if (d.reason === 'HEARTBREAK') reasonText = 'chết vì đau đớn khi người yêu qua đời';
        else if (d.reason === 'HUNTER_SHOT') reasonText = 'bị đạn thợ săn bắn gục';

        const roleReveal = game.config.rules.revealRoleOnDeath
          ? ` (Vai: **${getRoleInfo(d.player.roleId, game.customRoles).name}**)`
          : '';

        return `☠️ <@${d.player.id}> (${d.player.name}) đã ${reasonText}!${roleReveal}`;
      });

      embed.setDescription(`Trời đã sáng, nhưng ngôi làng nhuốm màu tang thương:\n\n${deathLines.join('\n')}`);
    }

    if (result.hunterTriggeredId) {
      embed.addFields({
        name: '🔫 Khẩu súng săn lên nòng!',
        value: `<@${result.hunterTriggeredId}> đã tử trận và chuẩn bị nổ súng trả thù!`,
      });
    }

    return embed;
  }

  public static buildDiscussionEmbed(game: WerewolfGame): EmbedBuilder {
    const alivePlayers = Array.from(game.players.values()).filter((p) => p.isAlive);

    return new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`☀️ THẢO LUẬN NGÀY ${game.dayNumber}`)
      .setDescription(
        `Dân làng tập trung tại quảng trường để bàn tán, suy luận và tìm ra tung tích kẻ giấu mặt.\n` +
        `⏳ **Thời gian thảo luận:** <t:${Math.floor(game.phaseDeadline / 1000)}:R>`
      )
      .addFields({
        name: `👥 Người còn sống sót (${alivePlayers.length})`,
        value: alivePlayers.map((p) => `• <@${p.id}>`).join(' ') || '_Không có ai_',
      })
      .setFooter({ text: 'Hãy thảo luận sôi nổi và quan sát kỹ từng cử chỉ của người khác!' });
  }

  public static buildVotingEmbed(game: WerewolfGame): EmbedBuilder {
    const aliveVoters = Array.from(game.players.values()).filter((p) => p.isAlive && p.canVote);
    const votes = game.currentPhaseActions.filter((a) => a.type === 'DAY_VOTE' || a.type === 'DAY_VOTE_SKIP');
    const votedUserIds = new Set(votes.map((v) => v.userId));

    const voterList = aliveVoters
      .map((p) => {
        const hasVoted = votedUserIds.has(p.id);
        return `${hasVoted ? '✅' : '⏳'} <@${p.id}>`;
      })
      .join('  ');

    return new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle(`⚖️ BIỂU QUYẾT TREO CỔ NGÀY ${game.dayNumber}`)
      .setDescription(
        `Đã đến lúc biểu quyết! Hãy chọn một người bạn nghi ngờ nhất để đưa lên giàn treo cổ.\n` +
        `Bạn cũng có thể chọn **Bỏ phiếu trắng** nếu không đủ chứng cứ.\n\n` +
        `⏳ **Hạn chót bỏ phiếu:** <t:${Math.floor(game.phaseDeadline / 1000)}:R>\n` +
        `📊 **Tiến độ bỏ phiếu:** **${votedUserIds.size}/${aliveVoters.length}** người đã bỏ phiếu`
      )
      .addFields({
        name: `🗳️ Danh sách người biểu quyết (${aliveVoters.length})`,
        value: voterList || '_Không có ai_',
      })
      .setFooter({ text: 'Chọn từ menu bên dưới. Bấm nút "Kéo bảng vote xuống" hoặc gõ /vote nếu bị trôi.' });
  }

  public static buildResolutionEmbed(
    game: WerewolfGame,
    result: {
      lynchedPlayer: Player | null;
      idiotSurvived: boolean;
      tannerWon: boolean;
      isTie: boolean;
      revoteTriggered: boolean;
      voteCounts: Record<string, number>;
    }
  ): EmbedBuilder {
    const embed = new EmbedBuilder().setTimestamp();

    if (result.revoteTriggered) {
      return embed
        .setColor(0xf1c40f)
        .setTitle('⚖️ HÒA PHIẾU - TIẾN HÀNH BỎ PHIẾU LẠI!')
        .setDescription('Số phiếu biểu quyết ngang bằng nhau! Cả làng sẽ tiến hành bỏ phiếu lại một lần duy nhất.');
    }

    if (!result.lynchedPlayer) {
      return embed
        .setColor(0x95a5a6)
        .setTitle('⚖️ KHÔNG CÓ AI BỊ TREO CỔ')
        .setDescription('Đa số phiếu chọn bỏ qua hoặc kết quả hòa phiếu. Dân làng quyết định giải tán trở về nhà bình yên.');
    }

    if (result.idiotSurvived) {
      return embed
        .setColor(0x3498db)
        .setTitle('🤪 THẰNG NGỐC ĐÃ LỘ DIỆN!')
        .setDescription(
          `Người bị đưa lên giàn treo cổ là <@${result.lynchedPlayer.id}> - **Thằng ngốc** của làng!\n` +
          `Dân làng nhận ra án oan nên tha mạng cho Thằng ngốc. Từ nay Thằng ngốc tiếp tục sống nhưng bị tước vĩnh viễn quyền bỏ phiếu!`
        );
    }

    if (result.tannerWon) {
      return embed
        .setColor(0x9b59b6)
        .setTitle('🎭 KẺ CHÁN ĐỜI ĐÃ ĐẠT ĐƯỢC ƯỚC NGUYỆN!')
        .setDescription(
          `Cả làng đã mắc bẫy! <@${result.lynchedPlayer.id}> chính là **Kẻ chán đời (Tanner)**!\n` +
          `Bằng việc bị dân làng treo cổ, Kẻ chán đời giành CHIẾN THẮNG ĐỘC LẬP!`
        );
    }

    const roleReveal = game.config.rules.revealRoleOnDeath
      ? `\nVai trò thực sự của nạn nhân: **${getRoleInfo(result.lynchedPlayer.roleId, game.customRoles).name}**`
      : '';

    return embed
      .setColor(0xc0392b)
      .setTitle('⚰️ DÂN LÀNG ĐÃ TREO CỔ MỘT NGƯỜI')
      .setDescription(
        `<@${result.lynchedPlayer.id}> (${result.lynchedPlayer.name}) đã bị treo cổ theo phán quyết của dân làng!${roleReveal}`
      );
  }

  public static buildGameOverEmbed(game: WerewolfGame, winResult: GameWinResult): EmbedBuilder {
    let color = 0x2ecc71;
    let title = '🏆 KẾT THÚC TRẬN ĐẤU - PHE DÂN LÀNG CHIẾN THẮNG!';

    if (winResult.winner === 'WEREWOLF') {
      color = 0xe74c3c;
      title = '🐺 KẾT THÚC TRẬN ĐẤU - PHE MA SÓI CHIẾN THẮNG!';
    } else if (winResult.winner === 'LOVERS') {
      color = 0xff7979;
      title = '💘 KẾT THÚC TRẬN ĐẤU - CẶP ĐÔI KHÁC PHE CHIẾN THẮNG!';
    } else if (winResult.winner === 'SOLO') {
      color = 0x9b59b6;
      title = `🔮 KẾT THÚC TRẬN ĐẤU - CHIẾN THẮNG ĐỘC LẬP (${winResult.winnerRoleId})!`;
    } else if (winResult.winner === 'DRAW') {
      color = 0x7f8c8d;
      title = '⚖️ KẾT THÚC TRẬN ĐẤU - KẾT QUẢ HÒA!';
    }

    const rolesList = Array.from(game.players.values())
      .map((p) => {
        const info = getRoleInfo(p.roleId, game.customRoles);
        const status = p.isAlive ? '🟢 Còn sống' : `☠️ Đã chết (${p.deathReason})`;
        const loverStr = p.loverId ? ` [💘 Người yêu: <@${p.loverId}>]` : '';
        return `• <@${p.id}> (${p.name}): **${info.name}** - ${status}${loverStr}`;
      })
      .join('\n');

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(`**Lý do:** ${winResult.reason}\n\n**Danh sách vai trò toàn bộ người chơi:**\n${rolesList}`)
      .setTimestamp();
  }

  public static buildRolesCatalogEmbed(customRoles: Record<string, RoleInfo> = {}): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(0x34495e)
      .setTitle('📚 DANH MỤC VAI TRÒ & LUẬT CHƠI MA SÓI')
      .setDescription(
        'Dưới đây là các vai trò đang được hỗ trợ và tích hợp trong hệ thống bot quản trò:\n'
      );

    const villageRoles = Object.values(STANDARD_ROLES).filter((r) => r.faction === 'VILLAGE' && r.isImplemented);
    const wolfRoles = Object.values(STANDARD_ROLES).filter((r) => r.faction === 'WEREWOLF' && r.isImplemented);
    const soloRoles = Object.values(STANDARD_ROLES).filter((r) => r.faction === 'SOLO' && r.isImplemented);
    const unimplRoles = Object.values(STANDARD_ROLES).filter((r) => !r.isImplemented);

    embed.addFields(
      {
        name: '🌾 Phe Dân làng',
        value: villageRoles.map((r) => `• **${r.name}**: ${r.skillDescription}`).join('\n\n'),
      },
      {
        name: '🐺 Phe Ma Sói',
        value: wolfRoles.map((r) => `• **${r.name}**: ${r.skillDescription}`).join('\n\n'),
      },
      {
        name: '🔮 Phe Độc lập',
        value: soloRoles.map((r) => `• **${r.name}**: ${r.skillDescription}`).join('\n\n'),
      },
      {
        name: '⏳ Gợi ý mở rộng (Chưa kích hoạt trong bản này)',
        value: unimplRoles.map((r) => `• **${r.name}**: ${r.skillDescription}`).join('\n'),
      }
    );

    return embed;
  }

  public static buildStatusEmbed(game: WerewolfGame): EmbedBuilder {
    const alivePlayers = Array.from(game.players.values()).filter((p) => p.isAlive);
    const deadPlayers = Array.from(game.players.values()).filter((p) => !p.isAlive);

    return new EmbedBuilder()
      .setColor(0x2c3e50)
      .setTitle(`📊 TRẠNG THÁI VÁN ĐẤU [${game.id}]`)
      .setDescription(
        `• **Giai đoạn hiện tại:** ${game.phase}\n` +
        `• **Ngày / Đêm:** Ngày ${game.dayNumber} / Đêm ${game.nightNumber}\n` +
        `• **Thời gian còn lại:** <t:${Math.floor(game.phaseDeadline / 1000)}:R>`
      )
      .addFields(
        {
          name: `🟢 Người chơi còn sống (${alivePlayers.length})`,
          value: alivePlayers.map((p) => `• <@${p.id}> (${p.name})`).join('\n') || '_Không có ai_',
          inline: true,
        },
        {
          name: `☠️ Người đã tử trận (${deadPlayers.length})`,
          value: deadPlayers.map((p) => `• <@${p.id}> (${p.name})`).join('\n') || '_Chưa có ai tử trận_',
          inline: true,
        }
      )
      .setFooter({ text: 'Thông tin vai bí mật luôn được giữ kín an toàn.' });
  }

  public static buildHelpEmbed(): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('📖 HƯỚNG DẪN LỆNH DISCORD MA SÓI')
      .setDescription('Bot tự động làm Quản trò điều hành ván đấu Ma Sói hoàn chỉnh:')
      .addFields(
        {
          name: '🎮 Lệnh Quản trị & Tạo phòng',
          value:
            '`/start [players]` : Tạo sảnh chờ mới (cần tối thiểu 4 người chơi để bắt đầu), có thể gắn kèm danh sách mention (VD: `/start players:"@An @Binh"`)\n' +
            '`/add @user` : Thêm người chơi vào sảnh chờ (chỉ chủ phòng)\n' +
            '`/remove @user` : Xóa người chơi khỏi sảnh chờ (chỉ chủ phòng)\n' +
            '`/custom` : Mở giao diện tùy chỉnh đội hình vai trò, thời gian và luật chơi (tối thiểu 4 người)\n' +
            '`/pause`, `/resume`, `/stop` : Tạm dừng, tiếp tục hoặc hủy ván đấu (có xác nhận)',
        },
        {
          name: 'ℹ️ Lệnh Tra cứu thông tin & Tiện ích',
          value:
            '`/vote` : Kéo bảng biểu quyết treo cổ xuống cuối kênh nếu bị trôi tin nhắn sau thảo luận\n' +
            '`/role` : Xem riêng vai bí mật của bản thân qua tin nhắn riêng ẩn (ephemeral)\n' +
            '`/status` : Xem trạng thái ván đấu, số người còn sống, thời gian còn lại\n' +
            '`/roles` : Xem bách khoa toàn thư về tất cả các vai trò và quy tắc luật\n' +
            '`/preset list`, `/preset load`, `/preset save` : Quản lý các cấu hình đội hình lưu sẵn',
        }
      )
      .setFooter({ text: 'Tất cả các hành động nhạy cảm đều được gửi riêng tư qua DM để bảo đảm bí mật.' });
  }
}
