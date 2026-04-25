import express from "express";

export function sessionsRouter({ store, analyticsService }) {
  const router = express.Router();

  router.post("/", async (req, res, next) => {
    try {
      const { userId, name, examId = "exam-2026-ai-proctoring" } = req.body || {};
      if (!userId || !name) {
        return res.status(400).json({ error: "userId and name are required" });
      }

      const user = await store.upsertUser({ id: userId, name, role: "student" });
      const session = await store.createSession({ userId, examId, status: "active" });
      await store.insertEvent({
        userId,
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        eventType: "session_start",
        metadata: { examId, name }
      });
      await analyticsService.recompute();

      res.status(201).json({ user, session });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
