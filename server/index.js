import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { Server } from "socket.io";
import { createStore } from "./db/store.js";
import { AnalyticsService } from "./services/analyticsService.js";
import { seedDemoData } from "./services/seed.js";
import { Simulator } from "./services/simulator.js";
import { analyticsRouter } from "./routes/analytics.js";
import { eventsRouter } from "./routes/events.js";
import { sessionsRouter } from "./routes/sessions.js";
import { simulatorRouter } from "./routes/simulator.js";

const PORT = Number(process.env.PORT || 4000);
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5174";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [CLIENT_URL, "http://127.0.0.1:5174", "http://localhost:4000"],
    methods: ["GET", "POST"]
  }
});

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

const store = await createStore();
if (process.env.SEED_DEMO !== "false") {
  await seedDemoData(store);
}

const analyticsService = new AnalyticsService(store, io);
await analyticsService.recompute();
const simulator = new Simulator(store, analyticsService);

io.on("connection", async (socket) => {
  socket.emit("analytics:update", await analyticsService.getAnalytics());
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    database: process.env.DATABASE_URL ? "postgresql" : "json-demo-store",
    simulator: simulator.status(),
    timestamp: new Date().toISOString()
  });
});

app.use("/api/sessions", sessionsRouter({ store, analyticsService }));
app.use("/api/events", eventsRouter({ store, analyticsService }));
app.use("/api/analytics", analyticsRouter({ analyticsService }));
app.use("/api/simulator", simulatorRouter({ simulator, store, analyticsService }));

const distPath = path.join(process.cwd(), "dist");
if (fs.existsSync(path.join(distPath, "index.html"))) {
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ error: error.message || "Internal server error" });
});

server.listen(PORT, () => {
  console.log(`Exam monitoring backend running on http://localhost:${PORT}`);
  if (process.env.SIMULATOR_AUTOSTART !== "false") {
    simulator.start();
    console.log("Live demo simulator started");
  }
});
