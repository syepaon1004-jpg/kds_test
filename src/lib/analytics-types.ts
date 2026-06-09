// 대시보드 집계 메트릭 공용 타입 (클라이언트/서버 공용 — 순수 타입, 런타임 의존 없음).
// 'custom' = 임의 기간(시작~종료, 분 단위). fromMs/toMs(epoch)로 지정.
export type AnalyticsRange = 'today' | '7d' | 'all' | 'custom';

export interface MenuCountItem {
  menu_name: string;
  count: number;
}

export interface NoodleCountItem {
  noodle_type: string;
  count: number; // 색은 클라이언트에서 NOODLE_TYPE_COLORS 로 매핑 (서버는 색 모름)
}

export interface HistogramBucket {
  label: string;
  loSec: number;
  hiSec: number; // -1 = 무한대(상한 없음)
  count: number;
}

export interface ServingStats {
  count: number;
  avgSec: number;
  minSec: number;
  maxSec: number;
  medianSec: number;
  histogram: HistogramBucket[];
}

export interface LatencyStats {
  count: number;
  avgSec: number;
  medianSec: number;
  maxSec: number;
}

export interface HourlyBucket {
  hour: number; // 0..23 (KST)
  inflow: number;
}

export interface ConcurrentPoint {
  epochMs: number;
  label: string; // 'MM-DD HH:mm' KST
  activeCount: number;
}

export interface ConcurrentStats {
  peak: number;
  peakAtLabel: string;
  series: ConcurrentPoint[];
}

export interface PortUsageItem {
  port: number; // 1..6
  count: number;
}

export interface StationLoad {
  station: '면' | '핫' | '튀김' | '토핑';
  hasData: boolean;
  avgServingSec: number;
  cardCount: number;
}

export interface StationLoadPanelData {
  stations: StationLoad[];
  loadSharePct: number; // 면 카드수 점유율 (타 스테이션 0 → 100)
  noodleLoadRatio: number | null; // 면 서빙시간 ÷ 타 스테이션 평균 (비교 불가 시 null)
  comparisonAvailable: boolean;
}

export interface AnalyticsMetrics {
  range: AnalyticsRange;
  generatedAt: string; // KST
  daysCovered: string[];
  windowFromMs: number | null; // 집계 구간 시작 epoch (null = 하한 없음)
  windowToMs: number | null; // 집계 구간 끝 epoch (null = 상한 없음)
  totalEvents: number;
  empty: boolean;
  // 1. 메뉴 개수
  totalOrders: number;
  menuBreakdown: MenuCountItem[];
  // 2. 소비된 면 개수
  noodlesCooked: number;
  noodleBreakdown: NoodleCountItem[];
  // 3. 평균 서빙시간
  serving: ServingStats;
  // 상세 지표
  pickupLatency: LatencyStats;
  hourly: HourlyBucket[];
  concurrent: ConcurrentStats;
  forceComplete: { forced: number; normal: number; ratioPct: number };
  portUsage: PortUsageItem[];
  // 스테이션 부하
  stationLoad: StationLoadPanelData;
}
