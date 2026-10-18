import { Faction, RoleId } from './types';

export interface RoleInfo {
  id: RoleId;
  name: string;
  faction: Faction;
  description: string;
  skillDescription: string;
  winCondition: string;
  nightOrder: number; // 0 = no night call, 1..N order
  isImplemented: boolean;
  wakeEveryNight: boolean;
  wakeFirstNightOnly?: boolean;
}

export const STANDARD_ROLES: Record<string, RoleInfo> = {
  // --- PHE DÂN (VILLAGE) ---
  VILLAGER: {
    id: 'VILLAGER',
    name: 'Dân làng',
    faction: 'VILLAGE',
    description: 'Người dân lương thiện, không có kỹ năng ban đêm.',
    skillDescription: 'Ngủ say giấc suốt đêm. Dùng suy luận và biểu quyết vào ban ngày để tìm ra sói.',
    winCondition: 'Tiêu diệt toàn bộ Phe Sói và các mối hiểm họa độc lập.',
    nightOrder: 0,
    isImplemented: true,
    wakeEveryNight: false,
  },
  SEER: {
    id: 'SEER',
    name: 'Tiên tri',
    faction: 'VILLAGE',
    description: 'Có đôi mắt nhìn thấu chân tướng trong màn đêm.',
    skillDescription: 'Mỗi đêm chọn một người chơi để soi xem người đó có thuộc Phe Sói hay không (Sói Trắng cũng hiện là Sói).',
    winCondition: 'Tiêu diệt toàn bộ Phe Sói và các mối hiểm họa độc lập.',
    nightOrder: 40,
    isImplemented: true,
    wakeEveryNight: true,
  },
  BODYGUARD: {
    id: 'BODYGUARD',
    name: 'Bảo vệ',
    faction: 'VILLAGE',
    description: 'Chiến binh quả cảm bảo vệ dân làng khỏi nanh vuốt sói.',
    skillDescription: 'Mỗi đêm chọn bảo vệ một người khỏi đòn cắn thông thường của sói. Được tự bảo vệ bản thân nhưng không được bảo vệ cùng một người 2 đêm liên tiếp.',
    winCondition: 'Tiêu diệt toàn bộ Phe Sói và các mối hiểm họa độc lập.',
    nightOrder: 10,
    isImplemented: true,
    wakeEveryNight: true,
  },
  WITCH: {
    id: 'WITCH',
    name: 'Phù thủy',
    faction: 'VILLAGE',
    description: 'Nắm giữ bình thuốc quyền năng cứu người hoặc diệt kẻ thù.',
    skillDescription: 'Có 1 bình Cứu và 1 bình Độc cho cả trận. Mỗi đêm được dùng tối đa 1 bình. Ban đêm được biết nạn nhân bị sói cắn để quyết định cứu hay không.',
    winCondition: 'Tiêu diệt toàn bộ Phe Sói và các mối hiểm họa độc lập.',
    nightOrder: 30,
    isImplemented: true,
    wakeEveryNight: true,
  },
  HUNTER: {
    id: 'HUNTER',
    name: 'Thợ săn',
    faction: 'VILLAGE',
    description: 'Xạ thủ luôn mang theo khẩu súng săn nạp sẵn đạn.',
    skillDescription: 'Khi chết, được bắn một phát súng tiễn đưa một người chơi còn sống bất kỳ. Mặc định: nếu chết vì bình độc Phù thủy thì súng bị vô hiệu hóa, không được bắn.',
    winCondition: 'Tiêu diệt toàn bộ Phe Sói và các mối hiểm họa độc lập.',
    nightOrder: 0,
    isImplemented: true,
    wakeEveryNight: false,
  },
  IDIOT: {
    id: 'IDIOT',
    name: 'Thằng ngốc',
    faction: 'VILLAGE',
    description: 'Kẻ ngây ngô được làng che chở qua một lần án oan.',
    skillDescription: 'Lần đầu tiên bị biểu quyết treo cổ vào ban ngày, được làng tha chết và lộ danh tính. Sau đó vẫn sống nhưng bị tước vĩnh viễn quyền bỏ phiếu. Vẫn có thể bị chết vì các nguyên nhân khác.',
    winCondition: 'Tiêu diệt toàn bộ Phe Sói và các mối hiểm họa độc lập.',
    nightOrder: 0,
    isImplemented: true,
    wakeEveryNight: false,
  },
  CUPID: {
    id: 'CUPID',
    name: 'Thần tình yêu',
    faction: 'VILLAGE',
    description: 'Vị thần gieo duyên kết tóc giữa hai con người.',
    skillDescription: 'Chỉ thức dậy duy nhất vào Đêm 1: chọn 2 người bất kỳ trở thành Cặp đôi yêu nhau. Khi một trong hai chết, người còn lại sẽ chết theo vì đau lòng.',
    winCondition: 'Theo phe dân làng (nếu cặp đôi cùng phe dân) hoặc theo Phe Sói (nếu cặp đôi cùng phe sói). Nếu Cặp đôi khác phe, Cặp đôi có điều kiện thắng riêng: sống sót là 2 người cuối cùng.',
    nightOrder: 5,
    isImplemented: true,
    wakeEveryNight: false,
    wakeFirstNightOnly: true,
  },

  // --- PHE SÓI (WEREWOLF) ---
  WEREWOLF: {
    id: 'WEREWOLF',
    name: 'Sói thường',
    faction: 'WEREWOLF',
    description: 'Kẻ khát máu ẩn mình dưới lốt người vào ban ngày.',
    skillDescription: 'Nhận biết các đồng đội phe sói. Mỗi đêm cùng bầy sói thống nhất biểu quyết chọn 1 nạn nhân để cắn xé.',
    winCondition: 'Số lượng Sói bằng hoặc lớn hơn số dân làng còn sống (khi không có Cặp đôi khác phe cạnh tranh).',
    nightOrder: 20,
    isImplemented: true,
    wakeEveryNight: true,
  },
  DEMON_WOLF: {
    id: 'DEMON_WOLF',
    name: 'Sói quỷ',
    faction: 'WEREWOLF',
    description: 'Chúa tể bóng tối mang khả năng tha hóa linh hồn con người.',
    skillDescription: 'Thức dậy cùng bầy sói. Một lần duy nhất trong cả trận, có thể quyết định chuyển hóa nạn nhân bị cắn thành Sói thay vì giết chết. Mục tiêu sẽ mất vai cũ, gia nhập Phe Sói. Nếu nạn nhân được Bảo vệ hoặc Cứu, phép chuyển hóa thất bại và không bị mất lượt dùng.',
    winCondition: 'Số lượng Sói bằng hoặc lớn hơn số dân làng còn sống.',
    nightOrder: 20,
    isImplemented: true,
    wakeEveryNight: true,
  },
  BERSERK_WOLF: {
    id: 'BERSERK_WOLF',
    name: 'Sói cuồng nộ',
    faction: 'WEREWOLF',
    description: 'Con sói hung bạo nhất với cơn thịnh nộ truyền thừa.',
    skillDescription: 'Thức dậy cùng bầy sói. Khi Sói cuồng nộ bị giết chết, sẽ kích hoạt hiệu ứng cuồng nộ cho đêm kế tiếp: đòn cắn của bầy sói đêm đó sẽ xuyên thủng lớp khiên của Bảo vệ (nhưng vẫn có thể được bình Cứu của Phù thủy ngăn chặn). Hiệu ứng chỉ dùng 1 lần và không cộng dồn.',
    winCondition: 'Số lượng Sói bằng hoặc lớn hơn số dân làng còn sống.',
    nightOrder: 20,
    isImplemented: true,
    wakeEveryNight: true,
  },
  WHITE_WOLF: {
    id: 'WHITE_WOLF',
    name: 'Sói trắng',
    faction: 'WEREWOLF', // Đồng thời là Sói nhưng có mục tiêu solo
    description: 'Kẻ phản trắc nguy hiểm nhất mang tham vọng độc chiếm khu rừng.',
    skillDescription: 'Được các con sói khác coi như đồng đội và cùng thức dậy cắn người mỗi đêm. Tuy nhiên, bắt đầu từ Đêm 2, vào mỗi đêm chẵn (Đêm 2, 4, 6...), Sói Trắng được thức dậy riêng bí mật giết thêm một thành viên khác thuộc Phe Sói.',
    winCondition: 'Chiến thắng ĐỘC LẬP duy nhất khi là người chơi cuối cùng còn sống sót trong ván.',
    nightOrder: 50,
    isImplemented: true,
    wakeEveryNight: true,
  },

  // --- PHE ĐỘC LẬP (SOLO) ---
  TANNER: {
    id: 'TANNER',
    name: 'Kẻ chán đời',
    faction: 'SOLO',
    description: 'Kẻ căm ghét cuộc đời và tìm kiếm cái chết danh dự trên giá treo cổ.',
    skillDescription: 'Không có kỹ năng ban đêm. Mục tiêu duy nhất là làm sao để dân làng nghi ngờ và biểu quyết TREO CỔ mình vào ban ngày.',
    winCondition: 'Thắng ĐỘC LẬP ngay lập tức nếu bị dân làng biểu quyết treo cổ thành công vào ban ngày. Nếu chết ban đêm, bị sói cắn, phù thủy độc hoặc thợ săn bắn thì KHÔNG thắng.',
    nightOrder: 0,
    isImplemented: true,
    wakeEveryNight: false,
  },

  // --- GỢI Ý THÊM (CHƯA TRIỂN KHAI THEO YÊU CẦU: TẮT MẶC ĐỊNH, KHÔNG BẬT LÀM TÍNH NĂNG CHƠI) ---
  ELDER: {
    id: 'ELDER',
    name: 'Già làng (Gợi ý - Chưa kích hoạt)',
    faction: 'VILLAGE',
    description: 'Trưởng làng đức cao vọng trọng.',
    skillDescription: 'Có 2 mạng trước đòn cắn của sói. Chưa triển khai trong phiên bản này.',
    winCondition: 'Phe dân thắng.',
    nightOrder: 0,
    isImplemented: false,
    wakeEveryNight: false,
  },
  LITTLE_GIRL: {
    id: 'LITTLE_GIRL',
    name: 'Cô bé (Gợi ý - Chưa kích hoạt)',
    faction: 'VILLAGE',
    description: 'Cô bé tò mò hé mắt xem sói.',
    skillDescription: 'Được hé mắt nhìn sói trong đêm. Chưa triển khai trong phiên bản này.',
    winCondition: 'Phe dân thắng.',
    nightOrder: 0,
    isImplemented: false,
    wakeEveryNight: false,
  },
  PIPER: {
    id: 'PIPER',
    name: 'Người thổi sáo (Gợi ý - Chưa kích hoạt)',
    faction: 'SOLO',
    description: 'Kẻ mê hoặc tâm trí dân làng bằng tiếng sáo thần.',
    skillDescription: 'Mỗi đêm mê hoặc 2 người. Thắng khi toàn bộ người còn sống bị mê hoặc. Chưa triển khai trong phiên bản này.',
    winCondition: 'Tất cả người chơi còn sống bị mê hoặc.',
    nightOrder: 0,
    isImplemented: false,
    wakeEveryNight: false,
  },
  SERIAL_KILLER: {
    id: 'SERIAL_KILLER',
    name: 'Sát nhân (Gợi ý - Chưa kích hoạt)',
    faction: 'SOLO',
    description: 'Kẻ sát nhân giấu mặt cuồng sát mỗi đêm.',
    skillDescription: 'Mỗi đêm giết 1 người bất kỳ. Chưa triển khai trong phiên bản này.',
    winCondition: 'Là người sống sót cuối cùng.',
    nightOrder: 0,
    isImplemented: false,
    wakeEveryNight: false,
  },
};

/**
 * Danh sách vai đã triển khai chính thức và có thể chọn trong game
 */
export const IMPLEMENTED_ROLE_IDS = Object.values(STANDARD_ROLES)
  .filter((r) => r.isImplemented)
  .map((r) => r.id);

export function getRoleInfo(roleId: RoleId, customRoles: Record<string, RoleInfo> = {}): RoleInfo {
  if (STANDARD_ROLES[roleId]) {
    return STANDARD_ROLES[roleId];
  }
  if (customRoles[roleId]) {
    return customRoles[roleId];
  }
  // Mặc định an toàn
  return {
    id: roleId,
    name: roleId,
    faction: 'VILLAGE',
    description: 'Vai tùy chỉnh',
    skillDescription: 'Không có thông tin chi tiết.',
    winCondition: 'Theo quy định của vai.',
    nightOrder: 0,
    isImplemented: true,
    wakeEveryNight: false,
  };
}
