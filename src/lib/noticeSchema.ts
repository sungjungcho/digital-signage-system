import { execute, query } from '@/lib/db';

export async function ensureNoticeSchema(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS device_display_settings (
      device_id VARCHAR(36) PRIMARY KEY,
      notice_enabled TINYINT(1) DEFAULT 1,
      notice_default_mode VARCHAR(20) DEFAULT 'ticker',
      notice_item_duration_sec INT DEFAULT 8,
      notice_max_items INT DEFAULT 3,
      updatedAt VARCHAR(30) NOT NULL,
      FOREIGN KEY (device_id) REFERENCES device(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await execute('ALTER TABLE device_notices ADD COLUMN IF NOT EXISTS active TINYINT(1) DEFAULT 1');
  await execute('ALTER TABLE device_notices ADD COLUMN IF NOT EXISTS priority INT DEFAULT 0');
  await execute('ALTER TABLE device_notices ADD COLUMN IF NOT EXISTS startAt VARCHAR(30) NULL');
  await execute('ALTER TABLE device_notices ADD COLUMN IF NOT EXISTS endAt VARCHAR(30) NULL');
}
