import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const EMPTY_DB = {
  users: [],
  sessions: [],
  events: [],
  risks: []
};

export class JsonStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = structuredClone(EMPTY_DB);
  }

  async init() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      this.data = { ...structuredClone(EMPTY_DB), ...JSON.parse(raw) };
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      await this.persist();
    }
  }

  async persist() {
    await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2));
  }

  async clear() {
    this.data = structuredClone(EMPTY_DB);
    await this.persist();
  }

  async upsertUser(user) {
    const existing = this.data.users.findIndex((item) => item.id === user.id);
    const record = {
      role: "student",
      createdAt: new Date().toISOString(),
      ...user
    };
    if (existing >= 0) this.data.users[existing] = { ...this.data.users[existing], ...record };
    else this.data.users.push(record);
    await this.persist();
    return record;
  }

  async listUsers() {
    return [...this.data.users];
  }

  async getUser(userId) {
    return this.data.users.find((user) => user.id === userId) || null;
  }

  async createSession(session) {
    const active = this.data.sessions.find(
      (item) => item.userId === session.userId && item.status === "active"
    );
    if (active) return active;

    const record = {
      id: randomUUID(),
      examId: "exam-2026-ai-proctoring",
      status: "active",
      startedAt: new Date().toISOString(),
      submittedAt: null,
      ...session
    };
    this.data.sessions.push(record);
    await this.persist();
    return record;
  }

  async listSessions() {
    return [...this.data.sessions];
  }

  async updateSession(sessionId, patch) {
    const index = this.data.sessions.findIndex((session) => session.id === sessionId);
    if (index < 0) return null;
    this.data.sessions[index] = { ...this.data.sessions[index], ...patch };
    await this.persist();
    return this.data.sessions[index];
  }

  async insertEvent(input) {
    const record = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      metadata: {},
      ...input
    };
    this.data.events.push(record);
    this.data.events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    await this.persist();
    return record;
  }

  async listEvents(userId = null) {
    const events = userId
      ? this.data.events.filter((event) => event.userId === userId)
      : this.data.events;
    return [...events].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  async upsertRisk(risk) {
    const record = {
      updatedAt: new Date().toISOString(),
      ...risk
    };
    const index = this.data.risks.findIndex((item) => item.userId === risk.userId);
    if (index >= 0) this.data.risks[index] = { ...this.data.risks[index], ...record };
    else this.data.risks.push(record);
    await this.persist();
    return record;
  }

  async listRiskScores() {
    return [...this.data.risks];
  }
}
