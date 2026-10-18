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
  | 'WITCH'         // Phù thủy
  | 'HUNTER'        // Thợ săn
  | 'IDIOT'         // Thằng ngốc
  | 'CUPID'         // Thần tình yêu
  | 'WEREWOLF'      // Sói thường
  | 'DEMON_WOLF'    // Sói quỷ
  | 'BERSERK_WOLF'  // Sói cuồng nộ
  | 'WHITE_WOLF'    // Sói trắng
  | 'TANNER'        // Kẻ chán đời
  | string;         // Cho phép custom role ID

export type ActionType =
  | 'CONFIRM_ROLE'
  | 'CUPID_LINK'
  | 'BODYGUARD_PROTECT'
  | 'SEER_INVESTIGATE'
  | 'WOLF_VOTE'
  | 'DEMON_WOLF_INFECT'
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
  lastProtectedTargetId: string | null;
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
  deathReason?: 'WOLF_BITE' | 'WITCH_POISON' | 'WHITE_WOLF' | 'HEARTBREAK' | 'HUNTER_SHOT' | 'LYNCH' | 'DISCONNECT';
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
    reason: 'WOLF_BITE' | 'WITCH_POISON' | 'WHITE_WOLF' | 'HEARTBREAK' | 'HUNTER_SHOT';
  }>;
  wolfVictimId: string | null;
  wasProtected: boolean;
  wasHealed: boolean;
  wasInfected: boolean;
  newWerewolfId: string | null;
  berserkTriggeredNextNight: boolean;
  hunterTriggeredId: string | null;
  investigationResults: Array<{
    seerId: string;
    targetId: string;
    isWolf: boolean;
  }>;
  logs: string[];
}

export interface GameWinResult {
  winner: Faction | 'DRAW' | 'NONE';
  winnerRoleId?: RoleId;
  winnerPlayerIds?: string[];
  reason: string;
}
