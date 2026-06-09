'use client';

import { motion } from 'framer-motion';
import type { StationLoadPanelData } from '@/lib/analytics-types';

// 4개 스테이션 카드수 비교 + 면 부하 점유율 게이지. 핫/튀김/토핑=0 "데이터 없음".
export default function StationLoadPanel({ data }: { data: StationLoadPanelData }) {
  const max = Math.max(1, ...data.stations.map((s) => s.cardCount));
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <div className="mb-2 text-sm font-medium text-text-secondary">스테이션별 카드 수</div>
        <div className="space-y-2.5">
          {data.stations.map((s, i) => (
            <div key={s.station} className="flex items-center gap-2">
              <div className="w-10 shrink-0 text-sm font-semibold text-text">{s.station}</div>
              <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-neutral-soft">
                <motion.div
                  className="h-full rounded-md"
                  style={{ backgroundColor: s.station === '면' ? '#56B4E9' : '#cbd5e1' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(s.cardCount / max) * 100}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.06 }}
                />
                <div className="absolute inset-y-0 right-2 flex items-center gap-1.5 text-xs">
                  <span className="font-semibold tabular-nums text-text">{s.cardCount}</span>
                  {!s.hasData && <span className="text-text-secondary">데이터 없음</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center">
        <div className="text-sm font-medium text-text-secondary">면 스테이션 부하 점유율</div>
        <GaugeRing pct={data.loadSharePct} />
        <div className="mt-2 max-w-56 text-center text-xs text-text-secondary">
          {data.comparisonAvailable && data.noodleLoadRatio != null ? (
            <>
              타 스테이션 평균 대비 서빙시간{' '}
              <span className="font-semibold text-text">×{data.noodleLoadRatio}</span>
            </>
          ) : (
            <>단독 부하 — 비교 대상 없음 (핫·튀김·토핑 0)</>
          )}
        </div>
      </div>
    </div>
  );
}

function GaugeRing({ pct }: { pct: number }) {
  const size = 124;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mt-1">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eceef1" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#56B4E9"
        strokeWidth={stroke}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - (Math.min(100, Math.max(0, pct)) / 100) * c }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />
      <text x={size / 2} y={size / 2 + 7} textAnchor="middle" fontSize={22} fontWeight={700} fill="#1A1A1A">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}
