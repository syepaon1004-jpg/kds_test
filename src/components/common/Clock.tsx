'use client';

import { useEffect, useState } from 'react';

const pad = (n: number) => String(n).padStart(2, '0');

// 현재 시각. SSR/첫 렌더에서는 자리표시자만 → 서버·클라이언트 첫 렌더 일치(하이드레이션 불일치 방지).
// 마운트 후 effect 에서 실제 시각 표시.
export default function Clock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="tabular-nums text-sm" suppressHydrationWarning>
      {time || '--:--:--'}
    </span>
  );
}
