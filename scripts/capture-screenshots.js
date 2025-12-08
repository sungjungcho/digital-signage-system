const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 스크린샷 저장 디렉토리
const SCREENSHOT_DIR = path.join(process.cwd(), 'screenshots');

// 디렉토리 생성
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// 캡처할 화면 목록
const pages = [
  {
    name: '01_메인화면',
    url: 'http://localhost:3000',
    waitFor: 1000,
  },
  {
    name: '02_관리자로그인',
    url: 'http://localhost:3000/admin/login',
    waitFor: 1000,
  },
  {
    name: '03_디바이스초기화',
    url: 'http://localhost:3000/initialize-device',
    waitFor: 1000,
  },
];

async function captureScreenshots() {
  console.log('🚀 스크린샷 캡처 시작...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  for (const pageInfo of pages) {
    try {
      console.log(`📸 캡처 중: ${pageInfo.name}`);
      console.log(`   URL: ${pageInfo.url}`);

      await page.goto(pageInfo.url, {
        waitUntil: 'networkidle0',
        timeout: 10000,
      });

      // 추가 대기
      await page.waitForTimeout(pageInfo.waitFor || 1000);

      // 스크린샷 저장
      const screenshotPath = path.join(SCREENSHOT_DIR, `${pageInfo.name}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: false,
      });

      console.log(`   ✅ 저장됨: ${screenshotPath}\n`);
    } catch (error) {
      console.error(`   ❌ 오류: ${error.message}\n`);
    }
  }

  // 관리자 대시보드는 로그인이 필요하므로 별도 처리
  try {
    console.log('📸 캡처 중: 04_관리자대시보드 (로그인 필요)');
    await page.goto('http://localhost:3000/admin/login', {
      waitUntil: 'networkidle0',
    });

    // 로그인 폼 작성
    await page.waitForSelector('input[type="text"]');
    await page.type('input[type="text"]', 'admin');
    await page.type('input[type="password"]', 'admin123');

    // 로그인 버튼 클릭
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000);

    // 관리자 페이지 스크린샷
    const adminScreenshot = path.join(SCREENSHOT_DIR, '04_관리자대시보드.png');
    await page.screenshot({
      path: adminScreenshot,
      fullPage: true, // 전체 페이지 캡처 (스크롤 포함)
    });
    console.log(`   ✅ 저장됨: ${adminScreenshot}\n`);
  } catch (error) {
    console.error(`   ❌ 오류: ${error.message}\n`);
  }

  // 디바이스 화면 캡처 (디바이스 ID 필요)
  try {
    console.log('📸 캡처 중: 05_디스플레이화면');

    // 관리자 페이지에서 첫 번째 디바이스 ID 가져오기
    await page.goto('http://localhost:3000/admin', {
      waitUntil: 'networkidle0',
    });

    // 디바이스 목록에서 첫 번째 디바이스 찾기
    const deviceId = await page.evaluate(() => {
      // 디바이스 관리 섹션에서 첫 번째 디바이스의 data attribute나 텍스트에서 ID 추출
      const deviceElements = document.querySelectorAll('[class*="border"]');
      for (const el of deviceElements) {
        const text = el.textContent;
        // UUID 형식의 ID 찾기
        const match = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        if (match) return match[0];
      }
      return null;
    });

    if (deviceId) {
      console.log(`   디바이스 ID: ${deviceId}`);
      await page.goto(`http://localhost:3000/display/${deviceId}`, {
        waitUntil: 'networkidle0',
      });
      await page.waitForTimeout(3000); // 콘텐츠 로딩 대기

      const displayScreenshot = path.join(SCREENSHOT_DIR, '05_디스플레이화면.png');
      await page.screenshot({
        path: displayScreenshot,
        fullPage: false,
      });
      console.log(`   ✅ 저장됨: ${displayScreenshot}\n`);
    } else {
      console.log('   ⚠️  디바이스를 찾을 수 없습니다.\n');
    }
  } catch (error) {
    console.error(`   ❌ 오류: ${error.message}\n`);
  }

  await browser.close();
  console.log('✅ 모든 스크린샷 캡처 완료!');
  console.log(`📁 저장 위치: ${SCREENSHOT_DIR}`);
}

captureScreenshots().catch(console.error);
