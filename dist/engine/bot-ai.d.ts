import { WerewolfGame } from './game';
import { Player } from './types';
export interface BotChatMessage {
    botId: string;
    botName: string;
    text: string;
    delaySec: number;
}
export declare class WerewolfBotAi {
    /**
     * Tự động thực hiện các hành động ban đêm cho tất cả Bot còn sống
     */
    static performNightActions(game: WerewolfGame): {
        actionsSubmitted: number;
        logs: string[];
    };
    /**
     * Tự động thực hiện bỏ phiếu treo cổ ban ngày cho tất cả Bot còn sống
     */
    static performDayVotes(game: WerewolfGame): {
        votesSubmitted: number;
    };
    /**
     * Tạo tin nhắn thảo luận sinh động cho các Bot trong pha thảo luận ban ngày (DISCUSSION)
     * - Tiên tri nếu soi ra Sói sẽ tố cáo mạnh mẽ, nếu soi ra Dân sẽ bảo vệ.
     * - Sói sẽ giả làm Dân làng chân chính, nghi ngờ người khác hoặc đóng vai dân vô tội ngủ say.
     * - Kẻ chán đời sẽ khiêu khích để được treo cổ.
     * - Thợ săn cảnh cáo bầy sói không được chạm vào mình.
     */
    static generateDiscussionChat(game: WerewolfGame): BotChatMessage[];
    /**
     * Tạo lời bình luận của Bot khi tiến hành biểu quyết treo cổ (VOTING).
     * Giữ bí mật tuyệt đối lá phiếu của bot, KHÔNG làm lộ danh tính người bị vote.
     */
    static generateVotingComments(game: WerewolfGame): Array<{
        botId: string;
        botName: string;
        text: string;
    }>;
    /**
     * Bot Thợ săn tự động nổ súng trả thù khi tử trận
     */
    static performHunterShot(game: WerewolfGame, hunterId: string): Player | null;
}
