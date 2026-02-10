'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Device {
  id: string;
  name: string;
  alias: string;
  location: string;
  pin_code: string;
  status: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  is_over_limit_request?: boolean | number;
  user_id: string;
  owner_username?: string;
  owner_name?: string;
  createdAt?: string;
}

interface User {
  id: string;
  username: string;
  email: string | null;
  role: 'user' | 'superadmin';
  status: 'pending' | 'approved' | 'rejected';
  name: string | null;
  max_devices: number;
  created_at: string;
  updated_at: string;
  deviceCount: number;
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userDevices, setUserDevices] = useState<Record<string, Device[]>>({});
  const [deviceLoading, setDeviceLoading] = useState<string | null>(null);

  // 디바이스 생성 폼
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [deviceForm, setDeviceForm] = useState({
    name: '',
    alias: '',
    location: '',
    pin_code: '',
    user_id: '',
  });
  const [deviceFormError, setDeviceFormError] = useState('');
  const [deviceFormLoading, setDeviceFormLoading] = useState(false);

  // 디바이스 수정
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editDeviceForm, setEditDeviceForm] = useState({ name: '', alias: '', location: '', pin_code: '', user_id: '' });

  // 디바이스 한도 수정
  const [editingMaxDevices, setEditingMaxDevices] = useState<string | null>(null);
  const [maxDevicesValue, setMaxDevicesValue] = useState<number>(3);

  // 승인 대기 디바이스
  const [pendingDevices, setPendingDevices] = useState<Device[]>([]);

  const approvedUsers = users.filter(u => u.status === 'approved');

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/superadmin/users');
      if (response.status === 403) {
        router.push('/');
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('사용자 목록 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingDevices = async () => {
    try {
      const response = await fetch('/api/devices');
      if (response.ok) {
        const data = await response.json();
        const pending = data.filter((d: Device) => d.approval_status === 'pending');
        setPendingDevices(pending);
      }
    } catch (error) {
      console.error('디바이스 목록 조회 오류:', error);
    }
  };

  const handleApproveDevice = async (deviceId: string) => {
    setActionLoading(deviceId);
    try {
      const response = await fetch(`/api/devices/${deviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_status: 'approved' }),
      });
      if (response.ok) {
        fetchPendingDevices();
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || '디바이스 승인 실패');
      }
    } catch { alert('디바이스 승인 중 오류 발생'); }
    finally { setActionLoading(null); }
  };

  const handleRejectDevice = async (deviceId: string) => {
    if (!confirm('이 디바이스 등록 요청을 거부하시겠습니까?')) return;
    setActionLoading(deviceId);
    try {
      const response = await fetch(`/api/devices/${deviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_status: 'rejected' }),
      });
      if (response.ok) {
        fetchPendingDevices();
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || '디바이스 거부 실패');
      }
    } catch { alert('디바이스 거부 중 오류 발생'); }
    finally { setActionLoading(null); }
  };

  const fetchUserDevices = async (userId: string) => {
    setDeviceLoading(userId);
    try {
      const response = await fetch(`/api/superadmin/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUserDevices(prev => ({ ...prev, [userId]: data.devices || [] }));
      }
    } catch (error) {
      console.error('디바이스 목록 조회 오류:', error);
    } finally {
      setDeviceLoading(null);
    }
  };

  const handleToggleExpand = async (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
    } else {
      setExpandedUserId(userId);
      await fetchUserDevices(userId);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPendingDevices();
  }, []);

  // 디바이스 생성
  const generatePin = () => {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    setDeviceForm(prev => ({ ...prev, pin_code: pin }));
  };

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeviceFormError('');

    if (!deviceForm.user_id) {
      setDeviceFormError('디바이스를 할당할 사용자를 선택해주세요.');
      return;
    }
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
          ...deviceForm,
          auto_pin: !deviceForm.pin_code,
        }),
      });

      if (response.ok) {
        setDeviceForm({ name: '', alias: '', location: '', pin_code: '', user_id: '' });
        setShowDeviceForm(false);
        fetchUsers();
        // 해당 사용자의 디바이스 목록 새로고침
        if (deviceForm.user_id) {
          setUserDevices(prev => {
            const updated = { ...prev };
            delete updated[deviceForm.user_id];
            return updated;
          });
          if (expandedUserId === deviceForm.user_id) {
            await fetchUserDevices(deviceForm.user_id);
          }
        }
      } else {
        const data = await response.json();
        setDeviceFormError(data.error || '디바이스 등록 실패');
      }
    } catch {
      setDeviceFormError('디바이스 등록 중 오류 발생');
    } finally {
      setDeviceFormLoading(false);
    }
  };

  // 디바이스 수정
  const handleStartEditDevice = (device: Device) => {
    setEditingDevice(device);
    setEditDeviceForm({
      name: device.name,
      alias: device.alias,
      location: device.location,
      pin_code: device.pin_code,
      user_id: device.user_id,
    });
  };

  const handleUpdateDevice = async () => {
    if (!editingDevice) return;
    setActionLoading(editingDevice.id);
    try {
      const response = await fetch(`/api/devices/${editingDevice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editDeviceForm),
      });
      if (response.ok) {
        setEditingDevice(null);
        fetchUsers();
        // 관련 사용자들의 디바이스 목록 새로고침
        const affectedUserIds = new Set([editingDevice.user_id, editDeviceForm.user_id]);
        affectedUserIds.forEach(uid => {
          setUserDevices(prev => {
            const updated = { ...prev };
            delete updated[uid];
            return updated;
          });
        });
        if (expandedUserId && affectedUserIds.has(expandedUserId)) {
          await fetchUserDevices(expandedUserId);
        }
      } else {
        const data = await response.json();
        alert(data.error || '디바이스 수정 실패');
      }
    } catch {
      alert('디바이스 수정 중 오류 발생');
    } finally {
      setActionLoading(null);
    }
  };

  // 디바이스 삭제
  const handleDeleteDevice = async (device: Device) => {
    if (!confirm(`정말로 '${device.name}' 디바이스를 삭제하시겠습니까?\n모든 콘텐츠도 함께 삭제됩니다.`)) return;
    setActionLoading(device.id);
    try {
      const response = await fetch(`/api/devices/${device.id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchUsers();
        setUserDevices(prev => {
          const updated = { ...prev };
          delete updated[device.user_id];
          return updated;
        });
        if (expandedUserId === device.user_id) {
          await fetchUserDevices(device.user_id);
        }
      } else {
        const data = await response.json();
        alert(data.error || '디바이스 삭제 실패');
      }
    } catch {
      alert('디바이스 삭제 중 오류 발생');
    } finally {
      setActionLoading(null);
    }
  };

  // 사용자 관리
  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    try {
      const response = await fetch(`/api/superadmin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      if (response.ok) fetchUsers();
      else {
        const data = await response.json();
        alert(data.error || '승인 처리 실패');
      }
    } catch { alert('승인 처리 중 오류 발생'); }
    finally { setActionLoading(null); }
  };

  const handleReject = async (userId: string) => {
    if (!confirm('이 사용자의 가입을 거부하시겠습니까?')) return;
    setActionLoading(userId);
    try {
      const response = await fetch(`/api/superadmin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });
      if (response.ok) fetchUsers();
      else {
        const data = await response.json();
        alert(data.error || '거부 처리 실패');
      }
    } catch { alert('거부 처리 중 오류 발생'); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async (userId: string, username: string) => {
    if (!confirm(`정말로 '${username}' 사용자를 삭제하시겠습니까?\n사용자의 디바이스는 슈퍼관리자에게 이전됩니다.`)) return;
    setActionLoading(userId);
    try {
      const response = await fetch(`/api/superadmin/users/${userId}`, { method: 'DELETE' });
      if (response.ok) {
        fetchUsers();
        setExpandedUserId(null);
      } else {
        const data = await response.json();
        alert(data.error || '삭제 실패');
      }
    } catch { alert('삭제 중 오류 발생'); }
    finally { setActionLoading(null); }
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'superadmin' ? 'user' : 'superadmin';
    const action = newRole === 'superadmin' ? '슈퍼관리자로 승격' : '일반 사용자로 변경';
    if (!confirm(`이 사용자를 ${action}하시겠습니까?`)) return;
    setActionLoading(userId);
    try {
      const response = await fetch(`/api/superadmin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (response.ok) fetchUsers();
      else {
        const data = await response.json();
        alert(data.error || '역할 변경 실패');
      }
    } catch { alert('역할 변경 중 오류 발생'); }
    finally { setActionLoading(null); }
  };

  // 디바이스 한도 수정
  const handleStartEditMaxDevices = (user: User) => {
    setEditingMaxDevices(user.id);
    setMaxDevicesValue(user.max_devices);
  };

  const handleUpdateMaxDevices = async (userId: string) => {
    setActionLoading(userId);
    try {
      const response = await fetch(`/api/superadmin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_devices: maxDevicesValue }),
      });
      if (response.ok) {
        fetchUsers();
        setEditingMaxDevices(null);
      } else {
        const data = await response.json();
        alert(data.error || '디바이스 한도 변경 실패');
      }
    } catch { alert('디바이스 한도 변경 중 오류 발생'); }
    finally { setActionLoading(null); }
  };

  const filteredUsers = users.filter(user => {
    if (filter === 'all') return true;
    return user.status === filter;
  });

  const pendingCount = users.filter(u => u.status === 'pending').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">대기중</span>;
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">승인됨</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">거부됨</span>;
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'superadmin') {
      return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">슈퍼관리자</span>;
    }
    return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">사용자</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-purple-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m9 5.197v-1a6 6 0 00-3-5.197" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">슈퍼관리자</h1>
                <p className="text-sm text-purple-600 font-medium">사용자 및 디바이스 관리</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowDeviceForm(!showDeviceForm)}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition font-medium shadow-md"
              >
                + 디바이스 등록
              </button>
              <a
                href="/admin"
                className="px-4 py-2 bg-teal-500/20 text-teal-700 rounded-lg hover:bg-teal-500/30 transition font-medium"
              >
                관리자 페이지
              </a>
              <a
                href="/"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                홈으로
              </a>
              <button
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  router.push('/login');
                }}
                className="px-4 py-2 bg-red-500/80 text-white rounded-lg hover:bg-red-600 transition font-medium"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* 디바이스 등록 폼 */}
        {showDeviceForm && (
          <div className="mb-6 bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">새 디바이스 등록</h2>
            </div>

            <form onSubmit={handleCreateDevice} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">할당 사용자 *</label>
                <select
                  value={deviceForm.user_id}
                  onChange={(e) => setDeviceForm(prev => ({ ...prev, user_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">사용자를 선택하세요</option>
                  {approvedUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.username} (@{user.username}) - 디바이스 {user.deviceCount}개
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">디바이스 이름 *</label>
                <input
                  type="text"
                  value={deviceForm.name}
                  onChange={(e) => setDeviceForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="예: 로비 디스플레이"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설치 위치 *</label>
                <input
                  type="text"
                  value={deviceForm.location}
                  onChange={(e) => setDeviceForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="예: 1층 로비"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">별칭 (URL에 사용, 미입력 시 자동생성)</label>
                <input
                  type="text"
                  value={deviceForm.alias}
                  onChange={(e) => {
                    const v = e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, '');
                    setDeviceForm(prev => ({ ...prev, alias: v }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="예: lobby-display"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PIN 코드 (4자리)</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={deviceForm.pin_code}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setDeviceForm(prev => ({ ...prev, pin_code: v }));
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-center tracking-widest"
                    placeholder="미입력 시 자동생성"
                    maxLength={4}
                  />
                  <button
                    type="button"
                    onClick={generatePin}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium whitespace-nowrap"
                  >
                    자동생성
                  </button>
                </div>
              </div>
              <div className="flex items-end space-x-2">
                <button
                  type="submit"
                  disabled={deviceFormLoading}
                  className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition font-medium disabled:opacity-50"
                >
                  {deviceFormLoading ? '등록 중...' : '디바이스 등록'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDeviceForm(false); setDeviceFormError(''); }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  취소
                </button>
              </div>
              {deviceFormError && (
                <div className="md:col-span-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {deviceFormError}
                </div>
              )}
            </form>
          </div>
        )}

        {/* 디바이스 승인 대기 목록 */}
        {pendingDevices.length > 0 && (
          <div className="mb-6 bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">디바이스 승인 대기</h2>
                <p className="text-sm text-orange-600">{pendingDevices.length}개의 디바이스가 승인 대기 중입니다</p>
              </div>
            </div>

            <div className="space-y-3">
              {pendingDevices.map((device) => {
                const isOverLimit = device.is_over_limit_request === true || device.is_over_limit_request === 1;
                return (
                  <div key={device.id} className={`flex items-center justify-between p-4 rounded-xl ${
                    isOverLimit
                      ? 'bg-red-50 border-2 border-red-300'
                      : 'bg-orange-50 border border-orange-200'
                  }`}>
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <svg className={`h-10 w-10 ${isOverLimit ? 'text-red-400' : 'text-orange-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold text-gray-800">{device.name}</p>
                          {isOverLimit && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                              한도 초과 요청
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">위치: {device.location}</p>
                        <p className="text-sm text-gray-500">
                          별칭: <span className={`font-mono ${isOverLimit ? 'text-red-600' : 'text-orange-600'}`}>/{device.alias}</span>
                          {' | '}요청자: <span className="font-medium">{device.owner_name || device.owner_username || '알 수 없음'}</span>
                        </p>
                        {isOverLimit && (
                          <p className="text-xs text-red-600 mt-1">
                            * 승인 전 해당 사용자의 디바이스 한도를 늘려주세요
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApproveDevice(device.id)}
                        disabled={actionLoading === device.id}
                        className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => handleRejectDevice(device.id)}
                        disabled={actionLoading === device.id}
                        className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 disabled:opacity-50 font-medium"
                      >
                        거부
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 사용자 승인 대기 알림 */}
        {pendingCount > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-yellow-800">승인 대기 중인 사용자가 {pendingCount}명 있습니다.</p>
              <p className="text-sm text-yellow-700">사용자를 승인하면 시스템에 로그인할 수 있습니다.</p>
            </div>
          </div>
        )}

        {/* 필터 */}
        <div className="mb-6 flex space-x-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f === 'all' && '전체'}
              {f === 'pending' && `대기중 (${users.filter(u => u.status === 'pending').length})`}
              {f === 'approved' && '승인됨'}
              {f === 'rejected' && '거부됨'}
            </button>
          ))}
        </div>

        {/* 사용자 목록 */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 w-8"></th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">사용자</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">상태</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">역할</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">디바이스 (현재/한도)</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">가입일</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <React.Fragment key={user.id}>
                  <tr
                    className={`hover:bg-gray-50 cursor-pointer ${expandedUserId === user.id ? 'bg-purple-50' : ''}`}
                    onClick={() => handleToggleExpand(user.id)}
                  >
                    <td className="px-6 py-4">
                      <svg
                        className={`h-5 w-5 text-gray-400 transition-transform ${expandedUserId === user.id ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-800">{user.name || user.username}</p>
                        <p className="text-sm text-gray-500">@{user.username}</p>
                        {user.email && <p className="text-xs text-gray-400">{user.email}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(user.status)}</td>
                    <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      {editingMaxDevices === user.id ? (
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={maxDevicesValue}
                            onChange={(e) => setMaxDevicesValue(parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                          />
                          <button
                            onClick={() => handleUpdateMaxDevices(user.id)}
                            disabled={actionLoading === user.id}
                            className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50"
                          >
                            저장
                          </button>
                          <button
                            onClick={() => setEditingMaxDevices(null)}
                            className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600">{user.deviceCount}/{user.max_devices}개</span>
                          {user.status === 'approved' && (
                            <button
                              onClick={() => handleStartEditMaxDevices(user)}
                              className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition"
                              title="디바이스 한도 수정"
                            >
                              수정
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                      {user.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(user.id)}
                            disabled={actionLoading === user.id}
                            className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => handleReject(user.id)}
                            disabled={actionLoading === user.id}
                            className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 disabled:opacity-50"
                          >
                            거부
                          </button>
                        </>
                      )}
                      {user.status === 'approved' && (
                        <button
                          onClick={() => handleToggleRole(user.id, user.role)}
                          disabled={actionLoading === user.id}
                          className="px-3 py-1.5 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 disabled:opacity-50"
                        >
                          {user.role === 'superadmin' ? '권한 해제' : '관리자 승격'}
                        </button>
                      )}
                      {user.status === 'rejected' && (
                        <button
                          onClick={() => handleApprove(user.id)}
                          disabled={actionLoading === user.id}
                          className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50"
                        >
                          승인
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(user.id, user.username)}
                        disabled={actionLoading === user.id}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                  {/* 디바이스 목록 (확장) */}
                  {expandedUserId === user.id && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 bg-gray-50">
                        <div className="ml-8 border-l-2 border-purple-200 pl-4">
                          <p className="text-sm font-semibold text-purple-700 mb-3">
                            할당된 디바이스 목록
                          </p>
                          {deviceLoading === user.id ? (
                            <div className="flex items-center space-x-2 text-gray-500">
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              <span>로딩 중...</span>
                            </div>
                          ) : userDevices[user.id]?.length > 0 ? (
                            <div className="space-y-2">
                              {userDevices[user.id].map((device) => (
                                <div
                                  key={device.id}
                                  className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition"
                                >
                                  {editingDevice?.id === device.id ? (
                                    /* 수정 모드 */
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                                      <input
                                        value={editDeviceForm.name}
                                        onChange={(e) => setEditDeviceForm(prev => ({ ...prev, name: e.target.value }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                                        placeholder="이름"
                                      />
                                      <input
                                        value={editDeviceForm.alias}
                                        onChange={(e) => {
                                          const v = e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, '');
                                          setEditDeviceForm(prev => ({ ...prev, alias: v }));
                                        }}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm font-mono"
                                        placeholder="별칭"
                                      />
                                      <input
                                        value={editDeviceForm.location}
                                        onChange={(e) => setEditDeviceForm(prev => ({ ...prev, location: e.target.value }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                                        placeholder="위치"
                                      />
                                      <input
                                        value={editDeviceForm.pin_code}
                                        onChange={(e) => {
                                          const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                                          setEditDeviceForm(prev => ({ ...prev, pin_code: v }));
                                        }}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm font-mono text-center"
                                        placeholder="PIN"
                                        maxLength={4}
                                      />
                                      <select
                                        value={editDeviceForm.user_id}
                                        onChange={(e) => setEditDeviceForm(prev => ({ ...prev, user_id: e.target.value }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                                      >
                                        {approvedUsers.map(u => (
                                          <option key={u.id} value={u.id}>
                                            {u.name || u.username}
                                          </option>
                                        ))}
                                      </select>
                                      <div className="flex space-x-1">
                                        <button
                                          onClick={handleUpdateDevice}
                                          disabled={actionLoading === device.id}
                                          className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50"
                                        >
                                          저장
                                        </button>
                                        <button
                                          onClick={() => setEditingDevice(null)}
                                          className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                                        >
                                          취소
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    /* 표시 모드 */
                                    <>
                                      <div className="flex-shrink-0">
                                        <svg className="h-8 w-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-800">{device.name}</p>
                                        <p className="text-sm text-gray-500">
                                          별칭: <span className="font-mono text-purple-600">/{device.alias}</span>
                                        </p>
                                        <p className="text-xs text-gray-400">
                                          위치: {device.location} | PIN: <span className="font-mono font-bold">{device.pin_code}</span>
                                        </p>
                                      </div>
                                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                                        device.status === 'online'
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-gray-100 text-gray-600'
                                      }`}>
                                        {device.status === 'online' ? '온라인' : '오프라인'}
                                      </div>
                                      <div className="flex space-x-1">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleStartEditDevice(device); }}
                                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition"
                                        >
                                          수정
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleDeleteDevice(device); }}
                                          disabled={actionLoading === device.id}
                                          className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 transition disabled:opacity-50"
                                        >
                                          삭제
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">할당된 디바이스가 없습니다.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <svg className="h-12 w-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-500">해당 조건의 사용자가 없습니다.</p>
            </div>
          )}
        </div>
      </main>

      {/* 디바이스 수정 모달 (모바일 대응) */}
      {editingDevice && (
        <div className="md:hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-3">
            <h3 className="text-lg font-bold text-gray-800">디바이스 수정</h3>
            <input
              value={editDeviceForm.name}
              onChange={(e) => setEditDeviceForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="디바이스 이름"
            />
            <input
              value={editDeviceForm.location}
              onChange={(e) => setEditDeviceForm(prev => ({ ...prev, location: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="설치 위치"
            />
            <input
              value={editDeviceForm.pin_code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                setEditDeviceForm(prev => ({ ...prev, pin_code: v }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono text-center"
              placeholder="PIN 코드"
              maxLength={4}
            />
            <div className="flex space-x-2 pt-2">
              <button
                onClick={handleUpdateDevice}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                저장
              </button>
              <button
                onClick={() => setEditingDevice(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
