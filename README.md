# AI-Powered Exam Monitoring System

A demo-ready full-stack proctoring system that tracks online exam behavior, scores risk in real time, and streams flagged participants to a dark monitoring dashboard.

## Stack

- Frontend: React, Tailwind CSS, Socket.IO client
- Backend: Node.js, Express, Socket.IO
- Database: PostgreSQL adapter and schema included; local JSON store is used automatically for zero-setup demos
- AI/ML: cohort anomaly model using statistical deviation plus a rule-based risk engine

## Run Locally

```bash
npm install
npm run dev
```

Open:

- Admin dashboard: http://localhost:5174
- Backend health: http://localhost:4000/api/health

The simulator starts automatically and produces multiple live users, including flagged users with different reasons. Use the "Student Demo" screen to generate real browser events such as tab switching, fullscreen exits, idle time, answer changes, and submissions.

The Student Demo also requests webcam and microphone access. It raises in-window warnings and logs risk events when media access is blocked, no person is visible, multiple people are detected, or sustained background noise crosses the local threshold. Person-count detection uses the browser's native `FaceDetector` API when available; microphone noise analysis runs locally with the Web Audio API.

## Optional PostgreSQL

```bash
docker compose up -d
copy .env.example .env
npm run dev
```

Uncomment `DATABASE_URL` in `.env` to use PostgreSQL. Without it, the app uses `data/demo-db.json`.

## API Endpoints

- `POST /api/sessions` starts or resumes an exam session
- `POST /api/events` logs behavior events with `{ userId, timestamp, eventType, metadata }`
- `GET /api/analytics` returns participants, risk scores, reasons, and summary metrics
- `GET /api/analytics/:userId` returns one participant with behavior timeline
- `POST /api/simulator/start` starts demo event generation
- `POST /api/simulator/stop` stops demo event generation
- `GET /api/simulator/status` returns simulator state

## Risk Model

The engine combines:

- Rule signals: tab switches, fullscreen exits, idle time, abnormal answer speed, repeated answer changes, sudden accuracy spikes
- Media proctoring signals: camera/microphone blocked, no person visible, multiple people visible, high background noise
- Cohort anomaly score: compares each participant against current exam averages using z-score deviation
- Risk bands: Low `0-39`, Medium `40-69`, High `70-100`

## Structure

```text
client/                 React app and Tailwind UI
server/index.js          Express and Socket.IO bootstrap
server/routes/           REST API routes
server/services/         risk engine, analytics service, simulator
server/db/               JSON store, PostgreSQL store, schema
server/data/             demo users, questions, seed event generation
data/demo-db.json        generated local demo database
```
