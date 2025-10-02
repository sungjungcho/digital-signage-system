'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Device {
  id: string;
  name: string;
  location: string;
  status: string;
}

export default function InitializeDevice() {
  const [deviceId, setDeviceId] = useState('');
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputMethod, setInputMethod] = useState<'select' | 'manual'>('select');
  const router = useRouter();

  // 등록된 디바이스 목록 가져오기
  useEffect(() => {
    const fetchDevices = async () => {
      setIsLoadingDevices(true);
      try {
        console.log('[InitializeDevice] Fetching devices from /api/devices');
        const response = await fetch('/api/devices');
        console.log('[InitializeDevice] Response status:', response.status, response.ok);

        if (!response.ok) {
          throw new Error(`API 요청 실패: ${response.status}`);
        }

        const data = await response.json();
        console.log('[InitializeDevice] Received data:', data);

        if (Array.isArray(data)) {
          setDevices(data);
          console.log('[InitializeDevice] Devices set:', data.length, 'devices');
        } else {
          console.error('[InitializeDevice] Data is not an array:', data);
          setError('디바이스 목록 형식이 올바르지 않습니다.');
        }
      } catch (error) {
        console.error('[InitializeDevice] 디바이스 목록을 가져오는 중 오류 발생:', error);
        setError(error instanceof Error ? error.message : '디바이스 목록을 가져올 수 없습니다.');
      } finally {
        setIsLoadingDevices(false);
      }
    };

    fetchDevices();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!deviceId.trim()) {
      setError('디바이스 ID를 입력하거나 선택해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 디바이스 ID 유효성 검증
      const response = await fetch(`/api/devices/${deviceId}`);
      
      if (!response.ok) {
        throw new Error('유효하지 않은 디바이스 ID입니다.');
      }
      
      // 브라우저에 디바이스 ID 저장
      localStorage.setItem('deviceId', deviceId);
      
      // 디바이스 표시 페이지로 이동
      router.push(`/display/${deviceId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">디지털 사이니지 디바이스 연결</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 입력 방법 선택 */}
          <div className="flex space-x-4 mb-4">
            <button
              type="button"
              onClick={() => setInputMethod('select')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition duration-200 ${
                inputMethod === 'select' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              디바이스 선택
            </button>
            <button
              type="button"
              onClick={() => setInputMethod('manual')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition duration-200 ${
                inputMethod === 'manual' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              직접 입력
            </button>
          </div>

          <div>
            <label htmlFor="deviceId" className="block text-sm font-medium text-gray-300 mb-2">
              디바이스 ID
            </label>
            
            {inputMethod === 'select' ? (
              <select
                id="deviceId"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading || isLoadingDevices}
              >
                <option value="">
                  {isLoadingDevices ? '디바이스 목록 로딩 중...' :
                   devices.length === 0 ? '등록된 디바이스가 없습니다' :
                   '디바이스를 선택해주세요'}
                </option>
                {devices.map(device => (
                  <option key={device.id} value={device.id}>
                    {device.name} - {device.location} ({device.status === 'online' ? '온라인' : '오프라인'})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                id="deviceId"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="디바이스 ID를 직접 입력하세요"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            )}
            
            {deviceId && (
              <div className="mt-2 text-xs text-gray-400">
                선택된 디바이스 ID: {deviceId}
              </div>
            )}

            {!isLoadingDevices && devices.length === 0 && inputMethod === 'select' && (
              <div className="mt-2 p-3 bg-yellow-900 text-yellow-200 rounded-md text-sm">
                등록된 디바이스가 없습니다. 관리자 페이지에서 먼저 디바이스를 등록해주세요.
              </div>
            )}
          </div>
          
          {error && (
            <div className="bg-red-900 text-white p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLoading || !deviceId}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? '연결 중...' : '디바이스 연결'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <a 
            href="/admin" 
            className="text-sm text-blue-400 hover:text-blue-300 underline"
          >
            관리자 페이지로 이동
          </a>
        </div>
      </div>
    </div>
  );
}
