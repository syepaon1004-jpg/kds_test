'use client';

import type { Card } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/labels';
import { formatMMSS } from '@/lib/format';

// 화면 상세 설계서 §2.7. 롱프레스 → "즉시 완료" 확인 팝업.
// 일반 완료(초록 --complete)와 명확히 구분되는 destructive 빨강(#DC2626) 버튼.
// card=null 이면 표시하지 않음. 배경 탭 = 취소.
export default function ForceCompleteModal({
  card,
  onConfirm,
  onCancel,
}: {
  card: Card | null;
  onConfirm: (id: string) => void;
  onCancel: () => void;
}) {
  if (!card) return null;

  // 진행중일 때만 남은 시간 표시 (실수 방지). -1(풀어질때까지)는 timer_remaining_sec=null → 미표시.
  const showRemaining = card.status === 'in_progress' && card.timer_remaining_sec !== null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-lg font-bold leading-snug">
          {card.order_number} {card.menu_name}을(를)
          <br />
          즉시 완료하시겠습니까?
        </div>

        <div className="mt-3 space-y-1 text-sm text-text-secondary">
          <div>
            현재 상태:{' '}
            <span className="font-semibold text-text">{STATUS_LABELS[card.status]}</span>
          </div>
          {showRemaining && (
            <div>
              남은 시간:{' '}
              <span className="font-semibold tabular-nums text-text">
                {formatMMSS(card.timer_remaining_sec ?? 0)}
              </span>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-lg bg-neutral font-semibold text-white"
          >
            취소
          </button>
          <button
            onClick={() => onConfirm(card.id)}
            className="min-h-11 flex-1 rounded-lg font-semibold text-white"
            style={{ backgroundColor: '#DC2626' }}
          >
            즉시 완료
          </button>
        </div>
      </div>
    </div>
  );
}
