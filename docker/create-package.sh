#!/bin/bash

echo "=================================="
echo "배포 패키지 생성 중..."
echo "=================================="

# 패키지 이름 및 날짜
DATE=$(date +%Y%m%d)
PACKAGE_NAME="digital-signage-docker-$DATE.tar.gz"

# 제외할 파일/폴더 목록
EXCLUDE_PATTERNS=(
    "--exclude=node_modules"
    "--exclude=.next"
    "--exclude=data"
    "--exclude=*.db"
    "--exclude=*.db-journal"
    "--exclude=public/uploads"
    "--exclude=.git"
    "--exclude=*.log"
)

# 프로젝트 루트로 이동
cd ..

# tar.gz 생성
tar czf "docker/$PACKAGE_NAME" ${EXCLUDE_PATTERNS[@]} .

# docker 폴더로 이동
cd docker

echo ""
echo "✅ 패키지 생성 완료!"
echo "파일: $PACKAGE_NAME"
echo "위치: $(pwd)/$PACKAGE_NAME"
echo ""
echo "이 파일을 다른 PC로 복사하여 사용하세요."
echo ""
