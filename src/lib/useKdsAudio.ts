'use client';

import { useEffect, useRef } from 'react';
import type { Card, CardStatus } from './types';
import { playClick, playNewCard, playTimerDone, playTimerStart, unlockAudio } from './sounds';

/** 브라우저 자동재생 정책: 첫 사용자 제스처에 오디오 컨텍스트를 깨운다 → 이후 도착음/경고음이 실제로 울림. */
export function useAudioUnlock(): void {
  useEffect(() => {
    const unlock = () => unlockAudio();
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);
}

/** 수정 6: 모든 버튼/선택 터치에 "톡". 문서 레벨 위임 리스너 1개로 전 버튼 커버. */
export function useClickSound(): void {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null;
      const btn = el?.closest('button');
      if (btn && !(btn as HTMLButtonElement).disabled) playClick();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);
}

/** 수정 5: 면 스테이션에서 새 카드(처음 보는 id) 등장 시 "띵". 최초/재접속 동기화 시엔 울리지 않음. */
export function useNewCardChime(cards: Card[]): void {
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(cards.map((c) => c.id));
    if (seen.current === null) {
      // 최초 동기화 — 시딩만 (소리 없음)
      seen.current = ids;
      return;
    }
    let hasNew = false;
    for (const id of ids) {
      if (!seen.current.has(id)) {
        hasNew = true;
        break;
      }
    }
    if (hasNew) playNewCard();
    seen.current = ids;
  }, [cards]);
}

/** 타이머 시작음: 카드가 active → in_progress 로 바뀌는 순간(워커 "시작" 탭) 1회. 최초/재접속 동기화 시엔 울리지 않음. */
export function useTimerStartChime(cards: Card[]): void {
  const prev = useRef<Map<string, CardStatus> | null>(null);
  useEffect(() => {
    const cur = new Map(cards.map((c) => [c.id, c.status]));
    if (prev.current === null) {
      prev.current = cur; // 최초 동기화 — 시딩만 (소리 없음)
      return;
    }
    let started = false;
    for (const c of cards) {
      if (c.status === 'in_progress' && prev.current.get(c.id) === 'active') {
        started = true;
        break;
      }
    }
    if (started) playTimerStart();
    prev.current = cur;
  }, [cards]);
}

/** 수정 7: 타이머 완료(completed && cook_time_sec!==-1) 카드가 남아있는 동안 완료음 반복. 전달되어 0건이면 정지. */
export function useTimerDoneAlarm(cards: Card[]): void {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const pending = cards.some((c) => c.status === 'completed' && c.cook_time_sec !== -1);

    if (pending && timerRef.current === null) {
      playTimerDone(); // 즉시 1회
      timerRef.current = setInterval(playTimerDone, 1200);
    } else if (!pending && timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [cards]);

  // 언마운트 시 정지
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);
}
