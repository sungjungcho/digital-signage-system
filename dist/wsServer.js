"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deviceSockets = exports.wss = void 0;
exports.broadcastAlertToDevices = broadcastAlertToDevices;
var ws_1 = require("ws");
var alertStore_1 = require("./alertStore");
// 디바이스별 연결 관리
var deviceSockets = new Map();
exports.deviceSockets = deviceSockets;
// WebSocket 서버 인스턴스 (포트 3031)
var wss = new ws_1.WebSocketServer({ port: 3031 });
exports.wss = wss;
wss.on('connection', function (ws, req) {
    // 디바이스 ID는 쿼리스트링으로 전달 (예: ws://host:3031?deviceId=xxx)
    var url = new URL(req.url || '', "http://".concat(req.headers.host));
    var deviceId = url.searchParams.get('deviceId');
    if (!deviceId) {
        ws.close(1008, 'deviceId required');
        return;
    }
    deviceSockets.set(deviceId, ws);
    // 연결 시점에 해당 디바이스의 최신 알림 전송
    var deviceAlerts = alertStore_1.alerts.filter(function (a) { return a.targetDeviceIds.includes(deviceId); });
    if (deviceAlerts.length > 0) {
        ws.send(JSON.stringify({ type: 'init', alerts: deviceAlerts }));
    }
    ws.on('close', function () {
        deviceSockets.delete(deviceId);
    });
});
// 알림 브로드캐스트 함수
function broadcastAlertToDevices(alert) {
    alert.targetDeviceIds.forEach(function (deviceId) {
        var ws = deviceSockets.get(deviceId);
        if (ws && ws.readyState === ws_1.WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'alert', alert: alert }));
        }
    });
}
