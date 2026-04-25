import { buildSeedEvents, demoUsers } from "../data/questions.js";

export async function seedDemoData(store, { force = false } = {}) {
  const existingUsers = await store.listUsers();
  if (existingUsers.length && !force) {
    return { seeded: false, reason: "Existing data found" };
  }

  if (force) await store.clear();

  for (const user of demoUsers) {
    await store.upsertUser(user);
    await store.createSession({
      userId: user.id,
      examId: "exam-2026-ai-proctoring",
      status: "active",
      startedAt: new Date(Date.now() - 28 * 60 * 1000).toISOString()
    });
  }

  for (const event of buildSeedEvents()) {
    await store.insertEvent(event);
  }

  return { seeded: true, users: demoUsers.length };
}
