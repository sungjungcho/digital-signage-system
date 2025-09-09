'use client';

import { useState, useEffect } from 'react';
import { device } from '@/types/device';

import DeviceList from '@/components/admin/DeviceList';
import DeviceForm from '@/components/admin/DeviceForm';
import ContentManager from '@/components/admin/ContentManager';
import PatientManager from '@/components/admin/PatientManager';

type AlertForm = {
  message: string;
  targetDeviceIds: string[];
};

export default function AdminPage() {
  const [selectedDevice, setSelectedDevice] = useState<device | null>(null);
  const [devices, setDevices] = useState<device[]>([]);
  // 알림 관련 상태
  const [alertForm, setAlertForm] = useState<AlertForm>({ message: '', targetDeviceIds: [] });
  const [alertDuration, setAlertDuration] = useState<number>(5000); // 알림 표시 시간 (ms)
  const [sending, setSending] = useState(false);
  const [alertResult, setAlertResult] = useState<string | null>(null);

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/devices');
      const data = await response.json();
      if (Array.isArray(data)) {
        setDevices(data);
      }
    } catch (error) {
      console.error('디바이스 목록을 가져오는 중 오류 발생:', error);
    }
  };

  // 컴포넌트 마운트 시 디바이스 목록 가져오기 및 WebSocket 서버 초기화
  useEffect(() => {
    fetchDevices();
    // WebSocket 서버 초기화
    fetch('/api/websocket').catch(console.error);
  }, []);

  const handleDeviceAdded = () => {
    fetchDevices();
  };

  return (
    <div className="h-screen overflow-y-auto bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-6">디지털 사이니지 관리자</h1>
      {/* 알림 전송 섹션 */}
      <div className="bg-white rounded-lg shadow p-4 mb-8">
        <h2 className="text-xl font-semibold mb-4">긴급 알림 전송</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSending(true);
            setAlertResult(null);
            try {
              const res = await fetch('/api/alerts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  message: alertForm.message,
                  targetDeviceIds: alertForm.targetDeviceIds,
                  duration: alertDuration,
                }),
              });
              if (res.ok) {
                setAlertResult('알림이 성공적으로 전송되었습니다.');
                setAlertForm({ message: '', targetDeviceIds: [] });
              } else {
                setAlertResult('알림 전송에 실패했습니다.');
              }
            } catch (err) {
              setAlertResult('알림 전송 중 오류 발생');
            } finally {
              setSending(false);
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block font-medium mb-1">알림 내용</label>
            <textarea
              className="w-full border rounded p-2"
              rows={2}
              value={alertForm.message}
              onChange={e => setAlertForm(f => ({ ...f, message: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block font-medium mb-1">대상 디바이스 선택</label>
            <div className="mb-2">
              <label className="inline-flex items-center space-x-1 border rounded px-1 py-1 bg-gray-50 font-semibold">
                <input
                  type="checkbox"
                  checked={alertForm.targetDeviceIds.length === devices.length}
                  onChange={e => {
                    setAlertForm(f => ({
                      ...f,
                      targetDeviceIds: e.target.checked ? devices.map(d => d.id) : []
                    }));
                  }}
                />
                <span>전체</span>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {devices.map(device => (
                <label key={device.id} className="flex items-center space-x-1 border rounded px-2 py-1">
                  <input
                    type="checkbox"
                    checked={alertForm.targetDeviceIds.includes(device.id)}
                    onChange={() => {
                      setAlertForm(f => {
                        const ids = f.targetDeviceIds.includes(device.id)
                          ? f.targetDeviceIds.filter(id => id !== device.id)
                          : [...f.targetDeviceIds, device.id];
                        return { ...f, targetDeviceIds: ids };
                      });
                    }}
                  />
                  <span>{device.name} ({device.location})</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block font-medium mb-1">알림 표시 시간</label>
            <select
              value={alertDuration}
              onChange={e => setAlertDuration(Number(e.target.value))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value={5000}>5초</option>
              <option value={10000}>10초</option>
              <option value={15000}>15초</option>
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            disabled={sending || !alertForm.message || alertForm.targetDeviceIds.length === 0}
          >
            {sending ? '전송 중...' : '알림 전송'}
          </button>
          {alertResult && <div className="mt-2 text-sm text-gray-700">{alertResult}</div>}
        </form>
        {/* 알림 닫기 버튼: 선택된 디바이스에 알림 닫기 명령 전송 */}
        <button
          className="mt-4 px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          disabled={!alertForm.targetDeviceIds.length || sending}
          onClick={async () => {
            if (!alertForm.targetDeviceIds.length) return;
            setSending(true);
            setAlertResult(null);
            try {
              for (const deviceId of alertForm.targetDeviceIds) {
                await fetch('/api/alerts/close', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ deviceId }),
                });
              }
              setAlertResult('알림이 닫혔습니다.');
            } catch (err) {
              setAlertResult('알림 닫기 중 오류 발생');
            } finally {
              setSending(false);
            }
          }}
        >
          선택한 디바이스 알림 닫기
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* 디바이스 관리 섹션 */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">디바이스 관리</h2>
          <DeviceForm onDeviceAdded={handleDeviceAdded} />
          <div className="mt-6">
            <DeviceList 
              devices={devices} 
              onDeviceSelect={setSelectedDevice}
              onDeviceDeleted={fetchDevices}
            />
          </div>
        </div>

        {/* 콘텐츠 관리 섹션 */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">콘텐츠 관리</h2>
            <div className="flex space-x-2 items-center">
              <div className="min-w-[200px]">
                <select 
                  value={selectedDevice?.id || ''} 
                  onChange={(e) => {
                    const deviceId = e.target.value;
                    const device = devices.find(d => d.id === deviceId);
                    setSelectedDevice(device || null);
                  }}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                >
                  <option value="">디바이스 선택</option>
                  {devices.map(device => (
                    <option key={device.id} value={device.id}>{device.name}</option>
                  ))}
                </select>
              </div>
              {selectedDevice && (
                  <a
                    href={`/display/${selectedDevice.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    title="미리보기"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </a>
              )}
            </div>
          </div>
          
          {/* 디바이스 변경 시 ContentManager의 contentType을 초기화하기 위한 key 속성 추가 */}
          {selectedDevice ? (
            <ContentManager key={selectedDevice.id} device={selectedDevice} />
          ) : (
            <p className="text-gray-500">디바이스를 선택해주세요.</p>
          )}
        </div>

        {/* 환자 명단 관리 섹션 */}
        <div className="bg-white rounded-lg shadow p-4">
          <PatientManager />
        </div>
      </div>
    </div>
  );
}
