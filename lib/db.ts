import path from 'node:path';
import fs from 'node:fs';

// Check if running against Postgres or SQLite
const DATABASE_URL = process.env.DATABASE_URL || '';
const isPostgres = DATABASE_URL.startsWith('postgres://') || DATABASE_URL.startsWith('postgresql://');

let pgPool: any = null;
let sqliteDb: any = null;

// Global singleton caching to avoid multiple connections across HMR in Next.js
declare global {
  // eslint-disable-next-line no-var
  var __sqliteDbInstance: any;
  // eslint-disable-next-line no-var
  var __pgPoolInstance: any;
}

export function resetDatabase() {
  if (global.__sqliteDbInstance) {
    try {
      global.__sqliteDbInstance.close();
    } catch {
      // ignore close errors
    }
    global.__sqliteDbInstance = null;
  }
}

function getDatabase() {
  if (isPostgres) {
    if (!global.__pgPoolInstance) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Pool } = require('pg');
      global.__pgPoolInstance = new Pool({
        connectionString: DATABASE_URL,
      });
    }
    return { type: 'pg', client: global.__pgPoolInstance };
  }

  if (!global.__sqliteDbInstance) {
    const sqliteModule = (process as any).getBuiltinModule
      ? (process as any).getBuiltinModule('node:sqlite')
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      : eval('require')('node:sqlite');
    const { DatabaseSync } = sqliteModule;
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

  return { type: 'sqlite', client: global.__sqliteDbInstance };
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

export async function query<T = any>(sqlText: string, params: any[] = []): Promise<T[]> {
  const start = performance.now();
  let db = getDatabase();

  if (db.type === 'pg') {
    const normSql = normalizeSql(sqlText, 'pg');
    const res = await db.client.query(normSql, params);
    if (process.env.NODE_ENV === 'development') {
      console.log('[PG SQL]', { text: normSql, duration: performance.now() - start, rows: res.rowCount });
    }
    return res.rows;
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
  } catch (err: any) {
    if (err.message?.includes('malformed') || err.message?.includes('busy') || err.message?.includes('locked')) {
      console.warn('[SQLite] Auto-recovering desynchronized database connection...', err.message);
      resetDatabase();
      db = getDatabase();
      const stmt = db.client.prepare(normSql);
      return stmt.all(...params) as T[];
    }
    throw err;
  }
}

export async function queryOne<T = any>(sqlText: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sqlText, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sqlText: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid?: number | bigint }> {
  const start = performance.now();
  let db = getDatabase();

  if (db.type === 'pg') {
    const normSql = normalizeSql(sqlText, 'pg');
    const res = await db.client.query(normSql, params);
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
  } catch (err: any) {
    if (err.message?.includes('malformed') || err.message?.includes('busy') || err.message?.includes('locked')) {
      console.warn('[SQLite Exec] Auto-recovering desynchronized database connection...', err.message);
      resetDatabase();
      db = getDatabase();
      const stmt = db.client.prepare(normSql);
      const result = stmt.run(...params);
      return {
        changes: Number(result.changes),
        lastInsertRowid: result.lastInsertRowid,
      };
    }
    throw err;
  }
}

export async function transaction<T>(callback: (client: {
  query: <R = any>(text: string, params?: any[]) => Promise<R[]>;
  queryOne: <R = any>(text: string, params?: any[]) => Promise<R | null>;
  execute: (text: string, params?: any[]) => Promise<{ changes: number; lastInsertRowid?: number | bigint }>;
}) => Promise<T>): Promise<T> {
  let db = getDatabase();

  if (db.type === 'pg') {
    const client = await db.client.connect();
    try {
      await client.query('BEGIN');
      const txClient = {
        query: async <R = any>(text: string, params: any[] = []) => {
          const res = await client.query(normalizeSql(text, 'pg'), params);
          return res.rows as R[];
        },
        queryOne: async <R = any>(text: string, params: any[] = []) => {
          const res = await client.query(normalizeSql(text, 'pg'), params);
          return (res.rows[0] || null) as R | null;
        },
        execute: async (text: string, params: any[] = []) => {
          const res = await client.query(normalizeSql(text, 'pg'), params);
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
      query: async <R = any>(text: string, params: any[] = []) => {
        const stmt = db.client.prepare(normalizeSql(text, 'sqlite'));
        return stmt.all(...params) as R[];
      },
      queryOne: async <R = any>(text: string, params: any[] = []) => {
        const stmt = db.client.prepare(normalizeSql(text, 'sqlite'));
        const rows = stmt.all(...params) as R[];
        return rows[0] || null;
      },
      execute: async (text: string, params: any[] = []) => {
        const stmt = db.client.prepare(normalizeSql(text, 'sqlite'));
        const res = stmt.run(...params);
        return { changes: Number(res.changes), lastInsertRowid: res.lastInsertRowid };
      },
    };
    const result = await callback(txClient);
    db.client.exec('COMMIT');
    return result;
  } catch (e: any) {
    try {
      db.client.exec('ROLLBACK');
    } catch {
      // ignore rollback failure
    }
    if (e.message?.includes('malformed') || e.message?.includes('busy') || e.message?.includes('locked')) {
      console.warn('[SQLite Transaction] Auto-recovering desynchronized database connection...', e.message);
      resetDatabase();
    }
    throw e;
  }
}
