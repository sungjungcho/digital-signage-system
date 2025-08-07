'use client';

import { useState, useEffect } from 'react';
import { Device } from '@/types/device';
import DeviceList from '@/components/admin/DeviceList';
import DeviceForm from '@/components/admin/DeviceForm';
import ContentManager from '@/components/admin/ContentManager';

export default function AdminPage() {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);

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

  // 컴포넌트 마운트 시 디바이스 목록 가져오기
  useEffect(() => {
    fetchDevices();
  }, []);

  const handleDeviceAdded = () => {
    fetchDevices();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-6">디지털 사이니지 관리자</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 디바이스 관리 섹션 */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">디바이스 관리</h2>
          <DeviceForm onDeviceAdded={handleDeviceAdded} />
          <div className="mt-6">
            <DeviceList devices={devices} onDeviceSelect={setSelectedDevice} />
          </div>
        </div>

        {/* 콘텐츠 관리 섹션 */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">콘텐츠 관리</h2>
            <div className="flex space-x-2 items-center w-2/3">
              <div className="flex-1">
                <select 
                  value={selectedDevice?.id || ''} 
                  onChange={(e) => {
                    const deviceId = e.target.value;
                    const device = devices.find(d => d.id === deviceId);
                    setSelectedDevice(device || null);
                  }}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">디바이스 선택</option>
                  {devices.map(device => (
                    <option key={device.id} value={device.id}>{device.name} ({device.location})</option>
                  ))}
                </select>
              </div>
              {selectedDevice && (
                <a
                  href={`/display/${selectedDevice.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  미리보기
                </a>
              )}
            </div>
          </div>
          
          {selectedDevice ? (
            <ContentManager device={selectedDevice} />
          ) : (
            <p className="text-gray-500">디바이스를 선택해주세요.</p>
          )}
        </div>
      </div>
    </div>
  );
}
