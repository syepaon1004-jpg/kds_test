'use client';

import type { Card } from '@/lib/types';
import { cookTimeLabel, noodleTypeStyle, PROCESS_STEPS, STATUS_STYLES } from '@/lib/labels';
import { formatElapsed, formatMMSS } from '@/lib/format';
import { useNow } from '@/lib/useNow';
import { useLongPress } from '@/lib/useLongPress';
import PortDial from './PortDial';

interface WorkCardProps {
  card: Card;
  onStartTimer: (id: string) => void;
  onManualComplete: (id: string) => void;
  onComplete: (id: string) => void;
  onPauseTimer: (id: string) => void;
  onResumeTimer: (id: string) => void;
  onResetTimer: (id: string) => void;
  mini?: boolean;
  /** false 면 워커 액션 버튼 비활성(외형만 동일) — 점장 복제화면용 */
  interactive?: boolean;
  /** 제공되면 점장 삭제 오버레이 (모든 상태) */
  onDelete?: (card: Card) => void;
  /** 제공되면 점장 수정 오버레이 (active 카드만, 서버 §3.7) */
  onEdit?: (card: Card) => void;
  /** 제공되면 카드 롱프레스(꾹 누르기) → "즉시 완료" 팝업 (워커 전용) */
  onForceComplete?: (card: Card) => void;
  /** 제공되면 해면기 투입 포트 표식 다이얼 표시 (워커 전용). mini 미러는 선택된 번호만 표시. */
  onSetPort?: (id: string, port: number | null) => void;
}

