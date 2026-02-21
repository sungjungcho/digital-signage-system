# 디지털 사이니지 시스템

Next.js 15 기반의 디지털 사이니지 관리 시스템입니다.  
다중 디바이스 콘텐츠 송출, 관리자/슈퍼관리자 권한 분리, 실시간 알림/상태 동기화를 제공합니다.

## 현재 주요 기능

### 콘텐츠/송출
- 텍스트, 이미지, 동영상, YouTube, 혼합(Mixed), 분할 레이아웃 콘텐츠 지원
- 디바이스별 콘텐츠 연결 및 순서 관리(Drag & Drop)
- 스케줄 설정: 항상/특정일/요일/기간 + 시간대
- 디스플레이 페이지 실시간 반영(WebSocket + API)

### 디바이스 관리
- 디바이스 등록/수정/삭제
- 별칭(alias) 기반 접근
- 디바이스별 PIN 인증
- 온라인/오프라인 상태 및 heartbeat 처리

### 사용자/권한
- 회원가입 후 승인 워크플로우(`pending`, `approved`, `rejected`)
- 역할 분리: `user`, `superadmin`
- 슈퍼관리자 전용 사용자/권한/디바이스 승인 관리 페이지 제공
- 환자 관리 메뉴는 **슈퍼관리자 계정에서만 노출**

### 운영 기능
- 공지사항 관리
- 긴급 알림 전송/닫기
- 스케줄 조회 캘린더(한국 공휴일 포함)
  - 2026년부터 제헌절(7/17) 반영
  - 대체공휴일 계산 반영

## 기술 스택

- Frontend: Next.js 15, React 19, Tailwind CSS 4
- Backend: Next.js App Router API Routes
- DB: MariaDB (`mysql2`)
- Realtime: `ws` WebSocket 서버(별도 실행)
- Auth: JWT(`jose`) + HttpOnly 쿠키
- Mail(옵션): Nodemailer SMTP

## 요구 사항

- Node.js 20+
- npm
- MariaDB 10.6+ (또는 호환 MySQL)

## 환경변수

루트에 `.env` 파일을 만들고 아래 값을 설정하세요.

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=signage
DB_PASSWORD=
DB_NAME=signage_db

# Auth
JWT_SECRET=change-this-secret

# Bootstrap superadmin password (db:init 시 사용)
SUPERADMIN_PASSWORD=admin1234

# Optional: base URL (메일 링크 생성용)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Optional: SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SERVICE_NAME=디지털 사이니지 시스템
```

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. DB 초기화

```bash
npm run db:init
```

초기화 시 기본 슈퍼관리자 계정이 생성됩니다.
- 아이디: `superadmin`
- 비밀번호: `SUPERADMIN_PASSWORD` (미설정 시 `admin1234`)

### 3. 개발 서버 실행

웹/WS를 함께 실행:

```bash
npm run dev:all
```

네트워크 바인딩(외부 접속) 필요 시:

```bash
npm run dev:all:host
```

## 접속 경로

- 홈: `http://localhost:3000/`
- 로그인: `http://localhost:3000/login`
- 관리자: `http://localhost:3000/admin`
- 슈퍼관리자: `http://localhost:3000/superadmin`
- 디바이스 연결: `http://localhost:3000/initialize-device`
- 디스플레이: `http://localhost:3000/display/{deviceIdOrAlias}`

## 포트

- Next.js 웹 서버: `3000`
- WebSocket 서버: `3031`
- HTTP 브로드캐스트 서버: `3032`

## 주요 npm 스크립트

- `npm run dev`: Next.js 개발 서버
- `npm run ws-server`: WebSocket/브로드캐스트 서버
- `npm run dev:all`: 웹 + WS 동시 실행
- `npm run build`: 프로덕션 빌드
- `npm run start`: 프로덕션 실행
- `npm run lint`: ESLint 실행
- `npm run test:smoke`: 스모크 테스트(Puppeteer)

## 프로젝트 구조(요약)

```text
src/
  app/
    admin/
    superadmin/
    display/[deviceId]/
    initialize-device/
    api/
  components/
    admin/
    display/
  lib/
    auth.ts
    db.ts
    wsServer.ts
    email.ts
  middleware.ts
scripts/
  init-db.js
  full-smoke-test.js
wsServerEntry.ts
```

## 라이선스

MIT
