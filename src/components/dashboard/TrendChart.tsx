'use client';

import { motion } from 'framer-motion';

// 선/영역 추세 차트. 시간대별 투입(area) + 동시부하(line) 공용.
// 진입 시 선이 그려지고(area fade-in). 갱신 시엔 모양만 즉시 갱신(재드로잉 깜빡임 없음).
export default function TrendChart({
  values,
  color = '#56B4E9',
  area = true,
  height = 160,
  xLabels,
  peakIndex,
}: {
  values: number[];
  color?: string;
  area?: boolean;
  height?: number;
  xLabels?: string[];
  peakIndex?: number;
}) {
  const W = 600;
  const H = height;
  const padL = 26;
  const padR = 8;
  const padT = 12;
  const padB = 18;
  const n = values.length;
  const yMax = Math.max(1, ...values);
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const x = (i: number) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => padT + plotH - (v / yMax) * plotH;

  const linePts = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const areaPath =
    n > 1
      ? `M ${x(0)},${padT + plotH} L ${values.map((v, i) => `${x(i)},${y(v)}`).join(' L ')} L ${x(n - 1)},${padT + plotH} Z`
      : '';
  const labelStep = xLabels ? Math.max(1, Math.ceil(n / 6)) : 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <line x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH} stroke="#d9dde3" strokeWidth={1} />
      {area && n > 1 && (
        <motion.path
          d={areaPath}
          fill={color}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.12 }}
          transition={{ duration: 0.6, delay: 0.25 }}
        />
      )}
      {n > 1 && (
        <motion.polyline
          points={linePts}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
        />
      )}
      {peakIndex != null && values[peakIndex] != null && n > 0 && (
        <motion.circle
          cx={x(peakIndex)}
          cy={y(values[peakIndex])}
          r={4.5}
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, delay: 0.9 }}
        />
      )}
      <text x={padL - 4} y={padT + 8} textAnchor="end" fontSize={10} fill="#9ca3af">
        {Math.round(yMax)}
      </text>
      {xLabels &&
        xLabels.map((lab, i) =>
          i % labelStep === 0 ? (
            <text key={i} x={x(i)} y={H - 4} textAnchor="middle" fontSize={9} fill="#9ca3af">
              {lab}
            </text>
          ) : null,
        )}
    </svg>
  );
}
