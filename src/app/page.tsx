'use client';

import ContentSlideShow from '@/components/ContentSlideShow';
import { useCurrentContent } from '@/lib/hooks';

export default function Home() {
  const currentContents = useCurrentContent();

  // 콘텐츠가 없을 경우 표시할 기본 콘텐츠
  const defaultContents = [
    {
      id: 'default-1',
      type: 'text' as const,
      text: '디지털 사이니지에 오신 것을 환영합니다',
      duration: 5000,
      fontSize: '2.5rem',
      fontColor: '#ffffff',
      backgroundColor: '#000000',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const contents = currentContents.length > 0 ? currentContents : defaultContents;

  return (
    <div className="w-screen h-screen bg-black text-white">
      <main className="w-full h-full">
        <ContentSlideShow contents={contents} />
      </main>
    </div>
  );
}
