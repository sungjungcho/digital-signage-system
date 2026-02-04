/**
 * SQLite -> MariaDB 데이터 마이그레이션 스크립트
 * 사용법: node scripts/migrate-sqlite-to-mariadb.js
 *
 * 주의: better-sqlite3가 임시로 설치되어 있어야 합니다.
 *       npm install better-sqlite3 --no-save
 */

const Database = require('better-sqlite3');
const mysql = require('mysql2/promise');
const path = require('path');

try {
  require('dotenv').config();
} catch {}

const SQLITE_PATH = path.join(__dirname, '..', 'data', 'signage.db');

async function migrate() {
  // SQLite 연결
  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  console.log('✅ SQLite 연결 성공:', SQLITE_PATH);

  // MariaDB 연결
  const maria = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'signage',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'signage_db',
  });
  console.log('✅ MariaDB 연결 성공');

  // FK 체크 비활성화 (데이터 순서 무관하게 삽입)
  await maria.query('SET FOREIGN_KEY_CHECKS = 0');

  // ========================================
  // 1. users 마이그레이션
  // ========================================
  const users = sqlite.prepare('SELECT * FROM users').all();
  if (users.length > 0) {
    await maria.query('DELETE FROM users');
    for (const u of users) {
      await maria.execute(
        `INSERT INTO users (id, username, email, password_hash, role, status, name, max_devices, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.id, u.username, u.email, u.password_hash, u.role, u.status, u.name, u.max_devices || 3, u.created_at, u.updated_at]
      );
    }
    console.log(`✅ users: ${users.length}행 마이그레이션 완료`);
  } else {
    console.log('⏭️  users: 데이터 없음');
  }

  // ========================================
  // 2. sessions 마이그레이션
  // ========================================
  const sessions = sqlite.prepare('SELECT * FROM sessions').all();
  if (sessions.length > 0) {
    await maria.query('DELETE FROM sessions');
    for (const s of sessions) {
      await maria.execute(
        `INSERT INTO sessions (id, user_id, token, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [s.id, s.user_id, s.token, s.expires_at, s.created_at]
      );
    }
    console.log(`✅ sessions: ${sessions.length}행 마이그레이션 완료`);
  } else {
    console.log('⏭️  sessions: 데이터 없음');
  }

  // ========================================
  // 3. device 마이그레이션
  // ========================================
  const devices = sqlite.prepare('SELECT * FROM device').all();
  if (devices.length > 0) {
    await maria.query('DELETE FROM device');
    for (const d of devices) {
      await maria.execute(
        `INSERT INTO device (id, name, location, alias, status, user_id, pin_code, lastConnected, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [d.id, d.name, d.location, d.alias, d.status, d.user_id, d.pin_code, d.lastConnected || null, d.createdAt, d.updatedAt]
      );
    }
    console.log(`✅ device: ${devices.length}행 마이그레이션 완료`);
  } else {
    console.log('⏭️  device: 데이터 없음');
  }

  // ========================================
  // 4. devicecontent 마이그레이션
  // ========================================
  const contents = sqlite.prepare('SELECT * FROM devicecontent').all();
  if (contents.length > 0) {
    await maria.query('DELETE FROM devicecontent');
    for (const c of contents) {
      await maria.execute(
        `INSERT INTO devicecontent (id, deviceId, type, url, text, duration, fontSize, fontColor, backgroundColor, alt, autoplay, \`loop\`, muted, metadata, \`order\`, active, scheduleType, specificDate, daysOfWeek, startDate, endDate, startTime, endTime, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          c.id, c.deviceId, c.type, c.url || null, c.text || null,
          c.duration, c.fontSize || null, c.fontColor || null, c.backgroundColor || null, c.alt || null,
          c.autoplay || 0, c.loop || 0, c.muted !== undefined ? c.muted : 1,
          c.metadata || null, c.order, c.active !== undefined ? c.active : 1,
          c.scheduleType || 'always', c.specificDate || null, c.daysOfWeek || null,
          c.startDate || null, c.endDate || null, c.startTime || null, c.endTime || null,
          c.createdAt, c.updatedAt
        ]
      );
    }
    console.log(`✅ devicecontent: ${contents.length}행 마이그레이션 완료`);
  } else {
    console.log('⏭️  devicecontent: 데이터 없음');
  }

  // ========================================
  // 5. content_schedule 마이그레이션
  // ========================================
  const schedules = sqlite.prepare('SELECT * FROM content_schedule').all();
  if (schedules.length > 0) {
    await maria.query('DELETE FROM content_schedule');
    for (const s of schedules) {
      await maria.execute(
        `INSERT INTO content_schedule (id, deviceId, name, scheduleType, specificDate, daysOfWeek, startDate, endDate, priority, active, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.id, s.deviceId, s.name, s.scheduleType, s.specificDate || null, s.daysOfWeek || null, s.startDate || null, s.endDate || null, s.priority || 0, s.active !== undefined ? s.active : 1, s.createdAt, s.updatedAt]
      );
    }
    console.log(`✅ content_schedule: ${schedules.length}행 마이그레이션 완료`);
  } else {
    console.log('⏭️  content_schedule: 데이터 없음');
  }

  // ========================================
  // 6. time_slot 마이그레이션
  // ========================================
  const slots = sqlite.prepare('SELECT * FROM time_slot').all();
  if (slots.length > 0) {
    await maria.query('DELETE FROM time_slot');
    for (const t of slots) {
      await maria.execute(
        `INSERT INTO time_slot (id, scheduleId, startTime, endTime, contentIds, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [t.id, t.scheduleId, t.startTime, t.endTime, t.contentIds, t.createdAt, t.updatedAt]
      );
    }
    console.log(`✅ time_slot: ${slots.length}행 마이그레이션 완료`);
  } else {
    console.log('⏭️  time_slot: 데이터 없음');
  }

  // ========================================
  // 7. notice 마이그레이션
  // ========================================
  const notices = sqlite.prepare('SELECT * FROM notice').all();
  if (notices.length > 0) {
    await maria.query('DELETE FROM notice');
    for (const n of notices) {
      await maria.execute(
        `INSERT INTO notice (id, title, content, category, favorite, lastUsedAt, usageCount, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [n.id, n.title, n.content, n.category || null, n.favorite || 0, n.lastUsedAt || null, n.usageCount || 0, n.createdAt, n.updatedAt]
      );
    }
    console.log(`✅ notice: ${notices.length}행 마이그레이션 완료`);
  } else {
    console.log('⏭️  notice: 데이터 없음');
  }

  // FK 체크 다시 활성화
  await maria.query('SET FOREIGN_KEY_CHECKS = 1');

  // 결과 검증
  console.log('\n===== 마이그레이션 결과 검증 =====');
  const tables = ['users', 'sessions', 'device', 'devicecontent', 'content_schedule', 'time_slot', 'notice'];
  for (const table of tables) {
    const sqliteCount = sqlite.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c;
    const [mariaRows] = await maria.execute(`SELECT COUNT(*) as c FROM ${table}`);
    const mariaCount = mariaRows[0].c;
    const match = sqliteCount === mariaCount ? '✅' : '❌';
    console.log(`${match} ${table}: SQLite(${sqliteCount}) → MariaDB(${mariaCount})`);
  }

  sqlite.close();
  await maria.end();
  console.log('\n✅ 마이그레이션이 완료되었습니다!');
}

migrate().catch(err => {
  console.error('❌ 마이그레이션 실패:', err);
  process.exit(1);
});
