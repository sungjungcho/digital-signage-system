-- 사용자 테이블에 전화번호 필드 추가
ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT NULL AFTER email;
