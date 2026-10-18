export interface ParsedCustomId {
  prefix: 'ww';
  gameId: string;
  phase: string;
  action: string;
  targetUserId: string; // 'all' | 'host' | specific userId
  extra?: string;
}

export function buildCustomId(
  gameId: string,
  phase: string,
  action: string,
  targetUserId: string = 'all',
  extra?: string
): string {
  const parts = ['ww', gameId, phase, action, targetUserId];
  if (extra) parts.push(extra);
  return parts.join(':');
}

export function parseCustomId(customId: string): ParsedCustomId | null {
  const parts = customId.split(':');
  if (parts.length < 5 || parts[0] !== 'ww') {
    return null;
  }
  return {
    prefix: 'ww',
    gameId: parts[1],
    phase: parts[2],
    action: parts[3],
    targetUserId: parts[4],
    extra: parts.slice(5).join(':') || undefined,
  };
}

/**
 * Phân trang danh sách người chơi nếu vượt quá giới hạn 25 của Discord Select Menu
 */
export function paginateOptions<T>(items: T[], pageSize: number = 25): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += pageSize) {
    pages.push(items.slice(i, i + pageSize));
  }
  return pages;
}
