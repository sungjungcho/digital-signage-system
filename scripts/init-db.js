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
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (deviceId) REFERENCES device(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_devicecontent_deviceId ON devicecontent(deviceId);
`);

console.log('✅ 데이터베이스가 성공적으로 초기화되었습니다!');
console.log(`📁 위치: ${dbPath}`);

db.close();
