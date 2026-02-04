require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkDB() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'signage',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'signage_db',
  });

  console.log('\n=== 최근 등록된 콘텐츠 5개 ===');
  const [contents] = await connection.execute(`
    SELECT id, deviceId, type, duration, active,
           LENGTH(metadata) as metadata_length,
           SUBSTRING(metadata, 1, 100) as metadata_preview,
           \`order\`, createdAt
    FROM devicecontent
    ORDER BY createdAt DESC
    LIMIT 5
  `);

  contents.forEach((content, index) => {
    console.log(`\n[${index + 1}] ${content.type} 콘텐츠`);
    console.log(`  - ID: ${content.id}`);
    console.log(`  - DeviceID: ${content.deviceId}`);
    console.log(`  - Duration: ${content.duration}ms`);
    console.log(`  - Active: ${content.active}`);
    console.log(`  - Order: ${content.order}`);
    console.log(`  - Metadata length: ${content.metadata_length || 0}`);
    if (content.metadata_preview) {
      console.log(`  - Metadata preview: ${content.metadata_preview}...`);
    }
    console.log(`  - Created: ${content.createdAt}`);
  });

  console.log('\n=== 복합형 콘텐츠만 확인 ===');
  const [mixedContents] = await connection.execute(`
    SELECT * FROM devicecontent WHERE type = 'mixed'
  `);

  console.log(`총 ${mixedContents.length}개의 복합형 콘텐츠 발견`);
  mixedContents.forEach((content, index) => {
    console.log(`\n[복합형 ${index + 1}]`);
    console.log(`  - ID: ${content.id}`);
    console.log(`  - DeviceID: ${content.deviceId}`);
    console.log(`  - Active: ${content.active}`);
    if (content.metadata) {
      try {
        const elements = JSON.parse(content.metadata);
        console.log(`  - 요소 개수: ${elements.length}개`);
        console.log(`  - 요소 타입: ${elements.map(e => e.type).join(', ')}`);
      } catch (e) {
        console.log(`  - Metadata 파싱 오류: ${e.message}`);
      }
    }
  });

  await connection.end();
}

checkDB().catch(err => {
  console.error('DB 확인 오류:', err);
  process.exit(1);
});
