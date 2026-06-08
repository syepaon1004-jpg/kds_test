import type { Card, CardStatus } from '@/lib/types';
import { STATUS_STYLES } from '@/lib/labels';

// 화면 상세 설계서 §2.3. 7개 포트, 색 = 해당 lane 의 첫(최소 row) 카드 상태. 카드 있으면 ▼ 표시.
// mini=true 이면 컨트롤러 우측 현황용 축소판 (PortBarMini).
function laneFirstStatus(cards: Card[], lane: number): CardStatus | 'empty' {
  const inLane = cards.filter((c) => c.lane === lane);
  if (inLane.length === 0) return 'empty';
  const first = inLane.reduce((a, b) => (a.row <= b.row ? a : b));
  return first.status;
}

export default function PortBar({ cards, mini = false }: { cards: Card[]; mini?: boolean }) {
  const lanes = Array.from({ length: 7 }, (_, i) => i + 1);
  return (
    <div className={`flex shrink-0 gap-2 px-3 ${mini ? 'py-1' : 'py-2'}`}>
      {lanes.map((n) => {
        const st = laneFirstStatus(cards, n);
        const s = STATUS_STYLES[st];
        const has = st !== 'empty';
        return (
          <div key={n} className="relative flex-1">
            <div
              className={`flex items-center justify-center rounded-md border ${s.soft} ${s.border} ${
                mini ? 'h-6' : 'h-9'
              }`}
            >
              <span className={`font-bold ${s.text} ${mini ? 'text-sm' : 'text-lg'}`}>{n}</span>
            </div>
            {has && (
              <div
                className={`absolute -bottom-1.5 left-1/2 h-0 w-0 -translate-x-1/2 border-x-4 border-t-4 border-x-transparent ${s.triangle}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
