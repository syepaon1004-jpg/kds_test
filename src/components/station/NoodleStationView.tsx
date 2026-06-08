import type { Card } from '@/lib/types';
import PortBar from './PortBar';
import CardGrid from './CardGrid';

interface Props {
  cards: Card[];
  /** 축소판 (점장 우측 복제용) */
  mini?: boolean;
  /** 워커 액션 버튼 동작 여부. 점장 복제에서는 false (외형만) */
  interactive?: boolean;
  onStartTimer?: (id: string) => void;
  onManualComplete?: (id: string) => void;
  onComplete?: (id: string) => void;
  onPauseTimer?: (id: string) => void;
  onResumeTimer?: (id: string) => void;
  onResetTimer?: (id: string) => void;
  /** 점장 오버레이 (제공 시 카드에 삭제/수정 버튼) */
  onDelete?: (card: Card) => void;
  onEdit?: (card: Card) => void;
  /** 워커 롱프레스 "즉시 완료" (제공 시 활성) */
  onForceComplete?: (card: Card) => void;
}

const noop = () => {};

// 면 스테이션 KDS 핵심 화면(PortBar + CardGrid). 면 스테이션 페이지와 점장 우측 복제가 공유하는 단일 소스.
export default function NoodleStationView({
  cards,
  mini = false,
  interactive = true,
  onStartTimer = noop,
  onManualComplete = noop,
  onComplete = noop,
  onPauseTimer = noop,
  onResumeTimer = noop,
  onResetTimer = noop,
  onDelete,
  onEdit,
  onForceComplete,
}: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PortBar cards={cards} mini={mini} />
      <CardGrid
        cards={cards}
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
    </div>
  );
}
