# 디지털 사이니지 시스템 - Docker 설치 가이드

## 📋 목차
1. [사전 요구사항](#사전-요구사항)
2. [설치 방법](#설치-방법)
3. [실행 방법](#실행-방법)
4. [업데이트 방법](#업데이트-방법)
5. [데이터 관리](#데이터-관리)
6. [문제 해결](#문제-해결)

---

## 🔧 사전 요구사항

### Docker Desktop 설치 (Windows)

1. **Docker Desktop 다운로드**
   - 웹사이트: https://www.docker.com/products/docker-desktop
   - Windows 10/11 64-bit 필요

2. **설치 실행**
   - 다운로드한 `Docker Desktop Installer.exe` 실행
   - 설치 마법사 따라하기
   - 설치 후 컴퓨터 재시작

3. **Docker 실행 확인**
   - Docker Desktop 앱 실행
   - 시스템 트레이에 Docker 아이콘이 나타나면 정상

---

## 📦 설치 방법

### 방법 1: Docker Compose 사용 (추천)

1. **docker 폴더로 이동**
   ```bash
   cd digital-signage-system/docker
   ```

2. **이미지 빌드 및 실행**
   ```bash
   docker-compose up -d
   ```

   - `-d` 옵션: 백그라운드에서 실행
   - 첫 실행 시 5-10분 소요 (이미지 빌드)

3. **실행 확인**
   ```bash
   docker-compose ps
   ```

### 방법 2: Docker 명령어 직접 사용

1. **이미지 빌드**
   ```bash
   cd digital-signage-system
   docker build -t digital-signage -f docker/Dockerfile .
   ```

2. **컨테이너 실행**
   ```bash
   docker run -d \
     --name digital-signage-app \
     -p 3000:3000 \
     -p 8080:8080 \
     -v signage-data:/app/data \
     -v signage-uploads:/app/public/uploads \
     digital-signage
   ```

---

## 🚀 실행 방법

### 접속 주소

- **관리자 페이지**: http://localhost:3000/admin
- **디스플레이 페이지**: http://localhost:3000/display/[deviceId]

### 다른 PC에서 접속

- **서버 PC의 IP 확인** (예: 192.168.1.100)
- **접속**: http://192.168.1.100:3000/admin

### IP 주소 확인 방법 (Windows)
```bash
ipconfig
```
"IPv4 주소" 확인

---

## 🔄 업데이트 방법

### 새 버전으로 업데이트

1. **기존 컨테이너 중지 및 삭제**
   ```bash
   docker-compose down
   ```

2. **새 코드로 교체**
   - 새 프로젝트 파일로 덮어쓰기

3. **새 이미지 빌드 및 실행**
   ```bash
   docker-compose up -d --build
   ```

### 💡 중요: 데이터는 자동으로 보존됩니다!
- 업데이트 시 등록된 콘텐츠, 디바이스 정보 유지
- Docker Volume에 저장되어 있음

---

## 💾 데이터 관리

### 데이터 백업

```bash
# 데이터 볼륨 백업
docker run --rm -v signage-data:/data -v $(pwd):/backup alpine tar czf /backup/signage-backup-$(date +%Y%m%d).tar.gz -C /data .

# 업로드 파일 백업
docker run --rm -v signage-uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup-$(date +%Y%m%d).tar.gz -C /data .
```

### 데이터 복원

```bash
# 데이터 볼륨 복원
docker run --rm -v signage-data:/data -v $(pwd):/backup alpine tar xzf /backup/signage-backup-YYYYMMDD.tar.gz -C /data

# 업로드 파일 복원
docker run --rm -v signage-uploads:/data -v $(pwd):/backup alpine tar xzf /backup/uploads-backup-YYYYMMDD.tar.gz -C /data
```

### 데이터 초기화 (모든 데이터 삭제)

```bash
docker-compose down -v
```
⚠️ **경고**: 모든 데이터가 삭제됩니다!

---

## 🛠️ 기본 명령어

### 컨테이너 상태 확인
```bash
docker-compose ps
```

### 로그 확인
```bash
# 전체 로그
docker-compose logs

# 실시간 로그 (Ctrl+C로 종료)
docker-compose logs -f

# 최근 100줄만 보기
docker-compose logs --tail=100
```

### 컨테이너 중지
```bash
docker-compose stop
```

### 컨테이너 시작 (이미 생성된 경우)
```bash
docker-compose start
```

### 컨테이너 재시작
```bash
docker-compose restart
```

### 컨테이너 완전 삭제
```bash
docker-compose down
```

---

## ❓ 문제 해결

### 1. 포트가 이미 사용 중입니다

**증상**: "port is already allocated" 오류

**해결**:
```bash
# 다른 포트 사용 (docker-compose.yml 수정)
ports:
  - "3001:3000"  # 3001로 변경
  - "8081:8080"  # 8081로 변경
```

### 2. Docker Desktop이 실행되지 않습니다

**해결**:
1. Windows 작업 관리자에서 Docker Desktop 종료
2. Docker Desktop 재실행
3. WSL 2 업데이트 확인

### 3. 데이터베이스 오류

**해결**:
```bash
# 컨테이너 재시작
docker-compose restart

# 안 되면 초기화
docker-compose down
docker-compose up -d
```

### 4. 이미지/동영상이 표시되지 않습니다

**해결**:
```bash
# uploads 볼륨 확인
docker volume ls

# 볼륨 재생성
docker-compose down
docker volume rm digital-signage-system_signage-uploads
docker-compose up -d
```

### 5. 로그 확인이 필요할 때

```bash
# 상세 로그 보기
docker-compose logs -f digital-signage
```

---

## 📊 성능 최적화

### Docker Desktop 설정

1. **Settings → Resources**
   - **CPU**: 2 cores 이상 권장
   - **Memory**: 2GB 이상 권장
   - **Disk**: 20GB 이상 권장

---

## 🔐 보안 권장사항

1. **외부 접속 허용 시**
   - Windows 방화벽에서 포트 3000, 8080 허용
   - 공유기에서 포트 포워딩 설정 (필요 시)

2. **비밀번호 설정**
   - 관리자 페이지 접근 시 인증 강화 권장

---

## 📞 지원

문제가 지속되면:
1. 로그 파일 확인: `docker-compose logs > error.log`
2. Docker Desktop 재시작
3. 시스템 재부팅

---

## 🎯 빠른 시작 체크리스트

- [ ] Docker Desktop 설치 완료
- [ ] 프로젝트 폴더로 이동
- [ ] `docker-compose up -d` 실행
- [ ] http://localhost:3000/admin 접속 확인
- [ ] 디바이스 등록
- [ ] 콘텐츠 추가
- [ ] 디스플레이 페이지 확인

---

**설치 완료! 🎉**
