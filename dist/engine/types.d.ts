import { z } from 'zod';
export type GamePhase = 'LOBBY' | 'ROLE_DISTRIBUTION' | 'NIGHT' | 'DAWN' | 'DISCUSSION' | 'VOTING' | 'RESOLUTION' | 'FINISHED' | 'PAUSED' | 'CANCELLED';
export type Faction = 'VILLAGE' | 'WEREWOLF' | 'SOLO' | 'LOVERS';
export type RoleId = 'VILLAGER' | 'SEER' | 'BODYGUARD' | 'WITCH' | 'HUNTER' | 'IDIOT' | 'CUPID' | 'WEREWOLF' | 'DEMON_WOLF' | 'BERSERK_WOLF' | 'WHITE_WOLF' | 'TANNER' | string;
export type ActionType = 'CONFIRM_ROLE' | 'CUPID_LINK' | 'BODYGUARD_PROTECT' | 'SEER_INVESTIGATE' | 'WOLF_VOTE' | 'DEMON_WOLF_INFECT' | 'WITCH_HEAL' | 'WITCH_POISON' | 'WITCH_PASS' | 'WHITE_WOLF_KILL' | 'HUNTER_SHOT' | 'DAY_VOTE' | 'DAY_VOTE_SKIP';
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
    id: string;
    name: string;
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
    roles: Record<string, number>;
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
    skillUsesPerGame: number;
    activeNights: 'ALL' | 'EVEN' | 'ODD' | 'FIRST_ONLY';
    targetCondition: 'ANY_ALIVE' | 'OTHER_ALIVE' | 'WOLF_ALIVE' | 'NON_WOLF_ALIVE';
    seenAsWolfBySeer: boolean;
}
export declare const CustomRoleSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    faction: z.ZodEnum<["VILLAGE", "WEREWOLF", "SOLO", "LOVERS"]>;
    skillType: z.ZodEnum<["INVESTIGATE", "PROTECT", "KILL", "HEAL", "POISON", "INFECT", "NONE"]>;
    skillUsesPerGame: z.ZodNumber;
    activeNights: z.ZodEnum<["ALL", "EVEN", "ODD", "FIRST_ONLY"]>;
    targetCondition: z.ZodEnum<["ANY_ALIVE", "OTHER_ALIVE", "WOLF_ALIVE", "NON_WOLF_ALIVE"]>;
    seenAsWolfBySeer: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    id: string;
    faction: "VILLAGE" | "WEREWOLF" | "SOLO" | "LOVERS";
    skillType: "INVESTIGATE" | "PROTECT" | "KILL" | "HEAL" | "POISON" | "INFECT" | "NONE";
    skillUsesPerGame: number;
    activeNights: "ALL" | "EVEN" | "ODD" | "FIRST_ONLY";
    targetCondition: "ANY_ALIVE" | "OTHER_ALIVE" | "WOLF_ALIVE" | "NON_WOLF_ALIVE";
    seenAsWolfBySeer: boolean;
}, {
    name: string;
    description: string;
    id: string;
    faction: "VILLAGE" | "WEREWOLF" | "SOLO" | "LOVERS";
    skillType: "INVESTIGATE" | "PROTECT" | "KILL" | "HEAL" | "POISON" | "INFECT" | "NONE";
    skillUsesPerGame: number;
    activeNights: "ALL" | "EVEN" | "ODD" | "FIRST_ONLY";
    targetCondition: "ANY_ALIVE" | "OTHER_ALIVE" | "WOLF_ALIVE" | "NON_WOLF_ALIVE";
    seenAsWolfBySeer: boolean;
}>;
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
