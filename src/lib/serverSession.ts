// 빌드 시점에 생성되는 고유 ID
// 서버 재빌드/재시작 시 변경됨
export const SERVER_START_TIME = process.env.BUILD_TIME
  ? parseInt(process.env.BUILD_TIME, 10)
  : 0; // 0이면 서버 시작 시간 체크 비활성화

// 토큰에 포함된 서버 시작 시간이 현재와 일치하는지 확인
export function isValidServerSession(tokenServerTime: number): boolean {
  // SERVER_START_TIME이 0이면 체크 비활성화
  if (SERVER_START_TIME === 0) return true;
  return tokenServerTime === SERVER_START_TIME;
}
