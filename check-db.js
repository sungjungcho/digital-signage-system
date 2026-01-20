const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'signage.db');
const db = new Database(dbPath);

console.log('\n=== 최근 등록된 콘텐츠 5개 ===');
const contents = db.prepare(`
  SELECT id, deviceId, type, duration, active,
         LENGTH(metadata) as metadata_length,
         SUBSTR(metadata, 1, 100) as metadata_preview,
         "order", createdAt
  FROM devicecontent
  ORDER BY createdAt DESC
  LIMIT 5
`).all();

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
const mixedContents = db.prepare(`
  SELECT * FROM devicecontent WHERE type = 'mixed'
`).all();

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

db.close();
