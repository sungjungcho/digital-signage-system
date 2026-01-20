// wsServerEntry.js
require('./src/lib/wsServer');
const http = require('http');
const wsModule = require('./src/lib/wsServer');
const deviceSockets = wsModule.deviceSockets;
const WebSocket = require('ws').WebSocket;

console.log('WebSocket 서버 엔트리 실행됨');

// HTTP 서버 생성 (알림 전송용 API)
const httpServer = http.createServer((req, res) => {
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
        const parsedData = JSON.parse(body);
        const type = parsedData.type;
        const data = parsedData.data;
        console.log('HTTP API 요청 수신:', type, data);

        if (type === 'alert') {
          const alert = data.alert;
          console.log('=== HTTP를 통한 알림 브로드캐스트 시작 ===');
          console.log('알림 ID:', alert.id);
          console.log('알림 메시지:', alert.message);
          console.log('대상 디바이스:', alert.targetDeviceIds);
          console.log('현재 연결된 디바이스 수:', deviceSockets.size);
          console.log('연결된 디바이스 목록:', Array.from(deviceSockets.keys()));

          alert.targetDeviceIds.forEach((deviceId) => {
            const ws = deviceSockets.get(deviceId);
            if (ws && ws.readyState === WebSocket.OPEN) {
              const message = JSON.stringify({ type: 'alert', alert: alert });
              ws.send(message);
              console.log('✓ 알림 전송 성공: ' + deviceId);
            } else {
              console.log('✗ 알림 전송 실패: ' + deviceId + ' (연결 상태: ' + (ws ? ws.readyState : 'undefined') + ')');
            }
          });
          console.log('=== 알림 브로드캐스트 종료 ===');
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        console.error('HTTP API 오류:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

httpServer.listen(3032, () => {
  console.log('HTTP API 서버가 3032 포트에서 실행 중입니다.');
});
