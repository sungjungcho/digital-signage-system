/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_USERNAME = process.env.TEST_USERNAME || 'superadmin';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'admin1234';

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.cookie = '';
  }

  _storeCookies(response) {
    const getSetCookie = response.headers.getSetCookie?.bind(response.headers);
    const cookieHeaders = getSetCookie ? getSetCookie() : [];

    for (const header of cookieHeaders) {
      const firstPart = header.split(';')[0];
      if (!firstPart) continue;
      const [name] = firstPart.split('=');
      if (!name) continue;

      const pairs = this.cookie
        ? this.cookie.split('; ').filter(Boolean).map((item) => item.split('=').slice(0, 2))
        : [];
      const map = new Map(pairs);
      const [k, v] = firstPart.split('=');
      map.set(k, v ?? '');
      this.cookie = Array.from(map.entries()).map(([ck, cv]) => `${ck}=${cv}`).join('; ');
    }
  }

  async request(pathname, options = {}) {
    const {
      method = 'GET',
      json,
      formData,
      headers = {},
      expectedStatus = [200],
    } = options;

    const reqHeaders = { ...headers };
    if (this.cookie) {
      reqHeaders.Cookie = this.cookie;
    }

    let body;
    if (json !== undefined) {
      reqHeaders['Content-Type'] = 'application/json';
      body = JSON.stringify(json);
    } else if (formData) {
      body = formData;
    }

    const response = await fetch(`${this.baseUrl}${pathname}`, {
      method,
      headers: reqHeaders,
      body,
    });

    this._storeCookies(response);

    const text = await response.text();
    let parsed;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }

    if (!expectedStatus.includes(response.status)) {
      throw new Error(
        `[${method} ${pathname}] expected ${expectedStatus.join('/')} but got ${response.status}: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`
      );
    }

    return { status: response.status, data: parsed };
  }
}

function loadImageFile() {
  const preferred = path.join(process.cwd(), 'public', 'next.svg');
  if (fs.existsSync(preferred)) {
    return {
      fileName: 'next.svg',
      mimeType: 'image/svg+xml',
      buffer: fs.readFileSync(preferred),
      publicUrl: '/next.svg',
    };
  }

  const imageDir = path.join(process.cwd(), 'public', 'images');
  const imageFiles = fs.existsSync(imageDir)
    ? fs.readdirSync(imageDir).filter((f) => /\.(png|jpe?g|gif|webp|svg)$/i.test(f))
    : [];
  if (imageFiles.length === 0) {
    throw new Error('테스트용 이미지 파일을 찾을 수 없습니다. public/images 또는 public/next.svg를 확인하세요.');
  }
  const fileName = imageFiles[0];
  const ext = path.extname(fileName).toLowerCase();
  const mimeType = ext === '.png'
    ? 'image/png'
    : ext === '.gif'
      ? 'image/gif'
      : ext === '.webp'
        ? 'image/webp'
        : ext === '.svg'
          ? 'image/svg+xml'
          : 'image/jpeg';
  return {
    fileName,
    mimeType,
    buffer: fs.readFileSync(path.join(imageDir, fileName)),
    publicUrl: `/images/${fileName}`,
  };
}

function loadVideoFile() {
  const videoDir = path.join(process.cwd(), 'public', 'videos');
  const videoFiles = fs.existsSync(videoDir)
    ? fs.readdirSync(videoDir).filter((f) => /\.(mp4|webm|mov|m4v)$/i.test(f))
    : [];
  if (videoFiles.length === 0) {
    throw new Error('테스트용 동영상 파일을 찾을 수 없습니다. public/videos 폴더에 mp4/webm 파일이 필요합니다.');
  }
  const fileName = videoFiles[0];
  const ext = path.extname(fileName).toLowerCase();
  const mimeType = ext === '.webm' ? 'video/webm' : 'video/mp4';
  return {
    fileName,
    mimeType,
    buffer: fs.readFileSync(path.join(videoDir, fileName)),
    publicUrl: `/videos/${fileName}`,
  };
}

function toBlob(buffer, mimeType) {
  return new Blob([buffer], { type: mimeType });
}

