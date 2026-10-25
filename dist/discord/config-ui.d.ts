import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ModalBuilder, StringSelectMenuBuilder } from 'discord.js';
import { GameConfig, RoleId } from '../engine/types';
import { RoleInfo } from '../engine/roles';
export declare const ROLE_EMOJIS: Record<string, string>;
export declare const ORDERED_CONFIG_ROLES: RoleId[];
export declare class ConfigUi {
    /**
     * Tạo Embed hiển thị danh sách vai trò dạng bảng với các thông tin số lượng
     */
    static buildRoleTableEmbed(config: GameConfig, customRoles?: Record<string, RoleInfo>, playerCount?: number, page?: number): EmbedBuilder;
    /**
     * Bộ nút điều chỉnh số lượng vai trò dạng bảng: mỗi hàng có nút [ - ] [ Tên: Số lượng ] [ + ]
     */
    static buildRoleTableControls(gameId: string, hostId: string, config: GameConfig, customRoles?: Record<string, RoleInfo>, page?: number): ActionRowBuilder<ButtonBuilder>[];
    /**
     * Tạo Embed tóm tắt cấu hình hiện tại
     */
    static buildConfigSummaryEmbed(config: GameConfig, playerCount: number): EmbedBuilder;
    /**
     * Bộ nút & menu điều khiển cấu hình tổng quát
     */
    static buildConfigControls(gameId: string, hostId: string): (ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>)[];
    /**
     * Modal chỉnh sửa thời gian
     */
    static buildTimerModal(gameId: string): ModalBuilder;
    /**
     * Modal tạo vai mới an toàn (Schema-backed)
     */
    static buildCustomRoleModal(gameId: string): ModalBuilder;
}
