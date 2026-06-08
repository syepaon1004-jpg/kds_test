'use client';

import { Fragment } from 'react';
import type { NoodleProcess } from '@/lib/types';
import { PROCESS_LABELS, PROCESS_ORDER } from '@/lib/labels';

// 화면 상세 설계서 §3.5. 누적 선택: 토렴 탭 → 세척+냉각+토렴 활성.
const RANK: Record<NoodleProcess, number> = { none: 0, wash: 1, cool: 2, torim: 3 };

function isActive(box: NoodleProcess, value: NoodleProcess | null): boolean {
  if (value === null) return false;
  // "없음"은 후처리 없음을 뜻하는 clear 선택 — 어떤 박스도 파란색으로 켜지 않는다 (§3.5: 없음 → 모두 회색)
  if (value === 'none' || box === 'none') return false;
  // none 이외 박스: 박스 랭크 ≤ 선택 랭크 (누적 활성)
  return RANK[box] <= RANK[value];
}

export default function ProcessSelector({
  value,
  onChange,
}: {
  value: NoodleProcess | null;
  onChange: (process: NoodleProcess) => void;
}) {
  return (
    <div>
      <label className="text-sm font-semibold">면처리 과정</label>
      <div className="mt-1 flex items-center gap-1 pt-5">
        {PROCESS_ORDER.map((p, i) => {
          const active = isActive(p, value);
          const arrowActive = i > 0 && active && isActive(PROCESS_ORDER[i - 1], value);
          return (
            <Fragment key={p}>
              {i > 0 && (
                <span className={arrowActive ? 'text-active' : 'text-neutral'}>→</span>
              )}
              <div className="relative flex-1">
                {/* 현재 선택 지점 표시 (§3.5) */}
                {value === p && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-active">
                    ▼ 선택
                  </span>
                )}
                <button
                  onClick={() => onChange(p)}
                  className={`min-h-11 w-full rounded-md border px-2 py-2 text-sm ${
                    active
                      ? 'border-active bg-active-soft font-bold text-active'
                      : 'border-border bg-white text-text'
                  }`}
                >
                  {PROCESS_LABELS[p]}
                </button>
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
