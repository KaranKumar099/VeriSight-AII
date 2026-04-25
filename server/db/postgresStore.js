import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

export class PostgresStore {
  constructor(connectionString) {
    this.pool = new Pool({ connectionString });
  }

  async init() {
    const directory = path.dirname(fileURLToPath(import.meta.url));
    const schema = await fs.readFile(path.join(directory, "schema.sql"), "utf8");
    await this.pool.query(schema);
  }

  async clear() {
    await this.pool.query("TRUNCATE risk_scores, behavior_logs, exam_sessions, users RESTART IDENTITY CASCADE");
  }

  async upsertUser(user) {
    const result = await this.pool.query(
      `INSERT INTO users (id, name, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
       RETURNING id, name, role, created_at AS "createdAt"`,
      [user.id, user.name, user.role || "student"]
    );
    return result.rows[0];
  }

  async listUsers() {
    const result = await this.pool.query(
      `SELECT id, name, role, created_at AS "createdAt"
       FROM users
       ORDER BY id`
    );
    return result.rows;
  }

  async getUser(userId) {
    const result = await this.pool.query(
      `SELECT id, name, role, created_at AS "createdAt" FROM users WHERE id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  async createSession(session) {
    const active = await this.pool.query(
      `SELECT id, user_id AS "userId", exam_id AS "examId", status,
              started_at AS "startedAt", submitted_at AS "submittedAt"
       FROM exam_sessions
       WHERE user_id = $1 AND status = 'active'
       LIMIT 1`,
      [session.userId]
    );
    if (active.rows[0]) return active.rows[0];

    const result = await this.pool.query(
      `INSERT INTO exam_sessions (id, user_id, exam_id, status, started_at, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id AS "userId", exam_id AS "examId", status,
                 started_at AS "startedAt", submitted_at AS "submittedAt"`,
      [
        session.id || randomUUID(),
        session.userId,
        session.examId || "exam-2026-ai-proctoring",
        session.status || "active",
        session.startedAt || new Date().toISOString(),
        session.submittedAt || null
      ]
    );
    return result.rows[0];
  }

  async listSessions() {
    const result = await this.pool.query(
      `SELECT id, user_id AS "userId", exam_id AS "examId", status,
              started_at AS "startedAt", submitted_at AS "submittedAt"
       FROM exam_sessions
       ORDER BY started_at DESC`
    );
    return result.rows;
  }

  async updateSession(sessionId, patch) {
    const result = await this.pool.query(
      `UPDATE exam_sessions
       SET status = COALESCE($2, status),
           submitted_at = COALESCE($3, submitted_at)
       WHERE id = $1
       RETURNING id, user_id AS "userId", exam_id AS "examId", status,
                 started_at AS "startedAt", submitted_at AS "submittedAt"`,
      [sessionId, patch.status || null, patch.submittedAt || null]
    );
    return result.rows[0] || null;
  }

  async insertEvent(input) {
    const result = await this.pool.query(
      `INSERT INTO behavior_logs (id, user_id, session_id, timestamp, event_type, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id AS "userId", session_id AS "sessionId",
                 timestamp, event_type AS "eventType", metadata`,
      [
        input.id || randomUUID(),
        input.userId,
        input.sessionId || null,
        input.timestamp || new Date().toISOString(),
        input.eventType,
        JSON.stringify(input.metadata || {})
      ]
    );
    return result.rows[0];
  }

  async listEvents(userId = null) {
    const result = await this.pool.query(
      `SELECT id, user_id AS "userId", session_id AS "sessionId", timestamp,
              event_type AS "eventType", metadata
       FROM behavior_logs
       WHERE ($1::text IS NULL OR user_id = $1)
       ORDER BY timestamp ASC`,
      [userId]
    );
    return result.rows;
  }

  async upsertRisk(risk) {
    const result = await this.pool.query(
      `INSERT INTO risk_scores (user_id, score, level, reasons, metrics, anomaly, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET score = EXCLUDED.score,
           level = EXCLUDED.level,
           reasons = EXCLUDED.reasons,
           metrics = EXCLUDED.metrics,
           anomaly = EXCLUDED.anomaly,
           updated_at = NOW()
       RETURNING user_id AS "userId", score, level, reasons, metrics, anomaly,
                 updated_at AS "updatedAt"`,
      [
        risk.userId,
        risk.score,
        risk.level,
        JSON.stringify(risk.reasons || []),
        JSON.stringify(risk.metrics || {}),
        JSON.stringify(risk.anomaly || {})
      ]
    );
    return result.rows[0];
  }

  async listRiskScores() {
    const result = await this.pool.query(
      `SELECT user_id AS "userId", score, level, reasons, metrics, anomaly,
              updated_at AS "updatedAt"
       FROM risk_scores
       ORDER BY score DESC`
    );
    return result.rows;
  }
}
