// 한국 표준시(KST = UTC+9, 고정 오프셋·DST 없음) 타임스탬프.
// 예: "2026-06-08T19:52:21.100+09:00" — 한국시간으로 읽히면서 +09:00 오프셋이 붙어
// 절대시각이 보존된다(다른 도구로 파싱해도 동일한 순간). 이벤트 로그/파일명에 사용.
export function kstNow(): string {
  const shifted = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return shifted.toISOString().replace('Z', '+09:00');
}
