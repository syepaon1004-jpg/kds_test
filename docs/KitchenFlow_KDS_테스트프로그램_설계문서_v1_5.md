# KDS 테스트용 프로그램 설계 문서

**문서 버전**: v1.5
**작성일**: 2026-05-29 (v1.2) / 2026-06-01 (v1.3, v1.4) / 2026-06-02 (v1.5)
**참조 문서**: KitchenFlow_KDS_현장검증_테스트계획서 v3.2, KitchenFlow_KDS_테스트목업_annotated.pdf, KitchenFlow_KDS_통합마스터문서 v1.0, 2026-05-13_국수나무-메뉴-레시피북.md, KDS_테스트_메뉴데이터_정의서_v1_1.md, menu_data.json, KDS_테스트_화면_상세_설계서_v1_3.md, KDS_테스트_서버_설계서_v1_1.md

---

## 1. 개요

면 스테이션 현장 검증 테스트용 KDS 데모 프로그램. POS 연동 없이, 점장이 수동으로 카드를 투입하고 워커가 태블릿에서 카드를 보며 조리하는 구조.

**2개 화면**:

| 화면 | 사용자 | 기기 | URL |
|---|---|---|---|
| 카드 입력 | 점장 | POS 공유 기기 또는 별도 태블릿 | `http://<서버IP>:3000/controller` |
| 면 스테이션 KDS | 면 워커 | 해면기 위치 태블릿 | `http://<서버IP>:3000/station/noodle` |

---

## 2. 기술 스택

| 항목 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | Next.js + TypeScript | MVP와 동일 스택. 컴포넌트 재사용. |
| 스타일 | Tailwind CSS | MVP 디자인시스템 v5.3 기반 |
| 실시간 동기화 | **Socket.io (로컬 서버)** | 인터넷 불필요. 매장 WiFi만으로 동작. 점장 기기 → 서버 → 워커 태블릿 실시간 push. |
| 데이터 저장 | **서버 메모리 (in-memory)** | 테스트 기간 한정 사용. DB 설치 불필요. 서버 재시작 시 초기화. |
| 서버 | **노트북 1대 (Node.js)** | 매장 현장에 노트북 배치. 모든 기기가 같은 WiFi에서 노트북 IP로 접속. |

### 2.1 네트워크 구조

```
[노트북 — Node.js 서버]
  - Next.js (웹 화면 제공)
  - Socket.io (실시간 이벤트)
  - 카드 데이터 메모리 보관
       │
       │  같은 WiFi
       │
  ┌────┴────┐
  ▼         ▼
[점장 기기]  [면 스테이션 태블릿]
 /controller  /station/noodle
```

- 인터넷 불필요. 매장 WiFi 라우터에 연결된 로컬 네트워크만으로 동작.
- 노트북 IP 예: `192.168.0.10` → 태블릿 브라우저에서 `http://192.168.0.10:3000/station/noodle` 접속.

### 2.2 MVP 전환 시 변경 사항

테스트에서 검증된 UI 컴포넌트(카드, 타이머, 포트 바 등)는 MVP에서 그대로 재사용한다. 통신 레이어만 교체:

| | 테스트 | MVP |
|---|---|---|
| 실시간 동기화 | Socket.io (로컬) | Supabase Realtime (클라우드) |
| 데이터 저장 | 서버 메모리 | Supabase PostgreSQL |
| 카드 투입 | 점장 수동 | POS 연동 → card-generator 자동 |

교체 범위는 통신 어댑터 레이어뿐이며, 화면 컴포넌트는 변경 없음.

---

## 3. 데이터 모델

### 3.1 menus (미리 정의, 서버 메모리)

국수나무 메뉴별 기본 조리 설정. 레시피북 기반 수작업 입력. 서버 시작 시 JSON 파일에서 로드.

```typescript
interface MenuTemplate {
  id: string;                    // "menu_01"
  name: string;                  // "잔치국수"
  default_cook_time_sec: number; // 100 (1:40)
  default_process: NoodleProcess; // "torim"
}

type NoodleProcess = "none" | "wash" | "cool" | "torim";
// none: 없음
// wash: 세척까지
// cool: 세척+냉각까지
// torim: 세척+냉각+토렴까지
```

**메뉴 목록**: 전체 26개 메뉴는 `menu_data.json` 및 `KDS_테스트_메뉴데이터_정의서_v1_1.md` 참조. 주요 분포:

