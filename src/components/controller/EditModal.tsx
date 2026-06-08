'use client';

import { useState } from 'react';
import type { Card, NoodleProcess } from '@/lib/types';
import CookTimeSelector from './CookTimeSelector';
import ProcessSelector from './ProcessSelector';

// 화면 상세 설계서 §3.7 / §4.3. 현재 값 프리필 → 확인 시 card:update.
export default function EditModal({
  card,
  onConfirm,
  onCancel,
}: {
  card: Card;
  onConfirm: (cookTimeSec: number, noodleProcess: NoodleProcess) => void;
  onCancel: () => void;
}) {
  const [cookTimeSec, setCookTimeSec] = useState<number>(card.cook_time_sec);
  const [noodleProcess, setNoodleProcess] = useState<NoodleProcess>(card.noodle_process);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 text-lg font-bold">
          카드 수정 <span className="text-text-secondary">{card.order_number}</span>
        </div>
        <div className="space-y-4">
          <CookTimeSelector value={cookTimeSec} onChange={setCookTimeSec} />
          <ProcessSelector value={noodleProcess} onChange={setNoodleProcess} />
        </div>
        <div className="mt-6 flex gap-2">
          <button
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-lg border border-border bg-white font-semibold"
          >
            취소
          </button>
          <button
            onClick={() => onConfirm(cookTimeSec, noodleProcess)}
            className="min-h-11 flex-1 rounded-lg bg-active font-semibold text-white"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
