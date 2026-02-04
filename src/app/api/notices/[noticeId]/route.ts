import { NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';

// 공지사항 수정
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ noticeId: string }> }
) {
  try {
    const { noticeId } = await params;
    const { title, content, category, favorite } = await req.json();

    const now = new Date().toISOString();

    await execute(
      'UPDATE notice SET title = ?, content = ?, category = ?, favorite = ?, updatedAt = ? WHERE id = ?',
      [title, content, category || null, favorite ? 1 : 0, now, noticeId]
    );

    const updatedNotice = await queryOne('SELECT * FROM notice WHERE id = ?', [noticeId]);

    return NextResponse.json(updatedNotice);
  } catch (error) {
    console.error('공지사항 수정 오류:', error);
    return NextResponse.json(
      { error: '공지사항 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 공지사항 삭제
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ noticeId: string }> }
) {
  try {
    const { noticeId } = await params;

    await execute('DELETE FROM notice WHERE id = ?', [noticeId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('공지사항 삭제 오류:', error);
    return NextResponse.json(
      { error: '공지사항 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 공지사항 사용 기록 업데이트
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ noticeId: string }> }
) {
  try {
    const { noticeId } = await params;

    const now = new Date().toISOString();

    await execute(
      'UPDATE notice SET lastUsedAt = ?, usageCount = usageCount + 1 WHERE id = ?',
      [now, noticeId]
    );

    const updatedNotice = await queryOne('SELECT * FROM notice WHERE id = ?', [noticeId]);

    return NextResponse.json(updatedNotice);
  } catch (error) {
    console.error('공지사항 사용 기록 업데이트 오류:', error);
    return NextResponse.json(
      { error: '공지사항 사용 기록 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
