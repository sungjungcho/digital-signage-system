'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { device } from '@/types/device';

import DeviceList from '@/components/admin/DeviceList';
import DeviceForm from '@/components/admin/DeviceForm';
import ContentManager from '@/components/admin/ContentManager';
import PatientManager from '@/components/admin/PatientManager';
import NoticeManager from '@/components/admin/NoticeManager';

type AlertForm = {
  message: string;
  targetDeviceIds: string[];
};

export default function AdminDashboard() {
  const router = useRouter();
  const [selectedDevice, setSelectedDevice] = useState<device | null>(null);
  const [devices, setDevices] = useState<device[]>([]);
  const [alertForm, setAlertForm] = useState<AlertForm>({ message: '', targetDeviceIds: [] });
  const [alertDuration, setAlertDuration] = useState<number>(5000);
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

  useEffect(() => {
    fetchDevices();
    fetch('/api/websocket').catch(console.error);
  }, []);

  const handleDeviceAdded = () => {
    fetchDevices();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      router.push('/admin/login');
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-cyan-50 pb-10">
      {/* 헤더 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-teal-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">디지털 사이니지 관리</h1>
                <p className="text-base text-teal-600 font-medium">병원 통합 관리 시스템</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl hover:from-gray-200 hover:to-gray-300 transition shadow-sm border border-gray-300 font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 - 반응형 2단 레이아웃 */}
      <div className="max-w-[1920px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-6">
          {/* 왼쪽 사이드바: 디바이스 관리 */}
          <div className="space-y-6">
            {/* 디바이스 관리 섹션 */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-teal-100">
              <div className="flex items-center space-x-3 mb-5">
                <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">디바이스 관리</h2>
              </div>
              <DeviceForm onDeviceAdded={handleDeviceAdded} />
              <div className="mt-6">
                <DeviceList
                  devices={devices}
                  onDeviceSelect={setSelectedDevice}
                  onDeviceDeleted={fetchDevices}
                />
              </div>
            </div>
          </div>

          {/* 오른쪽 메인 영역: 콘텐츠 관리 + 환자 관리 */}
          <div className="space-y-6">
            {/* 콘텐츠 관리 섹션 */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-teal-100">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">콘텐츠 관리</h2>
                </div>
              </div>
              <div className="flex space-x-2 items-center mb-4">
                <div className="flex-1">
                  <select
                    value={selectedDevice?.id || ''}
                    onChange={(e) => {
                      const deviceId = e.target.value;
                      const device = devices.find(d => d.id === deviceId);
                      setSelectedDevice(device || null);
                    }}
                    className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-base p-2.5"
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
                    className="inline-flex items-center px-4 py-2.5 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 transition"
                    title="미리보기"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </a>
                )}
              </div>

              {selectedDevice ? (
                <ContentManager key={selectedDevice.id} device={selectedDevice} />
              ) : (
                <div className="text-center py-12">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 font-medium text-lg">디바이스를 선택해주세요</p>
                </div>
              )}
            </div>

            {/* 환자 명단 관리 섹션 */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-teal-100">
              <div className="flex items-center space-x-3 mb-5">
                <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">환자 관리</h2>
              </div>
              <PatientManager />
            </div>
          </div>
        </div>

        {/* 공지사항 관리 섹션 - 전체 너비 */}
        <div className="mt-6">
          <NoticeManager
            onSendNotice={(content) => {
              setAlertForm({ ...alertForm, message: content });
            }}
          />
        </div>

        {/* 긴급 알림 전송 섹션 - 전체 너비 */}
        <div className="mt-6">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-teal-100">
            <div className="flex items-center space-x-3 mb-5">
              <div className="h-10 w-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">긴급 알림 전송</h2>
            </div>
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
                  <label className="block font-semibold text-gray-700 mb-2 text-base">알림 내용</label>
                  <textarea
                    className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                    rows={2}
                    value={alertForm.message}
                    onChange={e => setAlertForm(f => ({ ...f, message: e.target.value }))}
                    required
                    placeholder="긴급 알림 메시지를 입력하세요"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-2 text-base">대상 디바이스 선택</label>
                  <div className="mb-3">
                    <label className="inline-flex items-center space-x-2 border-2 border-teal-300 rounded-xl px-4 py-2 bg-teal-50 font-semibold text-teal-700 cursor-pointer hover:bg-teal-100 transition">
                      <input
                        type="checkbox"
                        checked={alertForm.targetDeviceIds.length === devices.length && devices.length > 0}
                        onChange={e => {
                          setAlertForm(f => ({
                            ...f,
                            targetDeviceIds: e.target.checked ? devices.map(d => d.id) : []
                          }));
                        }}
                        className="h-4 w-4 text-teal-600 rounded"
                      />
                      <span>전체 선택</span>
                    </label>
                  </div>
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                    {devices.map(device => (
                      <label key={device.id} className="flex items-center space-x-2 border border-gray-200 rounded-xl px-4 py-2 cursor-pointer hover:bg-gray-50 transition">
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
                          className="h-4 w-4 text-teal-600 rounded"
                        />
                        <span className="text-base font-medium">{device.name} ({device.location})</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-2 text-base">알림 표시 시간</label>
                  <select
                    value={alertDuration}
                    onChange={e => setAlertDuration(Number(e.target.value))}
                    className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-3"
                  >
                    <option value={5000}>5초</option>
                    <option value={10000}>10초</option>
                    <option value={15000}>15초</option>
                  </select>
                </div>
                <div className="flex flex-col space-y-2">
                  <button
                    type="submit"
                    className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:from-red-600 hover:to-pink-700 disabled:opacity-50 font-semibold shadow-md transition transform hover:scale-[1.02]"
                    disabled={sending || !alertForm.message || alertForm.targetDeviceIds.length === 0}
                  >
                    {sending ? '전송 중...' : '알림 전송'}
                  </button>
                  <button
                    type="button"
                    className="w-full px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl hover:from-gray-200 hover:to-gray-300 disabled:opacity-50 font-semibold shadow-md transition"
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
                    알림 닫기
                  </button>
                </div>
                {alertResult && (
                  <div className="mt-3 p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl text-base font-medium">
                    {alertResult}
                  </div>
                )}
              </form>
          </div>
        </div>
      </div>
    </div>
  );
}
