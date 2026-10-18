import { describe, it, expect } from 'vitest';
import { NightResolver } from '../../src/engine/night-resolver';
import { DEFAULT_CONFIG } from '../../src/engine/presets';
import { GameConfig, Player, PlayerAction } from '../../src/engine/types';

function createMockPlayer(id: string, name: string, roleId: any, faction: any): Player {
  return {
    id,
    name,
    roleId,
    originalRoleId: roleId,
    faction,
    isAlive: true,
    canVote: true,
    skills: {
      witchHealRemaining: roleId === 'WITCH' ? 1 : 0,
      witchPoisonRemaining: roleId === 'WITCH' ? 1 : 0,
      demonWolfInfectRemaining: roleId === 'DEMON_WOLF' ? 1 : 0,
      lastProtectedTargetId: null,
      hasUsedHunterShot: false,
      idiotRevealed: false,
    },
    hasConfirmedRole: true,
    joinedAt: Date.now(),
  };
}

describe('NightResolver - Kỹ năng ban đêm & Thứ tự giải quyết', () => {
  const config: GameConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

  it('Bảo vệ che chở thành công nạn nhân của Sói', () => {
    const players = new Map<string, Player>();
    players.set('wolf1', createMockPlayer('wolf1', 'Sói', 'WEREWOLF', 'WEREWOLF'));
    players.set('bg1', createMockPlayer('bg1', 'Bảo vệ', 'BODYGUARD', 'VILLAGE'));
    players.set('v1', createMockPlayer('v1', 'Dân', 'VILLAGER', 'VILLAGE'));

    const actions: PlayerAction[] = [
      {
        id: 'a1',
        userId: 'wolf1',
        roleId: 'WEREWOLF',
        type: 'WOLF_VOTE',
        targetId: 'v1',
        nightNumber: 1,
        phase: 'NIGHT',
        timestamp: Date.now(),
      },
      {
        id: 'a2',
        userId: 'bg1',
        roleId: 'BODYGUARD',
        type: 'BODYGUARD_PROTECT',
        targetId: 'v1',
        nightNumber: 1,
        phase: 'NIGHT',
        timestamp: Date.now(),
      },
    ];

    const { result, updatedPlayers } = NightResolver.resolveNight(1, players, actions, config, false);

    expect(result.wasProtected).toBe(true);
    expect(result.deaths).toHaveLength(0);
    expect(updatedPlayers.get('v1')?.isAlive).toBe(true);
  });

  it('Bảo vệ không được bảo vệ cùng 1 người 2 đêm liên tiếp', () => {
    const players = new Map<string, Player>();
    const bg = createMockPlayer('bg1', 'Bảo vệ', 'BODYGUARD', 'VILLAGE');
    bg.skills.lastProtectedTargetId = 'v1'; // Đêm trước đã bảo vệ v1
    players.set('bg1', bg);
    players.set('wolf1', createMockPlayer('wolf1', 'Sói', 'WEREWOLF', 'WEREWOLF'));
    players.set('v1', createMockPlayer('v1', 'Dân', 'VILLAGER', 'VILLAGE'));

    const actions: PlayerAction[] = [
      {
        id: 'a1',
        userId: 'wolf1',
        roleId: 'WEREWOLF',
        type: 'WOLF_VOTE',
        targetId: 'v1',
        nightNumber: 2,
        phase: 'NIGHT',
        timestamp: Date.now(),
      },
      {
        id: 'a2',
        userId: 'bg1',
        roleId: 'BODYGUARD',
        type: 'BODYGUARD_PROTECT',
        targetId: 'v1', // Cố bảo vệ tiếp
        nightNumber: 2,
        phase: 'NIGHT',
        timestamp: Date.now(),
      },
    ];

    const { result, updatedPlayers } = NightResolver.resolveNight(2, players, actions, config, false);

    expect(result.wasProtected).toBe(false);
    expect(result.deaths).toHaveLength(1);
    expect(updatedPlayers.get('v1')?.isAlive).toBe(false);
  });

  it('Phù thủy cứu nạn nhân và dùng bình cứu đúng quy định', () => {
    const players = new Map<string, Player>();
    players.set('wolf1', createMockPlayer('wolf1', 'Sói', 'WEREWOLF', 'WEREWOLF'));
    players.set('witch', createMockPlayer('witch', 'Phù thủy', 'WITCH', 'VILLAGE'));
    players.set('v1', createMockPlayer('v1', 'Dân', 'VILLAGER', 'VILLAGE'));

    const actions: PlayerAction[] = [
      {
        id: 'a1',
        userId: 'wolf1',
        roleId: 'WEREWOLF',
        type: 'WOLF_VOTE',
        targetId: 'v1',
        nightNumber: 1,
        phase: 'NIGHT',
        timestamp: Date.now(),
      },
      {
        id: 'a2',
        userId: 'witch',
        roleId: 'WITCH',
        type: 'WITCH_HEAL',
        nightNumber: 1,
        phase: 'NIGHT',
        timestamp: Date.now(),
      },
    ];

    const { result, updatedPlayers } = NightResolver.resolveNight(1, players, actions, config, false);

    expect(result.wasHealed).toBe(true);
    expect(result.deaths).toHaveLength(0);
    expect(updatedPlayers.get('v1')?.isAlive).toBe(true);
    expect(updatedPlayers.get('witch')?.skills.witchHealRemaining).toBe(0);
  });

  it('Phù thủy hạ độc giết chết mục tiêu', () => {
    const players = new Map<string, Player>();
    players.set('witch', createMockPlayer('witch', 'Phù thủy', 'WITCH', 'VILLAGE'));
    players.set('v1', createMockPlayer('v1', 'Dân', 'VILLAGER', 'VILLAGE'));

    const actions: PlayerAction[] = [
      {
        id: 'a1',
        userId: 'witch',
        roleId: 'WITCH',
        type: 'WITCH_POISON',
        targetId: 'v1',
        nightNumber: 1,
        phase: 'NIGHT',
        timestamp: Date.now(),
      },
    ];

    const { result, updatedPlayers } = NightResolver.resolveNight(1, players, actions, config, false);

    expect(result.deaths).toHaveLength(1);
    expect(result.deaths[0].player.id).toBe('v1');
    expect(result.deaths[0].reason).toBe('WITCH_POISON');
    expect(updatedPlayers.get('v1')?.isAlive).toBe(false);
    expect(updatedPlayers.get('witch')?.skills.witchPoisonRemaining).toBe(0);
  });

  it('Phù thủy không được dùng cả 2 bình trong cùng 1 đêm', () => {
    const players = new Map<string, Player>();
    players.set('wolf1', createMockPlayer('wolf1', 'Sói', 'WEREWOLF', 'WEREWOLF'));
    players.set('witch', createMockPlayer('witch', 'Phù thủy', 'WITCH', 'VILLAGE'));
    players.set('v1', createMockPlayer('v1', 'Dân 1', 'VILLAGER', 'VILLAGE'));
    players.set('v2', createMockPlayer('v2', 'Dân 2', 'VILLAGER', 'VILLAGE'));

    const actions: PlayerAction[] = [
      {
        id: 'a1',
        userId: 'wolf1',
        roleId: 'WEREWOLF',
        type: 'WOLF_VOTE',
        targetId: 'v1',
        nightNumber: 1,
        phase: 'NIGHT',
        timestamp: Date.now(),
      },
      {
        id: 'a2',
        userId: 'witch',
        roleId: 'WITCH',
        type: 'WITCH_HEAL',
        nightNumber: 1,
        phase: 'NIGHT',
        timestamp: Date.now(),
      },
      {
        id: 'a3',
        userId: 'witch',
        roleId: 'WITCH',
        type: 'WITCH_POISON',
        targetId: 'v2',
        nightNumber: 1,
        phase: 'NIGHT',
        timestamp: Date.now(),
      },
    ];

    const { result, updatedPlayers } = NightResolver.resolveNight(1, players, actions, config, false);

    expect(result.wasHealed).toBe(true);
    expect(updatedPlayers.get('v1')?.isAlive).toBe(true);
    // Bình độc bị từ chối
    expect(updatedPlayers.get('v2')?.isAlive).toBe(true);
    expect(updatedPlayers.get('witch')?.skills.witchPoisonRemaining).toBe(1);
  });

  it('Tiên tri soi Sói thường và Sói trắng đều ra kết quả là Sói', () => {
    const players = new Map<string, Player>();
    players.set('seer', createMockPlayer('seer', 'Tiên tri', 'SEER', 'VILLAGE'));
    players.set('wolf', createMockPlayer('wolf', 'Sói thường', 'WEREWOLF', 'WEREWOLF'));
    players.set('whiteWolf', createMockPlayer('whiteWolf', 'Sói trắng', 'WHITE_WOLF', 'WEREWOLF'));
    players.set('v1', createMockPlayer('v1', 'Dân làng', 'VILLAGER', 'VILLAGE'));

    const actions: PlayerAction[] = [
      {
        id: 'a1',
        userId: 'seer',
        roleId: 'SEER',
        type: 'SEER_INVESTIGATE',
        targetId: 'wolf',
        nightNumber: 1,
        phase: 'NIGHT',
        timestamp: Date.now(),
      },
    ];

    const res1 = NightResolver.resolveNight(1, players, actions, config, false);
    expect(res1.result.investigationResults[0].isWolf).toBe(true);

    const actions2: PlayerAction[] = [
      {
        id: 'a2',
        userId: 'seer',
        roleId: 'SEER',
        type: 'SEER_INVESTIGATE',
        targetId: 'whiteWolf',
        nightNumber: 1,
        phase: 'NIGHT',
        timestamp: Date.now(),
      },
    ];
    const res2 = NightResolver.resolveNight(1, players, actions2, config, false);
    expect(res2.result.investigationResults[0].isWolf).toBe(true);

    const actions3: PlayerAction[] = [
      {
        id: 'a3',
        userId: 'seer',
        roleId: 'SEER',
        type: 'SEER_INVESTIGATE',
        targetId: 'v1',
        nightNumber: 1,
        phase: 'NIGHT',
        timestamp: Date.now(),
      },
    ];
    const res3 = NightResolver.resolveNight(1, players, actions3, config, false);
    expect(res3.result.investigationResults[0].isWolf).toBe(false);
  });

  it('Sói quỷ chuyển hóa thành công mục tiêu bị cắn thành Sói', () => {
    const players = new Map<string, Player>();
    players.set('demon', createMockPlayer('demon', 'Sói quỷ', 'DEMON_WOLF', 'WEREWOLF'));
    players.set('v1', createMockPlayer('v1', 'Dân', 'VILLAGER', 'VILLAGE'));

    const actions: PlayerAction[] = [
      {
        id: 'a1',
        userId: 'demon',
        roleId: 'DEMON_WOLF',
        type: 'WOLF_VOTE',
        targetId: 'v1',
        nightNumber: 1,
        phase: 'NIGHT',
        timestamp: Date.now(),
      },
      {
        id: 'a2',
        userId: 'demon',
        roleId: 'DEMON_WOLF',
        type: 'DEMON_WOLF_INFECT',
        targetId: 'v1',
        nightNumber: 1,
        phase: 'NIGHT',
        timestamp: Date.now(),
      },
    ];

    const { result, updatedPlayers } = NightResolver.resolveNight(1, players, actions, config, false);

    expect(result.wasInfected).toBe(true);
    expect(result.deaths).toHaveLength(0);
    const converted = updatedPlayers.get('v1')!;
    expect(converted.isAlive).toBe(true);
    expect(converted.faction).toBe('WEREWOLF');
    expect(converted.roleId).toBe('WEREWOLF');
    expect(updatedPlayers.get('demon')?.skills.demonWolfInfectRemaining).toBe(0);
  });

  it('Sói quỷ chuyển hóa thất bại nếu mục tiêu được bảo vệ, không tiêu hao lượt', () => {
    const players = new Map<string, Player>();
    players.set('demon', createMockPlayer('demon', 'Sói quỷ', 'DEMON_WOLF', 'WEREWOLF'));
    players.set('bg', createMockPlayer('bg', 'Bảo vệ', 'BODYGUARD', 'VILLAGE'));
    players.set('v1', createMockPlayer('v1', 'Dân', 'VILLAGER', 'VILLAGE'));

    const actions: PlayerAction[] = [
      {
        id: 'a1',
        userId: 'demon',
        roleId: 'DEMON_WOLF',
        type: 'WOLF_VOTE',
        targetId: 'v1',
        nightNumber: 1,
        phase: 'NIGHT',
        timestamp: Date.now(),
      },
      {
        id: 'a2',
        userId: 'demon',
        roleId: 'DEMON_WOLF',
        type: 'DEMON_WOLF_INFECT',
        targetId: 'v1',
        nightNumber: 1,
        phase: 'NIGHT',
        timestamp: Date.now(),
      },
      {
        id: 'a3',
        userId: 'bg',
        roleId: 'BODYGUARD',
        type: 'BODYGUARD_PROTECT',
        targetId: 'v1',
        nightNumber: 1,
        phase: 'NIGHT',
        timestamp: Date.now(),
      },
    ];

    const { result, updatedPlayers } = NightResolver.resolveNight(1, players, actions, config, false);

    expect(result.wasInfected).toBe(false);
    expect(result.wasProtected).toBe(true);
    expect(updatedPlayers.get('v1')?.faction).toBe('VILLAGE');
    // Không bị trừ lượt
    expect(updatedPlayers.get('demon')?.skills.demonWolfInfectRemaining).toBe(1);
  });

  it('Hiệu ứng Sói cuồng nộ xuyên thủng khiên bảo vệ', () => {
    const players = new Map<string, Player>();
    players.set('wolf', createMockPlayer('wolf', 'Sói', 'WEREWOLF', 'WEREWOLF'));
    players.set('bg', createMockPlayer('bg', 'Bảo vệ', 'BODYGUARD', 'VILLAGE'));
    players.set('v1', createMockPlayer('v1', 'Dân', 'VILLAGER', 'VILLAGE'));

    const actions: PlayerAction[] = [
      {
        id: 'a1',
        userId: 'wolf',
        roleId: 'WEREWOLF',
        type: 'WOLF_VOTE',
        targetId: 'v1',
        nightNumber: 2,
        phase: 'NIGHT',
        timestamp: Date.now(),
      },
      {
        id: 'a2',
        userId: 'bg',
        roleId: 'BODYGUARD',
        type: 'BODYGUARD_PROTECT',
        targetId: 'v1',
        nightNumber: 2,
        phase: 'NIGHT',
        timestamp: Date.now(),
      },
    ];

    // activeBerserkPierce = true
    const { result, updatedPlayers } = NightResolver.resolveNight(2, players, actions, config, true);

    expect(result.deaths).toHaveLength(1);
    expect(result.deaths[0].player.id).toBe('v1');
    expect(updatedPlayers.get('v1')?.isAlive).toBe(false);
  });

  it('Sói trắng giết đồng loại ở đêm chẵn >= 2', () => {
    const players = new Map<string, Player>();
    players.set('ww', createMockPlayer('ww', 'Sói trắng', 'WHITE_WOLF', 'WEREWOLF'));
    players.set('w1', createMockPlayer('w1', 'Sói thường', 'WEREWOLF', 'WEREWOLF'));

    const actions: PlayerAction[] = [
      {
        id: 'a1',
        userId: 'ww',
        roleId: 'WHITE_WOLF',
        type: 'WHITE_WOLF_KILL',
        targetId: 'w1',
        nightNumber: 2,
        phase: 'NIGHT',
        timestamp: Date.now(),
      },
    ];

    const { result, updatedPlayers } = NightResolver.resolveNight(2, players, actions, config, false);

    expect(result.deaths).toHaveLength(1);
    expect(result.deaths[0].player.id).toBe('w1');
    expect(result.deaths[0].reason).toBe('WHITE_WOLF');
    expect(updatedPlayers.get('w1')?.isAlive).toBe(false);
  });
});
