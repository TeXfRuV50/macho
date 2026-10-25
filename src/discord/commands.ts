import { SlashCommandBuilder } from 'discord.js';

export function parseMentionIds(text: string): string[] {
  if (!text) return [];
  const regex = /<@!?(\d+)>/g;
  const ids: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1] && !ids.includes(match[1])) {
      ids.push(match[1]);
    }
  }
  return ids;
}

export const SLASH_COMMANDS = [
  new SlashCommandBuilder()
    .setName('start')
    .setDescription('Tạo sảnh chờ Ma Sói mới trong kênh này')
    .addStringOption((opt) =>
      opt
        .setName('players')
        .setDescription('Danh sách mention người chơi thêm sẵn vào sảnh (VD: @An @Bình @Chi)')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('add')
    .setDescription('Chủ phòng thêm người chơi vào sảnh chờ')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Người chơi muốn thêm vào sảnh').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Chủ phòng xóa người chơi khỏi sảnh chờ')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Người chơi muốn xóa').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('addbot')
    .setDescription('Chủ phòng thêm người chơi Bot ảo vào sảnh chờ để đủ số lượng')
    .addIntegerOption((opt) =>
      opt
        .setName('count')
        .setDescription('Số lượng bot muốn thêm (Mặc định: 1, tối đa: 20)')
        .setMinValue(1)
        .setMaxValue(20)
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('fillbots')
    .setDescription('Tự động điền đủ bot vào sảnh chờ để bắt đầu ván (≥ 4 người)')
    .addIntegerOption((opt) =>
      opt
        .setName('target')
        .setDescription('Tổng số người chơi mong muốn (Mặc định: đủ vai hoặc tối thiểu 4 người)')
        .setMinValue(4)
        .setMaxValue(25)
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('clearbots')
    .setDescription('Chủ phòng xóa toàn bộ Bot ảo khỏi sảnh chờ'),

  new SlashCommandBuilder()
    .setName('bot')
    .setDescription('Quản lý người chơi Bot ảo trong sảnh chờ')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Thêm bot ảo vào sảnh')
        .addIntegerOption((opt) => opt.setName('count').setDescription('Số lượng bot (1-20)').setMinValue(1).setMaxValue(20).setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('fill')
        .setDescription('Tự động điền bot cho đủ số lượng bắt đầu ván')
        .addIntegerOption((opt) => opt.setName('target').setDescription('Số người chơi mục tiêu (4-25)').setMinValue(4).setMaxValue(25).setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Xóa bớt 1 bot ảo gần nhất')
    )
    .addSubcommand((sub) =>
      sub
        .setName('clear')
        .setDescription('Xóa tất cả bot ảo trong sảnh')
    ),

  new SlashCommandBuilder()
    .setName('addallroles')
    .setDescription('Chủ phòng thêm nhanh tất cả các vai trò vào ván đấu (mỗi vai 1 vị trí)'),

  new SlashCommandBuilder()
    .setName('custom')
    .setDescription('Mở trình tùy chỉnh đội hình, thời gian và luật chơi của ván đấu'),

  new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Xem bách khoa toàn thư danh mục vai trò, phe phái và kỹ năng'),

  new SlashCommandBuilder()
    .setName('role')
    .setDescription('Xem lại vai trò bí mật của chính bạn trong ván đấu hiện tại'),

  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Xem trạng thái ván đấu hiện tại, người còn sống và thời gian còn lại'),

  new SlashCommandBuilder()
    .setName('vote')
    .setDescription('Kéo bảng biểu quyết treo cổ xuống cuối kênh nếu bị trôi tin nhắn sau thảo luận'),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Xem hướng dẫn chi tiết cách chơi và danh sách các lệnh của Bot'),

  new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Tạm dừng ván đấu hiện tại (chỉ Chủ phòng hoặc Quản trị viên)'),

  new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Tiếp tục ván đấu đang bị tạm dừng (chỉ Chủ phòng hoặc Quản trị viên)'),

  new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Hủy bỏ ván đấu hiện tại (chỉ Chủ phòng hoặc Quản trị viên)'),

  new SlashCommandBuilder()
    .setName('preset')
    .setDescription('Quản lý các cấu hình đội hình (Presets) trong server')
    .addSubcommand((sub) =>
      sub
        .setName('save')
        .setDescription('Lưu cấu hình hiện tại thành preset mới')
        .addStringOption((opt) =>
          opt.setName('name').setDescription('Tên của Preset').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('description').setDescription('Mô tả ngắn gọn về preset này').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('load')
        .setDescription('Áp dụng preset đã lưu vào sảnh chờ hiện tại')
        .addStringOption((opt) =>
          opt.setName('name').setDescription('Tên Preset muốn áp dụng').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('Xem danh sách tất cả các preset đã lưu trong máy chủ')
    ),
];
