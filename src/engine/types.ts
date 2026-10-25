import { z } from 'zod';

export type GamePhase =
  | 'LOBBY'
  | 'ROLE_DISTRIBUTION'
  | 'NIGHT'
  | 'DAWN'
  | 'DISCUSSION'
  | 'VOTING'
  | 'RESOLUTION'
  | 'FINISHED'
  | 'PAUSED'
  | 'CANCELLED';

export type Faction = 'VILLAGE' | 'WEREWOLF' | 'SOLO' | 'LOVERS';

export type RoleId =
  | 'VILLAGER'      // Dân làng
  | 'SEER'          // Tiên tri
  | 'BODYGUARD'     // Bảo vệ
  | 'DOCTOR'        // Bác sĩ (Werewolf Online)
  | 'WITCH'         // Phù thủy
  | 'HUNTER'        // Thợ săn
  | 'GUNNER'        // Xạ thủ (Werewolf Online)
  | 'DETECTIVE'     // Thám tử (Werewolf Online)
  | 'IDIOT'         // Thằng ngốc
  | 'CUPID'         // Thần tình yêu
  | 'WEREWOLF'      // Sói thường
  | 'ALPHA_WOLF'     // Sói trùm
  | 'DEMON_WOLF'    // Sói quỷ
  | 'BERSERK_WOLF'  // Sói cuồng nộ
  | 'WOLF_SEER'     // Sói tiên tri (Werewolf Online)
  | 'WHITE_WOLF'    // Sói trắng
  | 'FOOL'          // Kẻ khờ (Werewolf Online)
  | 'TANNER'        // Kẻ chán đời (tương đương Fool)
  | 'SERIAL_KILLER' // Kẻ sát nhân (Werewolf Online)
  | string;         // Cho phép custom role ID

export type ActionType =
  | 'CONFIRM_ROLE'
  | 'CUPID_LINK'
  | 'BODYGUARD_PROTECT'
  | 'DOCTOR_PROTECT'
  | 'SEER_INVESTIGATE'
  | 'DETECTIVE_INVESTIGATE'
  | 'WOLF_SEER_INVESTIGATE'
  | 'SERIAL_KILLER_KILL'
  | 'GUNNER_SHOOT'
  | 'WOLF_VOTE'
  | 'DEMON_WOLF_INFECT'
  | 'DEMON_WOLF_KILL_MODE'
  | 'BERSERK_DISABLE'
  | 'WITCH_HEAL'
  | 'WITCH_POISON'
  | 'WITCH_PASS'
  | 'WHITE_WOLF_KILL'
  | 'HUNTER_SHOT'
  | 'DAY_VOTE'
  | 'DAY_VOTE_SKIP';

export interface PlayerSkills {
  witchHealRemaining: number;
  witchPoisonRemaining: number;
  demonWolfInfectRemaining: number;
  demonWolfMode?: 'INFECT' | 'KILL';
  berserkUsedDisables?: number;
  lastProtectedTargetId: string | null;
  doctorLastProtectedTargetId?: string | null;
  gunnerBulletsRemaining?: number;
  hasUsedHunterShot: boolean;
  idiotRevealed: boolean;
  customSkillCharges?: Record<string, number>;
}

export interface Player {
  id: string; // Discord user ID
  name: string; // Discord username / nickname
  roleId: RoleId;
  originalRoleId: RoleId;
  faction: Faction;
  isAlive: boolean;
  canVote: boolean;
  isBot?: boolean; // Đánh dấu người chơi là bot ảo (AI)
  deathReason?:
    | 'WOLF_BITE'
    | 'WITCH_POISON'
    | 'WHITE_WOLF'
    | 'HEARTBREAK'
    | 'HUNTER_SHOT'
    | 'SERIAL_KILLER'
    | 'GUNNER_SHOT'
    | 'LYNCH'
    | 'DISCONNECT';
  deathNight?: number;
  deathPhase?: GamePhase;
  loverId?: string | null;
  skills: PlayerSkills;
  hasConfirmedRole: boolean;
  joinedAt: number;
}

