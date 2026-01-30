'use client';

import { useState } from 'react';

interface DeviceLimit {
  current: number;
  max: number;
}

interface DeviceFormProps {
  onDeviceAdded: () => void;
  deviceLimit?: DeviceLimit | null;
  onRequestMoreDevices?: () => void;
}

export default function DeviceForm({ onDeviceAdded, deviceLimit, onRequestMoreDevices }: DeviceFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    alias: '',
    location: '',
    pin_code: '0000',
  });
  const [error, setError] = useState('');
  const [showLimitPopup, setShowLimitPopup] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 별칭 유효성 검사
    if (!formData.alias.trim()) {
      setError('별칭을 입력해주세요.');
      return;
    }
    if (!/^[a-z0-9\-]+$/.test(formData.alias)) {
      setError('별칭은 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.');
      return;
    }

    // PIN 코드 유효성 검사
    if (!/^\d{4}$/.test(formData.pin_code)) {
      setError('PIN 코드는 4자리 숫자여야 합니다.');
      return;
    }

    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormData({ name: '', alias: '', location: '', pin_code: '0000' });
        onDeviceAdded();
      } else {
        const data = await response.json();
        if (data.code === 'DEVICE_LIMIT_REACHED') {
          setShowLimitPopup(true);
        } else {
          setError(data.error || '디바이스 등록에 실패했습니다.');
        }
      }
    } catch (error) {
      console.error('디바이스 등록 중 오류 발생:', error);
      setError('디바이스 등록 중 오류가 발생했습니다.');
    }
  };

  const isLimitReached = deviceLimit ? deviceLimit.current >= deviceLimit.max : false;

  return (
    <>
      {/* 디바이스 제한 안내 */}
      {deviceLimit && (
        <div className={`mb-4 p-3 rounded-lg ${isLimitReached ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${isLimitReached ? 'text-amber-700' : 'text-blue-700'}`}>
              디바이스: {deviceLimit.current} / {deviceLimit.max}개
            </span>
            {isLimitReached && (
              <button
                type="button"
                onClick={() => setShowLimitPopup(true)}
                className="text-xs px-2 py-1 bg-amber-500 text-white rounded hover:bg-amber-600 transition"
              >
                추가 요청
              </button>
            )}
          </div>
        </div>
      )}

      {/* 제한 도달 팝업 */}
      {showLimitPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">디바이스 등록 한도 도달</h3>
              <p className="text-gray-600 mb-4">
                현재 등록 가능한 디바이스 수({deviceLimit?.max}개)에 도달했습니다.<br />
                추가 등록이 필요하시면 관리자에게 요청하세요.
              </p>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowLimitPopup(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLimitPopup(false);
                    onRequestMoreDevices?.();
                  }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700 transition font-medium"
                >
                  추가 요청하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-base font-medium text-gray-700">
            디바이스 이름
          </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          required
        />
      </div>

      <div>
        <label htmlFor="alias" className="block text-base font-medium text-gray-700">
          <span className="text-red-500">*</span> 별칭 (필수. URL에 사용)
        </label>
        <input
          type="text"
          id="alias"
          value={formData.alias}
          onChange={(e) => {
            // 소문자로 변환하고 허용 문자만 필터링
            const v = e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, '');
            setFormData((prev) => ({ ...prev, alias: v }));
          }}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="예: lobby-display"
          required
        />
        <p className="mt-1 text-xs text-gray-500">영문 소문자, 숫자, 하이픈(-) 사용 가능</p>
      </div>

      <div>
        <label htmlFor="location" className="block text-base font-medium text-gray-700">
          설치 위치
        </label>
        <input
          type="text"
          id="location"
          value={formData.location}
          onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          required
        />
      </div>

      <div>
        <label htmlFor="pin_code" className="block text-base font-medium text-gray-700">
          PIN 코드 (4자리 숫자)
        </label>
        <input
          type="text"
          id="pin_code"
          value={formData.pin_code}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 4);
            setFormData((prev) => ({ ...prev, pin_code: v }));
          }}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-mono text-center tracking-widest"
          placeholder="0000"
          maxLength={4}
          required
        />
        <p className="mt-1 text-xs text-gray-500">디스플레이 접근 시 필요한 PIN 코드입니다.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        disabled={isLimitReached}
      >
        {isLimitReached ? '등록 한도 도달' : '디바이스 등록'}
      </button>
    </form>
    </>
  );
}
