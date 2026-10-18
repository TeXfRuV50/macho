"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomRoleSchema = void 0;
const zod_1 = require("zod");
exports.CustomRoleSchema = zod_1.z.object({
    id: zod_1.z.string().min(2).max(32).regex(/^[A-Z0-9_]+$/, 'ID chỉ gồm chữ hoa, số và dấu gạch dưới'),
    name: zod_1.z.string().min(2).max(32),
    description: zod_1.z.string().min(5).max(200),
    faction: zod_1.z.enum(['VILLAGE', 'WEREWOLF', 'SOLO', 'LOVERS']),
    skillType: zod_1.z.enum(['INVESTIGATE', 'PROTECT', 'KILL', 'HEAL', 'POISON', 'INFECT', 'NONE']),
    skillUsesPerGame: zod_1.z.number().int().min(0).max(10),
    activeNights: zod_1.z.enum(['ALL', 'EVEN', 'ODD', 'FIRST_ONLY']),
    targetCondition: zod_1.z.enum(['ANY_ALIVE', 'OTHER_ALIVE', 'WOLF_ALIVE', 'NON_WOLF_ALIVE']),
    seenAsWolfBySeer: zod_1.z.boolean(),
});
