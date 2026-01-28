'use client';

import { useState } from 'react';

interface DeviceFormProps {
  onDeviceAdded: () => void;
}

export default function DeviceForm({ onDeviceAdded }: DeviceFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    alias: '',
    location: '',
    pin_code: '0000',
  });
  const [error, setError] = useState('');

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
        setError(data.error || '디바이스 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('디바이스 등록 중 오류 발생:', error);
      setError('디바이스 등록 중 오류가 발생했습니다.');
    }
  };

  return (
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
      >
        디바이스 등록
      </button>
    </form>
  );
}
