import { WebSocketServer, WebSocket, RawData } from 'ws';
import { alerts, Alert } from './alertStore';

// 디바이스별 연결 관리
const deviceSockets: Map<string, WebSocket> = new Map();

// WebSocket 서버 인스턴스 (포트 3031)
// Next.js에서 import되어도 중복 실행 방지
let wss: WebSocketServer;
if (!(globalThis as any).wss) {
  try {
    wss = new WebSocketServer({ port: 3031, host: '0.0.0.0' }); // 모든 네트워크에서 접근 가능
    (globalThis as any).wss = wss;
    (globalThis as any).deviceSockets = deviceSockets;
    console.log('WebSocket 서버 새로 생성됨');
  } catch (err) {
    console.log('WebSocket 서버 생성 실패:', err);
    // 기존 서버가 있다면 재사용
    if ((globalThis as any).wss) {
      wss = (globalThis as any).wss;
      console.log('기존 WebSocket 서버 재사용');
    } else {
      throw err;
    }
  }

  wss.on('connection', (ws: WebSocket, req: any) => {
    // 디바이스 ID는 쿼리스트링으로 전달 (예: ws://host:3031?deviceId=xxx)
  // req.url이 /?deviceId=xxx 또는 ?deviceId=xxx 모두 지원
  let urlString = req.url || '';
  if (!urlString.startsWith('/')) urlString = '/' + urlString;
  const url = new URL(urlString, `http://${req.headers.host}`);
  const deviceId = url.searchParams.get('deviceId');
    console.log('WebSocket 연결됨:', deviceId, req.url);
    if (!deviceId) {
      ws.close(1008, 'deviceId required');
      return;
    }
    deviceSockets.set(deviceId, ws);
    // 글로벌 저장소에도 업데이트
    if ((globalThis as any).deviceSockets) {
      (globalThis as any).deviceSockets.set(deviceId, ws);
    }
    console.log('디바이스 연결 등록됨:', deviceId, ', 총 연결 수:', deviceSockets.size);

    // 연결 시점에 해당 디바이스의 최신 알림 전송
    const deviceAlerts = alerts.filter((a: Alert) => a.targetDeviceIds.includes(deviceId));
    if (deviceAlerts.length > 0) {
      ws.send(JSON.stringify({ type: 'init', alerts: deviceAlerts }));
    }

    ws.on('close', () => {
      deviceSockets.delete(deviceId);
      // 글로벌 저장소에서도 삭제
      if ((globalThis as any).deviceSockets) {
        (globalThis as any).deviceSockets.delete(deviceId);
      }
      console.log('WebSocket 연결 해제:', deviceId, ', 남은 연결 수:', deviceSockets.size);
    });
  });

  wss.on('listening', () => {
    console.log('WebSocket 서버가 3031 포트에서 실행 중입니다.');
  });
} else {
  wss = (globalThis as any).wss;
  // 기존 deviceSockets 맵을 재사용
  if ((globalThis as any).deviceSockets) {
    const globalDeviceSockets = (globalThis as any).deviceSockets;
    globalDeviceSockets.forEach((ws: WebSocket, deviceId: string) => {
      deviceSockets.set(deviceId, ws);
    });
    console.log('기존 디바이스 연결 복원됨, 연결된 디바이스 수:', deviceSockets.size);
  }
}

// 알림 브로드캐스트 함수
export function broadcastAlertToDevices(alert: Alert) {
  console.log('브로드캐스트:', alert);
  alert.targetDeviceIds.forEach((deviceId: string) => {
    const ws = deviceSockets.get(deviceId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'alert', alert }));
      console.log(`알림 전송: ${deviceId}`);
    } else {
      console.log(`연결 없음: ${deviceId}`);
    }
  });
}

// 단일 디바이스에 알림 닫기 메시지 전송
export function broadcastCloseAlertToDevice(deviceId: string) {
  const ws = deviceSockets.get(deviceId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'closeAlert' }));
    console.log(`알림 닫기 전송: ${deviceId}`);
  } else {
    console.log(`알림 닫기: 연결 없음: ${deviceId}`);
  }
}

// 특정 디바이스에 콘텐츠 업데이트 통지
export function broadcastContentUpdateToDevice(deviceId: string) {
  const ws = deviceSockets.get(deviceId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'contentUpdate' }));
    console.log(`콘텐츠 업데이트 전송: ${deviceId}`);
  } else {
    console.log(`콘텐츠 업데이트: 연결 없음: ${deviceId}`);
  }
}

// 모든 디바이스에 환자 명단 업데이트 통지
export function broadcastPatientListUpdate() {
  const activeSockets = (globalThis as any).deviceSockets || deviceSockets;
  console.log(`환자 명단 업데이트 브로드캐스트 시작, 연결된 디바이스 수: ${activeSockets.size}`);
  activeSockets.forEach((ws: WebSocket, deviceId: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'patientListUpdate' }));
      console.log(`환자 명단 업데이트 전송 성공: ${deviceId}`);
    } else {
      console.log(`환자 명단 업데이트 전송 실패 (연결 상태: ${ws?.readyState}): ${deviceId}`);
    }
  });
}

export { wss, deviceSockets };