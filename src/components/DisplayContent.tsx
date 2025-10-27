import { Content, ImageContent, VideoContent, TextContent, SplitLayoutContent } from '@/types';
import SplitLayoutDisplay from './SplitLayoutDisplay';
import YoutubePlayer from './YoutubePlayer';

interface DisplayContentProps {
  content: Content;
  deviceId?: string;
}

export default function DisplayContent({ content, deviceId = '' }: DisplayContentProps) {
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

      // 일반 비디오 파일
      return (
        <div className="w-full h-full relative">
          <video
            src={videoContent.url}
            autoPlay={videoContent.autoplay !== false}
            loop={videoContent.loop !== false}
            muted={videoContent.muted !== false}
            className="w-full h-full object-contain"
          />
        </div>
      );
    case 'text':
      const textContent = content as TextContent;
      return (
        <div className="w-full h-full flex items-center justify-center"
             style={{ backgroundColor: textContent.backgroundColor }}>
          <div 
            className="text-4xl font-bold"
            style={{
              color: textContent.fontColor || 'white',
              fontSize: textContent.fontSize || '2.25rem'
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
    default:
      return null;
  }
}
