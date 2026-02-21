import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ensureNoticeSchema } from '@/lib/noticeSchema';

function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

async function getDeviceByIdOrAlias(deviceIdOrAlias: string) {
  if (isUUID(deviceIdOrAlias)) {
    return await queryOne('SELECT id, user_id FROM device WHERE id = ?', [deviceIdOrAlias]) as any;
  }
  return await queryOne('SELECT id, user_id FROM device WHERE alias = ?', [deviceIdOrAlias]) as any;
}

const DEFAULT_SETTINGS = {
  notice_enabled: 1,
  notice_default_mode: 'ticker',
  notice_item_duration_sec: 8,
  notice_max_items: 3,
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    await ensureNoticeSchema();
    const { deviceId: deviceIdOrAlias } = await params;
    const device = await getDeviceByIdOrAlias(deviceIdOrAlias);
    if (!device) {
      return NextResponse.json({ error: '디바이스를 찾을 수 없습니다.' }, { status: 404 });
    }

    const settings = await queryOne(
      'SELECT * FROM device_display_settings WHERE device_id = ?',
      [device.id]
    ) as any;

    return NextResponse.json(settings || { device_id: device.id, ...DEFAULT_SETTINGS });
  } catch (error) {
    console.error('디스플레이 설정 조회 오류:', error);
    return NextResponse.json(
      { error: '디스플레이 설정 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    await ensureNoticeSchema();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { deviceId: deviceIdOrAlias } = await params;
    const device = await getDeviceByIdOrAlias(deviceIdOrAlias);
    if (!device) {
      return NextResponse.json({ error: '디바이스를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (user.role !== 'superadmin' && device.user_id !== user.userId) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const body = await req.json();
    const now = new Date().toISOString();
    const mode = ['ticker', 'side_panel', 'popup_cycle'].includes(body.notice_default_mode)
      ? body.notice_default_mode
      : DEFAULT_SETTINGS.notice_default_mode;
    const duration = Math.min(60, Math.max(3, Number(body.notice_item_duration_sec) || DEFAULT_SETTINGS.notice_item_duration_sec));
    const maxItems = Math.min(20, Math.max(1, Number(body.notice_max_items) || DEFAULT_SETTINGS.notice_max_items));
    const enabled = body.notice_enabled === false || body.notice_enabled === 0 ? 0 : 1;

    const existing = await queryOne(
      'SELECT device_id FROM device_display_settings WHERE device_id = ?',
      [device.id]
    );

    if (existing) {
      await execute(
        'UPDATE device_display_settings SET notice_enabled = ?, notice_default_mode = ?, notice_item_duration_sec = ?, notice_max_items = ?, updatedAt = ? WHERE device_id = ?',
        [enabled, mode, duration, maxItems, now, device.id]
      );
    } else {
      await execute(
        'INSERT INTO device_display_settings (device_id, notice_enabled, notice_default_mode, notice_item_duration_sec, notice_max_items, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        [device.id, enabled, mode, duration, maxItems, now]
      );
    }

    const updated = await queryOne('SELECT * FROM device_display_settings WHERE device_id = ?', [device.id]);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('디스플레이 설정 저장 오류:', error);
    return NextResponse.json(
      { error: '디스플레이 설정 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
