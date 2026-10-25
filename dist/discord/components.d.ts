import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js';
import { WerewolfGame } from '../engine/game';
import { NightResolutionResult, Player } from '../engine/types';
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
     * Nút tương tác tại kênh chính trong giai đoạn phát vai (xem vai & xác nhận)
     */
    static buildRoleDistributionControls(game: WerewolfGame): ActionRowBuilder<ButtonBuilder>[];
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
     * Menu chọn mục tiêu bảo vệ của Bác sĩ (Doctor - Werewolf Online)
     */
    static buildDoctorMenu(game: WerewolfGame, doctorPlayer: Player): ActionRowBuilder<StringSelectMenuBuilder>[];
    /**
     * Menu chọn 2 người để kiểm tra của Thám tử (Detective - Werewolf Online)
     */
    static buildDetectiveMenu(game: WerewolfGame, detectiveId: string): ActionRowBuilder<StringSelectMenuBuilder>[];
    /**
     * Menu soi chính xác vai trò của Sói tiên tri (Wolf Seer - Werewolf Online)
     */
    static buildWolfSeerMenu(game: WerewolfGame, wolfSeerId: string): ActionRowBuilder<StringSelectMenuBuilder>[];
    /**
     * Menu chọn nạn nhân hạ sát của Kẻ sát nhân (Serial Killer - Werewolf Online)
     */
    static buildSerialKillerMenu(game: WerewolfGame, skId: string): ActionRowBuilder<StringSelectMenuBuilder>[];
    /**
     * Menu nổ súng ban ngày của Xạ thủ (Gunner - Werewolf Online)
     */
    static buildGunnerMenu(game: WerewolfGame, gunnerPlayer: Player): ActionRowBuilder<StringSelectMenuBuilder>[];
    /**
     * Menu Sói trắng chọn cắn (Đêm chẵn >= 2): Có thể cắn Dân làng hoặc Sói khác (ngoại trừ bản thân)
     */
    static buildWhiteWolfMenu(game: WerewolfGame, whiteWolfId: string): ActionRowBuilder<StringSelectMenuBuilder>[];
    /**
     * Menu phế kỹ năng của Sói Cuồng Nộ (Berserk Wolf)
     */
    static buildBerserkDisableMenu(game: WerewolfGame, berserkId: string, availableDisables: number): ActionRowBuilder<StringSelectMenuBuilder>[];
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
     * Bộ nút điều khiển tại Kênh ban đêm (Thực hiện kỹ năng bí mật & xem vai)
     */
    static buildNightControls(game: WerewolfGame): ActionRowBuilder<ButtonBuilder>[];
    /**
     * Tạo nội dung phản hồi riêng tư (Ephemeral) khi người chơi bấm nút "Dùng kỹ năng đêm" tại kênh
     */
    static buildPlayerNightSkillResponse(game: WerewolfGame, player: Player): {
        content?: string;
        embeds?: EmbedBuilder[];
        components: (ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>)[];
    };
    /**
     * Bộ nút điều khiển tại Kênh thảo luận ban ngày (Xạ thủ nổ súng & xem kết quả soi)
     */
    static buildDiscussionControls(game: WerewolfGame): ActionRowBuilder<ButtonBuilder>[];
    /**
     * Bộ nút điều khiển tại Kênh bình minh (Bắn súng thợ săn & xem kết quả soi)
     */
    static buildDawnControls(game: WerewolfGame, result: NightResolutionResult): ActionRowBuilder<ButtonBuilder>[];
    /**
     * Bộ nút điều khiển sau khi chốt treo cổ (Thợ săn bị treo nổ súng trả thù)
     */
    static buildResolutionControls(game: WerewolfGame, result: {
        hunterTriggeredId: string | null;
    }): ActionRowBuilder<ButtonBuilder>[];
    /**
     * Nút xác nhận hủy trận đấu
     */
    static buildStopConfirmation(gameId: string, hostId: string): ActionRowBuilder<ButtonBuilder>;
}
