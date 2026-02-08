const mysql = require('mysql2/promise');
const crypto = require('crypto');

let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch {
  console.error('bcryptjs가 설치되어 있지 않습니다. npm install bcryptjs를 실행하세요.');
  process.exit(1);
}

// .env 파일 로드
try {
  require('dotenv').config();
} catch {
  // dotenv 없으면 환경변수 직접 사용
}

async function initDB() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'signage',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'signage_db',
    waitForConnections: true,
    connectionLimit: 5,
  });

  console.log('데이터베이스 초기화 중...');

  const dbName = process.env.DB_NAME || 'signage_db';

  async function columnExists(tableName, columnName) {
    const [rows] = await pool.execute(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [dbName, tableName, columnName]
    );
    return rows.length > 0;
  }

  async function tableExists(tableName) {
    const [rows] = await pool.execute(
      'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
      [dbName, tableName]
    );
    return rows.length > 0;
  }

  // ============================
  // 1. users 테이블 생성
  // ============================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      name VARCHAR(100),
      max_devices INT DEFAULT 3,
      created_at VARCHAR(30) NOT NULL,
      updated_at VARCHAR(30) NOT NULL,
      INDEX idx_users_username (username),
      INDEX idx_users_role (role),
      INDEX idx_users_status (status)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  console.log('✅ users 테이블 생성/확인 완료');

  // ============================
  // 2. sessions 테이블 생성
  // ============================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      token VARCHAR(500) NOT NULL,
      expires_at VARCHAR(30) NOT NULL,
      created_at VARCHAR(30) NOT NULL,
      INDEX idx_sessions_token (token(255)),
      INDEX idx_sessions_user_id (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  console.log('✅ sessions 테이블 생성/확인 완료');

  // ============================
  // 3. device 테이블 생성
  // ============================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS device (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      location VARCHAR(255) NOT NULL,
      alias VARCHAR(100),
      status VARCHAR(20) DEFAULT 'offline',
      approval_status VARCHAR(20) DEFAULT 'pending',
      user_id VARCHAR(36),
      pin_code VARCHAR(10),
      lastConnected VARCHAR(30),
      createdAt VARCHAR(30) NOT NULL,
      updatedAt VARCHAR(30) NOT NULL,
      INDEX idx_device_user_id (user_id),
      INDEX idx_device_approval_status (approval_status),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  console.log('✅ device 테이블 생성/확인 완료');

  // approval_status 컬럼 추가 (기존 DB 마이그레이션)
  if (await tableExists('device') && !(await columnExists('device', 'approval_status'))) {
    await pool.query("ALTER TABLE device ADD COLUMN approval_status VARCHAR(20) DEFAULT 'approved'");
    console.log('✅ device 테이블에 approval_status 컬럼 추가 완료');
  }

  // ============================
  // 4. devicecontent 테이블 생성
  // ============================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS devicecontent (
      id VARCHAR(36) PRIMARY KEY,
      deviceId VARCHAR(36) NOT NULL,
      type VARCHAR(50) NOT NULL,
      url TEXT,
      text MEDIUMTEXT,
      duration INT NOT NULL,
      fontSize VARCHAR(20),
      fontColor VARCHAR(20),
      backgroundColor VARCHAR(20),
      alt VARCHAR(255),
      autoplay TINYINT(1) DEFAULT 0,
      \`loop\` TINYINT(1) DEFAULT 0,
      muted TINYINT(1) DEFAULT 1,
      metadata MEDIUMTEXT,
      \`order\` INT NOT NULL,
      active TINYINT(1) DEFAULT 1,
      scheduleType VARCHAR(20) DEFAULT 'always',
      specificDate VARCHAR(30),
      daysOfWeek VARCHAR(30),
      startDate VARCHAR(30),
      endDate VARCHAR(30),
      startTime VARCHAR(10),
      endTime VARCHAR(10),
      createdAt VARCHAR(30) NOT NULL,
      updatedAt VARCHAR(30) NOT NULL,
      INDEX idx_devicecontent_deviceId (deviceId),
      FOREIGN KEY (deviceId) REFERENCES device(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  console.log('✅ devicecontent 테이블 생성/확인 완료');

  // ============================
  // 5. content_schedule 테이블 생성
  // ============================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS content_schedule (
      id VARCHAR(36) PRIMARY KEY,
      deviceId VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      scheduleType VARCHAR(50) NOT NULL,
      specificDate VARCHAR(30),
      daysOfWeek VARCHAR(30),
      startDate VARCHAR(30),
      endDate VARCHAR(30),
      priority INT DEFAULT 0,
      active TINYINT(1) DEFAULT 1,
      createdAt VARCHAR(30) NOT NULL,
      updatedAt VARCHAR(30) NOT NULL,
      INDEX idx_content_schedule_deviceId (deviceId),
      FOREIGN KEY (deviceId) REFERENCES device(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  console.log('✅ content_schedule 테이블 생성/확인 완료');

  // ============================
  // 6. time_slot 테이블 생성
  // ============================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS time_slot (
      id VARCHAR(36) PRIMARY KEY,
      scheduleId VARCHAR(36) NOT NULL,
      startTime VARCHAR(10) NOT NULL,
      endTime VARCHAR(10) NOT NULL,
      contentIds TEXT NOT NULL,
      createdAt VARCHAR(30) NOT NULL,
      updatedAt VARCHAR(30) NOT NULL,
      INDEX idx_time_slot_scheduleId (scheduleId),
      FOREIGN KEY (scheduleId) REFERENCES content_schedule(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  console.log('✅ time_slot 테이블 생성/확인 완료');

  // ============================
  // 7. notice 테이블 생성
  // ============================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notice (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      category VARCHAR(50),
      favorite TINYINT(1) DEFAULT 0,
      lastUsedAt VARCHAR(30),
      usageCount INT DEFAULT 0,
      createdAt VARCHAR(30) NOT NULL,
      updatedAt VARCHAR(30) NOT NULL,
      INDEX idx_notice_category (category),
      INDEX idx_notice_favorite (favorite)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  console.log('✅ notice 테이블 생성/확인 완료');

  // ============================
  // 8. device_requests 테이블 생성
  // ============================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS device_requests (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      requested_count INT NOT NULL,
      current_max INT NOT NULL,
      reason TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      approved_count INT,
      approved_by VARCHAR(36),
      approved_at VARCHAR(30),
      created_at VARCHAR(30) NOT NULL,
      updated_at VARCHAR(30) NOT NULL,
      INDEX idx_device_requests_user_id (user_id),
      INDEX idx_device_requests_status (status),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  console.log('✅ device_requests 테이블 생성/확인 완료');

  // ============================
  // 9. device_patients 테이블 생성 (디바이스별 환자 대기 목록)
  // ============================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS device_patients (
      id VARCHAR(36) PRIMARY KEY,
      device_id VARCHAR(36) NOT NULL,
      name VARCHAR(100) NOT NULL,
      number INT NOT NULL,
      department VARCHAR(100) NOT NULL,
      created_at VARCHAR(30) NOT NULL,
      INDEX idx_device_patients_device_id (device_id),
      INDEX idx_device_patients_number (number),
      FOREIGN KEY (device_id) REFERENCES device(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  console.log('✅ device_patients 테이블 생성/확인 완료');

  // ============================
  // 9-1. device_notices 테이블 생성 (디바이스별 공지사항)
  // ============================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS device_notices (
      id VARCHAR(36) PRIMARY KEY,
      device_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      category VARCHAR(50),
      favorite TINYINT(1) DEFAULT 0,
      lastUsedAt VARCHAR(30),
      usageCount INT DEFAULT 0,
      createdAt VARCHAR(30) NOT NULL,
      updatedAt VARCHAR(30) NOT NULL,
      INDEX idx_device_notices_device_id (device_id),
      INDEX idx_device_notices_category (category),
      FOREIGN KEY (device_id) REFERENCES device(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  console.log('✅ device_notices 테이블 생성/확인 완료');

  // ============================
  // 10. 기존 device_accounts, device_sessions 테이블 삭제
  // ============================
  if (await tableExists('device_sessions')) {
    await pool.query('DROP TABLE device_sessions');
    console.log('✅ device_sessions 테이블 삭제됨');
  }
  if (await tableExists('device_accounts')) {
    await pool.query('DROP TABLE device_accounts');
    console.log('✅ device_accounts 테이블 삭제됨');
  }

  // ============================
  // 10. 기본 superadmin 계정 생성
  // ============================
  const [superadminRows] = await pool.execute("SELECT id FROM users WHERE role = 'superadmin'");

  if (superadminRows.length === 0) {
    const superadminId = crypto.randomUUID();
    const superadminPassword = process.env.SUPERADMIN_PASSWORD || 'admin1234';
    const passwordHash = bcrypt.hashSync(superadminPassword, 12);
    const now = new Date().toISOString();

    await pool.execute(
      'INSERT INTO users (id, username, email, password_hash, role, status, name, max_devices, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [superadminId, 'superadmin', null, passwordHash, 'superadmin', 'approved', '슈퍼관리자', 999, now, now]
    );

    console.log('✅ 기본 superadmin 계정 생성됨');
    console.log('   - 아이디: superadmin');
    console.log(`   - 비밀번호: ${superadminPassword}`);
    console.log('   ⚠️  프로덕션 배포 전 비밀번호를 변경하세요!');

    // 기존 디바이스들을 superadmin에게 할당
    const [result] = await pool.execute('UPDATE device SET user_id = ? WHERE user_id IS NULL', [superadminId]);
    if (result.affectedRows > 0) {
      console.log(`✅ 기존 디바이스 ${result.affectedRows}개를 superadmin에게 할당됨`);
    }
  } else {
    console.log('✅ superadmin 계정이 이미 존재합니다.');

    // 소유자 없는 디바이스가 있다면 superadmin에게 할당
    const superadmin = superadminRows[0];
    const [result] = await pool.execute('UPDATE device SET user_id = ? WHERE user_id IS NULL', [superadmin.id]);
    if (result.affectedRows > 0) {
      console.log(`✅ 소유자 없는 디바이스 ${result.affectedRows}개를 superadmin에게 할당됨`);
    }
  }

  console.log('\n✅ 데이터베이스가 성공적으로 초기화되었습니다!');
  console.log(`📁 MariaDB: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}/${dbName}`);

  await pool.end();
}

initDB().catch((err) => {
  console.error('❌ 데이터베이스 초기화 실패:', err);
  process.exit(1);
});