async function run() {
  console.log(`\n[Smoke Test] Base URL: ${BASE_URL}`);
  const api = new ApiClient(BASE_URL);
  const created = {
    device: null,
    libraryContents: [],
  };

  const image = loadImageFile();
  const video = loadVideoFile();
  const timestamp = Date.now();

  console.log('[1/10] 로그인');
  await api.request('/api/auth/login', {
    method: 'POST',
    json: { username: TEST_USERNAME, password: TEST_PASSWORD },
  });

  console.log('[2/10] 사용자 확인');
  const auth = await api.request('/api/auth/check');
  if (!auth.data?.authenticated || !auth.data?.user?.userId) {
    throw new Error('로그인 후 사용자 정보를 확인하지 못했습니다.');
  }
  const userId = auth.data.user.userId;

  console.log('[3/10] 신규 디바이스 등록');
  const alias = `e2e-${timestamp}`;
  const deviceRes = await api.request('/api/devices', {
    method: 'POST',
    json: {
      name: `E2E Device ${timestamp}`,
      location: 'E2E Test Zone',
      alias,
      pin_code: '1234',
      user_id: userId,
    },
  });
  const device = deviceRes.data;
  if (!device?.id) {
    throw new Error('디바이스 등록 응답에 id가 없습니다.');
  }
  created.device = device;

  console.log('[4/10] PIN 검증');
  await api.request(`/api/devices/${alias}/verify-pin`, {
    method: 'POST',
    json: { pin: '1234' },
  });

  console.log('[5/10] 디바이스 콘텐츠 등록 (텍스트)');
  await api.request('/api/contents/text', {
    method: 'POST',
    json: {
      deviceId: device.id,
      text: `E2E 텍스트 ${timestamp}`,
      duration: 5000,
      fontSize: '2rem',
      fontColor: '#ffffff',
      backgroundColor: '#111111',
    },
  });

  console.log('[6/10] 콘텐츠 라이브러리 등록 (이미지/동영상)');
  const libImage = await api.request('/api/contents', {
    method: 'POST',
    json: {
      name: `E2E Library Image ${timestamp}`,
      type: 'image',
      url: image.publicUrl,
      duration: 10,
      alt: image.fileName,
    },
    expectedStatus: [201],
  });
  created.libraryContents.push(libImage.data);

  const libVideo = await api.request('/api/contents', {
    method: 'POST',
    json: {
      name: `E2E Library Video ${timestamp}`,
      type: 'video',
      url: video.publicUrl,
      duration: 10,
      alt: video.fileName,
      autoplay: true,
      loop: true,
      muted: true,
    },
    expectedStatus: [201],
  });
  created.libraryContents.push(libVideo.data);

  console.log('[7/10] 복합형 콘텐츠 등록');
  const mixedForm = new FormData();
  mixedForm.append('deviceId', device.id);
  mixedForm.append('elements', JSON.stringify([
    {
      type: 'text',
      order: 0,
      duration: 3000,
      text: `Mixed Text ${timestamp}`,
      fontSize: '2rem',
      fontColor: '#ffffff',
      backgroundColor: '#000000',
    },
    {
      type: 'image',
      order: 1,
      duration: 3000,
      url: libImage.data?.url,
    },
    {
      type: 'video',
      order: 2,
      duration: 3000,
      url: libVideo.data?.url,
      autoplay: true,
      loop: true,
      muted: true,
    },
  ]));
  await api.request('/api/contents/mixed', {
    method: 'POST',
    formData: mixedForm,
  });

  console.log('[8/10] 분할 레이아웃 콘텐츠 등록');
  await api.request('/api/contents/splitlayout', {
    method: 'POST',
    json: {
      deviceId: device.id,
      showNotices: true,
      leftContents: [
        {
          id: `left-text-${timestamp}`,
          type: 'text',
          order: 0,
          duration: 3000,
          text: `Split Left Text ${timestamp}`,
          fontSize: '2rem',
          fontColor: '#ffffff',
          backgroundColor: '#000000',
        },
        {
          id: `left-image-${timestamp}`,
          type: 'image',
          order: 1,
          duration: 3000,
          url: libImage.data?.url,
        },
      ],
    },
  });

  console.log('[9/10] 라이브러리 콘텐츠를 디바이스에 연결');
  await api.request(`/api/devices/${device.id}/contents/link`, {
    method: 'POST',
    json: {
      contentIds: [libImage.data.id, libVideo.data.id],
    },
  });

  console.log('[10/10] 연결 결과 검증');
  const linked = await api.request(`/api/devices/${device.id}/contents/link`);
  const linkedIds = new Set((linked.data || []).map((item) => item.id));
  if (!linkedIds.has(libImage.data.id) || !linkedIds.has(libVideo.data.id)) {
    throw new Error('라이브러리 콘텐츠 연결 검증에 실패했습니다.');
  }

  console.log('\n✅ 스모크 테스트 성공');
  console.log(`- Device ID: ${device.id}`);
  console.log(`- Device Alias: ${alias}`);
  console.log(`- Library Image ID: ${libImage.data.id}`);
  console.log(`- Library Video ID: ${libVideo.data.id}`);
  console.log('\n참고: 테스트 데이터는 자동 삭제하지 않습니다.');
}

run().catch((error) => {
  console.error('\n❌ 스모크 테스트 실패');
  console.error(error);
  process.exit(1);
});
