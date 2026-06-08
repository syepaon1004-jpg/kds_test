// 정적 설계 상수 (menu_data.json 의 cook_time_labels / process_labels / process_steps 와 동일).
// 클라이언트 표시 전용 — 서버는 menus:sync(MenuTemplate[]) + cards:sync 만 보내므로 라벨 맵은 여기서 보유.
import type { CardStatus, NoodleProcess, NoodleType } from './types';

// 메뉴데이터 v1.4: 쌀국수면 50→40초로 이동하여 0:50 은 어떤 활성 메뉴에도 매핑되지 않음(dead).
// 정의서 v1.4 §6 권고대로 0:50 → 0:40 으로 교체 (박스 6개 유지).
export const COOK_TIME_OPTIONS: number[] = [100, 150, 180, 60, 40, -1];

export const COOK_TIME_LABELS: Record<number, string> = {
  100: '1:40',
  150: '2:30',
  180: '3:00',
  60: '1:00',
  40: '0:40',
  [-1]: '풀어질때까지',
};

export const PROCESS_ORDER: NoodleProcess[] = ['none', 'wash', 'cool', 'torim'];

export const PROCESS_LABELS: Record<NoodleProcess, string> = {
  none: '없음',
  wash: '세척',
  cool: '냉각',
  torim: '토렴',
};

export const PROCESS_STEPS: Record<NoodleProcess, string[]> = {
  none: [],
  wash: ['면세척'],
  cool: ['면세척', '냉각'],
  torim: ['면세척', '냉각', '토렴'],
};

export function cookTimeLabel(sec: number): string {
  return COOK_TIME_LABELS[sec] ?? `${sec}초`;
}

// 재료(면 종류)별 강조 색 (배경 + 글자). 같은 재료를 한눈에 묶어 보이게 함.
// menu_data.json 의 noodle_type 값과 키 일치. Tailwind 기본 팔레트(설정 불필요).
export const NOODLE_TYPE_STYLES: Record<string, string> = {
  '생면1.0': 'bg-amber-100 text-amber-900',
  '생면1.2': 'bg-rose-100 text-rose-900',
  메밀면: 'bg-stone-200 text-stone-800',
  우동면: 'bg-orange-100 text-orange-900',
  쌀국수면: 'bg-emerald-100 text-emerald-900',
  냉면: 'bg-indigo-100 text-indigo-900',
};

export function noodleTypeStyle(noodleType: string): string {
  return NOODLE_TYPE_STYLES[noodleType] ?? 'bg-neutral-soft text-text';
}

// 점장 화면 MenuSelector 의 탭/메뉴 카드 순서 (화면 상세 설계서 §3.3.1). 디폴트 선택 = 첫 항목 "생면1.0".
export const NOODLE_TYPES: NoodleType[] = ['생면1.0', '생면1.2', '메밀면', '우동면', '쌀국수면', '냉면'];

// menu_data.json 의 noodle_type_colors 미러 (정의서 v1.4 §7 / 화면설계서 §1.3). bg/text 는 hex.
// MenuSelector 전용 — 면 스테이션 WorkCard 는 기존 NOODLE_TYPE_STYLES(Tailwind) 그대로 사용한다(STEP3 불변).
export const NOODLE_TYPE_COLORS: Record<NoodleType, { bg: string; text: string }> = {
  '생면1.0': { bg: '#E8F5E9', text: '#2E7D32' },
  '생면1.2': { bg: '#FFF3E0', text: '#E65100' },
  메밀면: { bg: '#F3E5F5', text: '#7B1FA2' },
  우동면: { bg: '#FFF9C4', text: '#F57F17' },
  쌀국수면: { bg: '#E0F7FA', text: '#00838F' },
  냉면: { bg: '#FCE4EC', text: '#C62828' },
};

/** 카드 상태 → 한글 라벨 (ForceCompleteModal 표시용, 화면설계서 §2.7) */
export const STATUS_LABELS: Record<CardStatus, string> = {
  active: '대기',
  in_progress: '진행중',
  completed: '완료',
};

/** 상태 → Tailwind 색 클래스 (화면 상세 설계서 §1.2) */
export const STATUS_STYLES: Record<
  CardStatus | 'empty',
  { solid: string; soft: string; border: string; text: string; triangle: string }
> = {
  active: {
    solid: 'bg-active',
    soft: 'bg-active-soft',
    border: 'border-active',
    text: 'text-active',
    triangle: 'border-t-active',
  },
  in_progress: {
    solid: 'bg-progress',
    soft: 'bg-progress-soft',
    border: 'border-progress',
    text: 'text-progress',
    triangle: 'border-t-progress',
  },
  completed: {
    solid: 'bg-complete',
    soft: 'bg-complete-soft',
    border: 'border-complete',
    text: 'text-complete',
    triangle: 'border-t-complete',
  },
  empty: {
    solid: 'bg-neutral',
    soft: 'bg-neutral-soft',
    border: 'border-neutral',
    text: 'text-neutral',
    triangle: 'border-t-neutral',
  },
};
