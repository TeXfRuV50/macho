"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomRoleRegistry = void 0;
const types_1 = require("./types");
class CustomRoleRegistry {
    customRoles = new Map();
    /**
     * Đăng ký một vai mới với schema validation nghiêm ngặt.
     * Tuyệt đối không dùng eval hoặc thực thi mã động do người dùng nhập.
     */
    registerRole(def) {
        const parseResult = types_1.CustomRoleSchema.safeParse(def);
        if (!parseResult.success) {
            const errorMsg = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
            return { success: false, error: `Dữ liệu vai không hợp lệ: ${errorMsg}` };
        }
        const validDef = parseResult.data;
        if (this.customRoles.has(validDef.id)) {
            return { success: false, error: `ID vai '${validDef.id}' đã tồn tại.` };
        }
        this.customRoles.set(validDef.id, validDef);
        return { success: true, role: validDef };
    }
    getRole(id) {
        return this.customRoles.get(id);
    }
    getAllRoles() {
        return Array.from(this.customRoles.values());
    }
    toRoleInfo(def) {
        let nightOrder = 0;
        if (def.skillType === 'PROTECT')
            nightOrder = 12;
        else if (def.skillType === 'KILL')
            nightOrder = 25;
        else if (def.skillType === 'HEAL' || def.skillType === 'POISON')
            nightOrder = 32;
        else if (def.skillType === 'INVESTIGATE')
            nightOrder = 42;
        else if (def.skillType === 'INFECT')
            nightOrder = 22;
        return {
            id: def.id,
            name: def.name,
            faction: def.faction,
            description: def.description,
            skillDescription: `Kỹ năng: ${def.skillType}, lượt dùng: ${def.skillUsesPerGame === 0 ? 'Không giới hạn' : def.skillUsesPerGame}, hoạt động: ${def.activeNights}.`,
            winCondition: def.faction === 'VILLAGE' ? 'Phe dân thắng' : def.faction === 'WEREWOLF' ? 'Phe sói thắng' : 'Thắng độc lập',
            nightOrder,
            isImplemented: true,
            wakeEveryNight: def.activeNights === 'ALL' || def.activeNights === 'EVEN' || def.activeNights === 'ODD',
            wakeFirstNightOnly: def.activeNights === 'FIRST_ONLY',
        };
    }
}
exports.CustomRoleRegistry = CustomRoleRegistry;
