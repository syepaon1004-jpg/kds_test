// 공유 타입 계약. 설계문서 §3 (데이터 모델) + 서버 설계서 §3 (이벤트) / §7 (로그) 기준.
// "문서가 권위다" — 여기 정의를 서버/클라이언트가 동일하게 사용한다.

export type NoodleProcess = 'none' | 'wash' | 'cool' | 'torim';
export type CardStatus = 'active' | 'in_progress' | 'completed';

/** 면 종류(재료). 점장 화면 MenuSelector 탭 + 색상 강조 키 (메뉴데이터 정의서 v1.4 §7). */
export type NoodleType = '생면1.0' | '생면1.2' | '메밀면' | '우동면' | '쌀국수면' | '냉면';

/** 점장 화면이 사용하는 메뉴 템플릿 (설계문서 §3.1) */
export interface MenuTemplate {
  id: string;
  name: string;
  noodle_type: string; // "생면1.0", "쌀국수면" 등 — 재료(면 종류). 색상 강조 기준.
  default_cook_time_sec: number;
  default_process: NoodleProcess;
}

/** menu_data.json 의 menus[] 원본 레코드 (MenuTemplate 의 상위 집합) */
export interface MenuRecord extends MenuTemplate {
  recipe_num: number | null;
  category: string;
  active?: boolean; // v1.4: false 면 카드 생성 대상 제외 (데이터는 보존). 누락 시 활성 취급.
  _unverified?: string;
}

/** menu_data.json 파일 전체 형상 */
export interface MenuData {
  _meta: {
    version: string;
    created: string;
    source: string;
    scope: string;
    cook_time_options: number[];
    process_options: NoodleProcess[];
    unverified: string[];
  };
  cook_time_labels: Record<string, string>;
  process_labels: Record<NoodleProcess, string>;
  process_steps: Record<NoodleProcess, string[]>;
  menus: MenuRecord[];
}

/** 조리 카드 (설계문서 §3.2) */
export interface Card {
  id: string;
  order_number: string; // "#001"
  menu_name: string;
  noodle_type: string; // 재료(면 종류) — 색상 강조 기준
  cook_time_sec: number;
  noodle_process: NoodleProcess;
  lane: number; // 1~7, 서버 자동 배정
  row: number; // 1, 2, ...
  status: CardStatus;
  timer_remaining_sec: number | null; // cook_time_sec === -1 이면 null
  paused: boolean; // in_progress 타이머 일시중지 여부 (true면 서버가 감소 안 함)
  created_at: string; // ISO timestamp
}

// ── Socket.io payload (서버 설계서 §3) ──

export interface CardCreatePayload {
  menu_name: string;
  noodle_type: string;
  cook_time_sec: number;
  noodle_process: NoodleProcess;
}
export interface CardIdPayload {
  card_id: string;
}
export interface CardUpdatePayload {
  card_id: string;
  cook_time_sec?: number;
  noodle_process?: NoodleProcess;
}

export interface CardsSyncPayload {
  cards: Card[];
}
export interface MenusSyncPayload {
  menus: MenuTemplate[];
}

// ── 효과음 (사용자 업로드 / 기본음) ──
export type SoundType = 'click' | 'newCard' | 'timerDone';

/** 각 효과음의 현재 상태. hasCustom=false 면 기본 합성음 사용. version 은 캐시 무효화용. */
export type SoundManifest = Record<SoundType, { hasCustom: boolean; version: number }>;

export interface SoundUploadPayload {
  type: SoundType;
  mime: string;
  data: ArrayBuffer;
}
export interface SoundResetPayload {
  type: SoundType;
}
export interface SoundsSyncPayload {
  manifest: SoundManifest;
}

/** 서버 → 클라이언트 이벤트 */
export interface ServerToClientEvents {
  'cards:sync': (payload: CardsSyncPayload) => void;
  'menus:sync': (payload: MenusSyncPayload) => void;
  'sounds:sync': (payload: SoundsSyncPayload) => void;
  error: (payload: { message: string }) => void;
}

/** 클라이언트 → 서버 이벤트 (점장 + 워커) */
export interface ClientToServerEvents {
  'card:create': (payload: CardCreatePayload) => void;
  'card:delete': (payload: CardIdPayload) => void;
  'card:update': (payload: CardUpdatePayload) => void;
  'cards:reset': () => void;
  'card:start_timer': (payload: CardIdPayload) => void;
  'card:pause_timer': (payload: CardIdPayload) => void;
  'card:resume_timer': (payload: CardIdPayload) => void;
  'card:reset_timer': (payload: CardIdPayload) => void;
  'card:manual_complete': (payload: CardIdPayload) => void;
  'card:complete': (payload: CardIdPayload) => void;
  'card:force_complete': (payload: CardIdPayload) => void;
  'sound:upload': (payload: SoundUploadPayload) => void;
  'sound:reset': (payload: SoundResetPayload) => void;
}

/** 이벤트 로그 스키마 (서버 설계서 §7.1) */
export interface EventLog {
  timestamp: string; // ISO 8601
  event: string; // "card:create" 등
  source: 'controller' | 'station';
  payload: Record<string, unknown>;
  result?: {
    card_id?: string;
    order_number?: string;
    lane?: number;
    row?: number;
    status_before?: string;
    status_after?: string;
  };
  active_cards_count: number;
}
