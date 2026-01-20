const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'signage.db');
const db = new Database(dbPath);

console.log('🔄 스케줄 마이그레이션 시작...');

try {
  // 트랜잭션 시작
  db.exec('BEGIN TRANSACTION');

  // 1. devicecontent 테이블에 스케줄 관련 컬럼 추가
  console.log('📋 devicecontent 테이블에 스케줄 컬럼 추가...');

  const columnsToAdd = [
    { name: 'scheduleType', type: 'TEXT DEFAULT "always"' },
    { name: 'specificDate', type: 'TEXT' },
    { name: 'daysOfWeek', type: 'TEXT' },
    { name: 'startDate', type: 'TEXT' },
    { name: 'endDate', type: 'TEXT' },
    { name: 'startTime', type: 'TEXT' },
    { name: 'endTime', type: 'TEXT' }
  ];

  columnsToAdd.forEach(col => {
    try {
      db.exec(`ALTER TABLE devicecontent ADD COLUMN ${col.name} ${col.type}`);
      console.log(`  ✓ ${col.name} 컬럼 추가 완료`);
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log(`  ⊘ ${col.name} 컬럼이 이미 존재함`);
      } else {
        throw error;
      }
    }
  });

  // 2. 기존 스케줄 데이터 마이그레이션
  console.log('\n📦 기존 스케줄 데이터 마이그레이션...');

  const schedules = db.prepare(`
    SELECT s.*, GROUP_CONCAT(t.id || ':' || t.startTime || ':' || t.endTime || ':' || t.contentIds, '||') as timeSlots
    FROM content_schedule s
    LEFT JOIN time_slot t ON s.id = t.scheduleId
    WHERE s.active = 1
    GROUP BY s.id
  `).all();

  console.log(`  발견된 스케줄: ${schedules.length}개`);

  let migratedCount = 0;
  schedules.forEach(schedule => {
    if (!schedule.timeSlots) {
      console.log(`  ⚠ 스케줄 "${schedule.name}"에 타임슬롯이 없음 - 건너뜀`);
      return;
    }

    const timeSlots = schedule.timeSlots.split('||');

    timeSlots.forEach(slotData => {
      const [slotId, startTime, endTime, contentIds] = slotData.split(':');
      const contentIdList = contentIds.split(',');

      contentIdList.forEach(contentId => {
        const updateData = {
          scheduleType: schedule.scheduleType,
          specificDate: schedule.specificDate,
          daysOfWeek: schedule.daysOfWeek,
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          startTime: startTime,
          endTime: endTime
        };

        const result = db.prepare(`
          UPDATE devicecontent
          SET scheduleType = ?,
              specificDate = ?,
              daysOfWeek = ?,
              startDate = ?,
              endDate = ?,
              startTime = ?,
              endTime = ?
          WHERE id = ?
        `).run(
          updateData.scheduleType,
          updateData.specificDate,
          updateData.daysOfWeek,
          updateData.startDate,
          updateData.endDate,
          updateData.startTime,
          updateData.endTime,
          contentId
        );

        if (result.changes > 0) {
          migratedCount++;
          console.log(`  ✓ 콘텐츠 ${contentId}에 스케줄 적용: ${startTime}-${endTime}`);
        }
      });
    });
  });

  console.log(`\n✅ ${migratedCount}개 콘텐츠에 스케줄 마이그레이션 완료`);

  // 3. 기존 스케줄 테이블 백업 후 삭제 (선택사항)
  console.log('\n🗑️  기존 스케줄 테이블 처리...');
  console.log('  ℹ️  기존 테이블은 보존됩니다 (필요시 수동으로 삭제하세요)');
  console.log('     - content_schedule');
  console.log('     - time_slot');
  console.log('  삭제 명령어:');
  console.log('     DROP TABLE IF EXISTS time_slot;');
  console.log('     DROP TABLE IF EXISTS content_schedule;');

  // 트랜잭션 커밋
  db.exec('COMMIT');

  console.log('\n✅ 마이그레이션이 성공적으로 완료되었습니다!');
  console.log('\n📊 마이그레이션 요약:');
  console.log(`   - 추가된 컬럼: ${columnsToAdd.length}개`);
  console.log(`   - 마이그레이션된 콘텐츠: ${migratedCount}개`);
  console.log(`   - 처리된 스케줄: ${schedules.length}개`);

} catch (error) {
  // 에러 발생 시 롤백
  db.exec('ROLLBACK');
  console.error('\n❌ 마이그레이션 실패:', error);
  console.error('   모든 변경사항이 롤백되었습니다.');
  process.exit(1);
} finally {
  db.close();
}
