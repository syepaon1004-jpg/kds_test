'use client';

import type { MenuTemplate, NoodleProcess } from '@/lib/types';
import { cookTimeLabel, PROCESS_LABELS } from '@/lib/labels';

// 화면 상세 설계서 §3.6. 메뉴 미선택 시 비활성. 요약 표시 후 card:create.
export default function CreateCardButton({
  selectedMenu,
  cookTimeSec,
  noodleProcess,
  onSubmit,
}: {
  selectedMenu: MenuTemplate | null;
  cookTimeSec: number | null;
  noodleProcess: NoodleProcess | null;
  onSubmit: () => void;
}) {
  const ready = !!selectedMenu && cookTimeSec !== null && noodleProcess !== null;

  return (
    <div>
      {ready && (
        <div className="mb-2 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-secondary">
          <span className="font-semibold text-text">{selectedMenu!.name}</span> ·{' '}
          {cookTimeLabel(cookTimeSec!)} · {PROCESS_LABELS[noodleProcess!]}
        </div>
      )}
      <button
        onClick={onSubmit}
        disabled={!ready}
        className={`min-h-12 w-full rounded-lg px-4 py-3 text-lg font-bold text-white ${
          ready ? 'bg-active' : 'cursor-not-allowed bg-neutral opacity-60'
        }`}
      >
        {ready ? '카드 생성' : '메뉴를 선택하세요'}
      </button>
    </div>
  );
}
