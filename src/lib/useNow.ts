'use client';

import { useEffect, useState } from 'react';

/** 매초 갱신되는 현재 시각(ms). 경과시간/시계 표시용 (클라이언트 표시 전용, 서버 타이머와 무관). */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
