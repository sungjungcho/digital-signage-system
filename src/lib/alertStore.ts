// src/lib/alertStore.ts
import { v4 as uuidv4 } from 'uuid';

export type Alert = {
  id: string;
  message: string;
  targetDeviceIds: string[];
  createdAt: Date;
  expiresAt?: Date;
};

// 인메모리 알림 저장소
const alerts: Alert[] = [];

export function addAlert(message: string, targetDeviceIds: string[], expiresAt?: Date): Alert {
  const alert: Alert = {
    id: uuidv4(),
    message,
    targetDeviceIds,
    createdAt: new Date(),
    expiresAt,
  };
  alerts.push(alert);
  return alert;
}

export function getAlertsForDevice(deviceId: string): Alert[] {
  const now = new Date();
  return alerts.filter(
    (alert) =>
      alert.targetDeviceIds.includes(deviceId) &&
      (!alert.expiresAt || alert.expiresAt > now)
  );
}

export function removeAlert(id: string) {
  const idx = alerts.findIndex((a) => a.id === id);
  if (idx !== -1) alerts.splice(idx, 1);
}

export { alerts };
