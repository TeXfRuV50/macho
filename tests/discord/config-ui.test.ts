import { describe, it, expect } from 'vitest';
import { ConfigUi } from '../../src/discord/config-ui';
import { DEFAULT_CONFIG } from '../../src/engine/presets';
import { parseCustomId } from '../../src/discord/types';

describe('ConfigUi - Bảng chỉnh số lượng vai trò (+/-)', () => {
  it('buildRoleTableEmbed tạo embed hiển thị đúng số vai và trang', () => {
    const config = {
      ...DEFAULT_CONFIG,
      roles: {
        WEREWOLF: 2,
        SEER: 1,
        BODYGUARD: 1,
        VILLAGER: 2,
      },
    };

    const embed = ConfigUi.buildRoleTableEmbed(config, {}, 6, 0);

    expect(embed.data.title).toContain('BẢNG CHỈNH SỐ LƯỢNG VAI TRÒ');
    expect(embed.data.description).toContain('Trang:** 1/');
    expect(embed.data.description).toContain('Đã xếp đủ 6/6 vai');
    expect(embed.data.fields).toBeDefined();
    expect(embed.data.fields![0].value).toContain('Sói');
  });

  it('buildRoleTableEmbed cảnh báo khi thiếu số vai so với người chơi', () => {
    const config = {
      ...DEFAULT_CONFIG,
      roles: {
        WEREWOLF: 1,
        SEER: 1,
      },
    };

    const embed = ConfigUi.buildRoleTableEmbed(config, {}, 6, 0);

    expect(embed.data.description).toContain('Đang thiếu 4 vai');
  });

  it('buildRoleTableControls tạo đúng cấu trúc [ ➖ ] [ Tên: Số lượng ] [ ➕ ] cho mỗi vai', () => {
    const config = {
      ...DEFAULT_CONFIG,
      roles: {
        WEREWOLF: 2,
        SEER: 0,
        BODYGUARD: 1,
        VILLAGER: 3,
      },
    };

    const rows = ConfigUi.buildRoleTableControls('game-123', 'host-456', config, {}, 0);

    // Mỗi trang có 4 vai (4 hàng) + 1 hàng điều hướng = 5 hàng
    expect(rows).toHaveLength(5);

    // Kiểm tra hàng 1 (WEREWOLF)
    const row1 = rows[0].components;
    expect(row1).toHaveLength(3);

    const minusBtn = row1[0].data as any;
    const centerBtn = row1[1].data as any;
    const plusBtn = row1[2].data as any;

    expect(minusBtn.label).toBe('➖');
    expect(minusBtn.disabled).toBe(false); // count = 2 nên không bị disable
    const parsedDec = parseCustomId(minusBtn.custom_id);
    expect(parsedDec?.action).toBe('role_dec');
    expect(parsedDec?.extra).toBe('WEREWOLF:0');

    expect(centerBtn.label).toContain('Sói thường: 2');
    expect(centerBtn.disabled).toBe(true);

    expect(plusBtn.label).toBe('➕');
    expect(plusBtn.disabled).toBe(false);
    const parsedInc = parseCustomId(plusBtn.custom_id);
    expect(parsedInc?.action).toBe('role_inc');
    expect(parsedInc?.extra).toBe('WEREWOLF:0');

    // Kiểm tra hàng 2 (ALPHA_WOLF - count = 0 thì nút ➖ bị disable)
    const row2 = rows[1].components;
    const alphaMinus = row2[0].data as any;
    const alphaCenter = row2[1].data as any;
    expect(alphaMinus.disabled).toBe(true);
    expect(alphaCenter.label).toContain('Sói trùm: 0');
  });

  it('buildRoleTableControls phân trang chính xác', () => {
    const config = { ...DEFAULT_CONFIG };
    const page2Rows = ConfigUi.buildRoleTableControls('game-123', 'host-456', config, {}, 1);

    expect(page2Rows).toHaveLength(5);
    const navRow = page2Rows[4].components;

    const prevBtn = navRow[0].data as any;
    const pageInfo = navRow[1].data as any;
    const nextBtn = navRow[2].data as any;

    // Ở trang 2 (index 1), nút Trước không bị disable
    expect(prevBtn.disabled).toBe(false);
    expect(pageInfo.label).toContain('2/');
  });

  it('buildRoleTableControls chứa nút "⚡ Thêm tất cả vai" ở hàng chức năng', () => {
    const config = { ...DEFAULT_CONFIG };
    const rows = ConfigUi.buildRoleTableControls('game-123', 'host-456', config, {}, 0);

    expect(rows).toHaveLength(5);
    const actionRow = rows[3].components;
    const addAllBtn = actionRow[0].data as any;

    expect(addAllBtn.label).toContain('Thêm tất cả vai');
    const parsed = parseCustomId(addAllBtn.custom_id);
    expect(parsed?.action).toBe('add_all_roles');
  });
});
