const { WebSocketServer, WebSocket } = require('ws');
const http = require('http');

// 디바이스별 연결 관리
const deviceSockets = new Map();

// WebSocket 서버 (포트 3031)
const wss = new WebSocketServer({ port: 3031, host: '0.0.0.0' });

console.log('WebSocket 서버 시작: ws://0.0.0.0:3031');

wss.on('connection', (ws, req) => {
  let urlString = req.url || '';
  if (!urlString.startsWith('/')) urlString = '/' + urlString;
  const url = new URL(urlString, `http://${req.headers.host}`);
  const deviceId = url.searchParams.get('deviceId');

  if (!deviceId) {
    ws.close(1008, 'deviceId required');
    return;
  }

  console.log(`디바이스 연결됨: ${deviceId}`);
  deviceSockets.set(deviceId, ws);

  ws.on('close', () => {
    console.log(`디바이스 연결 해제: ${deviceId}`);
    deviceSockets.delete(deviceId);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket 오류 (${deviceId}):`, error.message);
  });
});

// HTTP 브로드캐스트 서버 (포트 3032)
const httpServer = http.createServer((req, res) => {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/broadcast') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const { type, data } = JSON.parse(body);
        console.log(`브로드캐스트 요청: ${type}`);

        if (type === 'alert' && data.alert) {
          // 알림 브로드캐스트
          const { alert } = data;
          alert.targetDeviceIds.forEach(deviceId => {
            const ws = deviceSockets.get(deviceId);
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'alert', alert }));
              console.log(`알림 전송됨: ${deviceId}`);
            }
          });
        } else if (type === 'contentUpdate' && data.deviceId) {
          // 콘텐츠 업데이트
          const ws = deviceSockets.get(data.deviceId);
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'contentUpdate' }));
            console.log(`콘텐츠 업데이트 전송됨: ${data.deviceId}`);
          }
        } else if (type === 'closeAlert' && data.deviceId) {
          // 알림 닫기
          const ws = deviceSockets.get(data.deviceId);
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'closeAlert' }));
            console.log(`알림 닫기 전송됨: ${data.deviceId}`);
          }
        } else if (type === 'patientListUpdate' && data.deviceId) {
          // 환자 목록 업데이트
          const ws = deviceSockets.get(data.deviceId);
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'patientListUpdate' }));
            console.log(`환자 목록 업데이트 전송됨: ${data.deviceId}`);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error('브로드캐스트 처리 오류:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

httpServer.listen(3032, '0.0.0.0', () => {
  console.log('HTTP 브로드캐스트 서버 시작: http://0.0.0.0:3032');
});

// 연결된 디바이스 목록 표시 (10초마다)
setInterval(() => {
  if (deviceSockets.size > 0) {
    console.log(`연결된 디바이스: ${Array.from(deviceSockets.keys()).join(', ')}`);
  }
}, 10000);
