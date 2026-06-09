// 한국 표준시(KST = UTC+9, 고정 오프셋·DST 없음) 유틸. 이벤트 로그 + 대시보드 집계 공용.
export const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const p2 = (n: number) => String(n).padStart(2, '0');

// "2026-06-08T19:52:21.100+09:00" — 한국시간 표기 + +09:00 오프셋으로 절대시각 보존. 로그/파일명용.
export function kstNow(): string {
  const shifted = new Date(Date.now() + KST_OFFSET_MS);
  return shifted.toISOString().replace('Z', '+09:00');
}

// epoch(ms) → KST 'YYYY-MM-DD' (서버 로캘 무관)
export function kstDateOf(epochMs: number): string {
  const d = new Date(epochMs + KST_OFFSET_MS);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
}

// epoch(ms) → KST 시(0~23)
export function kstHourOf(epochMs: number): number {
  return new Date(epochMs + KST_OFFSET_MS).getUTCHours();
}

// epoch(ms) → 'MM-DD HH:mm' (KST)
export function kstClockLabel(epochMs: number): string {
  const d = new Date(epochMs + KST_OFFSET_MS);
  return `${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
}