| 면 종류 | 조리시간 | process | 메뉴 수 | 색상 |
|---|---|---|---|---|
| 생면1.0 온면 | 100초 (1:40) | torim | 4 | 초록 |
| 생면1.0 찬면 | 150초 (2:30) | cool | 6 | 초록 |
| 생면1.2 온면 | 150초 (2:30) | torim | 4 | 주황 |
| 쫄비빔면 | 180초 (3:00) | wash | 1 | 주황 |
| 메밀면 | 150초 (2:30) | cool/wash | 2 | 보라 |
| 우동면 | 풀어질때까지 (-1) | none (⚠미확인) | 4 | 노랑 |
| 쌀국수면 | 50초 | none | 2 | 시안 |
| 냉면 | 60초 (1:00) | wash | 3 | 빨강 |

조리시간 선택지 (6종): **100(1:40), 150(2:30), 180(3:00), 60(1:00), 50(0:50), -1(풀어질때까지)**

**면 종류별 색상 강조**: 같은 면 종류는 동일한 배경색+텍스트 색상으로 표시되어, 워커가 텍스트를 읽지 않고도 면 종류를 색상만으로 즉시 인지할 수 있다. 색상 값은 `menu_data.json`의 `noodle_type_colors` 필드, 렌더링 로직은 화면 상세 설계서 §2.5 NoodleTypeBadge 참조.

### 3.2 cards (서버 메모리)

```typescript
interface Card {
  id: string;                    // uuid
  order_number: string;          // "#127"
  menu_name: string;             // "잔치국수"
  cook_time_sec: number;         // 100
  noodle_process: NoodleProcess; // "torim"
  lane: number;                  // 1~7, 자동 배정
  row: number;                   // 1, 2, ...
  status: "active" | "in_progress" | "completed";
  timer_remaining_sec: number | null;
  created_at: string;            // ISO timestamp
}

// 서버 메모리에 배열로 보관
let cards: Card[] = [];
```

**자동 배정 로직**:

```
1. 현재 active/in_progress/completed 카드의 (lane, row) 점유 상태 조회
2. row=1에서 빈 lane 있으면 → 가장 작은 빈 lane에 배정
3. row=1이 모두 차면 → row=2에서 가장 작은 빈 lane에 배정
4. 반복
```

### 3.3 Socket.io 이벤트

```typescript
// ── 서버 → 클라이언트 ──
"cards:sync"        // 전체 카드 목록 전송 (접속 시, 변경 시)
  payload: Card[]

"menus:sync"        // 메뉴 목록 전송 (접속 시, 컨트롤러용)
  payload: MenuTemplate[]

// ── 클라이언트(점장) → 서버 ──
"card:create"       // 카드 생성 요청
  payload: { menu_name, cook_time_sec, noodle_process }
  → 서버가 order_number 자동 생성 + lane/row 자동 배정 후 cards:sync broadcast

"card:delete"       // 카드 삭제
  payload: { card_id }

"card:update"       // 카드 수정 (조리시간/면처리 변경)
  payload: { card_id, cook_time_sec?, noodle_process? }

"cards:reset"       // 전체 카드 초기화 (테스트 리셋)

// ── 클라이언트(워커) → 서버 ──
"card:start_timer"  // 타이머 시작
  payload: { card_id }
  → status: active → in_progress, timer_remaining_sec 설정

"card:manual_complete"  // 수동 완료 (우동면 "풀어질때까지" 전용)
  payload: { card_id }
  → status: in_progress → completed

"card:complete"     // 전달 완료 (카드 제거)
  payload: { card_id }
  → cards 배열에서 제거 후 cards:sync broadcast

"card:force_complete"  // 즉시 완료 (long-press 후 모달 확인 시)
  payload: { card_id }
  → 상태 무관 카드 즉시 제거. 로그에 source_status 기록.
```

**타이머 처리**: 서버에서 1초마다 in_progress 카드의 timer_remaining_sec을 감소. 0 도달 시 status를 completed로 변경하고 broadcast. 클라이언트는 수신한 값을 표시만 함 (타이머 로직은 서버 단일 소스).

---

## 4. 화면 설계

### 4.1 카드 입력 (`/controller`)

**레이아웃**: 좌우 2분할

**좌측 패널 — 카드 생성**:

