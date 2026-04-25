import express from "express";

const ALLOWED_EVENTS = new Set([
  "session_start",
  "tab_switch",
  "fullscreen_exit",
  "fullscreen_enter",
  "question_view",
  "question_submit",
  "answer_change",
  "idle",
  "activity",
  "media_monitor_started",
  "media_monitor_unsupported",
  "media_permission_denied",
  "face_absent",
  "multiple_faces",
  "high_noise",
  "exam_submit"
]);

function normalizeEvent(body) {
  if (!body?.userId || typeof body.userId !== "string") {
    const error = new Error("userId is required");
    error.status = 400;
    throw error;
  }
  if (!ALLOWED_EVENTS.has(body.eventType)) {
    const error = new Error(`Unsupported eventType: ${body.eventType}`);
    error.status = 400;
    throw error;
  }

  return {
    userId: body.userId,
    sessionId: body.sessionId || null,
    timestamp: body.timestamp || new Date().toISOString(),
    eventType: body.eventType,
    metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {}
  };
}

export function eventsRouter({ store, analyticsService }) {
  const router = express.Router();

  router.post("/", async (req, res, next) => {
    try {
      const event = normalizeEvent(req.body);
      const existingUser = await store.getUser(event.userId);
      if (!existingUser) {
        await store.upsertUser({
          id: event.userId,
          name: event.metadata?.name || event.userId,
          role: "student"
        });
        await store.createSession({
          userId: event.userId,
          examId: event.metadata?.examId || "exam-2026-ai-proctoring"
        });
      }

      const inserted = await store.insertEvent(event);
      if (event.eventType === "exam_submit" && event.sessionId) {
        await store.updateSession(event.sessionId, {
          status: "submitted",
          submittedAt: event.timestamp
        });
      }
      const analytics = await analyticsService.recompute();
      res.status(201).json({ event: inserted, analytics });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
