import type { Pool, PoolConnection, ResultSetHeader } from 'mysql2/promise';

// Automatically load .env if available in Node runtime
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch {
    // Ignore if .env is missing or already loaded
  }
}

// Global singleton pool caching across Next.js HMR reloads
declare global {
  var __mysqlPoolInstance: Pool | undefined;
}

export function resetDatabase(): void {
  if (global.__mysqlPoolInstance) {
    try {
      global.__mysqlPoolInstance.end();
    } catch {
      // ignore close errors
    }
    global.__mysqlPoolInstance = undefined;
  }
}

function getDatabase(): Pool {
  if (!global.__mysqlPoolInstance) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mysql = require('mysql2/promise') as typeof import('mysql2/promise');
    const databaseUrl = process.env.DATABASE_URL || '';

    let poolConfig: Record<string, unknown>;

    if (process.env.MYSQL_HOST) {
      poolConfig = {
        host: process.env.MYSQL_HOST,
        port: Number(process.env.MYSQL_PORT) || 3306,
        user: process.env.MYSQL_USERNAME || process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10_000,
      };
    } else if (databaseUrl) {
      poolConfig = {
        uri: databaseUrl,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10_000,
      };
    } else {
      throw new Error(
        'Database configuration missing. Please provide DATABASE_URL or MYSQL_HOST in your .env file.'
      );
    }

    // Configure SSL for TiDB Cloud, AWS RDS, or when MYSQL_SSL is set
    if (
      databaseUrl.includes('sslmode=') ||
      databaseUrl.includes('ssl=') ||
      process.env.MYSQL_SSL === 'true' ||
      process.env.MYSQL_HOST?.includes('tidbcloud.com') ||
      process.env.MYSQL_HOST?.includes('rds.amazonaws.com')
    ) {
      poolConfig.ssl = {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
      };
    }

    global.__mysqlPoolInstance = mysql.createPool(poolConfig as any);
  }

  return global.__mysqlPoolInstance!;
}

/**
 * Normalizes SQL for MySQL:
 * - Replaces PostgreSQL parameter placeholders ($1, $2, ...) with MySQL question marks (?)
 * - Quotes the MySQL 8.0/TiDB reserved keyword `rows` when used as an identifier
 */
export function normalizeSql(sql: string): string {
  let s = sql.replace(/\$\d+/g, '?');
  s = s.replace(/(?<!`)\b([a-zA-Z0-9_]+\.)?rows\b(?!`)/gi, (match) => {
    if (match.includes('.')) {
      const parts = match.split('.');
      return `${parts[0]}.\`rows\``;
    }
    return '`rows`';
  });
  return s;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query<T = any>(sqlText: string, params: unknown[] = []): Promise<T[]> {
  const pool = getDatabase();
  const normSql = normalizeSql(sqlText);
  const cleanParams = params.map((p) => (p === undefined ? null : p));

  const [rows] = await pool.query(normSql, cleanParams);
  return (rows || []) as T[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function queryOne<T = any>(sqlText: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(sqlText, params);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function execute(
  sqlText: string,
  params: unknown[] = []
): Promise<{ changes: number; lastInsertRowid?: number | bigint }> {
  const pool = getDatabase();
  const normSql = normalizeSql(sqlText);
  const cleanParams = params.map((p) => (p === undefined ? null : p));

  const [result] = await pool.query(normSql, cleanParams);
  const header = result as ResultSetHeader;

  return {
    changes: header.affectedRows || 0,
    lastInsertRowid: header.insertId,
  };
}

export async function transaction<T>(
  callback: (client: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: <R = any>(text: string, params?: unknown[]) => Promise<R[]>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryOne: <R = any>(text: string, params?: unknown[]) => Promise<R | null>;
    execute: (text: string, params?: unknown[]) => Promise<{ changes: number; lastInsertRowid?: number | bigint }>;
  }) => Promise<T>
): Promise<T> {
  const pool = getDatabase();
  const conn: PoolConnection = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const txClient = {
      query: async <R = unknown>(text: string, params: unknown[] = []) => {
        const normSql = normalizeSql(text);
        const cleanParams = params.map((p) => (p === undefined ? null : p));
        const [rows] = await conn.query(normSql, cleanParams);
        return (rows || []) as R[];
      },
      queryOne: async <R = unknown>(text: string, params: unknown[] = []) => {
        const normSql = normalizeSql(text);
        const cleanParams = params.map((p) => (p === undefined ? null : p));
        const [rows] = await conn.query(normSql, cleanParams);
        return (Array.isArray(rows) && rows.length > 0 ? rows[0] : null) as R | null;
      },
      execute: async (text: string, params: unknown[] = []) => {
        const normSql = normalizeSql(text);
        const cleanParams = params.map((p) => (p === undefined ? null : p));
        const [result] = await conn.query(normSql, cleanParams);
        const header = result as ResultSetHeader;
        return {
          changes: header.affectedRows || 0,
          lastInsertRowid: header.insertId,
        };
      },
    };

    const result = await callback(txClient);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
