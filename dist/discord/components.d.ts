import { ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder } from 'discord.js';
import { WerewolfGame } from '../engine/game';
import { Player } from '../engine/types';
export declare class WerewolfComponents {
    /**
     * Bộ nút điều khiển tại Sảnh chờ (Lobby)
     */
    static buildLobbyControls(game: WerewolfGame): ActionRowBuilder<ButtonBuilder>[];
    /**
     * Nút xác nhận đã nhận và hiểu vai trò bí mật
     */
    static buildRoleConfirmButton(gameId: string, userId: string): ActionRowBuilder<ButtonBuilder>;
    /**
     * Menu chọn mục tiêu soi của Tiên tri
     */
    static buildSeerMenu(game: WerewolfGame, seerId: string): ActionRowBuilder<StringSelectMenuBuilder>[];
    /**
     * Menu chọn mục tiêu bảo vệ của Bảo vệ
     */
    static buildBodyguardMenu(game: WerewolfGame, bgPlayer: Player): ActionRowBuilder<StringSelectMenuBuilder>[];
    /**
     * Menu chọn mục tiêu cắn của Bầy sói
     */
    static buildWolfBiteMenu(game: WerewolfGame, wolfId: string): ActionRowBuilder<StringSelectMenuBuilder>[];
    /**
     * Điều khiển của Phù thủy: Nút Cứu, Menu Độc, Nút Bỏ qua
     */
    static buildWitchControls(game: WerewolfGame, witchPlayer: Player, wolfVictimPlayer: Player | null): (ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>)[];
    /**
     * Menu Sói trắng chọn giết đồng loại (Đêm chẵn >= 2)
     */
    static buildWhiteWolfMenu(game: WerewolfGame, whiteWolfId: string): ActionRowBuilder<StringSelectMenuBuilder>[];
    /**
     * Menu Thần tình yêu ghép đôi (Đêm 1)
     */
    static buildCupidMenu(game: WerewolfGame, cupidId: string): ActionRowBuilder<StringSelectMenuBuilder>[];
    /**
     * Menu Biểu quyết treo cổ ban ngày
     */
    static buildVotingControls(game: WerewolfGame): (ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>)[];
    /**
     * Menu Thợ săn bắn trả thù
     */
    static buildHunterShotMenu(game: WerewolfGame, hunterId: string): ActionRowBuilder<StringSelectMenuBuilder>[];
    /**
     * Nút xác nhận hủy trận đấu
     */
    static buildStopConfirmation(gameId: string, hostId: string): ActionRowBuilder<ButtonBuilder>;
}
