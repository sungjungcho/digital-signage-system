'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { device } from '@/types/device';

import DeviceList from '@/components/admin/DeviceList';
import ContentManager from '@/components/admin/ContentManager';
import PatientManager from '@/components/admin/PatientManager';
import NoticeManager from '@/components/admin/NoticeManager';
import ContentLibrary from '@/components/admin/ContentLibrary';
import DeviceContentLinker from '@/components/admin/DeviceContentLinker';
import ScheduleViewer from '@/components/admin/ScheduleViewer';

type AlertForm = {
  message: string;
  targetDeviceIds: string[];
};

type TabType = 'devices' | 'content' | 'library' | 'linker' | 'schedule' | 'patient' | 'notice' | 'alert';

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: 'devices', label: '내 디바이스', icon: '📺' },
  { id: 'content', label: '콘텐츠 관리', icon: '🖼️' },
  { id: 'library', label: '콘텐츠 라이브러리', icon: '📚' },
  { id: 'linker', label: '콘텐츠 연결', icon: '🔗' },
  { id: 'schedule', label: '스케줄 조회', icon: '📅' },
  { id: 'patient', label: '환자 관리', icon: '👥' },
  { id: 'notice', label: '공지사항', icon: '📢' },
  { id: 'alert', label: '긴급 알림', icon: '🔔' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('devices');
  const [selectedDevice, setSelectedDevice] = useState<device | null>(null);
  const [devices, setDevices] = useState<device[]>([]);
  const [userRole, setUserRole] = useState<string>('user');
  const [alertForm, setAlertForm] = useState<AlertForm>({ message: '', targetDeviceIds: [] });
  const [alertDuration, setAlertDuration] = useState<number>(5000);
  const [sending, setSending] = useState(false);
  const [alertResult, setAlertResult] = useState<string | null>(null);

  // 디바이스 등록 폼
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [deviceForm, setDeviceForm] = useState({ name: '', location: '', alias: '', pin_code: '' });
  const [deviceFormLoading, setDeviceFormLoading] = useState(false);
  const [deviceFormError, setDeviceFormError] = useState('');
  const [deviceFormSuccess, setDeviceFormSuccess] = useState('');

  // 디바이스 한도 관련
  const [userMaxDevices, setUserMaxDevices] = useState<number>(3);
  const [isOverLimitRequest, setIsOverLimitRequest] = useState(false);
  const availableTabs = userRole === 'superadmin'
    ? TABS
    : TABS.filter((tab) => tab.id !== 'patient');

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

  const fetchUserRole = async () => {
    try {
      const response = await fetch('/api/auth/check');
      const data = await response.json();
      if (data.user?.role) {
        setUserRole(data.user.role);
      }
      if (data.user?.max_devices) {
        setUserMaxDevices(data.user.max_devices);
      }
    } catch (error) {
      console.error('사용자 정보 조회 오류:', error);
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchUserRole();
    fetch('/api/websocket').catch(console.error);
  }, []);

  useEffect(() => {
    if (userRole !== 'superadmin' && activeTab === 'patient') {
      setActiveTab('devices');
    }
  }, [userRole, activeTab]);

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

  // 디바이스 등록 요청
  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeviceFormError('');
    setDeviceFormSuccess('');

    if (!deviceForm.name.trim()) {
      setDeviceFormError('디바이스 이름을 입력해주세요.');
      return;
    }
    if (!deviceForm.location.trim()) {
      setDeviceFormError('설치 위치를 입력해주세요.');
      return;
    }
    if (deviceForm.alias && !/^[a-z0-9\-]+$/.test(deviceForm.alias)) {
      setDeviceFormError('별칭은 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.');
      return;
    }

    setDeviceFormLoading(true);
    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: deviceForm.name,
          location: deviceForm.location,
          alias: deviceForm.alias || undefined,
          pin_code: deviceForm.pin_code || undefined,
          auto_pin: !deviceForm.pin_code,
          is_over_limit_request: isOverLimitRequest,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setDeviceFormSuccess(data.message || '디바이스 등록 요청이 완료되었습니다.');
        setDeviceForm({ name: '', location: '', alias: '', pin_code: '' });
        setIsOverLimitRequest(false);
        setShowDeviceForm(false);
        fetchDevices();
      } else {
        setDeviceFormError(data.error || '디바이스 등록 실패');
      }
    } catch {
      setDeviceFormError('디바이스 등록 중 오류가 발생했습니다.');
    } finally {
      setDeviceFormLoading(false);
    }
  };

  // 디바이스 한도 초과 여부 확인
  const isDeviceLimitExceeded = userRole !== 'superadmin' && devices.length >= userMaxDevices;

  // 탭 콘텐츠 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case 'devices':
        return (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-teal-100">
            <div className="flex items-center space-x-3 mb-5">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">내 디바이스</h2>
            </div>

            {/* 디바이스 등록 버튼 */}
            <button
              onClick={() => setShowDeviceForm(!showDeviceForm)}
              className="w-full mb-4 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition font-medium shadow-md flex items-center justify-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>새 디바이스 등록</span>
            </button>

            {/* 성공 메시지 */}
            {deviceFormSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">{deviceFormSuccess}</p>
              </div>
            )}

            {/* 디바이스 등록 폼 */}
            {showDeviceForm && (
              <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <h3 className="font-semibold text-gray-700 mb-3">디바이스 등록 요청</h3>
                {userRole !== 'superadmin' && (
                  <p className="text-xs text-blue-600 mb-3">
                    * 등록 후 관리자 승인이 필요합니다.
                  </p>
                )}
                <form onSubmit={handleCreateDevice} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">디바이스 이름 *</label>
                    <input
                      type="text"
                      value={deviceForm.name}
                      onChange={(e) => setDeviceForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="예: 로비 디스플레이"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">설치 위치 *</label>
                    <input
                      type="text"
                      value={deviceForm.location}
                      onChange={(e) => setDeviceForm(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="예: 1층 로비"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">별칭 (선택)</label>
                    <input
                      type="text"
                      value={deviceForm.alias}
                      onChange={(e) => {
                        const v = e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, '');
                        setDeviceForm(prev => ({ ...prev, alias: v }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                      placeholder="예: lobby-display"
                    />
                    <p className="text-xs text-gray-500 mt-1">URL에 사용됩니다. 미입력 시 자동생성</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">PIN 코드 (선택)</label>
                    <input
                      type="text"
                      value={deviceForm.pin_code}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setDeviceForm(prev => ({ ...prev, pin_code: v }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono text-center tracking-widest"
                      placeholder="4자리 숫자 (미입력 시 자동생성)"
                      maxLength={4}
                    />
                  </div>
                  {deviceFormError && (
                    <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                      {deviceFormError}
                    </div>
                  )}
                  {isDeviceLimitExceeded && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-700 mb-2">
                        디바이스 등록 한도({userMaxDevices}개)를 초과했습니다.
                      </p>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isOverLimitRequest}
                          onChange={(e) => setIsOverLimitRequest(e.target.checked)}
                          className="h-4 w-4 text-orange-600 rounded border-orange-300 focus:ring-orange-500"
                        />
                        <span className="text-sm font-medium text-orange-800">
                          추가 등록 요청 (관리자 승인 필요)
                        </span>
                      </label>
                    </div>
                  )}
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      disabled={deviceFormLoading || (isDeviceLimitExceeded && !isOverLimitRequest)}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium disabled:opacity-50 text-sm"
                    >
                      {deviceFormLoading ? '등록 중...' : (isOverLimitRequest ? '추가 등록 요청' : '등록 요청')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeviceForm(false);
                        setDeviceFormError('');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium text-sm"
                    >
                      취소
                    </button>
                  </div>
                </form>
              </div>
            )}

            <DeviceList
              devices={devices}
              onDeviceSelect={(device) => {
                setSelectedDevice(device);
                setActiveTab('content');
              }}
              onDeviceDeleted={fetchDevices}
              userRole={userRole}
            />
          </div>
        );

      case 'content':
        return (
          <div className="flex gap-6 h-[calc(100vh-200px)]">
            {/* 왼쪽: 디바이스 목록 */}
            <div className="w-80 flex-shrink-0 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100 flex flex-col">
              <div className="p-4 border-b border-purple-100">
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">디바이스 목록</h3>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {devices.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">등록된 디바이스가 없습니다</p>
                  </div>
                ) : (
                  devices.map((device) => (
                    <button
                      key={device.id}
                      onClick={() => setSelectedDevice(device)}
                      className={`w-full text-left p-3 rounded-xl transition-all ${
                        selectedDevice?.id === device.id
                          ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                          selectedDevice?.id === device.id
                            ? 'bg-white/20'
                            : 'bg-purple-100'
                        }`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${
                            selectedDevice?.id === device.id ? 'text-white' : 'text-purple-600'
                          }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold truncate ${
                            selectedDevice?.id === device.id ? 'text-white' : 'text-gray-800'
                          }`}>
                            {device.name}
                          </p>
                          <p className={`text-xs truncate ${
                            selectedDevice?.id === device.id ? 'text-white/70' : 'text-gray-500'
                          }`}>
                            {device.location}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* 오른쪽: 콘텐츠 관리 영역 */}
            <div className="flex-1 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100 flex flex-col overflow-hidden">
              {selectedDevice ? (
                <>
                  <div className="p-4 border-b border-purple-100 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-9 w-9 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{selectedDevice.name}</h3>
                        <p className="text-xs text-gray-500">{selectedDevice.location}</p>
                      </div>
                    </div>
                    <a
                      href={`/display/${selectedDevice.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 transition"
                      title="미리보기"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>미리보기</span>
                    </a>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <ContentManager key={selectedDevice.id} device={selectedDevice} />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    <p className="text-gray-500 font-medium text-lg mb-1">디바이스를 선택해주세요</p>
                    <p className="text-gray-400 text-sm">왼쪽 목록에서 디바이스를 클릭하면<br/>콘텐츠를 관리할 수 있습니다</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'library':
        return <ContentLibrary />;

      case 'linker':
        return <DeviceContentLinker />;

      case 'schedule':
        return <ScheduleViewer />;

      case 'patient':
        if (userRole !== 'superadmin') {
          return null;
        }
        return (
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
        );

      case 'notice':
        return (
          <NoticeManager
            onSendNotice={(content) => {
              setAlertForm({ ...alertForm, message: content });
              setActiveTab('alert');
            }}
          />
        );

      case 'alert':
        return (
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
                } catch {
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
                    } catch {
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
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-cyan-50">
      {/* 헤더 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-teal-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">디지털 사이니지 관리</h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {userRole === 'superadmin' && (
                <a
                  href="/superadmin"
                  className="px-4 py-2.5 bg-purple-500/20 text-purple-700 rounded-xl hover:bg-purple-500/30 transition font-medium"
                >
                  슈퍼관리자
                </a>
              )}
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
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-teal-100 sticky top-[76px] z-10">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="flex space-x-1 overflow-x-auto py-2">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-[1920px] mx-auto px-6 py-6">
        {renderTabContent()}
      </div>
    </div>
  );
}
