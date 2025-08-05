import { Content, ImageContent, VideoContent, TextContent } from '@/types';

interface DisplayContentProps {
  content: Content;
}

export default function DisplayContent({ content }: DisplayContentProps) {
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
    default:
      return null;
  }
}
