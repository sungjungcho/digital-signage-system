# 디지털 사이니지 시스템 - Docker 버전

## 🚀 빠른 시작 (Windows)

### 1단계: Docker Desktop 설치
https://www.docker.com/products/docker-desktop 에서 다운로드 및 설치

### 2단계: 프로젝트 실행
```bash
# 명령 프롬프트(CMD) 또는 PowerShell에서:
cd digital-signage-system/docker
docker-compose up -d
```

### 3단계: 접속
- 관리자 페이지: http://localhost:3000/admin
- 디스플레이: http://localhost:3000/display/[deviceId]

## 📋 주요 명령어

| 작업 | 명령어 |
|------|--------|
| 시작 | `docker-compose up -d` |
| 중지 | `docker-compose stop` |
| 재시작 | `docker-compose restart` |
| 로그 보기 | `docker-compose logs -f` |
| 완전 삭제 | `docker-compose down` |

## 🔄 업데이트

```bash
# 1. 기존 컨테이너 중지
docker-compose down

# 2. 새 이미지 빌드 및 실행
docker-compose up -d --build
```

**데이터는 자동으로 보존됩니다!**

## 💾 데이터 백업

### Windows (PowerShell)
```powershell
docker run --rm -v signage-data:/data -v ${PWD}:/backup alpine tar czf /backup/backup.tar.gz -C /data .
```

## ❓ 문제 해결

### 포트 충돌
`docker-compose.yml` 파일에서 포트 변경:
```yaml
ports:
  - "3001:3000"  # 3000 → 3001로 변경
```

### 데이터 초기화
```bash
docker-compose down -v
docker-compose up -d
```

## 📖 상세 가이드

전체 설치 가이드는 [DOCKER_SETUP.md](DOCKER_SETUP.md) 참조

## 🎯 특징

✅ 독립 실행 환경 (Node.js 설치 불필요)
✅ 데이터 자동 보존
✅ 쉬운 업데이트
✅ 일관된 실행 환경
✅ 간편한 백업/복원

## 📞 지원

문제 발생 시:
1. `docker-compose logs` 확인
2. Docker Desktop 재시작
3. 컴퓨터 재부팅

---

**Happy Signage! 🎉**
