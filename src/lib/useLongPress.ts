'use client';

import { useRef, useState } from 'react';
import type { MouseEvent } from 'react';

// 꾹 누르기(롱프레스) 감지. 반환된 handlers 를 요소에 spread, pressing 으로 시각 피드백.
// - ms(기본 600) 이상 누르고 있으면 onLongPress 실행 (화면설계서 §2.6).
// - 누르기 시작 100ms 후부터 pressing=true → 카드 어두운 오버레이. 일찍 떼거나 이동(스크롤)하면 취소.
// - 롱프레스가 실행되면 뒤따르는 click 을 capture 단계에서 삼켜 밑의 버튼이 눌리지 않게 함.
export function useLongPress(onLongPress: () => void, ms = 600) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const [pressing, setPressing] = useState(false);

  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    setPressing(false);
  };

  const start = () => {
    clear();
    fired.current = false;
    pressTimer.current = setTimeout(() => setPressing(true), 100); // 시각 피드백 시작
    timer.current = setTimeout(() => {
      fired.current = true;
      clear(); // 모달이 뜨므로 오버레이 제거
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(50); // 가벼운 진동(가능한 경우) — 미지원 기기는 no-op
      }
      onLongPress();
    }, ms);
  };

  const handlers = {
    onPointerDown: start,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onPointerMove: clear,
    onContextMenu: (e: MouseEvent) => e.preventDefault(),
    onClickCapture: (e: MouseEvent) => {
      if (fired.current) {
        e.preventDefault();
        e.stopPropagation();
        fired.current = false;
      }
    },
  };

  return { pressing, handlers };
}
