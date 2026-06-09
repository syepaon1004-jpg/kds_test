'use client';

import type { SoundManifest, SoundType } from './types';

// Web Audio 합성 사운드 (기본음). 세 소리는 음높이·길이로 구분:
//  - playClick(): "톡"   — 모든 버튼/선택 터치 피드백 (짧고 낮음)
//  - playNewCard(): "띠링띠링" — 새 카드 도착 (밝은 2음 × 2회)
//  - playTimerDone(): 완료음 — 타이머 0 도달 경고 (880Hz, 반복 재생됨)
// 클릭음은 매우 자주 울리므로 AudioContext 를 하나만 공유 생성한다.
// ⚠ 브라우저 자동재생 정책: 사용자의 첫 제스처 전에는 소리가 나지 않는다 → unlockAudio() 로 깨운다.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// 첫 사용자 제스처 시 호출 — 컨텍스트 재개 + 무음 blip 으로 완전 unlock (iOS/Safari 포함).
export function unlockAudio(): void {
  const audio = getCtx();
  if (!audio) return;
  try {
    const osc = audio.createOscillator();
    const g = audio.createGain();
    g.gain.value = 0;
    osc.connect(g);
    g.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.01);
  } catch {
    // 무시
  }
}

// 단일 톤 비프.
function beep(opts: { freq: number; durationMs: number; type?: OscillatorType; gain?: number }): void {
  const audio = getCtx();
  if (!audio) return;
  const { freq, durationMs, type = 'sine', gain = 0.25 } = opts;
  const now = audio.currentTime;
  const dur = durationMs / 1000;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.connect(g);
  g.connect(audio.destination);
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

// ── 사용자 업로드 효과음 설정 (없으면 합성음 폴백) ──
let soundConfig: SoundManifest = {
  click: { hasCustom: false, version: 0 },
  newCard: { hasCustom: false, version: 0 },
  timerStart: { hasCustom: false, version: 0 },
  timerDone: { hasCustom: false, version: 0 },
};

// 커스텀 음원을 Web Audio 버퍼로 디코드해 캐시.
// iOS Safari 는 <audio>.play() 를 사용자 제스처 밖(소켓 이벤트)에서 막지만(NotAllowedError),
// 언락된 AudioContext 의 BufferSource 재생은 허용 → 아이패드에서도 동작한다.
const bufferCache = new Map<string, AudioBuffer | null>(); // null = 로딩중/실패 → 기본음 폴백

async function loadBuffer(type: SoundType, version: number): Promise<void> {
  const audio = getCtx();
  if (!audio) return;
  const key = `${type}:${version}`;
  if (bufferCache.has(key)) return; // 이미 로딩/완료
  bufferCache.set(key, null); // 로딩중 표시 (중복 fetch 방지)
  try {
    const res = await fetch(`/_sound/${type}?v=${version}`);
    const arr = await res.arrayBuffer();
    const buf = await audio.decodeAudioData(arr);
    bufferCache.set(key, buf);
  } catch {
    // 디코드/네트워크 실패 → null 유지 (기본음 폴백, 재시도 안 함)
  }
}

function playBuffer(buf: AudioBuffer): void {
  const audio = getCtx();
  if (!audio) return;
  try {
    const src = audio.createBufferSource();
    src.buffer = buf;
    src.connect(audio.destination);
    src.start();
  } catch {
    // 무시
  }
}

/** 서버 sounds:sync 수신 시 호출 (useKdsSocket 가 갱신). 커스텀 음원은 미리 디코드. */
export function setSoundConfig(manifest: SoundManifest): void {
  soundConfig = manifest;
  for (const type of Object.keys(manifest) as SoundType[]) {
    const c = manifest[type];
    if (c?.hasCustom) void loadBuffer(type, c.version);
  }
}

// 사용자 음원이 있으면 Web Audio 버퍼로 재생(아이패드 호환), 준비 전/실패 시 기본 합성음.
function playSound(type: SoundType, fallback: () => void): void {
  const c = soundConfig[type];
  if (c?.hasCustom) {
    const key = `${type}:${c.version}`;
    const buf = bufferCache.get(key);
    if (buf) {
      playBuffer(buf);
      return;
    }
    if (buf === undefined) void loadBuffer(type, c.version); // 첫 호출 → 로드 시작
    // 준비 전: 이번엔 기본음 (다음 호출부터 커스텀)
  }
  fallback();
}

// ── 기본 합성음 ──
function synthClick(): void {
  beep({ freq: 200, durationMs: 35, type: 'triangle', gain: 0.18 });
}
function synthNewCard(): void {
  if (!getCtx()) return;
  const ding = (delay: number) => {
    window.setTimeout(() => beep({ freq: 1175, durationMs: 90, gain: 0.3 }), delay); // D6
    window.setTimeout(() => beep({ freq: 1568, durationMs: 140, gain: 0.3 }), delay + 80); // G6
  };
  ding(0);
  ding(260);
}
// 타이머 시작음 — 상승 2음("삑↗"). 시작을 알리는 경쾌한 신호 (완료음과 구분).
function synthTimerStart(): void {
  if (!getCtx()) return;
  beep({ freq: 587, durationMs: 80, type: 'sine', gain: 0.28 }); // D5
  window.setTimeout(() => beep({ freq: 880, durationMs: 120, type: 'sine', gain: 0.28 }), 70); // A5 (상승)
}
function synthTimerDone(): void {
  beep({ freq: 880, durationMs: 320, type: 'sine', gain: 0.3 });
}

/** "톡" — 버튼 터치음 (사용자 음원 또는 기본) */
export function playClick(): void {
  playSound('click', synthClick);
}

/** 새 주문 도착음 (사용자 음원 또는 기본 "띠링띠링") */
export function playNewCard(): void {
  playSound('newCard', synthNewCard);
}

/** 타이머 시작음 (사용자 음원 또는 기본 상승 2음) */
export function playTimerStart(): void {
  playSound('timerStart', synthTimerStart);
}

/** 타이머 완료 경고음 — 반복 호출됨 (사용자 음원 또는 기본 880Hz) */
export function playTimerDone(): void {
  playSound('timerDone', synthTimerDone);
}
