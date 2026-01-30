'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Device {
  id: string;
  name: string;
  alias: string;
  location: string;
  pin_code: string;
  status: string;
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

interface DeviceRequest {
  id: string;
  user_id: string;
  username: string;
  user_name: string | null;
  requested_count: number;
  current_max: number;
  user_max_devices: number;
  current_device_count: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_count: number | null;
  created_at: string;
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
  const [deviceRequests, setDeviceRequests] = useState<DeviceRequest[]>([]);
  const [editingMaxDevices, setEditingMaxDevices] = useState<{ userId: string; value: number } | null>(null);

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

  const fetchUserDevices = async (userId: string) => {
    if (userDevices[userId]) return; // 이미 로드됨

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

  const fetchDeviceRequests = async () => {
    try {
      const response = await fetch('/api/superadmin/device-requests');
      if (response.ok) {
        const data = await response.json();
        setDeviceRequests(data);
      }
    } catch (error) {
      console.error('디바이스 요청 목록 조회 오류:', error);
    }
  };

  const handleDeviceRequestAction = async (requestId: string, action: 'approve' | 'reject', approvedCount?: number) => {
    setActionLoading(requestId);
    try {
      const response = await fetch('/api/superadmin/device-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action, approvedCount }),
      });
      if (response.ok) {
        fetchDeviceRequests();
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || '처리 실패');
      }
    } catch (error) {
      alert('처리 중 오류 발생');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateMaxDevices = async (userId: string, maxDevices: number) => {
    setActionLoading(userId);
    try {
      const response = await fetch(`/api/superadmin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_devices: maxDevices }),
      });
      if (response.ok) {
        fetchUsers();
        setEditingMaxDevices(null);
      } else {
        const data = await response.json();
        alert(data.error || '디바이스 한도 변경 실패');
      }
    } catch (error) {
      alert('디바이스 한도 변경 중 오류 발생');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDeviceRequests();
  }, []);

  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    try {
      const response = await fetch(`/api/superadmin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      if (response.ok) {
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || '승인 처리 실패');
      }
    } catch (error) {
      alert('승인 처리 중 오류 발생');
    } finally {
      setActionLoading(null);
    }
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
      if (response.ok) {
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || '거부 처리 실패');
      }
    } catch (error) {
      alert('거부 처리 중 오류 발생');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId: string, username: string) => {
    if (!confirm(`정말로 '${username}' 사용자를 삭제하시겠습니까?\n사용자의 디바이스는 슈퍼관리자에게 이전됩니다.`)) return;
    setActionLoading(userId);
    try {
      const response = await fetch(`/api/superadmin/users/${userId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchUsers();
        setExpandedUserId(null);
      } else {
        const data = await response.json();
        alert(data.error || '삭제 실패');
      }
    } catch (error) {
      alert('삭제 중 오류 발생');
    } finally {
      setActionLoading(null);
    }
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
      if (response.ok) {
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || '역할 변경 실패');
      }
    } catch (error) {
      alert('역할 변경 중 오류 발생');
    } finally {
      setActionLoading(null);
    }
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
                <p className="text-sm text-purple-600 font-medium">사용자 계정 관리</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
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
            </div>
          </div>
        </div>
      </header>

      {/* 메인 */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* 승인 대기 알림 */}
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

        {/* 디바이스 추가 요청 */}
        {deviceRequests.filter(r => r.status === 'pending').length > 0 && (
          <div className="mb-6 bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">디바이스 추가 요청</h2>
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                {deviceRequests.filter(r => r.status === 'pending').length}건 대기
              </span>
            </div>

            <div className="space-y-3">
              {deviceRequests.filter(r => r.status === 'pending').map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-xl">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">
                      {request.user_name || request.username}
                      <span className="text-sm font-normal text-gray-500 ml-2">(@{request.username})</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      현재 {request.current_device_count}개 사용 중 / 한도 {request.user_max_devices}개
                      <span className="text-orange-600 font-medium ml-2">
                        → {request.requested_count}개 추가 요청
                      </span>
                    </p>
                    {request.reason && (
                      <p className="text-sm text-gray-500 mt-1">사유: {request.reason}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      요청일: {new Date(request.created_at).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <input
                      type="number"
                      min={request.user_max_devices}
                      defaultValue={request.user_max_devices + request.requested_count}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                      id={`approve-count-${request.id}`}
                    />
                    <span className="text-sm text-gray-500">개로</span>
                    <button
                      onClick={() => {
                        const input = document.getElementById(`approve-count-${request.id}`) as HTMLInputElement;
                        handleDeviceRequestAction(request.id, 'approve', parseInt(input.value));
                      }}
                      disabled={actionLoading === request.id}
                      className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50"
                    >
                      승인
                    </button>
                    <button
                      onClick={() => handleDeviceRequestAction(request.id, 'reject')}
                      disabled={actionLoading === request.id}
                      className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 disabled:opacity-50"
                    >
                      거절
                    </button>
                  </div>
                </div>
              ))}
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
                <>
                  <tr
                    key={user.id}
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
                      {editingMaxDevices?.userId === user.id ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600">{user.deviceCount} /</span>
                          <input
                            type="number"
                            min={user.deviceCount}
                            value={editingMaxDevices.value}
                            onChange={(e) => setEditingMaxDevices({ userId: user.id, value: parseInt(e.target.value) || 0 })}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateMaxDevices(user.id, editingMaxDevices.value)}
                            disabled={actionLoading === user.id}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setEditingMaxDevices(null)}
                            className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingMaxDevices({ userId: user.id, value: user.max_devices || 3 })}
                          className="text-gray-600 hover:text-purple-600 hover:underline"
                          title="클릭하여 한도 수정"
                        >
                          {user.deviceCount} / {user.max_devices || 3}개
                        </button>
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
                  {/* 디바이스 트리 */}
                  {expandedUserId === user.id && (
                    <tr key={`${user.id}-devices`}>
                      <td colSpan={7} className="px-6 py-4 bg-gray-50">
                        <div className="ml-8 border-l-2 border-purple-200 pl-4">
                          <p className="text-sm font-semibold text-purple-700 mb-3">
                            등록된 디바이스 목록
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
                                      위치: {device.location} | PIN: {device.pin_code}
                                    </p>
                                  </div>
                                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                                    device.status === 'online'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {device.status === 'online' ? '온라인' : '오프라인'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">등록된 디바이스가 없습니다.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
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
    </div>
  );
}
