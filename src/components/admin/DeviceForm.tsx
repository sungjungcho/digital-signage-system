'use client';

import { useState } from 'react';
import { Device } from '@/types/device';

interface DeviceFormProps {
  onDeviceAdded: () => void;
}

export default function DeviceForm({ onDeviceAdded }: DeviceFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // TODO: 실제 API 호출로 대체
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormData({ name: '', location: '' });
        onDeviceAdded(); // 디바이스 추가 후 목록 새로고침
      }
    } catch (error) {
      console.error('디바이스 등록 중 오류 발생:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
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
        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
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

      <button
        type="submit"
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        디바이스 등록
      </button>
    </form>
  );
}
