import type { Card } from '@/lib/types';
import WorkCard from './WorkCard';

interface CardGridProps {
  cards: Card[];
  onStartTimer: (id: string) => void;
  onManualComplete: (id: string) => void;
  onComplete: (id: string) => void;
  onPauseTimer: (id: string) => void;
  onResumeTimer: (id: string) => void;
  onResetTimer: (id: string) => void;
  mini?: boolean;
  interactive?: boolean;
  onDelete?: (card: Card) => void;
  onEdit?: (card: Card) => void;
  onForceComplete?: (card: Card) => void;
}

const LANES = [1, 2, 3, 4, 5, 6, 7];

// 화면 상세 설계서 §2.4 + 수정 2/3: ROW-MAJOR.
// 카드가 있는 row 만 오름차순 표시(빈 행은 화면에서 사라짐 → 아래 행 상승).
// 각 행은 lane 1~7 슬롯으로 그려 위쪽 포트(열)와 정렬 유지. 행 안의 빈 lane(삭제 자리)은 빈 슬롯.
export default function CardGrid({
  cards,
  onStartTimer,
  onManualComplete,
  onComplete,
  onPauseTimer,
  onResumeTimer,
  onResetTimer,
  mini = false,
  interactive = true,
  onDelete,
  onEdit,
  onForceComplete,
}: CardGridProps) {
  const rows = Array.from(new Set(cards.map((c) => c.row))).sort((a, b) => a - b);
  const cardAt = (row: number, lane: number) =>
    cards.find((c) => c.row === row && c.lane === lane) ?? null;

  return (
    <div
      className={`relative flex flex-1 flex-col overflow-auto ${mini ? 'gap-1 px-3 pb-1' : 'gap-2 px-3 pb-3'}`}
    >
      {cards.length === 0 && (
        <div
          className={`pointer-events-none absolute inset-0 flex items-center justify-center text-text-secondary ${
            mini ? 'text-sm' : ''
          }`}
        >
          주문을 기다리는 중...
        </div>
      )}
      {rows.map((row) => (
        <div key={row} className="flex items-stretch gap-2">
          {LANES.map((lane) => {
            const card = cardAt(row, lane);
            return (
              <div key={lane} className="min-w-0 flex-1">
                {card ? (
                  <WorkCard
                    card={card}
                    mini={mini}
                    interactive={interactive}
                    onStartTimer={onStartTimer}
                    onManualComplete={onManualComplete}
                    onComplete={onComplete}
                    onPauseTimer={onPauseTimer}
                    onResumeTimer={onResumeTimer}
                    onResetTimer={onResetTimer}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onForceComplete={onForceComplete}
                  />
                ) : (
                  <div
                    className={`h-full rounded-lg border-2 border-dashed border-border ${
                      mini ? 'min-h-12' : 'min-h-24'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
