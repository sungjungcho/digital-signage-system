import nodemailer from 'nodemailer';

// SMTP 설정
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 발신자 이메일
const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com';
const SERVICE_NAME = process.env.SERVICE_NAME || '디지털 사이니지 시스템';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

// 이메일 발송 함수
export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  // SMTP 설정이 없으면 발송하지 않음
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('[Email] SMTP 설정이 없어 이메일을 발송하지 않습니다.');
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"${SERVICE_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });
    console.log(`[Email] 이메일 발송 성공: ${to}`);
    return true;
  } catch (error) {
    console.error('[Email] 이메일 발송 실패:', error);
    return false;
  }
}

// 회원가입 승인 이메일
export async function sendApprovalEmail(email: string, username: string): Promise<boolean> {
  const loginUrl = process.env.NEXT_PUBLIC_BASE_URL
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/login`
    : '/login';

  return sendEmail({
    to: email,
    subject: `[${SERVICE_NAME}] 회원가입이 승인되었습니다`,
    html: `
      <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e40af;">회원가입 승인 완료</h2>
        <p>안녕하세요, <strong>${username}</strong>님!</p>
        <p>회원가입 요청이 <span style="color: #16a34a; font-weight: bold;">승인</span>되었습니다.</p>
        <p>이제 서비스에 로그인하여 이용하실 수 있습니다.</p>
        <div style="margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
            로그인하기
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">본 메일은 발신 전용입니다.</p>
      </div>
    `,
  });
}

// 회원가입 거절 이메일
export async function sendRejectionEmail(email: string, username: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `[${SERVICE_NAME}] 회원가입 요청이 거절되었습니다`,
    html: `
      <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e40af;">회원가입 요청 거절</h2>
        <p>안녕하세요, <strong>${username}</strong>님.</p>
        <p>죄송합니다. 회원가입 요청이 <span style="color: #dc2626; font-weight: bold;">거절</span>되었습니다.</p>
        <p>자세한 사항은 관리자에게 문의해 주세요.</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">본 메일은 발신 전용입니다.</p>
      </div>
    `,
  });
}

// 승인 대기(pending) 상태 변경 이메일 (재심사 등)
export async function sendPendingEmail(email: string, username: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `[${SERVICE_NAME}] 회원가입 요청이 대기 상태로 변경되었습니다`,
    html: `
      <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e40af;">회원가입 상태 변경</h2>
        <p>안녕하세요, <strong>${username}</strong>님.</p>
        <p>회원가입 요청이 <span style="color: #ca8a04; font-weight: bold;">승인 대기</span> 상태로 변경되었습니다.</p>
        <p>관리자 검토 후 결과를 다시 안내드리겠습니다.</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">본 메일은 발신 전용입니다.</p>
      </div>
    `,
  });
}
