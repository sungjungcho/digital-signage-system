@echo off
chcp 65001 >nul
echo ==================================
echo 배포 패키지 생성 중...
echo ==================================
echo.

:: 패키지 이름 및 날짜
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
set PACKAGE_NAME=digital-signage-docker-%mydate%.zip

:: PowerShell을 사용하여 ZIP 생성
powershell -Command "Compress-Archive -Path * -DestinationPath %PACKAGE_NAME% -Force -Exclude node_modules,'.next',data,*.db,*.db-journal,'public/uploads','.git',*.log"

if %errorlevel% equ 0 (
    echo.
    echo ✅ 패키지 생성 완료!
    echo 파일: %PACKAGE_NAME%
    echo.
    echo 이 파일을 다른 PC로 복사하여 사용하세요.
    echo.
) else (
    echo.
    echo ❌ 패키지 생성 실패
    pause
    exit /b 1
)

pause
