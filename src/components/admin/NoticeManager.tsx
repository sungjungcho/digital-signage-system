'use client';

import { useState, useEffect } from 'react';

type Notice = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  favorite: number;
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  device_id?: string;
  deviceName?: string;
  active?: number;
  priority?: number;
};

type Device = {
  id: string;
  name: string;
  alias?: string;
};

const CATEGORIES = [
  { value: 'all', label: '전체' },
  { value: '휴진안내', label: '휴진안내' },
  { value: '진료변경', label: '진료변경' },
  { value: '시설안내', label: '시설안내' },
  { value: '행사알림', label: '행사알림' },
  { value: '기타', label: '기타' },
];

type NoticeManagerProps = {
  onSendNotice: (content: string, deviceId: string) => void;
};

type DisplaySettings = {
  notice_enabled: number;
  notice_default_mode: 'ticker' | 'side_panel' | 'popup_cycle';
  notice_item_duration_sec: number;
  notice_max_items: number;
};

const ALL_DEVICES = '__all__';

export default function NoticeManager({ onSendNotice }: NoticeManagerProps) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [filteredNotices, setFilteredNotices] = useState<Notice[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    notice_enabled: 1,
    notice_default_mode: 'ticker',
    notice_item_duration_sec: 8,
    notice_max_items: 3,
  });

  // 새 공지사항 입력 state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('기타');

  // 디바이스 목록 가져오기
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch('/api/devices');
        const data = await response.json();
        if (Array.isArray(data)) {
          setDevices(data);
        }
      } catch (error) {
        console.error('디바이스 목록 가져오기 오류:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDevices();
  }, []);

  // 공지사항 목록 가져오기
  const fetchNotices = async () => {
    if (!selectedDeviceId) {
      setNotices([]);
      setFilteredNotices([]);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      if (selectedDeviceId === ALL_DEVICES) {
        const responses = await Promise.all(
          devices.map(async (device) => {
            const response = await fetch(`/api/devices/${device.id}/notices?${params.toString()}`);
            if (!response.ok) return [];
            const data = await response.json();
            return (Array.isArray(data) ? data : []).map((notice: Notice) => ({
              ...notice,
              device_id: notice.device_id || device.id,
              deviceName: device.name,
            }));
          })
        );
        const merged = responses.flat();
        setNotices(merged);
        setFilteredNotices(merged);
      } else {
        const response = await fetch(`/api/devices/${selectedDeviceId}/notices?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          const selectedDeviceName = devices.find(d => d.id === selectedDeviceId)?.name;
          const normalized = (Array.isArray(data) ? data : []).map((notice: Notice) => ({
            ...notice,
            deviceName: selectedDeviceName,
          }));
          setNotices(normalized);
          setFilteredNotices(normalized);
        } else {
          setNotices([]);
          setFilteredNotices([]);
        }
      }
    } catch (error) {
      console.error('공지사항 목록 가져오기 오류:', error);
      setNotices([]);
      setFilteredNotices([]);
    }
  };

  useEffect(() => {
    if (selectedDeviceId) {
      fetchNotices();
    } else {
      setNotices([]);
      setFilteredNotices([]);
    }
  }, [selectedDeviceId, selectedCategory, searchQuery, devices]);

  useEffect(() => {
    const fetchDisplaySettings = async () => {
      if (!selectedDeviceId || selectedDeviceId === ALL_DEVICES) return;
      setSettingsLoading(true);
      try {
        const response = await fetch(`/api/devices/${selectedDeviceId}/display-settings`);
        if (!response.ok) return;
        const data = await response.json();
        setDisplaySettings({
          notice_enabled: data.notice_enabled ?? 1,
          notice_default_mode: data.notice_default_mode ?? 'ticker',
          notice_item_duration_sec: data.notice_item_duration_sec ?? 8,
          notice_max_items: data.notice_max_items ?? 3,
        });
      } catch (error) {
        console.error('공지 표시 설정 조회 오류:', error);
      } finally {
        setSettingsLoading(false);
      }
    };
    fetchDisplaySettings();
  }, [selectedDeviceId]);

  const handleApplyDisplaySettings = async () => {
    if (!selectedDeviceId || selectedDeviceId === ALL_DEVICES) return;
    try {
      const saveResponse = await fetch(`/api/devices/${selectedDeviceId}/display-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(displaySettings),
      });

      if (!saveResponse.ok) {
        const error = await saveResponse.json();
        alert(error.error || '설정 저장에 실패했습니다.');
        return;
      }

      const applyResponse = await fetch(`/api/devices/${selectedDeviceId}/apply-display-settings`, {
        method: 'POST',
      });

      if (applyResponse.ok) {
        alert('설정이 저장되었고 디바이스에 즉시 적용되었습니다.');
      } else {
        const error = await applyResponse.json();
        alert(error.error || '디바이스 적용에 실패했습니다.');
      }
    } catch (error) {
      console.error('공지 표시 설정 즉시 적용 오류:', error);
      alert('즉시 적용 중 오류가 발생했습니다.');
    }
  };

  // 공지사항 추가
  const handleAddNotice = async () => {
    if (!selectedDeviceId) {
      alert('먼저 디바이스를 선택해주세요.');
      return;
    }
    if (selectedDeviceId === ALL_DEVICES) {
      alert('전체 선택 상태에서는 등록할 수 없습니다. 특정 디바이스를 선택해주세요.');
      return;
    }

    if (!newTitle.trim() || !newContent.trim()) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(`/api/devices/${selectedDeviceId}/notices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          content: newContent,
          category: newCategory,
        }),
      });

      if (response.ok) {
        alert('공지사항이 등록되었습니다.');
        setNewTitle('');
        setNewContent('');
        setNewCategory('기타');
        setShowAddForm(false);
        fetchNotices();
      }
    } catch (error) {
      console.error('공지사항 추가 오류:', error);
      alert('공지사항 추가 중 오류가 발생했습니다.');
    }
  };

  // 공지사항 수정
  const handleUpdateNotice = async () => {
    if (!editingNotice || !selectedDeviceId) return;
    const targetDeviceId = selectedDeviceId === ALL_DEVICES ? editingNotice.device_id : selectedDeviceId;
    if (!targetDeviceId) {
      alert('공지 대상 디바이스를 확인할 수 없습니다.');
      return;
    }

    try {
      const response = await fetch(`/api/devices/${targetDeviceId}/notices/${editingNotice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingNotice.title,
          content: editingNotice.content,
          category: editingNotice.category,
          favorite: editingNotice.favorite,
        }),
      });

      if (response.ok) {
        alert('공지사항이 수정되었습니다.');
        setEditingNotice(null);
        fetchNotices();
      }
    } catch (error) {
      console.error('공지사항 수정 오류:', error);
      alert('공지사항 수정 중 오류가 발생했습니다.');
    }
  };

  // 공지사항 삭제
  const handleDeleteNotice = async (notice: Notice) => {
    if (!confirm('이 공지사항을 삭제하시겠습니까?')) return;
    const targetDeviceId = selectedDeviceId === ALL_DEVICES ? notice.device_id : selectedDeviceId;
    if (!targetDeviceId) {
      alert('공지 대상 디바이스를 확인할 수 없습니다.');
      return;
    }

    try {
      const response = await fetch(`/api/devices/${targetDeviceId}/notices/${notice.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('공지사항이 삭제되었습니다.');
        fetchNotices();
      }
    } catch (error) {
      console.error('공지사항 삭제 오류:', error);
      alert('공지사항 삭제 중 오류가 발생했습니다.');
    }
  };

  // 즐겨찾기 토글
  const handleToggleFavorite = async (notice: Notice) => {
    if (!selectedDeviceId) return;
    const targetDeviceId = selectedDeviceId === ALL_DEVICES ? notice.device_id : selectedDeviceId;
    if (!targetDeviceId) return;

    try {
      const response = await fetch(`/api/devices/${targetDeviceId}/notices/${notice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...notice,
          favorite: notice.favorite ? 0 : 1,
        }),
      });

      if (response.ok) {
        fetchNotices();
      }
    } catch (error) {
      console.error('즐겨찾기 토글 오류:', error);
    }
  };

  // 공지사항을 긴급 알림으로 전송
  const handleSendAsAlert = async (notice: Notice) => {
    if (!selectedDeviceId) return;
    const targetDeviceId = selectedDeviceId === ALL_DEVICES ? notice.device_id : selectedDeviceId;
    if (!targetDeviceId) return;

    // 사용 기록 업데이트
    await fetch(`/api/devices/${targetDeviceId}/notices/${notice.id}`, {
      method: 'PATCH',
    });

    // 긴급 알림으로 전송
    onSendNotice(notice.content, targetDeviceId);
    fetchNotices();
  };

  const handleCancelNotices = async () => {
    if (!selectedDeviceId || selectedDeviceId === ALL_DEVICES) return;
    if (!confirm('해당 디바이스의 등록 공지를 모두 취소하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/devices/${selectedDeviceId}/notices`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || '공지 취소에 실패했습니다.');
        return;
      }

      await fetch(`/api/devices/${selectedDeviceId}/apply-display-settings`, {
        method: 'POST',
      });

      alert('해당 디바이스의 등록 공지가 취소되었습니다.');
      fetchNotices();
    } catch (error) {
      console.error('공지 취소 오류:', error);
      alert('공지 취소 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return <div className="text-center py-4">로딩 중...</div>;
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-teal-100">
      <h3 className="text-2xl font-bold text-teal-800 mb-4 flex items-center">
        <span className="mr-2">📢</span>
        공지사항 관리
      </h3>

      {/* 디바이스 선택 */}
      <div className="mb-4">
        <label className="block text-base font-medium text-gray-700 mb-1">
          디바이스 선택
        </label>
        <select
          value={selectedDeviceId}
          onChange={(e) => {
            setSelectedDeviceId(e.target.value);
            setEditingNotice(null);
            setShowAddForm(false);
          }}
          className="w-full md:w-1/2 h-[42px] px-3 py-2 border rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        >
          <option value="">-- 디바이스를 선택하세요 --</option>
          <option value={ALL_DEVICES}>전체 디바이스</option>
          {devices.map(device => (
            <option key={device.id} value={device.id}>
              {device.name} {device.alias ? `(${device.alias})` : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedDeviceId ? (
        <>
          {selectedDeviceId !== ALL_DEVICES && (
          <div className="mb-4 p-4 bg-cyan-50 border border-cyan-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-cyan-900">디스플레이 공지 표시 방식</h4>
              {settingsLoading && <span className="text-sm text-cyan-700">불러오는 중...</span>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm text-gray-700">
                표시 모드
                <select
                  value={displaySettings.notice_default_mode}
                  onChange={(e) => setDisplaySettings(prev => ({ ...prev, notice_default_mode: e.target.value as DisplaySettings['notice_default_mode'] }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="ticker">하단 티커</option>
                  <option value="side_panel">우측 패널</option>
                  <option value="popup_cycle">팝업 순환</option>
                </select>
              </label>
              <label className="text-sm text-gray-700">
                항목 노출 시간(초)
                <input
                  type="number"
                  min={3}
                  max={60}
                  value={displaySettings.notice_item_duration_sec}
                  onChange={(e) => setDisplaySettings(prev => ({ ...prev, notice_item_duration_sec: parseInt(e.target.value, 10) || 8 }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </label>
              <label className="text-sm text-gray-700">
                최대 노출 개수
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={displaySettings.notice_max_items}
                  onChange={(e) => setDisplaySettings(prev => ({ ...prev, notice_max_items: parseInt(e.target.value, 10) || 3 }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </label>
              <label className="text-sm text-gray-700 flex items-end">
                <span className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={displaySettings.notice_enabled === 1}
                    onChange={(e) => setDisplaySettings(prev => ({ ...prev, notice_enabled: e.target.checked ? 1 : 0 }))}
                  />
                  공지 오버레이 사용
                </span>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleApplyDisplaySettings}
                className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
              >
                공지 적용
              </button>
              <button
                onClick={handleCancelNotices}
                className="px-4 py-2 bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors"
              >
                공지 취소
              </button>
            </div>
          </div>
          )}

          {/* 상단 컨트롤 */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
            >
              {showAddForm ? '취소' : '새 공지사항 등록'}
            </button>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="제목 또는 내용 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>

          {/* 새 공지사항 등록 폼 */}
          {showAddForm && (
            <div className="mb-4 p-4 bg-teal-50 border border-teal-200 rounded-lg space-y-3">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-1">카테고리</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  {CATEGORIES.filter((cat) => cat.value !== 'all').map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-1">제목</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="공지사항 제목"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-1">내용</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="공지사항 내용"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <button
                onClick={handleAddNotice}
                className="w-full py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors font-medium"
              >
                등록
              </button>
            </div>
          )}

          {/* 공지사항 목록 */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredNotices.length === 0 ? (
              <p className="text-center text-gray-500 py-8">등록된 공지사항이 없습니다.</p>
            ) : (
              filteredNotices.map((notice) => (
                <div
                  key={notice.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  {editingNotice?.id === notice.id ? (
                    // 수정 모드
                    <div className="space-y-3">
                      <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">카테고리</label>
                        <select
                          value={editingNotice.category || '기타'}
                          onChange={(e) =>
                            setEditingNotice({ ...editingNotice, category: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          {CATEGORIES.filter((cat) => cat.value !== 'all').map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">제목</label>
                        <input
                          type="text"
                          value={editingNotice.title}
                          onChange={(e) => setEditingNotice({ ...editingNotice, title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">내용</label>
                        <textarea
                          value={editingNotice.content}
                          onChange={(e) =>
                            setEditingNotice({ ...editingNotice, content: e.target.value })
                          }
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleUpdateNotice}
                          className="flex-1 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => setEditingNotice(null)}
                          className="flex-1 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 보기 모드
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleFavorite(notice)}
                            className="text-xl hover:scale-110 transition-transform"
                          >
                            {notice.favorite ? '⭐' : '☆'}
                          </button>
                          <span className="px-2 py-1 text-base font-medium bg-teal-100 text-teal-800 rounded">
                            {notice.category || '기타'}
                          </span>
                          {selectedDeviceId === ALL_DEVICES && (
                            <span className="px-2 py-1 text-base font-medium bg-indigo-100 text-indigo-800 rounded">
                              {notice.deviceName || notice.device_id || '디바이스'}
                            </span>
                          )}
                          <h4 className="font-semibold text-gray-800">{notice.title}</h4>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm mb-3 whitespace-pre-wrap">{notice.content}</p>
                      <div className="flex items-center justify-between text-base text-gray-500">
                        <div>
                          {notice.lastUsedAt ? (
                            <span>
                              마지막 사용: {new Date(notice.lastUsedAt).toLocaleDateString('ko-KR')} (
                              {notice.usageCount}회)
                            </span>
                          ) : (
                            <span>미사용</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingNotice(notice)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleSendAsAlert(notice)}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                          >
                            긴급 전송
                          </button>
                          <button
                            onClick={() => handleDeleteNotice(notice)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">
          공지사항을 등록할 디바이스를 선택해주세요.
        </p>
      )}
    </div>
  );
}
