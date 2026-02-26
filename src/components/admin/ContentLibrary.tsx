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

// 시간 변환 유틸리티
const secondsToHMS = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds };
};

const hmsToSeconds = (hours: number, minutes: number, seconds: number) => {
  return hours * 3600 + minutes * 60 + seconds;
};

// 초를 읽기 좋은 형식으로 변환 (예: 1시간 30분 45초)
const formatDuration = (totalSeconds: number) => {
  const { hours, minutes, seconds } = secondsToHMS(totalSeconds);
  const parts = [];
  if (hours > 0) parts.push(`${hours}시간`);
  if (minutes > 0) parts.push(`${minutes}분`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}초`);
  return parts.join(' ');
};

// 재생 시간 입력 컴포넌트
interface DurationInputProps {
  value: number; // 초 단위
  onChange: (seconds: number) => void;
}

function DurationInput({ value, onChange }: DurationInputProps) {
  const { hours, minutes, seconds } = secondsToHMS(value);

  const handleChange = (field: 'hours' | 'minutes' | 'seconds', val: string) => {
    const numVal = parseInt(val) || 0;
    const newHours = field === 'hours' ? Math.max(0, numVal) : hours;
    const newMinutes = field === 'minutes' ? Math.min(59, Math.max(0, numVal)) : minutes;
    const newSeconds = field === 'seconds' ? Math.min(59, Math.max(0, numVal)) : seconds;
    const totalSeconds = hmsToSeconds(newHours, newMinutes, newSeconds);
    onChange(Math.max(1, totalSeconds)); // 최소 1초
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <input
          type="number"
          value={hours}
          onChange={(e) => handleChange('hours', e.target.value)}
          min="0"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center"
        />
        <span className="block text-xs text-gray-500 text-center mt-1">시</span>
      </div>
      <span className="text-gray-400 font-bold">:</span>
      <div className="flex-1">
        <input
          type="number"
          value={minutes}
          onChange={(e) => handleChange('minutes', e.target.value)}
          min="0"
          max="59"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center"
        />
        <span className="block text-xs text-gray-500 text-center mt-1">분</span>
      </div>
      <span className="text-gray-400 font-bold">:</span>
      <div className="flex-1">
        <input
          type="number"
          value={seconds}
          onChange={(e) => handleChange('seconds', e.target.value)}
          min="0"
          max="59"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center"
        />
        <span className="block text-xs text-gray-500 text-center mt-1">초</span>
      </div>
    </div>
  );
}

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
  const [uploadMode, setUploadMode] = useState<'file' | 'youtube' | 'text'>('file');
  const [uploadName, setUploadName] = useState('');
  const [uploadDuration, setUploadDuration] = useState(10);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [editingFile, setEditingFile] = useState<File | null>(null);

  // 유튜브 관련 상태
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeOptions, setYoutubeOptions] = useState({
    autoplay: true,
    loop: false,
    mute: true,
  });

  // 텍스트 콘텐츠 상태
  const [textContent, setTextContent] = useState({
    text: '',
    fontSize: '36',
    fontColor: '#ffffff',
    backgroundColor: '#000000',
  });

  // 이미지 배경색 상태
  const [imageBackgroundColor, setImageBackgroundColor] = useState('#000000');

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

  // 파일 업로드 (다건 지원)
  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      alert('파일을 선택해주세요.');
      return;
    }

    setUploading(true);
    setUploadProgress({ current: 0, total: uploadFiles.length });

    const failedFiles: string[] = [];
    let successCount = 0;

    try {
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        setUploadProgress({ current: i + 1, total: uploadFiles.length });

        const formData = new FormData();
        formData.append('file', file);
        // 단건일 때만 사용자 입력 이름 사용, 다건일 때는 파일명 사용
        const fileName = uploadFiles.length === 1 && uploadName
          ? uploadName
          : file.name.replace(/\.[^/.]+$/, '');
        formData.append('name', fileName);
        formData.append('duration', uploadDuration.toString());
        // 이미지 파일인 경우 배경색 추가
        if (file.type.startsWith('image/')) {
          formData.append('backgroundColor', imageBackgroundColor);
        }

        try {
          const response = await fetch('/api/contents/library-upload', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            successCount++;
          } else {
            failedFiles.push(file.name);
          }
        } catch {
          failedFiles.push(file.name);
        }
      }

      if (failedFiles.length === 0) {
        alert(`${successCount}개 파일 업로드 완료!`);
      } else {
        alert(`${successCount}개 성공, ${failedFiles.length}개 실패\n실패: ${failedFiles.join(', ')}`);
      }

      setShowUploadModal(false);
      setUploadFiles([]);
      setUploadName('');
      setUploadDuration(10);
      setImageBackgroundColor('#000000');
      fetchContents();
    } catch (error) {
      console.error('업로드 오류:', error);
      alert('업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  // 텍스트 콘텐츠 등록
  const handleTextUpload = async () => {
    if (!textContent.text.trim()) {
      alert('텍스트를 입력해주세요.');
      return;
    }

    setUploading(true);
    try {
      const response = await fetch('/api/contents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: uploadName || '텍스트 콘텐츠',
          type: 'text',
          text: textContent.text,
          duration: uploadDuration,
          fontSize: textContent.fontSize,
          fontColor: textContent.fontColor,
          backgroundColor: textContent.backgroundColor,
        }),
      });

      if (response.ok) {
        alert('텍스트 콘텐츠 등록 완료!');
        setShowUploadModal(false);
        setTextContent({ text: '', fontSize: '36', fontColor: '#ffffff', backgroundColor: '#000000' });
        setUploadName('');
        setUploadDuration(10);
        setUploadMode('file');
        fetchContents();
      } else {
        const error = await response.json();
        alert(error.error || '텍스트 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('텍스트 등록 오류:', error);
      alert('텍스트 등록 중 오류가 발생했습니다.');
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
        // 텍스트/이미지 콘텐츠인 경우 추가 필드 포함
        const updateData: Record<string, unknown> = {
          name: editingContent.name,
          duration: editingContent.duration,
        };

        if (editingContent.type === 'text') {
          updateData.text = editingContent.text;
          updateData.fontSize = editingContent.fontSize;
          updateData.fontColor = editingContent.fontColor;
          updateData.backgroundColor = editingContent.backgroundColor;
        }

        if (editingContent.type === 'image') {
          updateData.backgroundColor = editingContent.backgroundColor;
        }

        response = await fetch(`/api/contents/${editingContent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
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
      case 'split_layout': return '📐';
      case 'advanced_layout': return '🎨';
      default: return '📄';
    }
  };

  // 타입별 라벨
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'image': return '이미지';
      case 'video': return '동영상';
      case 'text': return '텍스트';
      case 'split_layout': return '레이아웃';
      case 'advanced_layout': return '레이아웃';
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
                ) : content.type === 'text' && content.text ? (
                  // 텍스트 콘텐츠 미리보기
                  <div
                    className="w-full h-full flex items-center justify-center p-2 text-center"
                    style={{
                      backgroundColor: content.backgroundColor || '#000000',
                      color: content.fontColor || '#ffffff',
                      fontSize: `${Math.min(parseInt(content.fontSize || '24') / 2, 16)}px`,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    <span className="line-clamp-4 break-words">
                      {content.text}
                    </span>
                  </div>
                ) : content.type === 'split_layout' ? (
                  // 분할 레이아웃 미리보기
                  <div className="w-full h-full flex">
                    <div className="w-2/3 bg-gray-200 flex items-center justify-center border-r border-gray-300">
                      <span className="text-xs text-gray-500">콘텐츠</span>
                    </div>
                    <div className="w-1/3 bg-blue-50 flex flex-col items-center justify-center p-1">
                      <span className="text-[8px] text-gray-500">날짜/시간</span>
                      <span className="text-[8px] text-gray-500">환자명단</span>
                    </div>
                  </div>
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
                  <span>재생시간: {formatDuration(content.duration)}</span>
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
        <div className="fixed top-[130px] left-0 right-0 bottom-0 bg-black/50 flex items-start justify-center z-[100] pt-8">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h4 className="text-xl font-bold text-gray-800 mb-4">새 콘텐츠 등록</h4>

            {/* 탭 선택 */}
            <div className="grid grid-cols-3 mb-4 bg-gray-100 rounded-lg p-1 gap-1">
              <button
                onClick={() => setUploadMode('file')}
                className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                  uploadMode === 'file'
                    ? 'bg-white text-purple-700 shadow'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                이미지/동영상
              </button>
              <button
                onClick={() => setUploadMode('text')}
                className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                  uploadMode === 'text'
                    ? 'bg-white text-blue-600 shadow'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                텍스트
              </button>
              <button
                onClick={() => setUploadMode('youtube')}
                className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                  uploadMode === 'youtube'
                    ? 'bg-white text-red-600 shadow'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                유튜브
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {/* 파일 업로드 모드 */}
              {uploadMode === 'file' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이미지/동영상 선택 (여러 파일 선택 가능)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) {
                        setUploadFiles(files);
                        if (files.length === 1 && !uploadName) {
                          setUploadName(files[0].name.replace(/\.[^/.]+$/, ''));
                        }
                      }
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-purple-400 transition-colors"
                  >
                    {uploadFiles.length === 0
                      ? '클릭하여 파일 선택 (이미지/동영상)'
                      : `${uploadFiles.length}개 파일 선택됨`}
                  </button>
                  {uploadFiles.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      <div className="space-y-1">
                        {uploadFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between px-2 py-1 bg-gray-50 rounded text-sm"
                          >
                            <span className="truncate flex-1 mr-2">
                              {file.type.startsWith('image/') ? '🖼️' : '🎬'} {file.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => setUploadFiles(uploadFiles.filter((_, i) => i !== index))}
                              className="text-red-500 hover:text-red-700 flex-shrink-0"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* 이미지 파일이 포함된 경우 배경색 선택 */}
                  {uploadFiles.some(file => file.type.startsWith('image/')) && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        이미지 배경 색상
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={imageBackgroundColor}
                          onChange={(e) => setImageBackgroundColor(e.target.value)}
                          className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                        />
                        <span className="text-sm text-gray-600">{imageBackgroundColor}</span>
                        <button
                          type="button"
                          onClick={() => setImageBackgroundColor('#000000')}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          검정으로 초기화
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">이미지가 화면보다 작을 때 표시되는 배경 색상입니다.</p>
                    </div>
                  )}
                </div>
              )}

              {/* 유튜브 URL 모드 */}
              {uploadMode === 'youtube' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">유튜브 URL</label>
                    <input
                      type="text"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
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

              {/* 텍스트 모드 */}
              {uploadMode === 'text' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">텍스트 내용</label>
                    <textarea
                      value={textContent.text}
                      onChange={(e) => setTextContent(prev => ({ ...prev, text: e.target.value }))}
                      placeholder="표시할 텍스트를 입력하세요"
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">글자 크기</label>
                      <select
                        value={textContent.fontSize}
                        onChange={(e) => setTextContent(prev => ({ ...prev, fontSize: e.target.value }))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="18">18pt</option>
                        <option value="24">24pt</option>
                        <option value="36">36pt</option>
                        <option value="48">48pt</option>
                        <option value="72">72pt</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">글자 색상</label>
                      <input
                        type="color"
                        value={textContent.fontColor}
                        onChange={(e) => setTextContent(prev => ({ ...prev, fontColor: e.target.value }))}
                        className="w-full h-8 rounded border border-gray-300 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">배경 색상</label>
                      <input
                        type="color"
                        value={textContent.backgroundColor}
                        onChange={(e) => setTextContent(prev => ({ ...prev, backgroundColor: e.target.value }))}
                        className="w-full h-8 rounded border border-gray-300 cursor-pointer"
                      />
                    </div>
                  </div>
                  {/* 미리보기 */}
                  <div
                    className="p-4 rounded-lg text-center"
                    style={{
                      backgroundColor: textContent.backgroundColor,
                      color: textContent.fontColor,
                      fontSize: `${parseInt(textContent.fontSize) / 2}px`,
                    }}
                  >
                    {textContent.text || '미리보기'}
                  </div>
                </>
              )}

              {/* 공통: 콘텐츠 이름 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  콘텐츠 이름
                  {uploadMode === 'file' && uploadFiles.length > 1 && (
                    <span className="text-xs text-gray-500 ml-2">(다건 시 파일명 적용)</span>
                  )}
                </label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder={
                    uploadMode === 'youtube' ? '유튜브 영상 이름' :
                    uploadMode === 'text' ? '텍스트 콘텐츠 이름' :
                    '콘텐츠 이름'
                  }
                  disabled={uploadMode === 'file' && uploadFiles.length > 1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                />
              </div>

              {/* 공통: 재생 시간 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">재생 시간</label>
                <DurationInput
                  value={uploadDuration}
                  onChange={setUploadDuration}
                />
              </div>
            </div>

            {/* 업로드 진행 상태 */}
            {uploadProgress && (
              <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-purple-700 font-medium">
                    업로드 중... ({uploadProgress.current}/{uploadProgress.total})
                  </span>
                  <span className="text-sm text-purple-600">
                    {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFiles([]);
                  setUploadName('');
                  setYoutubeUrl('');
                  setUploadMode('file');
                  setTextContent({ text: '', fontSize: '36', fontColor: '#ffffff', backgroundColor: '#000000' });
                  setImageBackgroundColor('#000000');
                }}
                disabled={uploading}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={
                  uploadMode === 'file' ? handleUpload :
                  uploadMode === 'youtube' ? handleYoutubeUpload :
                  handleTextUpload
                }
                disabled={
                  uploading ||
                  (uploadMode === 'file' && uploadFiles.length === 0) ||
                  (uploadMode === 'youtube' && !youtubeUrl.trim()) ||
                  (uploadMode === 'text' && !textContent.text.trim())
                }
                className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                  uploadMode === 'youtube' ? 'bg-red-600 hover:bg-red-700' :
                  uploadMode === 'text' ? 'bg-blue-600 hover:bg-blue-700' :
                  'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {uploading ? '등록 중...' :
                  uploadMode === 'youtube' ? '유튜브 추가' :
                  uploadMode === 'text' ? '텍스트 등록' :
                  uploadFiles.length > 1 ? `${uploadFiles.length}개 업로드` : '업로드'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {editingContent && (
        <div className="fixed top-[130px] left-0 right-0 bottom-0 bg-black/50 flex items-start justify-center z-[100] pt-8">
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
                  재생 시간
                </label>
                <DurationInput
                  value={editingContent.duration}
                  onChange={(seconds) =>
                    setEditingContent({
                      ...editingContent,
                      duration: seconds,
                    })
                  }
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

              {editingContent.type === 'image' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    배경 색상
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={editingContent.backgroundColor || '#000000'}
                      onChange={(e) =>
                        setEditingContent({ ...editingContent, backgroundColor: e.target.value })
                      }
                      className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                    />
                    <span className="text-sm text-gray-600">{editingContent.backgroundColor || '#000000'}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">이미지가 화면보다 작을 때 표시되는 배경 색상입니다.</p>
                </div>
              )}

              {editingContent.type === 'text' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      텍스트 내용
                    </label>
                    <textarea
                      value={editingContent.text || ''}
                      onChange={(e) =>
                        setEditingContent({ ...editingContent, text: e.target.value })
                      }
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                      placeholder="표시할 텍스트를 입력하세요"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">글자 크기</label>
                      <select
                        value={editingContent.fontSize || '36'}
                        onChange={(e) =>
                          setEditingContent({ ...editingContent, fontSize: e.target.value })
                        }
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="18">18pt</option>
                        <option value="24">24pt</option>
                        <option value="36">36pt</option>
                        <option value="48">48pt</option>
                        <option value="72">72pt</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">글자 색상</label>
                      <input
                        type="color"
                        value={editingContent.fontColor || '#ffffff'}
                        onChange={(e) =>
                          setEditingContent({ ...editingContent, fontColor: e.target.value })
                        }
                        className="w-full h-8 rounded border border-gray-300 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">배경 색상</label>
                      <input
                        type="color"
                        value={editingContent.backgroundColor || '#000000'}
                        onChange={(e) =>
                          setEditingContent({ ...editingContent, backgroundColor: e.target.value })
                        }
                        className="w-full h-8 rounded border border-gray-300 cursor-pointer"
                      />
                    </div>
                  </div>
                  {/* 미리보기 */}
                  <div
                    className="p-4 rounded-lg text-center"
                    style={{
                      backgroundColor: editingContent.backgroundColor || '#000000',
                      color: editingContent.fontColor || '#ffffff',
                      fontSize: `${parseInt(editingContent.fontSize || '36') / 2}px`,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {editingContent.text || '미리보기'}
                  </div>
                </>
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
