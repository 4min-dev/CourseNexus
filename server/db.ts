import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import 'dotenv/config';
import pg, { type Pool as PgPoolType } from 'pg';
import { drizzle as neonDrizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";

const { Pool: PgPool } = pg;

const driver = (process.env.DB_DRIVER ?? "neon").toLowerCase();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Настройка пула с улучшенной стабильностью
const pool = driver === "pg"
  ? new PgPool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Максимум соединений
    idleTimeoutMillis: 30000, // Закрывать неактивные соединения через 30 сек
    connectionTimeoutMillis: 10000, // Таймаут подключения 10 сек
  })
  : (() => {
    neonConfig.webSocketConstructor = ws;
    return new NeonPool({
      connectionString: process.env.DATABASE_URL,
      max: 20, // Максимум соединений
      idleTimeoutMillis: 30000, // Закрывать неактивные соединения через 30 сек
      connectionTimeoutMillis: 10000, // Таймаут подключения 10 сек
    });
  })();

// Обработка ошибок пула - не падать при потере соединения
pool.on('error', (err: any) => {
  console.error('[DB Pool] Unexpected error on idle client:', err.message);
  if (err.code) {
    console.error('[DB Pool] Error code:', err.code);
  }
  // Не падать, просто логировать. Пул автоматически создаст новое соединение
});

// Обработка события подключения
pool.on('connect', () => {
  console.log('[DB Pool] New client connected');
});

// Обработка удаления клиента из пула
pool.on('remove', () => {
  console.log('[DB Pool] Client removed from pool');
});

export const db = driver === "pg"
  ? pgDrizzle(pool as PgPoolType, { schema })
  : neonDrizzle({ client: pool as NeonPool, schema });

// Graceful shutdown функция для корректного закрытия всех соединений
export async function closeDatabase() {
  console.log('[DB] Closing database connections...');
  try {
    await pool.end();
    console.log('[DB] All database connections closed');
  } catch (error) {
    console.error('[DB] Error closing database:', error);
  }
}
