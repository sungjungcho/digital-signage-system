import mysql from 'mysql2/promise';
import type { ResultSetHeader } from 'mysql2';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'signage',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'signage_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 단일 행 조회 (replaces db.prepare(sql).get(...params))
export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | undefined> {
  const [rows] = await pool.execute(sql, params);
  return (rows as any[])[0] as T | undefined;
}

// 다중 행 조회 (replaces db.prepare(sql).all(...params))
export async function queryAll<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

// INSERT/UPDATE/DELETE 실행 (replaces db.prepare(sql).run(...params))
export async function execute(sql: string, params?: any[]): Promise<ResultSetHeader> {
  const [result] = await pool.execute(sql, params);
  return result as ResultSetHeader;
}

// DDL 등 raw SQL 실행 (replaces db.exec())
export async function query(sql: string, params?: any[]): Promise<any> {
  const [result] = await pool.query(sql, params);
  return result;
}

export { pool };
