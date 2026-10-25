"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseManager = void 0;
const node_sqlite_1 = require("node:sqlite");
const game_1 = require("../engine/game");
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
class DatabaseManager {
    db;
    constructor(dbPath = './werewolf.db') {
        const dir = node_path_1.default.dirname(node_path_1.default.resolve(dbPath));
        if (!node_fs_1.default.existsSync(dir)) {
            node_fs_1.default.mkdirSync(dir, { recursive: true });
        }
        this.db = new node_sqlite_1.DatabaseSync(dbPath);
        this.initTables();
    }
    initTables() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        host_id TEXT NOT NULL,
        phase TEXT NOT NULL,
        day_number INTEGER NOT NULL DEFAULT 0,
        night_number INTEGER NOT NULL DEFAULT 0,
        phase_deadline INTEGER NOT NULL DEFAULT 0,
        config_json TEXT NOT NULL,
        state_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS players (
        game_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        role_id TEXT NOT NULL,
        original_role_id TEXT NOT NULL,
        faction TEXT NOT NULL,
        is_alive INTEGER NOT NULL DEFAULT 1,
        can_vote INTEGER NOT NULL DEFAULT 1,
        death_reason TEXT,
        death_night INTEGER,
        death_phase TEXT,
        lover_id TEXT,
        skills_json TEXT NOT NULL,
        has_confirmed_role INTEGER NOT NULL DEFAULT 0,
        joined_at INTEGER NOT NULL,
        is_bot INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (game_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS actions (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        target_id TEXT,
        secondary_target_id TEXT,
        night_number INTEGER NOT NULL,
        phase TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS presets (
        id TEXT PRIMARY KEY,
        guild_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        config_json TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS game_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT NOT NULL,
        log_entry TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_games_channel ON games (channel_id, phase);
      CREATE INDEX IF NOT EXISTS idx_actions_game ON actions (game_id);
      CREATE INDEX IF NOT EXISTS idx_presets_guild ON presets (guild_id);
    `);
        try {
            this.db.exec(`ALTER TABLE players ADD COLUMN is_bot INTEGER NOT NULL DEFAULT 0;`);
        }
        catch {
            // Đã có cột is_bot từ trước
        }
    }
    /**
     * Lưu hoặc cập nhật thông tin game và players vào SQLite
     */
    saveGame(game) {
        const now = Date.now();
        const stateJson = JSON.stringify({
            activeBerserkPierce: game.activeBerserkPierce,
            nextNightBerserkPierce: game.nextNightBerserkPierce,
            pendingHunterId: game.pendingHunterId,
            hasRevotedToday: game.hasRevotedToday,
            customRoles: game.customRoles,
            lastDawnResult: game.lastDawnResult,
            lastLynchResult: game.lastLynchResult,
        });
        const configJson = JSON.stringify(game.config);
        // Lưu game
        const upsertGame = this.db.prepare(`
      INSERT INTO games (id, guild_id, channel_id, host_id, phase, day_number, night_number, phase_deadline, config_json, state_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        phase = excluded.phase,
        day_number = excluded.day_number,
        night_number = excluded.night_number,
        phase_deadline = excluded.phase_deadline,
        config_json = excluded.config_json,
        state_json = excluded.state_json,
        updated_at = excluded.updated_at
    `);
        upsertGame.run(game.id, game.guildId, game.channelId, game.hostId, game.phase, game.dayNumber, game.nightNumber, game.phaseDeadline, configJson, stateJson, now, now);
        // Lưu players
        const upsertPlayer = this.db.prepare(`
      INSERT INTO players (game_id, user_id, name, role_id, original_role_id, faction, is_alive, can_vote, death_reason, death_night, death_phase, lover_id, skills_json, has_confirmed_role, joined_at, is_bot)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(game_id, user_id) DO UPDATE SET
        name = excluded.name,
        role_id = excluded.role_id,
        original_role_id = excluded.original_role_id,
        faction = excluded.faction,
        is_alive = excluded.is_alive,
        can_vote = excluded.can_vote,
        death_reason = excluded.death_reason,
        death_night = excluded.death_night,
        death_phase = excluded.death_phase,
        lover_id = excluded.lover_id,
        skills_json = excluded.skills_json,
        has_confirmed_role = excluded.has_confirmed_role,
        is_bot = excluded.is_bot
    `);
        for (const p of game.players.values()) {
            upsertPlayer.run(game.id, p.id, p.name, p.roleId, p.originalRoleId, p.faction, p.isAlive ? 1 : 0, p.canVote ? 1 : 0, p.deathReason || null, p.deathNight || null, p.deathPhase || null, p.loverId || null, JSON.stringify(p.skills), p.hasConfirmedRole ? 1 : 0, p.joinedAt, p.isBot ? 1 : 0);
        }
    }
    /**
     * Lưu hành động người chơi
     */
    recordAction(action, gameId) {
        const insertAction = this.db.prepare(`
      INSERT INTO actions (id, game_id, user_id, role_id, action_type, target_id, secondary_target_id, night_number, phase, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `);
        insertAction.run(action.id, gameId, action.userId, action.roleId, action.type, action.targetId || null, action.secondaryTargetId || null, action.nightNumber, action.phase, action.timestamp);
    }
    /**
     * Lấy game theo ID
     */
    getGame(gameId) {
        const selectGame = this.db.prepare('SELECT * FROM games WHERE id = ?');
        const row = selectGame.get(gameId);
        if (!row)
            return null;
        return this.hydrateGame(row);
    }
    /**
     * Lấy game đang hoạt động tại kênh
     */
    getActiveGameByChannel(channelId) {
        const select = this.db.prepare(`
      SELECT * FROM games 
      WHERE channel_id = ? AND phase NOT IN ('FINISHED', 'CANCELLED')
      LIMIT 1
    `);
        const row = select.get(channelId);
        if (!row)
            return null;
        return this.hydrateGame(row);
    }
    /**
     * Lấy toàn bộ game đang hoạt động để phục hồi khi reboot bot
     */
    getAllActiveGames() {
        const select = this.db.prepare(`
      SELECT * FROM games 
      WHERE phase NOT IN ('FINISHED', 'CANCELLED')
    `);
        const rows = select.all();
        return rows.map((r) => this.hydrateGame(r));
    }
    hydrateGame(row) {
        const config = JSON.parse(row.config_json);
        const state = JSON.parse(row.state_json);
        const game = new game_1.WerewolfGame(row.id, row.guild_id, row.channel_id, row.host_id, config);
        game.phase = row.phase;
        game.dayNumber = row.day_number;
        game.nightNumber = row.night_number;
        game.phaseDeadline = row.phase_deadline;
        game.activeBerserkPierce = state.activeBerserkPierce || false;
        game.nextNightBerserkPierce = state.nextNightBerserkPierce || false;
        game.pendingHunterId = state.pendingHunterId || null;
        game.hasRevotedToday = state.hasRevotedToday || false;
        game.customRoles = state.customRoles || {};
        game.lastDawnResult = state.lastDawnResult || null;
        game.lastLynchResult = state.lastLynchResult || null;
        // Phục hồi players
        const selectPlayers = this.db.prepare('SELECT * FROM players WHERE game_id = ?');
        const playerRows = selectPlayers.all(game.id);
        for (const pr of playerRows) {
            const player = {
                id: pr.user_id,
                name: pr.name,
                roleId: pr.role_id,
                originalRoleId: pr.original_role_id,
                faction: pr.faction,
                isAlive: pr.is_alive === 1,
                canVote: pr.can_vote === 1,
                isBot: pr.is_bot === 1 || pr.user_id.startsWith('bot_'),
                deathReason: pr.death_reason || undefined,
                deathNight: pr.death_night || undefined,
                deathPhase: pr.death_phase || undefined,
                loverId: pr.lover_id || null,
                skills: JSON.parse(pr.skills_json),
                hasConfirmedRole: pr.has_confirmed_role === 1,
                joinedAt: pr.joined_at,
            };
            game.players.set(player.id, player);
        }
        return game;
    }
    // ==========================================
    // PRESET MANAGEMENT
    // ==========================================
    savePreset(guildId, name, description, config, createdBy) {
        const id = `${guildId}:${name.toLowerCase()}`;
        const insert = this.db.prepare(`
      INSERT INTO presets (id, guild_id, name, description, config_json, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        description = excluded.description,
        config_json = excluded.config_json
    `);
        insert.run(id, guildId, name, description, JSON.stringify(config), createdBy, Date.now());
    }
    getPreset(guildId, name) {
        const id = `${guildId}:${name.toLowerCase()}`;
        const select = this.db.prepare('SELECT * FROM presets WHERE id = ?');
        const row = select.get(id);
        if (!row)
            return null;
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            minPlayers: 4,
            maxPlayers: 25,
            config: JSON.parse(row.config_json),
        };
    }
    getGuildPresets(guildId) {
        const select = this.db.prepare('SELECT * FROM presets WHERE guild_id = ? ORDER BY created_at DESC');
        const rows = select.all(guildId);
        return rows.map((r) => ({
            id: r.id,
            name: r.name,
            description: r.description,
            minPlayers: 4,
            maxPlayers: 25,
            config: JSON.parse(r.config_json),
        }));
    }
    // ==========================================
    // LOGS
    // ==========================================
    addGameLog(gameId, logEntry) {
        const insert = this.db.prepare('INSERT INTO game_logs (game_id, log_entry, created_at) VALUES (?, ?, ?)');
        insert.run(gameId, logEntry, Date.now());
    }
    getGameLogs(gameId) {
        const select = this.db.prepare('SELECT log_entry FROM game_logs WHERE game_id = ? ORDER BY id ASC');
        const rows = select.all(gameId);
        return rows.map((r) => r.log_entry);
    }
    close() {
        this.db.close();
    }
}
exports.DatabaseManager = DatabaseManager;
