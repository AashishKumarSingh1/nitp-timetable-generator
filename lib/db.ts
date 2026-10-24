import path from 'node:path';
import fs from 'node:fs';
import type { Pool } from 'pg';

// Check if running against Postgres or SQLite
const DATABASE_URL = process.env.DATABASE_URL || '';
const isPostgres = DATABASE_URL.startsWith('postgres://') || DATABASE_URL.startsWith('postgresql://');

// Helper type for Node's built-in sqlite DatabaseSync
type DatabaseSync = {
  exec(sql: string): void;
  prepare(sql: string): { all(...params: unknown[]): unknown[]; run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint } };
  close(): void;
};

// Global singleton caching to avoid multiple connections across HMR in Next.js
declare global {
  var __sqliteDbInstance: DatabaseSync | undefined;
  var __pgPoolInstance: Pool | undefined;
}

function loadSqliteDb(): new (path: string) => DatabaseSync {
  // Use the official Node.js built-in sqlite module.
  // Prefer getBuiltinModule (Node 22+), fall back to Function('return require')
  // so bundlers cannot statically tree-shake the require call.
  type SqliteModule = { DatabaseSync: new (path: string) => DatabaseSync };
  type ProcessWithBuiltin = NodeJS.Process & { getBuiltinModule?: (id: string) => SqliteModule };

  const proc = process as ProcessWithBuiltin;
  let mod: SqliteModule;
  if (typeof proc.getBuiltinModule === 'function') {
    mod = proc.getBuiltinModule('node:sqlite') as SqliteModule;
  } else {
    mod = Function('return require')('node:sqlite') as SqliteModule;
  }

  return mod.DatabaseSync;
}

export function resetDatabase() {
  if (global.__sqliteDbInstance) {
    try {
      global.__sqliteDbInstance.close();
    } catch {
      // ignore close errors
    }
    global.__sqliteDbInstance = undefined;
  }
}

function getDatabase(): { type: 'pg'; client: Pool } | { type: 'sqlite'; client: DatabaseSync } {
  if (isPostgres) {
    if (!global.__pgPoolInstance) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Pool: PgPool } = require('pg') as { Pool: new (opts: object) => Pool };
      global.__pgPoolInstance = new PgPool({
        connectionString: DATABASE_URL,
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
      });
    }
    return { type: 'pg', client: global.__pgPoolInstance! };
  }

  if (!global.__sqliteDbInstance) {
    const DatabaseSync = loadSqliteDb();
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'scheduler.db');
    const db = new DatabaseSync(dbPath);

    // Enable WAL mode, busy timeout & normal sync for multi-process safety
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA busy_timeout = 10000;');
    db.exec('PRAGMA synchronous = NORMAL;');
    db.exec('PRAGMA foreign_keys = ON;');

    // Run schema migrations if tables don't exist
    const schemaFile = path.join(process.cwd(), 'db', 'schema.sql');
    if (fs.existsSync(schemaFile)) {
      const schemaSql = fs.readFileSync(schemaFile, 'utf8');
      db.exec(schemaSql);
    }

    global.__sqliteDbInstance = db;
  }

  return { type: 'sqlite', client: global.__sqliteDbInstance! };
}


