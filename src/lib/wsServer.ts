import { WebSocketServer, WebSocket } from 'ws';
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
  } catch (err) {
    // 기존 서버가 있다면 재사용
    if ((globalThis as any).wss) {
      wss = (globalThis as any).wss;
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
    if (!deviceId) {
      ws.close(1008, 'deviceId required');
      return;
    }
    deviceSockets.set(deviceId, ws);
    // 글로벌 저장소에도 업데이트
    if ((globalThis as any).deviceSockets) {
      (globalThis as any).deviceSockets.set(deviceId, ws);
    }

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
    });
  });

  wss.on('listening', () => {
  });
} else {
  wss = (globalThis as any).wss;
  // 기존 deviceSockets 맵을 재사용
  if ((globalThis as any).deviceSockets) {
    const globalDeviceSockets = (globalThis as any).deviceSockets;
    globalDeviceSockets.forEach((ws: WebSocket, deviceId: string) => {
      deviceSockets.set(deviceId, ws);
    });
  }
}

// 알림 브로드캐스트 함수
export function broadcastAlertToDevices(alert: Alert) {

  // 글로벌 저장소 확인
  const globalSockets = (globalThis as any).deviceSockets;
  if (globalSockets) {
  }

  alert.targetDeviceIds.forEach((deviceId: string) => {
    const ws = deviceSockets.get(deviceId) || (globalSockets && globalSockets.get(deviceId));
    if (ws && ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type: 'alert', alert });
      ws.send(message);
    } else {
    }
  });
}

// 단일 디바이스에 알림 닫기 메시지 전송
export function broadcastCloseAlertToDevice(deviceId: string) {
  const ws = deviceSockets.get(deviceId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'closeAlert' }));
  } else {
  }
}

// 특정 디바이스에 콘텐츠 업데이트 통지
export function broadcastContentUpdateToDevice(deviceId: string) {
  const ws = deviceSockets.get(deviceId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'contentUpdate' }));
  } else {
  }
}

// 모든 디바이스에 환자 명단 업데이트 통지
export function broadcastPatientListUpdate() {
  const activeSockets = (globalThis as any).deviceSockets || deviceSockets;
  activeSockets.forEach((ws: WebSocket, deviceId: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'patientListUpdate' }));
    } else {
    }
  });
}

export { wss, deviceSockets };