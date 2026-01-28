const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// bcryptjs는 init 스크립트에서 직접 사용
let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch {
  console.error('bcryptjs가 설치되어 있지 않습니다. npm install bcryptjs를 실행하세요.');
  process.exit(1);
}

// 데이터 디렉토리 생성
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'signage.db');
const db = new Database(dbPath);

console.log('데이터베이스 초기화 중...');

// 기존 테이블 확인
function tableExists(tableName) {
  const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
  return !!result;
}

function columnExists(tableName, columnName) {
  try {
    const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
    return tableInfo.some(col => col.name === columnName);
  } catch {
    return false;
  }
}

// ============================
// 1. users 테이블 생성
// ============================
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'pending',
    name TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
`);
console.log('✅ users 테이블 생성/확인 완료');

// ============================
// 2. sessions 테이블 생성
// ============================
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
`);
console.log('✅ sessions 테이블 생성/확인 완료');

// ============================
// 3. device 테이블 수정 (user_id, pin_code 컬럼 추가)
// ============================
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
`);

// alias 컬럼 추가 (이전 마이그레이션)
if (!columnExists('device', 'alias')) {
  db.exec(`ALTER TABLE device ADD COLUMN alias TEXT`);
  console.log('✅ device 테이블에 alias 컬럼 추가됨');
}

// user_id 컬럼 추가
if (!columnExists('device', 'user_id')) {
  db.exec(`ALTER TABLE device ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL`);
  console.log('✅ device 테이블에 user_id 컬럼 추가됨');
}

// pin_code 컬럼 추가
if (!columnExists('device', 'pin_code')) {
  db.exec(`ALTER TABLE device ADD COLUMN pin_code TEXT`);
  // 기존 디바이스에 기본 PIN 설정
  db.exec(`UPDATE device SET pin_code = '0000' WHERE pin_code IS NULL`);
  console.log('✅ device 테이블에 pin_code 컬럼 추가됨 (기본값: 0000)');
}

// device user_id 인덱스 생성
try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_device_user_id ON device(user_id)`);
} catch (e) {
  // 인덱스 이미 존재하는 경우 무시
}

// ============================
// 4. 기타 테이블 (변경 없음)
// ============================
db.exec(`
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

// ============================
// 5. 기존 device_accounts, device_sessions 테이블 삭제
// ============================
if (tableExists('device_sessions')) {
  db.exec(`DROP TABLE device_sessions`);
  console.log('✅ device_sessions 테이블 삭제됨');
}

if (tableExists('device_accounts')) {
  db.exec(`DROP TABLE device_accounts`);
  console.log('✅ device_accounts 테이블 삭제됨');
}

// ============================
// 6. 기본 superadmin 계정 생성
// ============================
const superadminExists = db.prepare("SELECT id FROM users WHERE role = 'superadmin'").get();

if (!superadminExists) {
  const superadminId = crypto.randomUUID();
  const superadminPassword = process.env.SUPERADMIN_PASSWORD || 'admin1234';
  const passwordHash = bcrypt.hashSync(superadminPassword, 12);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, role, status, name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(superadminId, 'superadmin', null, passwordHash, 'superadmin', 'approved', '슈퍼관리자', now, now);

  console.log('✅ 기본 superadmin 계정 생성됨');
  console.log(`   - 아이디: superadmin`);
  console.log(`   - 비밀번호: ${superadminPassword}`);
  console.log('   ⚠️  프로덕션 배포 전 비밀번호를 변경하세요!');

  // 기존 디바이스들을 superadmin에게 할당
  const deviceCount = db.prepare(`UPDATE device SET user_id = ? WHERE user_id IS NULL`).run(superadminId);
  if (deviceCount.changes > 0) {
    console.log(`✅ 기존 디바이스 ${deviceCount.changes}개를 superadmin에게 할당됨`);
  }
} else {
  console.log('✅ superadmin 계정이 이미 존재합니다.');

  // 소유자 없는 디바이스가 있다면 superadmin에게 할당
  const superadmin = db.prepare("SELECT id FROM users WHERE role = 'superadmin'").get();
  if (superadmin) {
    const deviceCount = db.prepare(`UPDATE device SET user_id = ? WHERE user_id IS NULL`).run(superadmin.id);
    if (deviceCount.changes > 0) {
      console.log(`✅ 소유자 없는 디바이스 ${deviceCount.changes}개를 superadmin에게 할당됨`);
    }
  }
}

console.log('\n✅ 데이터베이스가 성공적으로 초기화되었습니다!');
console.log(`📁 위치: ${dbPath}`);

db.close();
