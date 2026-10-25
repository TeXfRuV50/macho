import { EmbedBuilder } from 'discord.js';
import { WerewolfGame } from '../engine/game';
import { GameWinResult, NightResolutionResult, Player } from '../engine/types';
import { RoleInfo } from '../engine/roles';
export declare function formatPlayerName(player: Player, withMention?: boolean): string;
export declare function formatPlayerTag(player: Player): string;
export declare class WerewolfEmbeds {
    static buildLobbyEmbed(game: WerewolfGame): EmbedBuilder;
    static buildRoleDistributionEmbed(game: WerewolfGame): EmbedBuilder;
    static buildPrivateRoleEmbed(player: Player, roleInfo: RoleInfo, partnerPlayer?: Player): EmbedBuilder;
    static buildNightEmbed(game: WerewolfGame): EmbedBuilder;
    static buildDawnEmbed(game: WerewolfGame, result: NightResolutionResult): EmbedBuilder;
    static buildDiscussionEmbed(game: WerewolfGame): EmbedBuilder;
    static buildVotingEmbed(game: WerewolfGame): EmbedBuilder;
    static buildResolutionEmbed(game: WerewolfGame, result: {
        lynchedPlayer: Player | null;
        idiotSurvived: boolean;
        tannerWon: boolean;
        isTie: boolean;
        revoteTriggered: boolean;
        voteCounts: Record<string, number>;
    }): EmbedBuilder;
    static buildGameOverEmbed(game: WerewolfGame, winResult: GameWinResult): EmbedBuilder;
    static buildRolesCatalogEmbed(customRoles?: Record<string, RoleInfo>): EmbedBuilder;
    static buildStatusEmbed(game: WerewolfGame): EmbedBuilder;
    static buildHelpEmbed(): EmbedBuilder;
}
