// 로그 이벤트 → 대시보드 메트릭. 순수 함수(파일 I/O 없음 → 단위검증 가능).
// I/O(파일 읽기)는 analytics-source.ts 가 담당.
import type { EventLog } from '@/lib/types';
import { kstClockLabel, kstHourOf, kstNow } from '@/lib/time';
import type { AnalyticsMetrics, AnalyticsRange } from '@/lib/analytics-types';

// "소비된 면" 기준 이벤트 (가정: 실제 삶은 면 = 타이머 시작).
// → 'card:complete'(서빙완료) 또는 'card:create'(주문)로 바꾸려면 이 한 줄만 변경.
const SOURCE_NOODLE_EVENT = 'card:start_timer';

// 서빙시간 분포 버킷 [lo, hi, label] (hi=Infinity = 상한 없음)
const HIST_BUCKETS: [number, number, string][] = [
  [0, 30, '0–30초'],
  [30, 60, '30–60초'],
  [60, 120, '1–2분'],
  [120, 180, '2–3분'],
  [180, 300, '3–5분'],
  [300, Infinity, '5분+'],
];

// 1시간 초과 = 세션 가로지름/카드 방치로 간주 → 서빙·반응속도 통계에서 제외(평균 왜곡 방지).
const MAX_REASONABLE_SEC = 3600;

interface NE extends EventLog {
  epoch: number;
}

const cardIdOf = (e: EventLog): string | undefined =>
  (e.result?.card_id as string | undefined) ?? (e.payload?.card_id as string | undefined);

const round1 = (n: number) => Math.round(n * 10) / 10;

function statList(secs: number[]) {
  if (secs.length === 0) return { count: 0, avgSec: 0, minSec: 0, maxSec: 0, medianSec: 0 };
  const sorted = [...secs].sort((a, b) => a - b);
  const sum = sorted.reduce((s, x) => s + x, 0);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return {
    count: sorted.length,
    avgSec: round1(sum / sorted.length),
    minSec: round1(sorted[0]),
    maxSec: round1(sorted[sorted.length - 1]),
    medianSec: round1(median),
  };
}

