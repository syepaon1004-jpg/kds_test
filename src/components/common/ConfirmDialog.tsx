'use client';

// 수정 4: 삭제 등 되돌리기 어려운 동작 확인 팝업 (EditModal 오버레이 패턴 재사용).
export default function ConfirmDialog({
  message,
  detail,
  confirmLabel = '확인',
  confirmClass = 'bg-red-600',
  onConfirm,
  onCancel,
}: {
  message: string;
  detail?: string;
  confirmLabel?: string;
  confirmClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-lg font-bold">{message}</div>
        {detail && <div className="mt-2 text-sm text-text-secondary">{detail}</div>}
        <div className="mt-6 flex gap-2">
          <button
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-lg border border-border bg-white font-semibold"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className={`min-h-11 flex-1 rounded-lg font-semibold text-white ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
