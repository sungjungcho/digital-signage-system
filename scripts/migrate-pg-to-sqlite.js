const { Client } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');

async function migrate() {
  // PostgreSQL 연결
  const pgClient = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/digital_signage'
  });

  await pgClient.connect();
  console.log('✓ PostgreSQL 연결 성공');

  // SQLite 연결
  const dbPath = path.join(process.cwd(), 'data', 'signage.db');
  const sqlite = new Database(dbPath);
  console.log('✓ SQLite 연결 성공');

  try {
    // Device 데이터 마이그레이션
    console.log('\n=== Device 마이그레이션 시작 ===');
    const devices = await pgClient.query('SELECT * FROM "Device" ORDER BY "createdAt" ASC');
    console.log(`총 ${devices.rows.length}개의 디바이스 발견`);

    const insertDevice = sqlite.prepare(`
      INSERT OR REPLACE INTO device (id, name, location, status, lastConnected, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const device of devices.rows) {
      insertDevice.run(
        device.id,
        device.name,
        device.location,
        device.status,
        device.lastConnected ? device.lastConnected.toISOString() : null,
        device.createdAt.toISOString(),
        device.updatedAt.toISOString()
      );
      console.log(`  ✓ ${device.name} (${device.id})`);
    }

    // DeviceContent 데이터 마이그레이션
    console.log('\n=== DeviceContent 마이그레이션 시작 ===');
    const contents = await pgClient.query('SELECT * FROM "DeviceContent" ORDER BY "createdAt" ASC');
    console.log(`총 ${contents.rows.length}개의 콘텐츠 발견`);

    const insertContent = sqlite.prepare(`
      INSERT OR REPLACE INTO devicecontent (
        id, deviceId, type, url, text, duration, fontSize, fontColor,
        backgroundColor, alt, autoplay, loop, muted, metadata, "order",
        active, createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const content of contents.rows) {
      insertContent.run(
        content.id,
        content.deviceId,
        content.type,
        content.url,
        content.text,
        content.duration,
        content.fontSize,
        content.fontColor,
        content.backgroundColor,
        content.alt,
        content.autoplay ? 1 : 0,
        content.loop ? 1 : 0,
        content.muted ? 1 : 0,
        content.metadata,
        content.order,
        content.active ? 1 : 0,
        content.createdAt.toISOString(),
        content.updatedAt.toISOString()
      );
      console.log(`  ✓ ${content.type} 콘텐츠 (${content.id.substring(0, 8)}...)`);
    }

    console.log('\n=== 마이그레이션 완료! ===');
    console.log(`총 ${devices.rows.length}개 디바이스, ${contents.rows.length}개 콘텐츠 마이그레이션됨`);

  } catch (error) {
    console.error('마이그레이션 중 오류:', error);
    throw error;
  } finally {
    await pgClient.end();
    sqlite.close();
    console.log('\n연결 종료됨');
  }
}

migrate().catch(console.error);
