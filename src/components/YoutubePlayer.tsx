'use client';

import { useEffect, useRef } from 'react';

interface YoutubePlayerProps {
  videoId: string;
  type: 'video' | 'playlist';
  autoplay?: boolean;
  loop?: boolean;
  mute?: boolean;
}

export default function YoutubePlayer({
  videoId,
  type,
  autoplay = true,
  loop = true,
  mute = false,
}: YoutubePlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // YouTube iframe API가 이미 로드되었는지 확인
    if (!(window as any).YT) {
      // YouTube iframe API 스크립트 로드
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // URL 파라미터 생성
  const getEmbedUrl = () => {
    const params = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      mute: mute ? '1' : '0',
      controls: '0', // 컨트롤 숨김
      modestbranding: '1', // YouTube 로고 최소화
      rel: '0', // 관련 동영상 비활성화
      showinfo: '0', // 제목 등 정보 숨김
    });

    if (type === 'playlist') {
      params.append('list', videoId);
      if (loop) {
        params.append('loop', '1');
      }
      return `https://www.youtube.com/embed?${params.toString()}`;
    } else {
      if (loop) {
        params.append('loop', '1');
        params.append('playlist', videoId); // loop를 위해서는 playlist 파라미터 필요
      }
      return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
    }
  };

  return (
    <div className="w-full h-full">
      <iframe
        ref={iframeRef}
        src={getEmbedUrl()}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{
          border: 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}
