// 대시보드 데이터 엔드포인트. logs/*.jsonl 을 읽어 집계 메트릭 JSON 반환.
// 커스텀 server.ts 가 Next 핸들러로 라우팅하므로 별도 등록 불필요.
// 쿼리: ?range=today|7d|all|custom  (custom 이면 &fromMs=<epoch>&toMs=<epoch>, 분 단위)
import { loadEntries } from '@/server/analytics-source';
import { computeMetrics } from '@/server/analytics';
import type { AnalyticsRange } from '@/lib/analytics-types';

export const runtime = 'nodejs'; // fs 접근 필요
export const dynamic = 'force-dynamic'; // 매 요청마다 로그 재집계 (캐시 X)

function parseRange(v: string | null): AnalyticsRange {
  return v === '7d' || v === 'all' || v === 'custom' ? v : 'today';
}
function parseMs(v: string | null): number | undefined {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const range = parseRange(params.get('range'));
  const fromMs = parseMs(params.get('fromMs'));
  const toMs = parseMs(params.get('toMs'));
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const { entries, daysCovered, window } = loadEntries(range, fromMs, toMs);
    return Response.json(computeMetrics(entries, range, daysCovered, window), { headers });
  } catch {
    // 로그 없음/읽기 실패 → 빈 메트릭 (UI 빈 상태)
    return Response.json(computeMetrics([], range, []), { headers });
  }
}
