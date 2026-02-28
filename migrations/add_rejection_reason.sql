-- 디바이스 테이블에 거부 사유 컬럼 추가
ALTER TABLE device ADD COLUMN rejection_reason TEXT DEFAULT NULL;