export interface GameConfig {
  roles: Record<string, number>; // RoleId -> count
  timers: {
    roleConfirmSec: number;
    nightSec: number;
    dawnSec: number;
    discussionSec: number;
    votingSec: number;
    hunterShotSec: number;
  };
  rules: {
    witchCanSelfHealFirstNightOnly: boolean;
    witchCanSelfHealAlways: boolean;
    bodyguardCanProtectSelf: boolean;
    hunterCanShootIfPoisoned: boolean;
    revealRoleOnDeath: boolean;
    tieVoteAction: 'SKIP' | 'REVOTE_ONCE';
    wolfTieAction: 'NO_KILL' | 'RANDOM';
    allowLoversWin: boolean;
  };
}

export interface CustomRoleDefinition {
  id: string;
  name: string;
  description: string;
  faction: Faction;
  skillType: 'INVESTIGATE' | 'PROTECT' | 'KILL' | 'HEAL' | 'POISON' | 'INFECT' | 'NONE';
  skillUsesPerGame: number; // 0 = unlimited
  activeNights: 'ALL' | 'EVEN' | 'ODD' | 'FIRST_ONLY';
  targetCondition: 'ANY_ALIVE' | 'OTHER_ALIVE' | 'WOLF_ALIVE' | 'NON_WOLF_ALIVE';
  seenAsWolfBySeer: boolean;
}

export const CustomRoleSchema = z.object({
  id: z.string().min(2).max(32).regex(/^[A-Z0-9_]+$/, 'ID chỉ gồm chữ hoa, số và dấu gạch dưới'),
  name: z.string().min(2).max(32),
  description: z.string().min(5).max(200),
  faction: z.enum(['VILLAGE', 'WEREWOLF', 'SOLO', 'LOVERS']),
  skillType: z.enum(['INVESTIGATE', 'PROTECT', 'KILL', 'HEAL', 'POISON', 'INFECT', 'NONE']),
  skillUsesPerGame: z.number().int().min(0).max(10),
  activeNights: z.enum(['ALL', 'EVEN', 'ODD', 'FIRST_ONLY']),
  targetCondition: z.enum(['ANY_ALIVE', 'OTHER_ALIVE', 'WOLF_ALIVE', 'NON_WOLF_ALIVE']),
  seenAsWolfBySeer: z.boolean(),
});

export interface PlayerAction {
  id: string;
  userId: string;
  roleId: RoleId;
  type: ActionType;
  targetId?: string;
  secondaryTargetId?: string;
  nightNumber: number;
  phase: GamePhase;
  timestamp: number;
}

export interface NightResolutionResult {
  deaths: Array<{
    player: Player;
    reason: 'WOLF_BITE' | 'WITCH_POISON' | 'WHITE_WOLF' | 'HEARTBREAK' | 'HUNTER_SHOT' | 'SERIAL_KILLER';
  }>;
  wolfVictimId: string | null;
  wolfVictimId2?: string | null;
  wolfVictimIds?: string[];
  wasProtected: boolean;
  wasHealed: boolean;
  wasInfected: boolean;
  newWerewolfId: string | null;
  berserkTriggeredNextNight: boolean;
  silencedUserId?: string | null;
  hunterTriggeredId: string | null;
  serialKillerVictimId: string | null;
  wasSerialKillerImmune?: boolean;
  investigationResults: Array<{
    seerId: string;
    targetId: string;
    isWolf: boolean;
    isSilenced?: boolean;
  }>;
  detectiveResults?: Array<{
    detectiveId: string;
    target1Id: string;
    target2Id: string;
    isSameTeam: boolean;
    isSilenced?: boolean;
  }>;
  wolfSeerResults?: Array<{
    wolfSeerId: string;
    targetId: string;
    targetRoleId: RoleId;
    targetRoleName: string;
  }>;
  logs: string[];
}

export interface GameWinResult {
  winner: Faction | 'DRAW' | 'NONE';
  winnerRoleId?: RoleId;
  winnerPlayerIds?: string[];
  reason: string;
}
