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
  onSendNotice: (content: string) => void;
};

export default function NoticeManager({ onSendNotice }: NoticeManagerProps) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [filteredNotices, setFilteredNotices] = useState<Notice[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);

  // 새 공지사항 입력 state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('기타');

  // 공지사항 목록 가져오기
  const fetchNotices = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/notices?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setNotices(data);
        setFilteredNotices(data);
      }
    } catch (error) {
      console.error('공지사항 목록 가져오기 오류:', error);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, [selectedCategory, searchQuery]);

  // 공지사항 추가
  const handleAddNotice = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/notices', {
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
    if (!editingNotice) return;

    try {
      const response = await fetch(`/api/notices/${editingNotice.id}`, {
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
  const handleDeleteNotice = async (noticeId: string) => {
    if (!confirm('이 공지사항을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/notices/${noticeId}`, {
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
    try {
      const response = await fetch(`/api/notices/${notice.id}`, {
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
    // 사용 기록 업데이트
    await fetch(`/api/notices/${notice.id}`, {
      method: 'PATCH',
    });

    // 긴급 알림으로 전송
    onSendNotice(notice.content);
    fetchNotices();
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-teal-100">
      <h3 className="text-2xl font-bold text-teal-800 mb-4 flex items-center">
        <span className="mr-2">📢</span>
        공지사항 관리
      </h3>

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
                        전송
                      </button>
                      <button
                        onClick={() => handleDeleteNotice(notice.id)}
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
    </div>
  );
}
