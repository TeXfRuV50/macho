import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ModalBuilder, StringSelectMenuBuilder } from 'discord.js';
import { GameConfig } from '../engine/types';
export declare class ConfigUi {
    /**
     * Tạo Embed tóm tắt cấu hình hiện tại
     */
    static buildConfigSummaryEmbed(config: GameConfig, playerCount: number): EmbedBuilder;
    /**
     * Bộ nút & menu điều khiển cấu hình
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
