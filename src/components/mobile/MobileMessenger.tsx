'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Device = {
  id: string;
  name: string;
  location: string;
};

export default function MobileMessenger() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [duration, setDuration] = useState(5000);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/devices');
      const data = await response.json();
      if (Array.isArray(data)) {
        setDevices(data);
      }
    } catch (error) {
      console.error('디바이스 목록 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedDevices.length === devices.length) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices(devices.map(d => d.id));
    }
  };

  const handleToggleDevice = (deviceId: string) => {
    setSelectedDevices(prev =>
      prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleSendAlert = async () => {
    if (!message.trim() || selectedDevices.length === 0) return;

    setSending(true);
    setResult(null);

    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          targetDeviceIds: selectedDevices,
          duration,
        }),
      });

      if (response.ok) {
        setResult({ type: 'success', message: '알림이 전송되었습니다!' });
        setMessage('');
      } else {
        setResult({ type: 'error', message: '전송에 실패했습니다.' });
      }
    } catch {
      setResult({ type: 'error', message: '전송 중 오류가 발생했습니다.' });
    } finally {
      setSending(false);
    }
  };

  const handleCloseAlert = async () => {
    if (selectedDevices.length === 0) return;

    setSending(true);
    setResult(null);

    try {
      for (const deviceId of selectedDevices) {
        await fetch('/api/alerts/close', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId }),
        });
      }
      setResult({ type: 'success', message: '알림이 닫혔습니다.' });
    } catch {
      setResult({ type: 'error', message: '알림 닫기 실패' });
    } finally {
      setSending(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/mobile/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* 헤더 */}
      <header className="bg-white/10 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-white">긴급 알림</h1>
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-2 bg-white/20 rounded-xl text-white text-sm font-medium"
        >
          로그아웃
        </button>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 p-4 space-y-4">
        {/* 메시지 입력 */}
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            알림 메시지
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-base"
            rows={3}
            placeholder="전송할 메시지를 입력하세요"
          />
        </div>

        {/* 표시 시간 */}
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            표시 시간
          </label>
          <div className="flex space-x-2">
            {[
              { value: 5000, label: '5초' },
              { value: 10000, label: '10초' },
              { value: 15000, label: '15초' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDuration(opt.value)}
                className={`flex-1 py-3 rounded-xl font-medium transition ${
                  duration === opt.value
                    ? 'bg-teal-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 디바이스 선택 */}
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-gray-700">
              대상 디바이스
            </label>
            <button
              onClick={handleSelectAll}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                selectedDevices.length === devices.length && devices.length > 0
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              전체 선택
            </button>
          </div>

          {devices.length === 0 ? (
            <p className="text-center text-gray-400 py-4">등록된 디바이스가 없습니다</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {devices.map((device) => (
                <button
                  key={device.id}
                  onClick={() => handleToggleDevice(device.id)}
                  className={`w-full flex items-center p-3 rounded-xl transition ${
                    selectedDevices.includes(device.id)
                      ? 'bg-teal-50 border-2 border-teal-500'
                      : 'bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${
                    selectedDevices.includes(device.id)
                      ? 'bg-teal-500 border-teal-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedDevices.includes(device.id) && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-800">{device.name}</p>
                    <p className="text-xs text-gray-500">{device.location}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 결과 메시지 */}
        {result && (
          <div className={`p-4 rounded-2xl ${
            result.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            <p className="text-center font-medium">{result.message}</p>
          </div>
        )}
      </main>

      {/* 하단 버튼 */}
      <div className="p-4 bg-white/10 backdrop-blur-sm space-y-3">
        <button
          onClick={handleSendAlert}
          disabled={sending || !message.trim() || selectedDevices.length === 0}
          className="w-full py-4 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-2xl font-bold text-lg shadow-lg disabled:opacity-50 active:scale-[0.98] transition"
        >
          {sending ? '전송 중...' : '알림 전송'}
        </button>

        <button
          onClick={handleCloseAlert}
          disabled={sending || selectedDevices.length === 0}
          className="w-full py-3 bg-white/20 text-white rounded-2xl font-medium disabled:opacity-50 active:scale-[0.98] transition"
        >
          알림 닫기
        </button>
      </div>
    </div>
  );
}