| 영역 | 컴포넌트 | 동작 |
|---|---|---|
| 메뉴 선택 | `MenuSelector` (`MenuTabBar` + `MenuGrid`) | 상단 6개 탭(면 종류별)으로 그룹 전환 + 그리드에서 카드 터치로 선택. POS 스타일. 메뉴명만 표시. |
| 조리시간 | `CookTimeSelector` | 6개 박스 (1:40/2:30/3:00/1:00/0:50/풀어질때까지). 1개만 선택. 메뉴 선택 시 `default_cook_time_sec`으로 자동 선택. |
| 면처리 과정 | `ProcessSelector` | 4단계 (없음/세척/냉각/토렴). 누적 선택 — 토렴 탭 시 세척+냉각+토렴 전체 활성. 메뉴 선택 시 `default_process`로 자동 선택. |
| 카드 생성 버튼 | `CreateCardButton` | 메뉴명 + 설정 요약 표시. 클릭 시 `card:create` 이벤트 전송 (lane 서버 자동 배정). |

**용어 주의**: 위의 "메뉴 선택 카드"(MenuCard)는 메뉴 선택용 UI로, 면 스테이션의 "워크 카드"(=액션 오더 카드)와는 완전히 다른 컴포넌트다.

**우측 패널 — 면 스테이션 현황 (미니뷰)**:

| 영역 | 컴포넌트 | 동작 |
|---|---|---|
| 포트 바 | `PortBarMini` | 1~7 포트 상태 색상 표시 |
| 카드 목록 | `CardListMini` | 미니 카드 7열. 각 카드에 삭제/수정 버튼. |

**삭제**: `card:delete` 이벤트 → 서버에서 카드 제거 → 면 스테이션에서 즉시 사라짐
**수정**: 모달 팝업 → 조리시간/면처리 과정 재선택 → `card:update` 이벤트

### 4.2 면 스테이션 KDS (`/station/noodle`)

**레이아웃**: 상단 헤더 → 포트 바 → 카드 그리드 (7열)

| 영역 | 컴포넌트 | 동작 |
|---|---|---|
| 스테이션 헤더 | `StationHeader` | 스테이션명, active 카드 수, 시각, 연결 상태 |
| 포트 바 | `PortBar` | 1~7 포트. 색상 = 해당 lane의 첫 번째 카드 상태. |
| 카드 그리드 | `CardGrid` | 7열. lane별로 카드 세로 배치. row=1이 상단, row=2가 하단. |
| 워크 카드 | `WorkCard` | 주문번호, 메뉴명, 조리 스텝 목록, 타이머/전달 버튼 |

**WorkCard 내부 구조**:

```
┌─────────────────────┐
│ #127       03:22    │ ← 헤더 (주문번호 + 경과시간, 상태 색상)
│ 잔치국수             │
├─────────────────────┤
│ 면 삶기              │ ← 섹션 라벨
│ ┌─────────────────┐ │ ← NoodleTypeBadge (색상 강조)
│ │ 생면1.0 (1:40)   │ │   bg+text = noodle_type_colors[type]
│ └─────────────────┘ │
│  · 면세척            │ ← ProcessSteps (기본 색상)
│  · 냉각              │
│  · 토렴              │ ← noodle_process에 따라 표시 범위 결정
├─────────────────────┤
│   [ 1:40 시작 ]     │ ← 타이머 버튼 (active)
│   [   0:47   ]      │ ← 카운트다운 (in_progress)
│   [ 전달 > 토핑 ]   │ ← 전달 버튼 (completed)
└─────────────────────┘
```

**카드 상태 전이**:

```
active ──[타이머 시작]──→ in_progress ──[타이머 종료]──→ completed ──[전달 탭]──→ 제거
```

- active → in_progress: 워커가 타이머 버튼 탭 → `card:start_timer` → 서버에서 상태 변경 + 타이머 시작
- in_progress: 서버가 매초 timer_remaining_sec 감소 → broadcast → 클라이언트 표시. 0 도달 시 알림음 + completed 전환.
- completed → 제거: 워커가 "전달 > 토핑" 탭 → `card:complete` → 서버에서 카드 제거.

**조리 스텝 표시 로직**:

`noodle_process` 값에 따라 표시되는 스텝이 결정된다:

| noodle_process | 표시 스텝 |
|---|---|
| none | (삶기 타이머만, 후처리 없음) |
| wash | 면세척 |
| cool | 면세척 → 냉각 |
| torim | 면세척 → 냉각 → 토렴 |

---

## 5. 컴포넌트 목록

