"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alerts = void 0;
exports.addAlert = addAlert;
exports.getAlertsForDevice = getAlertsForDevice;
exports.removeAlert = removeAlert;
// src/lib/alertStore.ts
var uuid_1 = require("uuid");
// 인메모리 알림 저장소
var alerts = [];
exports.alerts = alerts;
function addAlert(message, targetDeviceIds, expiresAt) {
    var alert = {
        id: (0, uuid_1.v4)(),
        message: message,
        targetDeviceIds: targetDeviceIds,
        createdAt: new Date(),
        expiresAt: expiresAt,
    };
    alerts.push(alert);
    return alert;
}
function getAlertsForDevice(deviceId) {
    var now = new Date();
    return alerts.filter(function (alert) {
        return alert.targetDeviceIds.includes(deviceId) &&
            (!alert.expiresAt || alert.expiresAt > now);
    });
}
function removeAlert(id) {
    var idx = alerts.findIndex(function (a) { return a.id === id; });
    if (idx !== -1)
        alerts.splice(idx, 1);
}
