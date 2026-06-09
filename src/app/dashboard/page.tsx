'use client';

// 분석 대시보드. logs 집계(/api/analytics)를 폴링해 표시. UX: 위계 4섹션 + 상세 접이식.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Clock from '@/components/common/Clock';
import StatCard from '@/components/dashboard/StatCard';
import BarChart from '@/components/dashboard/BarChart';
import DonutChart from '@/components/dashboard/DonutChart';
import TrendChart from '@/components/dashboard/TrendChart';
import Histogram from '@/components/dashboard/Histogram';
import StationLoadPanel from '@/components/dashboard/StationLoadPanel';
import CollapsibleSection from '@/components/dashboard/CollapsibleSection';
import { formatMMSS } from '@/lib/format';
import { kstClockLabel } from '@/lib/time';
import type { AnalyticsMetrics, AnalyticsRange } from '@/lib/analytics-types';

const PRESETS: { key: AnalyticsRange; label: string }[] = [
  { key: 'today', label: '오늘' },
  { key: '7d', label: '7일' },
  { key: 'all', label: '전체' },
  { key: 'custom', label: '직접 설정' },
];

// datetime-local("YYYY-MM-DDTHH:mm", KST 가정) → epoch ms (브라우저 TZ 무관하게 +09:00 강제)
function localToMs(v: string): number | null {
  if (!v) return null;
  const ms = Date.parse(`${v}:00+09:00`);
  return Number.isNaN(ms) ? null : ms;
}
function nowLocal(offsetMin = 0): string {
  const d = new Date(Date.now() + 9 * 3600 * 1000 + offsetMin * 60000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
const mmss = (sec: number) => formatMMSS(Math.round(sec));

export default function DashboardPage() {
  const [range, setRange] = useState<AnalyticsRange>('today');
  const [fromLocal, setFromLocal] = useState(() => nowLocal(-180)); // 기본: 3시간 전
  const [toLocal, setToLocal] = useState(() => nowLocal(0));
  const [m, setM] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const customWin = useRef<{ from: number; to: number } | null>(null);

  const fetchMetrics = useCallback(async (r: AnalyticsRange) => {
    const url =
      r === 'custom' && customWin.current
        ? `/api/analytics?range=custom&fromMs=${customWin.current.from}&toMs=${customWin.current.to}`
        : `/api/analytics?range=${r === 'custom' ? 'today' : r}`;
    setLoading(true);
    try {
      const res = await fetch(url, { cache: 'no-store' });
      setM((await res.json()) as AnalyticsMetrics);
    } catch {
      /* 실패 시 이전 데이터 유지 */
    } finally {
      setLoading(false);
    }
  }, []);

  // URL ?range= 프리셋 초기화 (클라이언트, 하이드레이션 후)
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get('range');
    if (r === '7d' || r === 'all') setRange(r);
  }, []);

  useEffect(() => {
    fetchMetrics(range);
    const id = setInterval(() => fetchMetrics(range), 10000);
    return () => clearInterval(id);
  }, [range, fetchMetrics]);

  const applyCustom = () => {
    const from = localToMs(fromLocal);
    const to = localToMs(toLocal);
    if (from == null || to == null) return;
    customWin.current = { from, to };
    if (range === 'custom') fetchMetrics('custom');
    else setRange('custom');
  };

  const windowText = !m
    ? ''
    : m.windowFromMs && m.windowToMs
      ? `${kstClockLabel(m.windowFromMs)} ~ ${kstClockLabel(m.windowToMs)}`
      : m.range === 'all'
        ? '전체 기간'
        : m.daysCovered.length
          ? `${m.daysCovered[0]} ~ ${m.daysCovered[m.daysCovered.length - 1]}`
          : '';

  const peakIdx = m
    ? m.concurrent.series.reduce(
        (bi, p, i, a) => (p.activeCount > a[bi].activeCount ? i : bi),
        0,
      )
    : 0;

  return (
    <div className="flex h-screen flex-col bg-bg">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 bg-header-bg px-4 py-2 text-white">
        <span className="text-base font-bold">KitchenFlow — 분석 대시보드</span>
        <div className="flex items-center gap-3 text-sm">
          {loading && <span className="text-white/60">갱신 중…</span>}
          <Clock />
        </div>
      </header>

      <div className="shrink-0 border-b border-border bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setRange(p.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                range === p.key
                  ? 'bg-active text-white'
                  : 'border border-border bg-white text-text-secondary'
              }`}
            >
              {p.label}
            </button>
          ))}
          {range === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="datetime-local"
                step={60}
                value={fromLocal}
                onChange={(e) => setFromLocal(e.target.value)}
                className="rounded-md border border-border px-2 py-1 text-sm"
              />
              <span className="text-text-secondary">~</span>
              <input
                type="datetime-local"
                step={60}
                value={toLocal}
                onChange={(e) => setToLocal(e.target.value)}
                className="rounded-md border border-border px-2 py-1 text-sm"
              />
              <button
                onClick={applyCustom}
                className="rounded-lg bg-active px-3 py-1.5 text-sm font-semibold text-white"
              >
                적용
              </button>
            </div>
          )}
          <span className="ml-auto text-xs text-text-secondary">{windowText}</span>
        </div>
      </div>

      <main className="min-h-0 flex-1 overflow-auto p-4">
        {!m ? (
          <div className="flex h-full items-center justify-center text-text-secondary">불러오는 중…</div>
        ) : m.empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-text-secondary">
            <div className="text-lg font-semibold">집계할 데이터가 없습니다</div>
            <div className="text-sm">이 기간에 투입된 카드가 없습니다. 범위를 바꿔보세요.</div>
          </div>
        ) : (
          <div className="mx-auto max-w-6xl space-y-8">
            {/* 1. 한눈에 보기 */}
            <Section title="한눈에 보기">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="메뉴 개수 (총 주문)" value={m.totalOrders} caption={`${m.menuBreakdown.length}종`} />
                <StatCard label="소비된 면" value={m.noodlesCooked} caption="삶은 면(타이머 시작)" accent="#00838F" />
                <StatCard label="평균 서빙시간" value={m.serving.avgSec} format={mmss} caption={`중앙값 ${mmss(m.serving.medianSec)}`} accent="#009E73" />
                <StatCard label="면 부하 점유율" value={m.stationLoad.loadSharePct} format={(n) => `${Math.round(n)}%`} caption={m.stationLoad.comparisonAvailable ? '타 스테이션 비교' : '단독 부하'} accent="#56B4E9" />
              </div>
              <Card className="mt-4">
                <StationLoadPanel data={m.stationLoad} />
              </Card>
            </Section>

            {/* 2. 메뉴 & 면 */}
            <Section title="메뉴 & 면">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card title="메뉴별 투입 (상위)">
                  <BarChart items={m.menuBreakdown.map((x) => ({ label: x.menu_name, value: x.count }))} topN={10} />
                </Card>
                <Card title="면 종류별 소비">
                  <DonutChart items={m.noodleBreakdown} />
                </Card>
              </div>
            </Section>

            {/* 3. 시간 & 부하 */}
            <Section title="시간 & 부하">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card title="시간대별 투입 (KST)">
                  <TrendChart values={m.hourly.map((h) => h.inflow)} xLabels={m.hourly.map((h) => `${h.hour}시`)} color="#56B4E9" />
                </Card>
                <Card title={`동시 처리 부하 (최대 ${m.concurrent.peak})`}>
                  {m.concurrent.series.length > 1 ? (
                    <TrendChart values={m.concurrent.series.map((p) => p.activeCount)} xLabels={m.concurrent.series.map((p) => p.label.slice(-5))} color="#E69F00" area={false} peakIndex={peakIdx} />
                  ) : (
                    <div className="py-10 text-center text-sm text-text-secondary">표시할 추이가 부족합니다</div>
                  )}
                </Card>
              </div>
            </Section>

            {/* 4. 상세 (기본 접힘) */}
            <CollapsibleSection title="상세 지표">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <div className="mb-2 text-sm font-medium text-text-secondary">서빙시간 분포</div>
                  <Histogram buckets={m.serving.histogram} />
                  <div className="mt-2 text-xs text-text-secondary">
                    최소 {mmss(m.serving.minSec)} · 중앙 {mmss(m.serving.medianSec)} · 최대 {mmss(m.serving.maxSec)} · n={m.serving.count}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <StatCard label="워커 반응속도(평균)" value={m.pickupLatency.avgSec} format={mmss} caption={`중앙값 ${mmss(m.pickupLatency.medianSec)}`} />
                    <StatCard label="즉시완료 비율" value={m.forceComplete.ratioPct} format={(n) => `${Math.round(n)}%`} caption={`${m.forceComplete.forced}건 / 정상 ${m.forceComplete.normal}건`} accent="#DC2626" />
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-medium text-text-secondary">바구니 포트 사용</div>
                    <BarChart items={m.portUsage.map((p) => ({ label: `${p.port}번`, value: p.count }))} labelWidth={40} />
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <div className="pb-4 text-center text-xs text-text-secondary">
              집계 {m.generatedAt} · {m.totalEvents} 이벤트 · {m.daysCovered.length}일
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-text">{title}</h2>
      {children}
    </section>
  );
}

function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-white p-5 shadow-sm ${className}`}>
      {title && <div className="mb-3 text-sm font-semibold text-text-secondary">{title}</div>}
      {children}
    </div>
  );
}
