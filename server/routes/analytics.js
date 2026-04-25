import express from "express";

export function analyticsRouter({ analyticsService }) {
  const router = express.Router();

  router.get("/", async (_req, res, next) => {
    try {
      res.json(await analyticsService.getAnalytics());
    } catch (error) {
      next(error);
    }
  });

  router.get("/:userId", async (req, res, next) => {
    try {
      const detail = await analyticsService.getParticipant(req.params.userId);
      if (!detail.participant) return res.status(404).json({ error: "Participant not found" });
      res.json(detail);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
