import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'signage.db');

export async function GET(
  req: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;
    const db = new Database(dbPath);

    // 데이터베이스에서 디바이스별 콘텐츠 목록 조회
    const deviceContents = db.prepare(`
      SELECT * FROM devicecontent
      WHERE deviceId = ? AND active = 1
      ORDER BY "order" ASC
    `).all(deviceId) as any[];

    db.close();

    // 복합형 콘텐츠의 metadata를 elements로 파싱
    const processedContents = deviceContents.map(content => {
      if (content.type === 'mixed' && content.metadata) {
        try {
          const elements = JSON.parse(content.metadata);
          console.log('[API] 복합형 콘텐츠 파싱:', {
            contentId: content.id,
            metadataType: typeof content.metadata,
            metadataLength: content.metadata?.length,
            elementsType: typeof elements,
            isArray: Array.isArray(elements),
            elementsLength: Array.isArray(elements) ? elements.length : 'not array',
            firstElement: Array.isArray(elements) && elements.length > 0 ? elements[0] : null
          });
          return {
            ...content,
            elements,
            metadata: undefined // metadata는 제거하고 elements만 사용
          };
        } catch (error) {
          console.error('복합형 콘텐츠 metadata 파싱 오류:', error);
          return content;
        }
      }
      return content;
    });

    console.log(`[API] 디바이스 ${deviceId}의 콘텐츠 ${processedContents.length}개 조회됨`);

    // 복합형 콘텐츠가 있으면 상세 로그
    const mixedContent = processedContents.find(c => c.type === 'mixed');
    if (mixedContent) {
      console.log('[API] 복합형 콘텐츠 최종 데이터:', JSON.stringify(mixedContent, null, 2));
    }

    return NextResponse.json(processedContents);
  } catch (error) {
    console.error('콘텐츠 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '콘텐츠 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
