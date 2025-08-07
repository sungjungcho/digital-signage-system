# 디지털 사이니지 시스템

이 프로젝트는 Next.js 기반의 디지털 사이니지 시스템으로, 다양한 디바이스에서 동적 콘텐츠를 표시하고 관리할 수 있는 솔루션입니다.

## 주요 기능

- **디지털 사이니지 콘텐츠 표시**: 텍스트, 이미지, 비디오 등 다양한 형태의 콘텐츠 지원
- **실시간 콘텐츠 업데이트**: API를 통한 콘텐츠 실시간 갱신
- **관리자 인터페이스**: 콘텐츠 및 디바이스 관리를 위한 직관적인 대시보드
- **스케줄링 기능**: 시간 기반의 콘텐츠 교체 기능
- **반응형 레이아웃**: 다양한 디스플레이 크기 지원

## 기술 스택

- **프론트엔드**: Next.js, React, Tailwind CSS
- **백엔드**: Next.js API Routes
- **데이터베이스**: PostgreSQL, Prisma ORM
- **배포**: Vercel (예정)

## 프로젝트 구조

- `/src/app`: App Router 기반의 페이지 및 레이아웃 컴포넌트
- `/src/components`: 재사용 가능한 UI 컴포넌트
- `/src/lib`: 유틸리티 함수 및 공통 로직
- `/src/types`: TypeScript 타입 정의

## 시작하기

### 1. 저장소 클론

```bash
git clone https://github.com/yourusername/digital-signage-system.git
cd digital-signage-system
```

### 2. 의존성 설치

```bash
npm install
# 또는
yarn install
```

### 3. 환경 변수 설정

`.env` 파일을 생성하고 다음 변수를 설정합니다:

```
DATABASE_URL="postgresql://username:password@localhost:5432/digital_signage"
```

### 4. 데이터베이스 마이그레이션

```bash
npx prisma migrate dev
```

### 5. 개발 서버 실행

```bash
npm run dev
# 또는
yarn dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 결과를 확인하세요.

## 기여 방법

1. 이 저장소를 포크합니다.
2. 새로운 기능 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m '새로운 기능 추가'`)
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다.