// 화면 상세 설계서 §2.5 + 수정 1/7
export default function WorkCard({
  card,
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
}: WorkCardProps) {
  const now = useNow();
  const elapsed = formatElapsed((now - new Date(card.created_at).getTime()) / 1000);
  const s = STATUS_STYLES[card.status];
  const processSteps = PROCESS_STEPS[card.noodle_process];

  // 꾹 누르기 → "즉시 완료" 팝업 (onForceComplete 제공 시에만 활성 = 워커 화면)
  const { pressing, handlers } = useLongPress(() => onForceComplete?.(card));
  const longPressHandlers = onForceComplete ? handlers : {};
  const showPressOverlay = !!onForceComplete && pressing;

  // 수정 7: 타이머 메뉴(-1 아님)가 완료되면 헤더 붉은 점멸
  const blinking = card.status === 'completed' && card.cook_time_sec !== -1;
  const headerBg = blinking ? 'animate-blink-red' : s.solid;

  const showEdit = !!onEdit && card.status === 'active';
  const hasOverlay = !!onDelete || showEdit;

  return (
    <div
      {...longPressHandlers}
      className="relative select-none overflow-hidden rounded-lg border border-border bg-card"
    >
      {/* 롱프레스 시각 피드백 (100ms~): 카드 전체 살짝 어둡게 → 600ms 도달 시 모달 */}
      {showPressOverlay && (
        <div className="pointer-events-none absolute inset-0 z-20 rounded-lg bg-black/25" />
      )}

      {/* 점장 오버레이 (삭제/수정) — 복제화면 위에 떠 있는 점장 전용 컨트롤 */}
      {hasOverlay && (
        <div className="absolute right-1 top-1 z-10 flex gap-1">
          {onDelete && (
            <button
              onClick={() => onDelete(card)}
              title="삭제"
              className="rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-bold leading-none text-red-600 shadow-sm"
            >
              삭제
            </button>
          )}
          {showEdit && (
            <button
              onClick={() => onEdit!(card)}
              title="수정"
              className="rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-bold leading-none text-active shadow-sm"
            >
              수정
            </button>
          )}
        </div>
      )}

      {/* 헤더: 주문번호(좌) + 경과시간(우), 상태 색 (완료 타이머 카드는 붉은 점멸) */}
      <div
        className={`flex items-center justify-between px-3 text-white ${headerBg} ${
          mini ? 'py-1' : 'py-2'
        } ${hasOverlay ? 'pr-16' : ''}`}
      >
        <span className={`font-bold ${mini ? 'text-sm' : 'text-base'}`}>{card.order_number}</span>
        <span className={`tabular-nums ${mini ? 'text-[11px]' : 'text-sm'}`}>{elapsed}</span>
      </div>

      {/* 메뉴명 + 조리 스텝 (mini 는 축소) */}
      <div className={mini ? 'px-2 pb-1 pt-1' : 'px-3 pb-2 pt-2'}>
        <div className={`font-semibold ${mini ? 'text-xs leading-tight' : ''}`}>{card.menu_name}</div>
        {/* mini 미러: 선택된 투입 포트 번호만 읽기전용 배지로 표시 */}
        {mini && card.basket_port != null && (
          <div className="mt-0.5 inline-block rounded bg-text px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            포트 {card.basket_port}
          </div>
        )}
        <div className={`text-text-secondary ${mini ? 'mt-1 text-[10px] leading-tight' : 'mt-2 text-sm'}`}>
          <div className="font-bold text-text">면 삶기</div>
          {/* 재료(면 종류) — 같은 재료끼리 정해진 배경색/글자색으로 강조 */}
          <span
            className={`mt-0.5 inline-block rounded font-semibold ${
              mini ? 'px-1 py-0.5 text-[10px]' : 'px-1.5 py-0.5 text-sm'
            } ${noodleTypeStyle(card.noodle_type)}`}
          >
            {card.noodle_type} ({cookTimeLabel(card.cook_time_sec)})
          </span>
          {processSteps.length > 0 && (
            <ul className={mini ? 'mt-0.5' : 'mt-1 space-y-0.5'}>
              {processSteps.map((step, i) => (
                <li key={i}>· {step}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 해면기 투입 포트 다이얼 (워커 전용). 원형 1~6, 메모용. 롱프레스 제외는 PortDial 내부에서 처리 */}
      {!mini && onSetPort && (
        <div className="px-3 pb-1">
          <div className="mb-1 text-center text-[11px] font-semibold text-text-secondary">투입 포트</div>
          <PortDial value={card.basket_port} onChange={(p) => onSetPort(card.id, p)} />
        </div>
      )}

      {/* 상태별 액션 버튼 — 롱프레스 트리거 제외 (pointerdown 전파 차단, 화면설계서 §2.6) */}
      <div className={mini ? 'p-1' : 'p-2'} onPointerDown={(e) => e.stopPropagation()}>
        <ActionButton
          card={card}
          mini={mini}
          interactive={interactive}
          onStartTimer={onStartTimer}
          onManualComplete={onManualComplete}
          onComplete={onComplete}
          onPauseTimer={onPauseTimer}
          onResumeTimer={onResumeTimer}
          onResetTimer={onResetTimer}
        />
      </div>
    </div>
  );
}

// 화면 상세 설계서 §2.5 ActionButton 상태별 분기. interactive=false 면 외형만 보여주고 비활성.
function ActionButton({
  card,
  mini,
  interactive,
  onStartTimer,
  onManualComplete,
  onComplete,
  onPauseTimer,
  onResumeTimer,
  onResetTimer,
}: {
  card: Card;
  mini: boolean;
  interactive: boolean;
  onStartTimer: (id: string) => void;
  onManualComplete: (id: string) => void;
  onComplete: (id: string) => void;
  onPauseTimer: (id: string) => void;
  onResumeTimer: (id: string) => void;
  onResetTimer: (id: string) => void;
}) {
  const base = `w-full rounded-md px-2 font-bold text-white ${mini ? 'min-h-8 text-xs' : 'min-h-[44px]'}`;
  const ro = interactive ? '' : 'pointer-events-none';
  const tab = interactive ? undefined : -1;

  if (card.status === 'active') {
    const label = card.cook_time_sec === -1 ? '시작' : `${cookTimeLabel(card.cook_time_sec)} 시작`;
    return (
      <button
        className={`${base} bg-active ${ro}`}
        tabIndex={tab}
        onClick={() => interactive && onStartTimer(card.id)}
      >
        {label}
      </button>
    );
  }

  if (card.status === 'in_progress') {
    // 풀어질때까지(-1): 카운트다운 없이 수동 완료
    if (card.cook_time_sec === -1) {
      return (
        <button
          className={`${base} bg-progress ${ro}`}
          tabIndex={tab}
          onClick={() => interactive && onManualComplete(card.id)}
        >
          완료
        </button>
      );
    }
    // 일반 타이머: 카운트다운(표시 전용) + 진행 중엔 일시중지, 일시중지 중엔 초기화/재시작 2버튼.
    // 서버가 매초 timer_remaining_sec 갱신.
    const btn = `rounded-md font-bold text-white ${ro} ${mini ? 'min-h-7 text-[11px]' : 'min-h-9 text-sm'}`;
    return (
      <div className="space-y-1">
        <div
          className={`${base} flex items-center justify-center tabular-nums ${
            card.paused ? 'bg-neutral' : 'bg-progress'
          } ${mini ? '' : 'text-lg'}`}
        >
          {formatMMSS(card.timer_remaining_sec ?? 0)}
          {card.paused ? ' ⏸' : ''}
        </div>
        {card.paused ? (
          <div className="flex gap-1">
            <button
              className={`${btn} flex-1 whitespace-nowrap bg-neutral`}
              tabIndex={tab}
              onClick={() => interactive && onResetTimer(card.id)}
            >
              🔄 초기화
            </button>
            <button
              className={`${btn} flex-1 whitespace-nowrap bg-active`}
              tabIndex={tab}
              onClick={() => interactive && onResumeTimer(card.id)}
            >
              ▶ 재시작
            </button>
          </div>
        ) : (
          <button
            className={`${btn} w-full bg-neutral`}
            tabIndex={tab}
            onClick={() => interactive && onPauseTimer(card.id)}
          >
            ⏸ 일시중지
          </button>
        )}
      </div>
    );
  }

  // completed
  return (
    <button
      className={`${base} bg-complete ${ro}`}
      tabIndex={tab}
      onClick={() => interactive && onComplete(card.id)}
    >
      전달 &gt; 토핑
    </button>
  );
}
