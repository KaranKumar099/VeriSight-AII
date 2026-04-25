import { getEventLabel, RiskEngine } from "./riskEngine.js";

const riskEngine = new RiskEngine();

function serializeEvent(event) {
  return {
    ...event,
    label: getEventLabel(event.eventType),
    timestamp: new Date(event.timestamp).toISOString()
  };
}

export class AnalyticsService {
  constructor(store, io = null) {
    this.store = store;
    this.io = io;
  }

  async recompute() {
    const [users, sessions, events] = await Promise.all([
      this.store.listUsers(),
      this.store.listSessions(),
      this.store.listEvents()
    ]);

    const riskScores = riskEngine.computeAll(users, events);
    for (const risk of riskScores) {
      await this.store.upsertRisk(risk);
    }

    const analytics = await this.getAnalytics();
    if (this.io) this.io.emit("analytics:update", analytics);
    return analytics;
  }

  async getAnalytics() {
    const [users, sessions, events, risks] = await Promise.all([
      this.store.listUsers(),
      this.store.listSessions(),
      this.store.listEvents(),
      this.store.listRiskScores()
    ]);

    const riskByUser = new Map(risks.map((risk) => [risk.userId, risk]));
    const eventsByUser = new Map();
    for (const event of events) {
      const current = eventsByUser.get(event.userId) || [];
      current.push(event);
      eventsByUser.set(event.userId, current);
    }

    const latestSessionByUser = new Map();
    for (const session of sessions) {
      const existing = latestSessionByUser.get(session.userId);
      if (!existing || new Date(session.startedAt) > new Date(existing.startedAt)) {
        latestSessionByUser.set(session.userId, session);
      }
    }

    const participants = users.map((user) => {
      const risk = riskByUser.get(user.id) || {
        userId: user.id,
        score: 0,
        level: "Low Risk",
        reasons: [],
        metrics: {},
        anomaly: {},
        updatedAt: null
      };
      const userEvents = eventsByUser.get(user.id) || [];
      const latestEvent = userEvents[userEvents.length - 1] || null;
      const session = latestSessionByUser.get(user.id);

      return {
        userId: user.id,
        name: user.name,
        sessionId: session?.id || null,
        status: session?.status || "not_started",
        startedAt: session?.startedAt || null,
        submittedAt: session?.submittedAt || null,
        riskScore: risk.score,
        riskLevel: risk.level,
        reasons: risk.reasons || [],
        metrics: risk.metrics || {},
        anomaly: risk.anomaly || {},
        eventCount: userEvents.length,
        lastEventAt: latestEvent?.timestamp || null,
        lastEventType: latestEvent?.eventType || null
      };
    });

    const activeParticipants = participants.filter((participant) => participant.status === "active").length;
    const highRisk = participants.filter((participant) => participant.riskLevel === "High Risk").length;
    const mediumRisk = participants.filter((participant) => participant.riskLevel === "Medium Risk").length;
    const averageRisk = participants.length
      ? Math.round(participants.reduce((total, participant) => total + participant.riskScore, 0) / participants.length)
      : 0;
    const recentThreshold = Date.now() - 60 * 1000;
    const eventsLastMinute = events.filter((event) => new Date(event.timestamp).getTime() >= recentThreshold).length;

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalParticipants: participants.length,
        activeParticipants,
        highRisk,
        mediumRisk,
        averageRisk,
        eventsLastMinute
      },
      participants: participants.sort((a, b) => b.riskScore - a.riskScore)
    };
  }

  async getParticipant(userId) {
    const analytics = await this.getAnalytics();
    const participant = analytics.participants.find((item) => item.userId === userId);
    const events = await this.store.listEvents(userId);

    return {
      participant,
      timeline: events
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 80)
        .map(serializeEvent)
    };
  }
}
