// 서버 시작 시간 - 서버가 재시작되면 이 값이 변경됨
// 이를 통해 서버 재시작 시 모든 세션 무효화
export const SERVER_START_TIME = Date.now();

// 토큰에 포함된 서버 시작 시간이 현재와 일치하는지 확인
export function isValidServerSession(tokenServerTime: number): boolean {
  return tokenServerTime === SERVER_START_TIME;
}
