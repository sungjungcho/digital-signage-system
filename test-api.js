const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'signage.db');
const db = new Database(dbPath);

const deviceId = '7429620b-277b-4e24-ab32-def06310bbc9';

console.log(`\n=== 디바이스 ${deviceId}의 콘텐츠 조회 ===\n`);

// API 로직과 동일하게 조회
const deviceContents = db.prepare(`
  SELECT * FROM devicecontent
  WHERE deviceId = ? AND active = 1
  ORDER BY "order" ASC
`).all(deviceId);

console.log(`조회된 콘텐츠 개수: ${deviceContents.length}개\n`);

// 복합형 콘텐츠 파싱 (API와 동일한 로직)
const processedContents = deviceContents.map(content => {
  if (content.type === 'mixed' && content.metadata) {
    try {
      const elements = JSON.parse(content.metadata);
      console.log(`[복합형 파싱] contentId: ${content.id}`);
      console.log(`  - metadata 타입: ${typeof content.metadata}`);
      console.log(`  - metadata 길이: ${content.metadata.length}`);
      console.log(`  - elements 타입: ${typeof elements}`);
      console.log(`  - elements 배열 여부: ${Array.isArray(elements)}`);
      console.log(`  - elements 개수: ${Array.isArray(elements) ? elements.length : 'N/A'}`);
      if (Array.isArray(elements) && elements.length > 0) {
        console.log(`  - 첫 번째 요소:`, elements[0]);
      }

      return {
        ...content,
        elements,
        metadata: undefined
      };
    } catch (error) {
      console.error('복합형 콘텐츠 metadata 파싱 오류:', error);
      return content;
    }
  }
  return content;
});

console.log(`\n=== 최종 처리된 콘텐츠 ===\n`);
processedContents.forEach((content, index) => {
  console.log(`[${index + 1}] ${content.type} (order: ${content.order})`);
  if (content.type === 'mixed') {
    console.log(`  - elements 존재: ${!!content.elements}`);
    console.log(`  - elements 개수: ${content.elements?.length || 0}`);
    console.log(`  - metadata 제거됨: ${content.metadata === undefined}`);
  }
});

db.close();
