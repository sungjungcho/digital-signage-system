'use client';

import { Content, ImageContent, VideoContent, TextContent, SplitLayoutContent, AdvancedLayoutContent } from '@/types';
import { AdvancedLayoutData, LayoutContentItem } from '@/types/layout';
import SplitLayoutDisplay from './SplitLayoutDisplay';
import { AdvancedLayoutDisplay } from './layout';
import YoutubePlayer from './YoutubePlayer';
import DOMPurify from 'dompurify';

// 기존 split_layout 데이터를 advanced_layout으로 변환
function migrateSplitLayoutToAdvanced(
  leftContents: any[],
  showNotices: boolean = true
): AdvancedLayoutData {
  const contents: LayoutContentItem[] = leftContents.map((item: any) => ({
    id: item.id || String(Date.now()),
    type: item.type === 'youtube' ? 'youtube' : item.type,
    duration: item.duration || 5000,
    url: item.url,
    text: item.text,
    fontSize: item.fontSize,
    fontColor: item.fontColor,
    backgroundColor: item.backgroundColor,
    metadata: item.type === 'youtube' ? {
      youtubeType: 'video',
      autoplay: true,
      loop: true,
      mute: true,
    } : undefined,
  }));

  return {
    version: 2,
    templateId: 'split_h_2_1', // 기존 2:1 비율 레이아웃
    areas: {
      'area-0': {
        type: 'content',
        contents,
      },
      'area-1': {
        type: 'widget',
        widgetType: showNotices ? 'waiting_list' : 'datetime',
      },
    },
  };
}

interface DisplayContentProps {
  content: Content;
  deviceId?: string;
  onVideoEnd?: () => void;
}

export default function DisplayContent({ content, deviceId = '', onVideoEnd }: DisplayContentProps) {
  switch (content.type) {
    case 'image':
      return (
        <div className="w-full h-full relative">
          <img
            src={(content as ImageContent).url}
            alt={(content as ImageContent).alt || 'Display content'}
            className="w-full h-full object-contain"
          />
        </div>
      );
    case 'video':
      const videoContent = content as VideoContent;

      // 유튜브 영상인지 확인
      if (videoContent.url.startsWith('youtube:')) {
        const youtubeId = videoContent.url.replace('youtube:', '');
        const metadata = videoContent.metadata ? JSON.parse(videoContent.metadata) : {};

        return (
          <div className="w-full h-full relative">
            <YoutubePlayer
              videoId={youtubeId}
              type={metadata.youtubeType || 'video'}
              autoplay={metadata.autoplay !== false}
              loop={metadata.loop !== false}
              mute={metadata.mute !== false}
            />
          </div>
        );
      }

      // 일반 동영상 파일
      return (
        <div className="w-full h-full relative">
          <video
            src={videoContent.url}
            autoPlay={videoContent.autoplay !== false}
            loop={videoContent.duration === 0 ? false : videoContent.loop !== false}
            muted={videoContent.muted !== false}
            className="w-full h-full object-contain"
            onEnded={videoContent.duration === 0 && onVideoEnd ? onVideoEnd : undefined}
          />
        </div>
      );
    case 'text':
      const textContent = content as TextContent;
      // fontSize가 숫자면 px 추가, 아니면 그대로 사용 (하위 호환성)
      const fontSize = textContent.fontSize
        ? (isNaN(Number(textContent.fontSize)) ? textContent.fontSize : `${textContent.fontSize}px`)
        : '32px';
      // HTML 태그 지원 (XSS 방지를 위해 DOMPurify로 sanitize)
      const sanitizedHtml = DOMPurify.sanitize(textContent.text || '', {
        ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'span', 'div', 'font', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'hr', 'sub', 'sup'],
        ALLOWED_ATTR: ['style', 'color', 'size', 'class'],
      });
      return (
        <div className="w-full h-full flex items-center justify-center"
             style={{ backgroundColor: textContent.backgroundColor || '#FFFFFF' }}>
          <div
            className="font-bold"
            style={{
              color: textContent.fontColor || '#000000',
              fontSize: fontSize
            }}
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        </div>
      );
    case 'split_layout':
      // 기존 split_layout을 advanced_layout으로 자동 변환하여 렌더링
      const splitContent = content as SplitLayoutContent;
      const convertedData = migrateSplitLayoutToAdvanced(
        splitContent.leftContents || [],
        true // showNotices 기본값
      );
      return (
        <AdvancedLayoutDisplay
          data={convertedData}
          deviceId={deviceId}
        />
      );

    case 'advanced_layout':
      const advancedContent = content as AdvancedLayoutContent;
      return (
        <AdvancedLayoutDisplay
          data={advancedContent.layoutData}
          deviceId={deviceId}
        />
      );

    default:
      return null;
  }
}