| 컴포넌트 | 위치 | MVP 재사용 |
|---|---|---|
| `StationHeader` | 면 스테이션 | **재사용** |
| `PortBar` / `PortBarMini` | 면 스테이션 / 컨트롤러 | 테스트 전용 (MVP에서는 면 스테이션 특화 UI로 발전 가능) |
| `WorkCard` | 면 스테이션 | **재사용** (MVP WorkCard의 면 스테이션 버전) |
| `NoodleTypeBadge` | WorkCard 내부 | **재사용** (면 종류별 색상 강조 라벨) |
| `ProcessSteps` | WorkCard 내부 | **재사용** (면처리 스텝 목록) |
| `CardGrid` | 면 스테이션 | **재사용** |
| `TimerButton` | WorkCard 내부 | **재사용** |
| `ForceCompleteModal` | 면 스테이션 (전역) | **재사용** (long-press 즉시 완료 확인 팝업) |
| `MenuSelector` | 컨트롤러 | 테스트 전용 (MVP에서는 POS 연동이 대체) |
| `MenuTabBar` | MenuSelector 내부 | 테스트 전용 (면 종류별 6개 탭) |
| `MenuGrid` | MenuSelector 내부 | 테스트 전용 (POS 스타일 메뉴 카드 그리드) |
| `MenuCard` | MenuGrid 내부 | 테스트 전용 (메뉴 선택용 카드. 워크 카드와 다름) |
| `CookTimeSelector` | 컨트롤러 | 테스트 전용 |
| `ProcessSelector` | 컨트롤러 | 테스트 전용 |
| `CreateCardButton` | 컨트롤러 | 테스트 전용 |
| `CardListMini` | 컨트롤러 | 테스트 전용 |

---

## 6. 현장 세팅 절차

1. 노트북에 프로젝트 clone + `npm install` + `npm run dev`
2. 노트북과 태블릿을 같은 WiFi에 연결
3. 노트북 IP 확인 (`ipconfig` 또는 `ifconfig`)
4. 점장 기기 브라우저: `http://<IP>:3000/controller`
5. 면 스테이션 태블릿 브라우저: `http://<IP>:3000/station/noodle`
6. 연결 상태 확인 (헤더의 "온라인" 표시)
7. 테스트 주문 1~2건으로 동작 확인 후 본 테스트 시작

---

## 7. 제작하지 않는 것

- POS 연동 (점장 수동 투입으로 대체)
- card-generator 엔진 (메뉴 템플릿 + 점장 선택으로 대체)
- 다른 스테이션 (토핑/튀김/핫)
- 안테나 연결 (단일 스테이션)
- CommanderCard (지휘 카드 — 면 스테이션만 테스트)
- 오프라인 큐
- 설정 화면
- 완료 내역 뷰
- 주문번호는 서버가 순번 자동 생성 (#001, #002...). POS 실제 주문번호와 연동하지 않음.

---

## 변경 이력

| 버전 | 일자 | 내용 |
|---|---|---|
| v1.0 | 2026-05-29 | 초안 작성. Supabase Realtime 기반. |
| v1.1 | 2026-05-29 | 실시간 동기화를 Socket.io 로컬 서버 방식으로 변경. Supabase → 서버 메모리. 네트워크 구조 + 현장 세팅 절차 + MVP 전환 변경사항 추가. |
| v1.2 | 2026-05-29 | 조리시간 선택지를 레시피북 기준으로 수정 (1:30→1:40, 2:10→1:00, 0:40→0:50). 메뉴 테이블을 menu_data.json + 정의서 참조로 교체. 메뉴 26개 전수 반영. |
| v1.3 | 2026-06-01 | 면 종류별 색상 강조 기능 반영. 메뉴 분포 표에 색상 컬럼 추가, WorkCard 다이어그램에 NoodleTypeBadge 영역 명시, 컴포넌트 목록에 NoodleTypeBadge + ProcessSteps 추가. 참조 문서 업데이트 (정의서 v1.0→v1.1, 화면설계서 v1.0→v1.1, 계획서 v3.0→v3.2). |
| v1.4 | 2026-06-01 | Long-press 즉시 완료 기능 추가. `card:force_complete` 이벤트 신설, ForceCompleteModal 컴포넌트 추가. 참조 문서 업데이트 (서버설계서 v1.0→v1.1, 화면설계서 v1.1→v1.2). |
| v1.5 | 2026-06-02 | 점장용 메뉴 선택 방식을 검색 → POS 스타일 그리드로 변경. MenuSearch 제거, MenuSelector(MenuTabBar + MenuGrid + MenuCard) 추가. 컨트롤러 좌측 패널 표 갱신. 참조 문서 업데이트 (화면설계서 v1.2→v1.3). |
