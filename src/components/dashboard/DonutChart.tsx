'use client';

import { motion } from 'framer-motion';
import { NOODLE_TYPE_COLORS } from '@/lib/labels';
import type { NoodleCountItem } from '@/lib/analytics-types';

// 면 종류별 도넛. 색은 NOODLE_TYPE_COLORS(클라이언트 매핑). 세그먼트 fade-in stagger + 중앙 총합.
export default function DonutChart({
  items,
  centerUnit = '개',
}: {
  items: NoodleCountItem[];
  centerUnit?: string;
}) {
  const segs = items.map((it) => ({
    label: it.noodle_type,
    value: it.count,
    color: NOODLE_TYPE_COLORS[it.noodle_type as keyof typeof NOODLE_TYPE_COLORS]?.text ?? '#9CA3AF',
  }));
  const total = segs.reduce((s, x) => s + x.value, 0);
  const size = 176;
  const stroke = 26;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eceef1" strokeWidth={stroke} />
          {segs.map((s, i) => {
            const dash = total > 0 ? (s.value / total) * c : 0;
            const el = (
              <motion.circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }}
              />
            );
            offset += dash;
            return el;
          })}
        </g>
        <text x={size / 2} y={size / 2 - 2} textAnchor="middle" fontSize={28} fontWeight={700} fill="#1A1A1A">
          {total}
        </text>
        <text x={size / 2} y={size / 2 + 18} textAnchor="middle" fontSize={12} fill="#4B5563">
          {centerUnit}
        </text>
      </svg>
      <div className="space-y-1.5">
        {segs.length === 0 && <div className="text-sm text-text-secondary">데이터 없음</div>}
        {segs.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="min-w-16 text-text-secondary">{s.label}</span>
            <span className="font-semibold tabular-nums text-text">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
