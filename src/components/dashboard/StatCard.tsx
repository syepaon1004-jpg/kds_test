'use client';

import { motion } from 'framer-motion';
import { useCountUp } from './useCountUp';

// KPI 카드. 큰 숫자(카운트업) + 라벨 + 보조 캡션. 진입 시 fade/up.
export default function StatCard({
  label,
  value,
  format,
  caption,
  accent = '#1A1A1A',
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  caption?: string;
  accent?: string;
}) {
  const text = useCountUp(value, format);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="rounded-2xl border border-border bg-white p-5 shadow-sm"
    >
      <div className="text-sm font-medium text-text-secondary">{label}</div>
      <motion.div
        className="mt-1 text-3xl font-bold tabular-nums"
        style={{ color: accent }}
      >
        {text}
      </motion.div>
      {caption && <div className="mt-1 text-xs text-text-secondary">{caption}</div>}
    </motion.div>
  );
}
