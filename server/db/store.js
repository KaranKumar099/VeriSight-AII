import path from "node:path";
import { JsonStore } from "./jsonStore.js";
import { PostgresStore } from "./postgresStore.js";

export async function createStore() {
  const store = process.env.DATABASE_URL
    ? new PostgresStore(process.env.DATABASE_URL)
    : new JsonStore(path.join(process.cwd(), "data", "demo-db.json"));

  await store.init();
  return store;
}
