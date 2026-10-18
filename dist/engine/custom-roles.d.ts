import { CustomRoleDefinition } from './types';
import { RoleInfo } from './roles';
export declare class CustomRoleRegistry {
    private customRoles;
    /**
     * Đăng ký một vai mới với schema validation nghiêm ngặt.
     * Tuyệt đối không dùng eval hoặc thực thi mã động do người dùng nhập.
     */
    registerRole(def: unknown): {
        success: boolean;
        role?: CustomRoleDefinition;
        error?: string;
    };
    getRole(id: string): CustomRoleDefinition | undefined;
    getAllRoles(): CustomRoleDefinition[];
    toRoleInfo(def: CustomRoleDefinition): RoleInfo;
}
