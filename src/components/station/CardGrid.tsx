'use client';

import type { Card } from '@/lib/types';
import { AnimatePresence, motion } from 'framer-motion';
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
  onSetPort?: (id: string, port: number | null) => void;
}

// 주문번호("#012")의 숫자 부분 = 생성 순서.
const seq = (c: Card) => Number(c.order_number.replace(/\D/g, '')) || 0;

// 면 스테이션 KDS 카드 영역. 6열 압축(reflow): 생성 순서대로 좌→우, 위→아래로 빈칸 없이 채우고,
// 카드가 완료/삭제되어 사라지면 뒤 카드들이 즉시 당겨진다. (고정 lane/row·포트바 방식 폐기)
// 애니메이션(framer-motion): 생성=fade/scale-in, 삭제=fade/scale-out, 당겨짐=layout(위치) 부드럽게.
// mode="popLayout" → 빠지는 카드를 레이아웃에서 즉시 빼 나머지가 곧바로 당겨지며 슬라이드.
// key=card.id 로 카드 정체성을 고정해 reflow 시에도 상태/표식이 올바른 카드를 따라간다.
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
  onSetPort,
}: CardGridProps) {
  const ordered = [...cards].sort((a, b) => seq(a) - seq(b));

  return (
    <div className={`min-h-0 flex-1 overflow-auto ${mini ? 'px-3 pb-1' : 'px-3 pb-3'}`}>
      {ordered.length === 0 && (
        <div
          className={`flex h-full items-center justify-center text-text-secondary ${mini ? 'text-sm' : ''}`}
        >
          주문을 기다리는 중...
        </div>
      )}
      <div className={`grid grid-cols-6 ${mini ? 'gap-1' : 'gap-2'}`}>
        {/* initial=false → 첫 렌더/재접속 시 기존 카드는 애니메이션 없이 표시. 이후 추가분만 enter 연출 */}
        <AnimatePresence mode="popLayout" initial={false}>
          {ordered.map((card) => (
            <motion.div
              key={card.id}
              layout="position"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ layout: { duration: 0.28, ease: 'easeOut' }, duration: 0.2 }}
              className="min-w-0"
            >
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
                onSetPort={onSetPort}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
