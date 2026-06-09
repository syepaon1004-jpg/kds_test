'use client';

import { animate, useMotionValue, useTransform, type MotionValue } from 'framer-motion';
import { useEffect } from 'react';

// 숫자 카운트업. 값이 바뀌면(진입·갱신) 현재값→목표값으로 부드럽게 보간.
// 반환값은 MotionValue<string> — <motion.span>{값}</motion.span> 으로 렌더.
export function useCountUp(
  value: number,
  format: (n: number) => string = (n) => Math.round(n).toString(),
): MotionValue<string> {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (n) => format(n));
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.8, ease: 'easeOut' });
    return () => controls.stop();
  }, [value, mv]);
  return text;
}
