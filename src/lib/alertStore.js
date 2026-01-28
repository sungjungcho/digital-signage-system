// src/lib/alertStore.js
const { v4: uuidv4 } = require('uuid');

// 인메모리 알림 저장소
const alerts = [];

function addAlert(message, targetDeviceIds, expiresAt, duration) {
  const createdAt = new Date();
  let finalExpiresAt = expiresAt;
  if (duration && !expiresAt) {
    finalExpiresAt = new Date(createdAt.getTime() + duration);
  }
  const alert = {
    id: uuidv4(),
    message,
    targetDeviceIds,
    createdAt,
    expiresAt: finalExpiresAt,
    duration,
  };
  alerts.push(alert);
  return alert;
}

function getAlertsForDevice(deviceId) {
  const now = new Date();
  return alerts.filter(
    (alert) =>
      alert.targetDeviceIds.includes(deviceId) &&
      (!alert.expiresAt || alert.expiresAt > now)
  );
}

function removeAlert(id) {
  const idx = alerts.findIndex((a) => a.id === id);
  if (idx !== -1) alerts.splice(idx, 1);
}

module.exports = { alerts, addAlert, getAlertsForDevice, removeAlert };
