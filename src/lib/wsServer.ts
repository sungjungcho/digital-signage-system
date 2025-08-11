import { WebSocketServer, WebSocket, RawData } from 'ws';
import { alerts, Alert } from './alertStore';

// 디바이스별 연결 관리
const deviceSockets: Map<string, WebSocket> = new Map();

// WebSocket 서버 인스턴스 (포트 3031)
// 이미 인스턴스가 있으면 새로 만들지 않음 (Next.js import 방지)
let wss: WebSocketServer;
if (!(globalThis as any).wss) {
  wss = new WebSocketServer({ port: 3031 });
  (globalThis as any).wss = wss;

  wss.on('connection', (ws: WebSocket, req: any) => {
    // 디바이스 ID는 쿼리스트링으로 전달 (예: ws://host:3031?deviceId=xxx)
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const deviceId = url.searchParams.get('deviceId');
    console.log('WebSocket 연결됨:', deviceId);
    console.log('WebSocket 연결됨2:', req.url);
    if (!deviceId) {
      ws.close(1008, 'deviceId required');
      return;
    }
    deviceSockets.set(deviceId, ws);

    // 연결 시점에 해당 디바이스의 최신 알림 전송
    const deviceAlerts = alerts.filter((a: Alert) => a.targetDeviceIds.includes(deviceId));
    if (deviceAlerts.length > 0) {
      ws.send(JSON.stringify({ type: 'init', alerts: deviceAlerts }));
    }

    ws.on('close', () => {
      deviceSockets.delete(deviceId);
    });
  });
} else {
  wss = (globalThis as any).wss;
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

export { wss, deviceSockets };