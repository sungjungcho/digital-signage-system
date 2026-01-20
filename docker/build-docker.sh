#!/bin/bash

# 디지털 사이니지 시스템 - Docker 빌드 스크립트

echo "=================================="
echo "디지털 사이니지 Docker 빌드"
echo "=================================="
echo ""

# 버전 입력 받기
read -p "버전을 입력하세요 (예: 1.0.0): " VERSION

if [ -z "$VERSION" ]; then
    VERSION="latest"
fi

echo ""
echo "빌드 시작..."
echo "버전: $VERSION"
echo ""

# Docker 이미지 빌드
docker build -t digital-signage:$VERSION .

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 빌드 성공!"
    echo ""
    echo "생성된 이미지:"
    docker images | grep digital-signage
    echo ""
    echo "실행 방법:"
    echo "  docker-compose up -d"
    echo ""
    echo "또는:"
    echo "  docker run -d -p 3000:3000 -p 8080:8080 digital-signage:$VERSION"
    echo ""
else
    echo ""
    echo "❌ 빌드 실패"
    echo "에러 로그를 확인하세요."
    exit 1
fi
