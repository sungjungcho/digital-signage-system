-- 디바이스 레이아웃 템플릿 마이그레이션
-- 실행: mysql -u root -p signage_db < migrations/add_layout_template.sql

-- device 테이블에 layout_template 컬럼 추가
ALTER TABLE device ADD COLUMN layout_template VARCHAR(50) DEFAULT 'fullscreen';

-- devicecontent 테이블에 zone_id 컬럼 추가
ALTER TABLE devicecontent ADD COLUMN zone_id VARCHAR(20) DEFAULT 'area-0';

-- 확인
SELECT 'Migration completed!' AS status;
