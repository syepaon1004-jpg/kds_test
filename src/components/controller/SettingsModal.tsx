'use client';

import { useRef } from 'react';
import type { SoundManifest, SoundType } from '@/lib/types';
import { playClick, playNewCard, playTimerStart, playTimerDone } from '@/lib/sounds';

const SOUNDS: { type: SoundType; label: string; desc: string; preview: () => void }[] = [
  { type: 'click', label: '버튼 터치음', desc: '모든 버튼 클릭 시', preview: playClick },
  { type: 'newCard', label: '새 주문 도착음', desc: '새 카드가 들어올 때', preview: playNewCard },
  { type: 'timerStart', label: '타이머 시작음', desc: '타이머를 시작할 때', preview: playTimerStart },
  { type: 'timerDone', label: '타이머 완료 경고음', desc: '면이 다 됐을 때 (반복)', preview: playTimerDone },
];

const MAX_BYTES = 5_000_000;

export default function SettingsModal({
  manifest,
  onUpload,
  onReset,
  onClose,
}: {
  manifest: SoundManifest;
  onUpload: (type: SoundType, file: File) => void;
  onReset: (type: SoundType) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 text-lg font-bold">효과음 설정</div>
        <p className="mb-4 text-sm text-text-secondary">
          오디오 파일을 올리면 해당 소리로 바뀌고 모든 기기에 즉시 적용됩니다. 올리지 않으면 기본음이
          사용됩니다. (짧은 음원 권장, 최대 5MB)
        </p>
        <div className="space-y-3">
          {SOUNDS.map((s) => (
            <SoundRow
              key={s.type}
              sound={s}
              hasCustom={manifest[s.type].hasCustom}
              onUpload={onUpload}
              onReset={onReset}
            />
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-6 min-h-11 w-full rounded-lg border border-border font-semibold"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

function SoundRow({
  sound,
  hasCustom,
  onUpload,
  onReset,
}: {
  sound: { type: SoundType; label: string; desc: string; preview: () => void };
  hasCustom: boolean;
  onUpload: (type: SoundType, file: File) => void;
  onReset: (type: SoundType) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      window.alert('오디오 파일만 올릴 수 있습니다.');
      return;
    }
    if (file.size > MAX_BYTES) {
      window.alert('파일이 너무 큽니다 (최대 5MB).');
      return;
    }
    onUpload(sound.type, file);
  };

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">{sound.label}</div>
          <div className="text-xs text-text-secondary">{sound.desc}</div>
        </div>
        <span
          className={`rounded px-2 py-0.5 text-xs font-semibold ${
            hasCustom ? 'bg-complete-soft text-complete' : 'bg-neutral-soft text-text-secondary'
          }`}
        >
          {hasCustom ? '사용자 음원' : '기본음'}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          onClick={sound.preview}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold"
        >
          미리듣기
        </button>
        <button
          onClick={() => inputRef.current?.click()}
          className="rounded-md bg-active px-3 py-1.5 text-sm font-semibold text-white"
        >
          파일 올리기
        </button>
        {hasCustom && (
          <button
            onClick={() => onReset(sound.type)}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-red-600"
          >
            기본음으로
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