export function normalizeSql(sql: string, targetType: 'sqlite' | 'pg'): string {
  if (targetType === 'sqlite') {
    // Replace $1, $2 with ? for SQLite
    return sql.replace(/\$\d+/g, '?');
  } else {
    // Replace ? with $1, $2 for Postgres if needed
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query<T = any>(sqlText: string, params: unknown[] = []): Promise<T[]> {
  const start = performance.now();
  let db: ReturnType<typeof getDatabase> = getDatabase();

  if (db.type === 'pg') {
    const normSql = normalizeSql(sqlText, 'pg');
    const res = await db.client.query(normSql, params as unknown[]);
    if (process.env.NODE_ENV === 'development') {
      console.log('[PG SQL]', { text: normSql, duration: performance.now() - start, rows: res.rowCount });
    }
    return res.rows as T[];
  }

  // SQLite execution with auto-recovery on connection desynchronization
  const normSql = normalizeSql(sqlText, 'sqlite');
  try {
    const stmt = db.client.prepare(normSql);
    const rows = stmt.all(...params) as T[];
    if (process.env.NODE_ENV === 'development') {
      console.log('[SQLite]', { text: normSql, duration: performance.now() - start, rows: rows.length });
    }
    return rows;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('malformed') || msg.includes('busy') || msg.includes('locked')) {
      console.warn('[SQLite] Auto-recovering desynchronized database connection...', msg);
      resetDatabase();
      db = getDatabase();
      if (db.type === 'sqlite') {
        const stmt = db.client.prepare(normSql);
        return stmt.all(...params) as T[];
      }
    }
    throw err;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function queryOne<T = any>(sqlText: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(sqlText, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sqlText: string, params: unknown[] = []): Promise<{ changes: number; lastInsertRowid?: number | bigint }> {
  const start = performance.now();
  let db: ReturnType<typeof getDatabase> = getDatabase();

  if (db.type === 'pg') {
    const normSql = normalizeSql(sqlText, 'pg');
    const res = await db.client.query(normSql, params as unknown[]);
    if (process.env.NODE_ENV === 'development') {
      console.log('[PG Exec]', { text: normSql, duration: performance.now() - start, changes: res.rowCount });
    }
    return { changes: res.rowCount || 0 };
  }

  const normSql = normalizeSql(sqlText, 'sqlite');
  try {
    const stmt = db.client.prepare(normSql);
    const result = stmt.run(...params);
    if (process.env.NODE_ENV === 'development') {
      console.log('[SQLite Exec]', { text: normSql, duration: performance.now() - start, changes: result.changes });
    }
    return {
      changes: Number(result.changes),
      lastInsertRowid: result.lastInsertRowid,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('malformed') || msg.includes('busy') || msg.includes('locked')) {
      console.warn('[SQLite Exec] Auto-recovering desynchronized database connection...', msg);
      resetDatabase();
      db = getDatabase();
      if (db.type === 'sqlite') {
        const stmt = db.client.prepare(normSql);
        const result = stmt.run(...params);
        return {
          changes: Number(result.changes),
          lastInsertRowid: result.lastInsertRowid,
        };
      }
    }
    throw err;
  }
}

export async function transaction<T>(callback: (client: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: <R = any>(text: string, params?: unknown[]) => Promise<R[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryOne: <R = any>(text: string, params?: unknown[]) => Promise<R | null>;
  execute: (text: string, params?: unknown[]) => Promise<{ changes: number; lastInsertRowid?: number | bigint }>;
}) => Promise<T>): Promise<T> {
  const db = getDatabase();

  if (db.type === 'pg') {
    const client = await db.client.connect();
    try {
      await client.query('BEGIN');
      const txClient = {
        query: async <R = unknown>(text: string, params: unknown[] = []) => {
          const res = await client.query(normalizeSql(text, 'pg'), params as unknown[]);
          return res.rows as R[];
        },
        queryOne: async <R = unknown>(text: string, params: unknown[] = []) => {
          const res = await client.query(normalizeSql(text, 'pg'), params as unknown[]);
          return (res.rows[0] || null) as R | null;
        },
        execute: async (text: string, params: unknown[] = []) => {
          const res = await client.query(normalizeSql(text, 'pg'), params as unknown[]);
          return { changes: res.rowCount || 0 };
        },
      };
      const result = await callback(txClient);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // SQLite transaction with immediate lock & recovery
  try {
    db.client.exec('BEGIN IMMEDIATE');
    const txClient = {
      query: async <R = unknown>(text: string, params: unknown[] = []) => {
        const stmt = db.client.prepare(normalizeSql(text, 'sqlite'));
        return stmt.all(...params) as R[];
      },
      queryOne: async <R = unknown>(text: string, params: unknown[] = []) => {
        const stmt = db.client.prepare(normalizeSql(text, 'sqlite'));
        const rows = stmt.all(...params) as R[];
        return rows[0] || null;
      },
      execute: async (text: string, params: unknown[] = []) => {
        const stmt = db.client.prepare(normalizeSql(text, 'sqlite'));
        const res = stmt.run(...params);
        return { changes: Number(res.changes), lastInsertRowid: res.lastInsertRowid };
      },
    };
    const result = await callback(txClient);
    db.client.exec('COMMIT');
    return result;
  } catch (e: unknown) {
    try {
      db.client.exec('ROLLBACK');
    } catch {
      // ignore rollback failure
    }
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('malformed') || msg.includes('busy') || msg.includes('locked')) {
      console.warn('[SQLite Transaction] Auto-recovering desynchronized database connection...', msg);
      resetDatabase();
    }
    throw e;
  }
}
