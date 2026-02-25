import { NextResponse } from 'next/server';
import { LAYOUT_TEMPLATE_LIST } from '@/types/layout';

// GET: 사용 가능한 레이아웃 템플릿 목록 반환
export async function GET() {
  try {
    return NextResponse.json(LAYOUT_TEMPLATE_LIST);
  } catch (error) {
    console.error('레이아웃 템플릿 조회 오류:', error);
    return NextResponse.json(
      { error: '레이아웃 템플릿을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
