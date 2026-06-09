'use client';

import { motion } from 'framer-motion';

export interface BarItem {
  label: string;
  value: number;
  color?: string;
}

// 가로 막대. 메뉴별 투입 / 포트 사용 등에 재사용. 막대 width 0→값 stagger.
export default function BarChart({
  items,
  unit = '',
  topN,
  labelWidth = 96,
}: {
  items: BarItem[];
  unit?: string;
  topN?: number;
  labelWidth?: number;
}) {
  const data = topN ? items.slice(0, topN) : items;
  const peak = Math.max(1, ...data.map((d) => d.value));

  if (data.length === 0) {
    return <div className="py-6 text-center text-sm text-text-secondary">데이터 없음</div>;
  }
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={d.label} className="flex items-center gap-2">
          <div
            className="shrink-0 truncate text-right text-xs text-text-secondary"
            style={{ width: labelWidth }}
            title={d.label}
          >
            {d.label}
          </div>
          <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-neutral-soft">
            <motion.div
              className="h-full rounded-md"
              style={{ backgroundColor: d.color ?? '#56B4E9' }}
              initial={{ width: 0 }}
              animate={{ width: `${(d.value / peak) * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.04 }}
            />
            <div className="absolute inset-y-0 right-2 flex items-center text-xs font-semibold tabular-nums text-text">
              {d.value}
              {unit}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
