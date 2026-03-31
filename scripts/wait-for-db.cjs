#!/usr/bin/env node

const { Client } = require("pg");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[DB Wait] DATABASE_URL is not set");
  process.exit(1);
}

const timeoutMs = Number(process.env.DB_WAIT_TIMEOUT_MS ?? 60000);
const retryDelayMs = Number(process.env.DB_WAIT_RETRY_MS ?? 2000);

async function canConnect() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    await client.end();
    return true;
  } catch (error) {
    console.warn("[DB Wait] Database not ready yet:", error.message);
    return false;
  }
}

async function main() {
  const start = Date.now();
  while (true) {
    if (await canConnect()) {
      console.log("[DB Wait] Database connection established");
      return;
    }

    if (Date.now() - start > timeoutMs) {
      console.error("[DB Wait] Timed out waiting for database");
      process.exit(1);
    }

    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
}

main().catch((error) => {
  console.error("[DB Wait] Unexpected error:", error);
  process.exit(1);
});