export function computeMetrics(
  entries: EventLog[],
  range: AnalyticsRange,
  daysCovered: string[] = [],
  window?: { fromMs: number; toMs: number },
): AnalyticsMetrics {
  const norm: NE[] = entries
    .map((e) => ({ ...e, epoch: Date.parse(e.timestamp) }))
    .filter((e) => !Number.isNaN(e.epoch))
    .sort((a, b) => a.epoch - b.epoch);

  // card_id 단일 순회 조인
  const byCard = new Map<string, { create?: NE; start?: NE; complete?: NE }>();
  for (const e of norm) {
    const id = cardIdOf(e);
    if (!id) continue;
    let rec = byCard.get(id);
    if (!rec) {
      rec = {};
      byCard.set(id, rec);
    }
    if (e.event === 'card:create') rec.create = e;
    else if (e.event === 'card:start_timer') rec.start = e;
    else if (e.event === 'card:complete') rec.complete = e;
  }

  const creates = norm.filter((e) => e.event === 'card:create');
  const totalOrders = creates.length;

  // 1. 메뉴별 투입
  const menuMap = new Map<string, number>();
  for (const e of creates) {
    const m = (e.payload?.menu_name as string) || '기타';
    menuMap.set(m, (menuMap.get(m) ?? 0) + 1);
  }
  const menuBreakdown = [...menuMap]
    .map(([menu_name, count]) => ({ menu_name, count }))
    .sort((a, b) => b.count - a.count);

  // 2. 소비된 면 (SOURCE_NOODLE_EVENT) — 면 종류별
  const noodleEvents = norm.filter((e) => e.event === SOURCE_NOODLE_EVENT);
  const noodleMap = new Map<string, number>();
  for (const e of noodleEvents) {
    let nt = e.payload?.noodle_type as string | undefined;
    if (!nt) {
      const id = cardIdOf(e);
      nt = id ? (byCard.get(id)?.create?.payload?.noodle_type as string | undefined) : undefined;
    }
    const key = nt || '기타';
    noodleMap.set(key, (noodleMap.get(key) ?? 0) + 1);
  }
  const noodleBreakdown = [...noodleMap]
    .map(([noodle_type, count]) => ({ noodle_type, count }))
    .sort((a, b) => b.count - a.count);
  const noodlesCooked = noodleEvents.length;

  // 3. 서빙시간 (create→complete, card_id 조인). force_complete 는 비정상 종료 → 제외(별도 집계).
  const servingSecs: number[] = [];
  for (const rec of byCard.values()) {
    if (rec.create && rec.complete) {
      const sec = (rec.complete.epoch - rec.create.epoch) / 1000;
      if (sec >= 0 && sec <= MAX_REASONABLE_SEC) servingSecs.push(sec);
    }
  }
  const sStat = statList(servingSecs);
  const histogram = HIST_BUCKETS.map(([lo, hi, label]) => ({
    label,
    loSec: lo,
    hiSec: hi === Infinity ? -1 : hi,
    count: servingSecs.filter((s) => s >= lo && s < hi).length,
  }));
  const serving = { ...sStat, histogram };

  // 워커 반응속도 (create→start)
  const pickupSecs: number[] = [];
  for (const rec of byCard.values()) {
    if (rec.create && rec.start) {
      const sec = (rec.start.epoch - rec.create.epoch) / 1000;
      if (sec >= 0 && sec <= MAX_REASONABLE_SEC) pickupSecs.push(sec);
    }
  }
  const pStat = statList(pickupSecs);
  const pickupLatency = {
    count: pStat.count,
    avgSec: pStat.avgSec,
    medianSec: pStat.medianSec,
    maxSec: pStat.maxSec,
  };

  // 시간대별 투입 (KST 24버킷)
  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, inflow: 0 }));
  for (const e of creates) hourly[kstHourOf(e.epoch)].inflow++;

  // 동시부하 peak + series (5분 버킷 max, ~200점 캡)
  let peak = 0;
  let peakAtLabel = '';
  for (const e of norm) {
    const c = e.active_cards_count ?? 0;
    if (c > peak) {
      peak = c;
      peakAtLabel = kstClockLabel(e.epoch);
    }
  }
  const BUCKET = 5 * 60 * 1000;
  const bmap = new Map<number, { epochMs: number; activeCount: number }>();
  for (const e of norm) {
    const b = Math.floor(e.epoch / BUCKET);
    const c = e.active_cards_count ?? 0;
    const cur = bmap.get(b);
    if (!cur || c > cur.activeCount) bmap.set(b, { epochMs: b * BUCKET, activeCount: c });
  }
  let series = [...bmap.values()]
    .sort((a, b) => a.epochMs - b.epochMs)
    .map((x) => ({ ...x, label: kstClockLabel(x.epochMs) }));
  if (series.length > 200) {
    const step = Math.ceil(series.length / 200);
    series = series.filter((_, i) => i % step === 0);
  }
  const concurrent = { peak, peakAtLabel, series };

  // 즉시완료 비율
  const forced = norm.filter((e) => e.event === 'card:force_complete').length;
  const normalDone = norm.filter((e) => e.event === 'card:complete').length;
  const forceComplete = {
    forced,
    normal: normalDone,
    ratioPct: forced + normalDone > 0 ? round1((forced / (forced + normalDone)) * 100) : 0,
  };

  // 포트(바구니) 사용
  const portMap = new Map<number, number>();
  for (const e of norm) {
    if (e.event === 'card:set_port') {
      const port = e.payload?.port as number | null | undefined;
      if (typeof port === 'number' && port >= 1 && port <= 6) {
        portMap.set(port, (portMap.get(port) ?? 0) + 1);
      }
    }
  }
  const portUsage = [1, 2, 3, 4, 5, 6].map((port) => ({ port, count: portMap.get(port) ?? 0 }));

  // 스테이션 부하 (면만 실제, 핫/튀김/토핑 = 0). 향후 타 스테이션 데이터 들어오면 자동 비교.
  const stations = [
    { station: '면' as const, hasData: serving.count > 0, avgServingSec: serving.avgSec, cardCount: serving.count },
    { station: '핫' as const, hasData: false, avgServingSec: 0, cardCount: 0 },
    { station: '튀김' as const, hasData: false, avgServingSec: 0, cardCount: 0 },
    { station: '토핑' as const, hasData: false, avgServingSec: 0, cardCount: 0 },
  ];
  const others = stations.filter((s) => s.station !== '면' && s.hasData);
  const comparisonAvailable = others.length > 0;
  const othersAvg = comparisonAvailable
    ? others.reduce((s, x) => s + x.avgServingSec, 0) / others.length
    : 0;
  const noodleLoadRatio =
    comparisonAvailable && othersAvg > 0 ? round1(serving.avgSec / othersAvg) : null;
  const totalCards = stations.reduce((s, x) => s + x.cardCount, 0);
  const loadSharePct = totalCards > 0 ? round1((stations[0].cardCount / totalCards) * 100) : 100;
  const stationLoad = { stations, loadSharePct, noodleLoadRatio, comparisonAvailable };

  const UNBOUNDED_MAX = Number.MAX_SAFE_INTEGER;
  return {
    range,
    generatedAt: kstNow(),
    daysCovered,
    windowFromMs: window && window.fromMs > 0 ? window.fromMs : null,
    windowToMs: window && window.toMs < UNBOUNDED_MAX ? window.toMs : null,
    totalEvents: norm.length,
    empty: totalOrders === 0,
    totalOrders,
    menuBreakdown,
    noodlesCooked,
    noodleBreakdown,
    serving,
    pickupLatency,
    hourly,
    concurrent,
    forceComplete,
    portUsage,
    stationLoad,
  };
}
