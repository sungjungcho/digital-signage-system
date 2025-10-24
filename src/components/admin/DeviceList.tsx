'use client';

import { useState } from 'react';
import type { device as Device } from '@/types/device';

interface DeviceListProps {
  devices: Device[];
  onDeviceSelect: (device: Device) => void;
  onDeviceDeleted: () => void;
}

export default function DeviceList({ devices, onDeviceSelect, onDeviceDeleted }: DeviceListProps) {
  const [deletingDeviceId, setDeletingDeviceId] = useState<string | null>(null);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState<string>('');

  const handleEditDevice = (deviceId: string, currentName: string) => {
    setEditingDeviceId(deviceId);
    setEditedName(currentName);
  };

  const handleSaveDeviceName = async (deviceId: string) => {
    if (!editedName.trim()) {
      alert('디바이스 이름을 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(`/api/devices/${deviceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: editedName }),
      });

      if (response.ok) {
        alert('디바이스 이름이 성공적으로 변경되었습니다.');
        setEditingDeviceId(null);
        setEditedName('');
        onDeviceDeleted(); // 목록 새로고침
      } else {
        const error = await response.json();
        alert(`수정 실패: ${error.error || '알 수 없는 오류가 발생했습니다.'}`);
      }
    } catch (error) {
      console.error('디바이스 이름 수정 중 오류 발생:', error);
      alert('디바이스 이름 수정 중 오류가 발생했습니다.');
    }
  };

  const handleCancelEdit = () => {
    setEditingDeviceId(null);
    setEditedName('');
  };

  const handleDeleteDevice = async (deviceId: string, deviceName: string) => {
    if (!window.confirm(`정말로 '${deviceName}' 디바이스를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 디바이스의 모든 콘텐츠도 함께 삭제됩니다.`)) {
      return;
    }

    setDeletingDeviceId(deviceId);
    try {
      const response = await fetch(`/api/devices/${deviceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('디바이스가 성공적으로 삭제되었습니다.');
        onDeviceDeleted();
      } else {
        const error = await response.json();
        alert(`삭제 실패: ${error.error || '알 수 없는 오류가 발생했습니다.'}`);
      }
    } catch (error) {
      console.error('디바이스 삭제 중 오류 발생:', error);
      alert('디바이스 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingDeviceId(null);
    }
  };

  return (
    <div className="space-y-4">
      {devices.map((device) => (
        <div
          key={device.id}
          className="border rounded-lg p-4 hover:bg-gray-50"
        >
          <div className="flex items-center justify-between">
            {editingDeviceId === device.id ? (
              // 편집 모드
              <div className="flex-1 flex items-center space-x-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="디바이스 이름"
                  autoFocus
                />
                <button
                  onClick={() => handleSaveDeviceName(device.id)}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  저장
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  취소
                </button>
              </div>
            ) : (
              // 일반 모드
              <>
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => onDeviceSelect(device)}
                >
                  <h3 className="font-semibold">{device.name}</h3>
                  <p className="text-sm text-gray-500">{device.location}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`px-2 py-1 rounded text-sm ${
                    device.status === 'online'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {device.status}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditDevice(device.id, device.name);
                    }}
                    className="px-2 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                    title="디바이스 이름 수정"
                  >
                    수정
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDevice(device.id, device.name);
                    }}
                    disabled={deletingDeviceId === device.id}
                    className="px-2 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50"
                    title="디바이스 삭제"
                  >
                    {deletingDeviceId === device.id ? '삭제 중...' : '삭제'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
