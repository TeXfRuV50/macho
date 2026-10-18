import { Faction, RoleId } from './types';
export interface RoleInfo {
    id: RoleId;
    name: string;
    faction: Faction;
    description: string;
    skillDescription: string;
    winCondition: string;
    nightOrder: number;
    isImplemented: boolean;
    wakeEveryNight: boolean;
    wakeFirstNightOnly?: boolean;
}
export declare const STANDARD_ROLES: Record<string, RoleInfo>;
/**
 * Danh sách vai đã triển khai chính thức và có thể chọn trong game
 */
export declare const IMPLEMENTED_ROLE_IDS: string[];
export declare function getRoleInfo(roleId: RoleId, customRoles?: Record<string, RoleInfo>): RoleInfo;
