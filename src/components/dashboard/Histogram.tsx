'use client';

import { motion } from 'framer-motion';
import type { HistogramBucket } from '@/lib/analytics-types';

// 세로 막대 분포(서빙시간 분포). 막대 height 0→값 stagger.
export default function Histogram({
  buckets,
  color = '#009E73',
}: {
  buckets: HistogramBucket[];
  color?: string;
}) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div>
      <div className="flex h-40 items-end gap-2">
        {buckets.map((b, i) => (
          <div key={b.label} className="flex flex-1 flex-col items-center justify-end">
            <div className="mb-1 text-xs font-semibold tabular-nums text-text">{b.count}</div>
            <motion.div
              className="w-full rounded-t-md"
              style={{ backgroundColor: color }}
              initial={{ height: 0 }}
              animate={{ height: `${(b.count / max) * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.05 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-2">
        {buckets.map((b) => (
          <div key={b.label} className="flex-1 text-center text-[10px] text-text-secondary">
            {b.label}
          </div>
        ))}
      </div>
    </div>
  );
}
