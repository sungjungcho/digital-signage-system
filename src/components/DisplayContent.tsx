import { Content, ImageContent, VideoContent, TextContent, SplitLayoutContent, MixedContent } from '@/types';
import SplitLayoutDisplay from './SplitLayoutDisplay';
import YoutubePlayer from './YoutubePlayer';
import MixedContentDisplay from './MixedContentDisplay';

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
      return (
        <div className="w-full h-full flex items-center justify-center"
             style={{ backgroundColor: textContent.backgroundColor || '#FFFFFF' }}>
          <div
            className="font-bold"
            style={{
              color: textContent.fontColor || '#000000',
              fontSize: fontSize
            }}
          >
            {textContent.text}
          </div>
        </div>
      );
    case 'split_layout':
      const splitContent = content as SplitLayoutContent;
      return (
        <SplitLayoutDisplay
          contents={splitContent.leftContents}
          deviceId={deviceId}
        />
      );
    case 'mixed':
      const mixedContent = content as MixedContent;
      return (
        <MixedContentDisplay elements={mixedContent.elements} />
      );
    default:
      return null;
  }
}
