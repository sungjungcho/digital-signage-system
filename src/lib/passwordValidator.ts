// 흔한 비밀번호 블랙리스트
const COMMON_PASSWORDS = [
  // 숫자 패턴
  '12345678', '123456789', '1234567890', '87654321', '00000000', '11111111',
  '12341234', '11112222', '12121212', '01234567', '76543210',
  // 영문 패턴
  'password', 'password1', 'password12', 'password123',
  'qwerty123', 'qwertyui', 'qwerty12', 'asdfghjk', 'zxcvbnm1',
  'abcd1234', 'abcdefgh', 'abc12345', 'a1234567',
  // 흔한 단어
  'iloveyou', 'sunshine', 'princess', 'football', 'baseball',
  'dragon12', 'master12', 'monkey12', 'shadow12', 'michael1',
  'superman', 'batman123', 'spiderman', 'ironman1',
  // 키보드 패턴
  'qweasdzxc', 'asdfasdf', '1q2w3e4r', 'zaq12wsx', '1qaz2wsx',
  // 한글 관련 (영문 입력)
  'gksrmfdl', 'tkathdlf', 'dkssudgktpdy', 'tlqkf123', 'akstp123',
  'qkrwhdtjd', 'qkrckdcjswo', 'dkssud12', 'gksrmf12',
  // 관리자 관련
  'admin123', 'admin1234', 'administrator', 'root1234', 'test1234',
  'user1234', 'guest123', 'default1',
  // 기타
  'letmein12', 'welcome1', 'welcome12', 'changeme', 'passw0rd',
];

export interface PasswordValidationResult {
  isValid: boolean;
  message: string;
}

export function validatePassword(password: string): PasswordValidationResult {
  // 1. 최소 길이 검사 (8자 이상)
  if (password.length < 8) {
    return {
      isValid: false,
      message: '비밀번호는 8자 이상이어야 합니다.',
    };
  }

  // 2. 최대 길이 검사 (보안상 너무 긴 비밀번호 제한)
  if (password.length > 128) {
    return {
      isValid: false,
      message: '비밀번호는 128자 이하여야 합니다.',
    };
  }

  // 3. 블랙리스트 검사 (대소문자 무시)
  const lowerPassword = password.toLowerCase();
  if (COMMON_PASSWORDS.includes(lowerPassword)) {
    return {
      isValid: false,
      message: '너무 흔한 비밀번호입니다. 다른 비밀번호를 사용해주세요.',
    };
  }

  // 4. 연속된 같은 문자 검사 (예: aaaaaaaa)
  if (/^(.)\1{7,}$/.test(password)) {
    return {
      isValid: false,
      message: '같은 문자만 반복된 비밀번호는 사용할 수 없습니다.',
    };
  }

  return {
    isValid: true,
    message: '사용 가능한 비밀번호입니다.',
  };
}
