@echo off
chcp 65001 >nul
echo ==================================
echo 디지털 사이니지 Docker 빌드
echo ==================================
echo.

set /p VERSION="버전을 입력하세요 (예: 1.0.0, 엔터=latest): "

if "%VERSION%"=="" set VERSION=latest

echo.
echo 빌드 시작...
echo 버전: %VERSION%
echo.

docker build -t digital-signage:%VERSION% .

if %errorlevel% equ 0 (
    echo.
    echo ✅ 빌드 성공!
    echo.
    echo 생성된 이미지:
    docker images | findstr digital-signage
    echo.
    echo 실행 방법:
    echo   docker-compose up -d
    echo.
    echo 또는:
    echo   docker run -d -p 3000:3000 -p 8080:8080 digital-signage:%VERSION%
    echo.
) else (
    echo.
    echo ❌ 빌드 실패
    echo 에러 로그를 확인하세요.
    pause
    exit /b 1
)

pause
