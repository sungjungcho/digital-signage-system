'use client';

import { useState, useEffect, useRef } from 'react';

type Content = {
  id: string;
  name: string;
  type: string;
  url: string | null;
  text: string | null;
  duration: number;
  fontSize: string | null;
  fontColor: string | null;
  backgroundColor: string | null;
  metadata: string | null;
  linkedDeviceCount: number;
  createdAt: string;
  updatedAt: string;
};

const CONTENT_TYPES = [
  { value: 'all', label: '전체' },
  { value: 'image', label: '이미지' },
  { value: 'video', label: '동영상' },
  { value: 'text', label: '텍스트' },
];

export default function ContentLibrary() {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 업로드 폼 상태
  const [uploadMode, setUploadMode] = useState<'file' | 'youtube'>('file');
  const [uploadName, setUploadName] = useState('');
  const [uploadDuration, setUploadDuration] = useState(10);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [editingFile, setEditingFile] = useState<File | null>(null);

  // 유튜브 관련 상태
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeOptions, setYoutubeOptions] = useState({
    autoplay: true,
    loop: false,
    mute: true,
  });

  // 콘텐츠 목록 조회
  const fetchContents = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedType !== 'all') params.append('type', selectedType);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/contents?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setContents(data);
      }
    } catch (error) {
      console.error('콘텐츠 목록 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContents();
  }, [selectedType, searchQuery]);

  // 파일 업로드
  const handleUpload = async () => {
    if (!uploadFile) {
      alert('파일을 선택해주세요.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('name', uploadName || uploadFile.name);
      formData.append('duration', uploadDuration.toString());

      const response = await fetch('/api/contents/library-upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('업로드 완료!');
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadName('');
        setUploadDuration(10);
        fetchContents();
      } else {
        let errorMessage = `업로드 실패 (HTTP ${response.status})`;
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          const error = await response.json();
          errorMessage = error?.error || errorMessage;
        } else {
          const text = await response.text();
          if (text) {
            errorMessage = `${errorMessage}\n${text.slice(0, 200)}`;
          }
        }

        alert(errorMessage);
      }
    } catch (error) {
      console.error('업로드 오류:', error);
      alert('업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  // 유튜브 영상 추가
  const handleYoutubeUpload = async () => {
    if (!youtubeUrl.trim()) {
      alert('유튜브 URL을 입력해주세요.');
      return;
    }

    setUploading(true);
    try {
      const response = await fetch('/api/contents/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: null, // 라이브러리 전용 (디바이스 연결 없음)
          name: uploadName || '유튜브 영상',
          duration: uploadDuration,
          url: youtubeUrl,
          autoplay: youtubeOptions.autoplay,
          loop: youtubeOptions.loop,
          mute: youtubeOptions.mute,
        }),
      });

      if (response.ok) {
        alert('유튜브 영상 추가 완료!');
        setShowUploadModal(false);
        setYoutubeUrl('');
        setUploadName('');
        setUploadDuration(10);
        setUploadMode('file');
        fetchContents();
      } else {
        const error = await response.json();
        alert(error.error || '유튜브 영상 추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('유튜브 영상 추가 오류:', error);
      alert('유튜브 영상 추가 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  // 유튜브 썸네일 URL 생성
  const getYoutubeThumbnail = (url: string): string | null => {
    try {
      const videoUrl = url.replace('youtube:', '');
      let videoId = '';

      if (videoUrl.includes('youtube.com/watch?v=')) {
        videoId = new URL(videoUrl).searchParams.get('v') || '';
      } else if (videoUrl.includes('youtu.be/')) {
        videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0] || '';
      } else if (videoUrl.includes('youtube.com/embed/')) {
        videoId = videoUrl.split('youtube.com/embed/')[1]?.split('?')[0] || '';
      }

      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      }
    } catch (error) {
      console.error('유튜브 썸네일 URL 생성 실패:', error);
    }
    return null;
  };

  // 콘텐츠 수정
  const handleUpdate = async () => {
    if (!editingContent) return;

    try {
      let response: Response;
      if (editingFile) {
        const formData = new FormData();
        formData.append('name', editingContent.name);
        formData.append('duration', editingContent.duration.toString());
        formData.append('file', editingFile);

        response = await fetch(`/api/contents/${editingContent.id}`, {
          method: 'PUT',
          body: formData,
        });
      } else {
        response = await fetch(`/api/contents/${editingContent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editingContent.name,
            duration: editingContent.duration,
          }),
        });
      }

      if (response.ok) {
        alert('수정 완료!');
        setEditingContent(null);
        setEditingFile(null);
        fetchContents();
      } else {
        const error = await response.json();
        alert(error.error || '수정 실패');
      }
    } catch (error) {
      console.error('수정 오류:', error);
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  // 콘텐츠 삭제
  const handleDelete = async (content: Content) => {
    if (content.linkedDeviceCount > 0) {
      alert(`이 콘텐츠는 ${content.linkedDeviceCount}개의 디바이스에 연결되어 있습니다.\n먼저 연결을 해제해주세요.`);
      return;
    }

    if (!confirm(`"${content.name}" 콘텐츠를 삭제하시겠습니까?`)) return;

    try {
      const response = await fetch(`/api/contents/${content.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('삭제 완료!');
        fetchContents();
      } else {
        const error = await response.json();
        alert(error.error || '삭제 실패');
      }
    } catch (error) {
      console.error('삭제 오류:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 타입별 아이콘
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return '🖼️';
      case 'video': return '🎬';
      case 'text': return '📝';
      default: return '📄';
    }
  };

  // 타입별 라벨
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'image': return '이미지';
      case 'video': return '동영상';
      case 'text': return '텍스트';
      default: return type;
    }
  };

  if (loading) {
    return <div className="text-center py-8">로딩 중...</div>;
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-purple-100">
      <h3 className="text-2xl font-bold text-purple-800 mb-4 flex items-center">
        <span className="mr-2">📚</span>
        콘텐츠 라이브러리
      </h3>

      {/* 상단 컨트롤 */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
        >
          + 새 콘텐츠 업로드
        </button>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        >
          {CONTENT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* 콘텐츠 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contents.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-8">
            등록된 콘텐츠가 없습니다.
          </div>
        ) : (
          contents.map((content) => (
            <div
              key={content.id}
              className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow bg-white"
            >
              {/* 미리보기 */}
              <div className="h-32 bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
                {content.type === 'image' && content.url ? (
                  <img
                    src={content.url}
                    alt={content.name}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : content.type === 'video' && content.url?.startsWith('youtube:') ? (
                  // 유튜브 영상
                  <>
                    {getYoutubeThumbnail(content.url) ? (
                      <img
                        src={getYoutubeThumbnail(content.url)!}
                        alt={content.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-4xl">📺</span>
                    )}
                    <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded">
                      YouTube
                    </div>
                  </>
                ) : content.type === 'video' && content.url ? (
                  <video
                    src={content.url}
                    className="max-h-full max-w-full object-contain"
                    muted
                  />
                ) : (
                  <span className="text-4xl">{getTypeIcon(content.type)}</span>
                )}
              </div>

              {/* 정보 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-800 truncate flex-1">
                    {content.name}
                  </h4>
                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded ml-2">
                    {getTypeLabel(content.type)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>재생시간: {content.duration}초</span>
                  <span>연결: {content.linkedDeviceCount}개</span>
                </div>

                {/* 버튼 */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setEditingContent(content);
                      setEditingFile(null);
                    }}
                    className="flex-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(content)}
                    className="flex-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 업로드 모달 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h4 className="text-xl font-bold text-gray-800 mb-4">새 콘텐츠 등록</h4>

            {/* 탭 선택 */}
            <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setUploadMode('file')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  uploadMode === 'file'
                    ? 'bg-white text-purple-700 shadow'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                파일 업로드
              </button>
              <button
                onClick={() => setUploadMode('youtube')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  uploadMode === 'youtube'
                    ? 'bg-white text-red-600 shadow'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                유튜브 URL
              </button>
            </div>

            <div className="space-y-4">
              {/* 파일 업로드 모드 */}
              {uploadMode === 'file' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    파일 선택
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadFile(file);
                        if (!uploadName) {
                          setUploadName(file.name.replace(/\.[^/.]+$/, ''));
                        }
                      }
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-gray-600 hover:bg-gray-50"
                  >
                    {uploadFile ? uploadFile.name : '클릭하여 파일 선택'}
                  </button>
                </div>
              )}

              {/* 유튜브 URL 모드 */}
              {uploadMode === 'youtube' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      유튜브 URL
                    </label>
                    <input
                      type="text"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... 또는 재생목록 URL"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  {/* 유튜브 옵션 */}
                  <div className="flex flex-wrap gap-4 p-3 bg-gray-50 rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={youtubeOptions.autoplay}
                        onChange={(e) => setYoutubeOptions(prev => ({ ...prev, autoplay: e.target.checked }))}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="text-sm text-gray-700">자동재생</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={youtubeOptions.loop}
                        onChange={(e) => setYoutubeOptions(prev => ({ ...prev, loop: e.target.checked }))}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="text-sm text-gray-700">반복재생</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={youtubeOptions.mute}
                        onChange={(e) => setYoutubeOptions(prev => ({ ...prev, mute: e.target.checked }))}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="text-sm text-gray-700">음소거</span>
                    </label>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  콘텐츠 이름
                </label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder={uploadMode === 'youtube' ? '유튜브 영상 이름' : '콘텐츠 이름'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  재생 시간 (초)
                </label>
                <input
                  type="number"
                  value={uploadDuration}
                  onChange={(e) => setUploadDuration(parseInt(e.target.value) || 10)}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                  setUploadName('');
                  setYoutubeUrl('');
                  setUploadMode('file');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={uploadMode === 'file' ? handleUpload : handleYoutubeUpload}
                disabled={uploading || (uploadMode === 'file' ? !uploadFile : !youtubeUrl.trim())}
                className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                  uploadMode === 'youtube'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {uploading ? '등록 중...' : uploadMode === 'youtube' ? '유튜브 추가' : '업로드'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {editingContent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h4 className="text-xl font-bold text-gray-800 mb-4">콘텐츠 수정</h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  콘텐츠 이름
                </label>
                <input
                  type="text"
                  value={editingContent.name}
                  onChange={(e) =>
                    setEditingContent({ ...editingContent, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  재생 시간 (초)
                </label>
                <input
                  type="number"
                  value={editingContent.duration}
                  onChange={(e) =>
                    setEditingContent({
                      ...editingContent,
                      duration: parseInt(e.target.value) || 10,
                    })
                  }
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {(editingContent.type === 'image' || editingContent.type === 'video') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    파일 교체 (선택)
                  </label>
                  <input
                    type="file"
                    accept={editingContent.type === 'image' ? 'image/*' : 'video/*'}
                    onChange={(e) => setEditingFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  {editingFile && (
                    <p className="text-xs text-gray-500 mt-1">
                      선택된 파일: {editingFile.name}
                    </p>
                  )}
                </div>
              )}

              {editingContent.linkedDeviceCount > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  이 콘텐츠는 {editingContent.linkedDeviceCount}개의 디바이스에 연결되어 있습니다.
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setEditingContent(null);
                  setEditingFile(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleUpdate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
