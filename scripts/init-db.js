const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 데이터 디렉토리 생성
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'signage.db');
const db = new Database(dbPath);

console.log('데이터베이스 초기화 중...');

// 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS device (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT DEFAULT 'offline',
    lastConnected TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS devicecontent (
    id TEXT PRIMARY KEY,
    deviceId TEXT NOT NULL,
    type TEXT NOT NULL,
    url TEXT,
    text TEXT,
    duration INTEGER NOT NULL,
    fontSize TEXT,
    fontColor TEXT,
    backgroundColor TEXT,
    alt TEXT,
    autoplay INTEGER DEFAULT 0,
    loop INTEGER DEFAULT 0,
    muted INTEGER DEFAULT 1,
    metadata TEXT,
    "order" INTEGER NOT NULL,
    active INTEGER DEFAULT 1,
    scheduleType TEXT DEFAULT 'always',
    specificDate TEXT,
    daysOfWeek TEXT,
    startDate TEXT,
    endDate TEXT,
    startTime TEXT,
    endTime TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (deviceId) REFERENCES device(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_devicecontent_deviceId ON devicecontent(deviceId);

  CREATE TABLE IF NOT EXISTS content_schedule (
    id TEXT PRIMARY KEY,
    deviceId TEXT NOT NULL,
    name TEXT NOT NULL,
    scheduleType TEXT NOT NULL,
    specificDate TEXT,
    daysOfWeek TEXT,
    startDate TEXT,
    endDate TEXT,
    priority INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (deviceId) REFERENCES device(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS time_slot (
    id TEXT PRIMARY KEY,
    scheduleId TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    contentIds TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (scheduleId) REFERENCES content_schedule(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_content_schedule_deviceId ON content_schedule(deviceId);
  CREATE INDEX IF NOT EXISTS idx_time_slot_scheduleId ON time_slot(scheduleId);

  CREATE TABLE IF NOT EXISTS notice (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    favorite INTEGER DEFAULT 0,
    lastUsedAt TEXT,
    usageCount INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_notice_category ON notice(category);
  CREATE INDEX IF NOT EXISTS idx_notice_favorite ON notice(favorite);
`);

console.log('✅ 데이터베이스가 성공적으로 초기화되었습니다!');
console.log(`📁 위치: ${dbPath}`);

db.close();
