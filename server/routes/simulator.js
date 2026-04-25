import express from "express";
import { seedDemoData } from "../services/seed.js";

export function simulatorRouter({ simulator, store, analyticsService }) {
  const router = express.Router();

  router.get("/status", (_req, res) => {
    res.json(simulator.status());
  });

  router.post("/start", (_req, res) => {
    res.json(simulator.start());
  });

  router.post("/stop", (_req, res) => {
    res.json(simulator.stop());
  });

  router.post("/reset", async (_req, res, next) => {
    try {
      simulator.stop();
      const result = await seedDemoData(store, { force: true });
      await analyticsService.recompute();
      simulator.start();
      res.json({ ...result, simulator: simulator.status() });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
