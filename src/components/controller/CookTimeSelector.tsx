'use client';

import { COOK_TIME_OPTIONS, cookTimeLabel } from '@/lib/labels';

// 화면 상세 설계서 §3.4. 6개 박스, 1개만 선택(radio). 메뉴 선택 시 자동 채움.
export default function CookTimeSelector({
  value,
  onChange,
  autoFilled = false,
}: {
  value: number | null;
  onChange: (sec: number) => void;
  autoFilled?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold">조리시간</label>
        {autoFilled && <span className="text-xs text-active">레시피 자동 선택 ✓</span>}
      </div>
      <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {COOK_TIME_OPTIONS.map((sec) => {
          const isSel = value === sec;
          return (
            <button
              key={sec}
              onClick={() => onChange(sec)}
              className={`min-h-11 rounded-md border px-2 py-2 text-sm ${
                isSel
                  ? 'border-active bg-active-soft font-bold text-active'
                  : 'border-border bg-white text-text'
              }`}
            >
              {cookTimeLabel(sec)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
