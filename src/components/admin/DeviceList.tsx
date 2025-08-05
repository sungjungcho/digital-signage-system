'use client';

import { useEffect, useState } from 'react';
import { Device } from '@/types/device';

interface DeviceListProps {
  devices: Device[];
  onDeviceSelect: (device: Device) => void;
}

export default function DeviceList({ devices, onDeviceSelect }: DeviceListProps) {

  return (
    <div className="space-y-4">
      {devices.map((device) => (
        <div
          key={device.id}
          className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
          onClick={() => onDeviceSelect(device)}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{device.name}</h3>
              <p className="text-sm text-gray-500">{device.location}</p>
            </div>
            <div className={`px-2 py-1 rounded text-sm ${
              device.status === 'online'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {device.status}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
