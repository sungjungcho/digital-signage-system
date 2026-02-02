'use client';

import { useState } from 'react';
import type { device as Device } from '@/types/device';

interface DeviceListProps {
  devices: Device[];
  onDeviceSelect: (device: Device) => void;
  onDeviceDeleted: () => void;
  userRole?: string;
}

export default function DeviceList({ devices, onDeviceSelect, onDeviceDeleted, userRole }: DeviceListProps) {
  const isSuperAdmin = userRole === 'superadmin';
  const [deletingDeviceId, setDeletingDeviceId] = useState<string | null>(null);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState<string>('');
  const [editedAlias, setEditedAlias] = useState<string>('');
  const [editedPinCode, setEditedPinCode] = useState<string>('');

  // PIN 관리 모달
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedDeviceForPin, setSelectedDeviceForPin] = useState<Device | null>(null);
  const [newPinCode, setNewPinCode] = useState('');
  const [pinSaving, setPinSaving] = useState(false);

  const handleOpenPinModal = (device: Device) => {
    setSelectedDeviceForPin(device);
    setNewPinCode(device.pin_code || '');
    setShowPinModal(true);
  };

  const handleClosePinModal = () => {
    setShowPinModal(false);
    setSelectedDeviceForPin(null);
    setNewPinCode('');
  };

  const handleSavePinCode = async () => {
    if (!selectedDeviceForPin) return;
    if (!/^\d{4}$/.test(newPinCode)) {
      alert('PIN 코드는 4자리 숫자여야 합니다.');
      return;
    }

    setPinSaving(true);
    try {
      const response = await fetch(`/api/devices/${selectedDeviceForPin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin_code: newPinCode }),
      });

      if (response.ok) {
        alert('PIN 코드가 변경되었습니다.');
        handleClosePinModal();
        onDeviceDeleted(); // 목록 새로고침
      } else {
        const error = await response.json();
        alert(error.error || 'PIN 코드 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('PIN 코드 변경 오류:', error);
      alert('PIN 코드 변경 중 오류가 발생했습니다.');
    } finally {
      setPinSaving(false);
    }
  };

  const handleEditDevice = (device: Device) => {
    setEditingDeviceId(device.id);
    setEditedName(device.name);
    setEditedAlias(device.alias || '');
    setEditedPinCode(device.pin_code || '0000');
  };

  const handleSaveDevice = async (deviceId: string) => {
    if (!editedName.trim()) {
      alert('디바이스 이름을 입력해주세요.');
      return;
    }
    if (!editedAlias.trim()) {
      alert('별칭을 입력해주세요.');
      return;
    }
    if (!/^[a-zA-Z0-9가-힣\-]+$/.test(editedAlias)) {
      alert('별칭은 영문, 숫자, 한글, 하이픈(-)만 사용할 수 있습니다.');
      return;
    }
    if (!/^\d{4}$/.test(editedPinCode)) {
      alert('PIN 코드는 4자리 숫자여야 합니다.');
      return;
    }

    try {
      const response = await fetch(`/api/devices/${deviceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editedName,
          alias: editedAlias,
          pin_code: editedPinCode
        }),
      });

      if (response.ok) {
        alert('디바이스 정보가 성공적으로 변경되었습니다.');
        setEditingDeviceId(null);
        setEditedName('');
        setEditedAlias('');
        setEditedPinCode('');
        onDeviceDeleted();
      } else {
        const error = await response.json();
        alert(`수정 실패: ${error.error || '알 수 없는 오류가 발생했습니다.'}`);
      }
    } catch (error) {
      console.error('디바이스 정보 수정 중 오류 발생:', error);
      alert('디바이스 정보 수정 중 오류가 발생했습니다.');
    }
  };

  const handleCancelEdit = () => {
    setEditingDeviceId(null);
    setEditedName('');
    setEditedAlias('');
    setEditedPinCode('');
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
            {isSuperAdmin && editingDeviceId === device.id ? (
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600 w-16">이름</label>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="디바이스 이름"
                    autoFocus
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600 w-16">별칭</label>
                  <input
                    type="text"
                    value={editedAlias}
                    onChange={(e) => setEditedAlias(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="URL에 사용될 별칭 (예: device1)"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600 w-16">PIN</label>
                  <input
                    type="text"
                    value={editedPinCode}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setEditedPinCode(v);
                    }}
                    className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="4자리 숫자"
                    maxLength={4}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => handleSaveDevice(device.id)}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    저장
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => onDeviceSelect(device)}
                >
                  <h3 className="font-semibold">{device.name}</h3>
                  <p className="text-sm text-gray-500">/{device.alias}</p>
                  <p className="text-base text-black">{device.location}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`px-2 py-1 rounded text-sm ${
                    device.status === 'online'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {device.status}
                  </div>
                  {isSuperAdmin && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPinModal(device);
                        }}
                        className="px-2 py-1 text-base text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded"
                        title="PIN 코드 변경"
                      >
                        PIN
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditDevice(device);
                        }}
                        className="px-2 py-1 text-base text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                        title="디바이스 정보 수정"
                      >
                        수정
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDevice(device.id, device.name);
                        }}
                        disabled={deletingDeviceId === device.id}
                        className="px-2 py-1 text-base text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50"
                        title="디바이스 삭제"
                      >
                        {deletingDeviceId === device.id ? '삭제 중...' : '삭제'}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ))}

      {/* PIN 코드 변경 모달 */}
      {showPinModal && selectedDeviceForPin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                PIN 코드 변경
              </h3>
              <button
                onClick={handleClosePinModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">디바이스: <span className="font-semibold">{selectedDeviceForPin.name}</span></p>
              <p className="text-sm text-gray-500">현재 PIN: <span className="font-mono font-bold">{selectedDeviceForPin.pin_code || '0000'}</span></p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  새 PIN 코드
                </label>
                <input
                  type="text"
                  value={newPinCode}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setNewPinCode(v);
                  }}
                  className="w-full px-4 py-3 text-center text-2xl font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 tracking-widest"
                  placeholder="0000"
                  maxLength={4}
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500 text-center">4자리 숫자를 입력하세요</p>
              </div>

              <button
                onClick={handleSavePinCode}
                disabled={pinSaving || newPinCode.length !== 4}
                className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
              >
                {pinSaving ? '저장 중...' : 'PIN 코드 변경'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
