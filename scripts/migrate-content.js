const mysql = require('mysql2/promise');
const crypto = require('crypto');

// .env 파일 로드
try {
  require('dotenv').config();
} catch {
  // dotenv 없으면 환경변수 직접 사용
}

async function migrateContent() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'signage',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'signage_db',
    waitForConnections: true,
    connectionLimit: 5,
  });

  console.log('콘텐츠 마이그레이션 시작...\n');

  try {
    // 1. 기존 devicecontent 데이터 조회
    const [deviceContents] = await pool.execute(`
      SELECT
        dc.*,
        d.user_id as device_user_id
      FROM devicecontent dc
      LEFT JOIN device d ON dc.deviceId = d.id
      ORDER BY dc.deviceId, dc.\`order\`
    `);

    console.log(`총 ${deviceContents.length}개의 기존 콘텐츠 발견\n`);

    if (deviceContents.length === 0) {
      console.log('마이그레이션할 데이터가 없습니다.');
      await pool.end();
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;

    for (const dc of deviceContents) {
      // 이미 마이그레이션된 콘텐츠인지 확인 (같은 ID로 content 테이블에 존재하는지)
      const [existing] = await pool.execute(
        'SELECT id FROM content WHERE id = ?',
        [dc.id]
      );

      if (existing.length > 0) {
        console.log(`⏭️  건너뜀 (이미 존재): ${dc.id}`);
        skippedCount++;
        continue;
      }

      // 콘텐츠 이름 생성 (type + 날짜 기반)
      const contentName = `${dc.type}_${new Date(dc.createdAt).toLocaleDateString('ko-KR').replace(/\. /g, '-').replace('.', '')}`;

      // 2. content 테이블에 삽입
      await pool.execute(`
        INSERT INTO content (
          id, name, type, url, text, duration,
          fontSize, fontColor, backgroundColor,
          alt, autoplay, \`loop\`, muted, metadata,
          user_id, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        dc.id,
        contentName,
        dc.type,
        dc.url,
        dc.text,
        dc.duration,
        dc.fontSize,
        dc.fontColor,
        dc.backgroundColor,
        dc.alt,
        dc.autoplay,
        dc.loop,
        dc.muted,
        dc.metadata,
        dc.device_user_id,
        dc.createdAt,
        dc.updatedAt
      ]);

      // 3. device_content 연결 테이블에 삽입
      const linkId = crypto.randomUUID();
      await pool.execute(`
        INSERT INTO device_content (
          id, device_id, content_id, \`order\`, active,
          scheduleType, specificDate, daysOfWeek,
          startDate, endDate, startTime, endTime,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        linkId,
        dc.deviceId,
        dc.id,
        dc.order,
        dc.active,
        dc.scheduleType,
        dc.specificDate,
        dc.daysOfWeek,
        dc.startDate,
        dc.endDate,
        dc.startTime,
        dc.endTime,
        dc.createdAt,
        dc.updatedAt
      ]);

      console.log(`✅ 마이그레이션 완료: ${dc.type} (${dc.id.substring(0, 8)}...) → 디바이스 ${dc.deviceId.substring(0, 8)}...`);
      migratedCount++;
    }

    console.log('\n========================================');
    console.log(`✅ 마이그레이션 완료: ${migratedCount}개`);
    console.log(`⏭️  건너뜀: ${skippedCount}개`);
    console.log('========================================\n');

    // 4. 결과 확인
    const [contentCount] = await pool.execute('SELECT COUNT(*) as count FROM content');
    const [linkCount] = await pool.execute('SELECT COUNT(*) as count FROM device_content');

    console.log('현재 테이블 상태:');
    console.log(`- content 테이블: ${contentCount[0].count}개`);
    console.log(`- device_content 테이블: ${linkCount[0].count}개`);

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
  } finally {
    await pool.end();
  }
}

migrateContent();
