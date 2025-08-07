# 다중 모니터 지원을 위한 추가 개발 계획

## 필요한 기능

### 1. 멀티 디스플레이 매니저 컴포넌트
- 하나의 PC에서 여러 모니터에 다른 콘텐츠 표시
- Electron 앱으로 변환하여 각 모니터별 창 관리

### 2. 모니터 감지 및 할당
- 연결된 모니터 자동 감지
- 각 모니터를 특정 디바이스 ID에 할당

### 3. 전체화면 관리
- 각 모니터에서 전체화면 모드 실행
- 키보드/마우스 입력 비활성화

## 구현 방법

### Electron 앱 변환
```javascript
// main.js
const { app, BrowserWindow, screen } = require('electron');

app.whenReady().then(() => {
  const displays = screen.getAllDisplays();
  
  displays.forEach((display, index) => {
    const win = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      fullscreen: true,
      kiosk: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    
    win.loadURL(`http://localhost:3000/display/device${index + 1}`);
  });
});
```

### 모니터 설정 UI 추가
- 관리자 페이지에 모니터 매핑 설정 추가
- 각 모니터별 디바이스 할당 인터페이스

## 예상 개발 시간
- Electron 변환: 1-2주
- 다중 모니터 관리: 1주  
- UI/UX 개선: 1주
- 테스트 및 최적화: 1주

총 4-5주 소요 예상
