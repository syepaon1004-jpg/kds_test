# KDS 테스트 프로그램 — 화면 상세 설계서

**문서 버전**: v1.3
**작성일**: 2026-05-29 (v1.0) / 2026-06-01 (v1.1, v1.2) / 2026-06-02 (v1.3)
**참조 문서**: KDS_테스트프로그램_설계문서_v1_5.md, KDS_테스트_서버_설계서_v1_1.md, KDS_테스트목업_annotated.pdf, KDS_테스트_메뉴데이터_정의서_v1_1.md, menu_data.json

---

## 1. 공통

### 1.1 디자인 토큰

통합마스터문서 §5.1 Okabe-Ito 색맹 안전 팔레트 기반:

| 토큰 | 값 | 용도 |
|---|---|---|
| `--bg` | #F7F8FA | 페이지 배경 |
| `--card` | #F2F2F2 | 카드 배경 |
| `--border` | #D9DDE3 | 테두리 |
| `--text` | #1A1A1A | 기본 텍스트 |
| `--text-secondary` | #4B5563 | 보조 텍스트 |
| `--active` | #56B4E9 | active 상태 (파랑) |
| `--progress` | #E69F00 | in_progress 상태 (주황) |
| `--complete` | #009E73 | completed 상태 (초록) |
| `--neutral` | #9CA3AF | 비활성/빈 상태 |
| `--header-bg` | #1F2937 | 헤더 배경 (다크) |

### 1.2 상태-색상 매핑

모든 컴포넌트에서 동일하게 적용:

| 카드 상태 | 헤더 색상 | 버튼 색상 | 포트 바 색상 |
|---|---|---|---|
| active | `--active` | `--active` | `--active` 연하게 |
| in_progress | `--progress` | `--progress` | `--progress` 연하게 |
| completed | `--complete` | `--complete` | `--complete` 연하게 |
| empty | - | - | `--neutral` 연하게 |

### 1.3 면 종류별 색상 토큰

NoodleTypeBadge 렌더링에 사용. `menu_data.json`의 `noodle_type_colors`에서 동적으로 조회한다.

| noodle_type | bg | text | 색상 계열 |
|---|---|---|---|
| 생면1.0 | `#E8F5E9` | `#2E7D32` | 초록 |
| 생면1.2 | `#FFF3E0` | `#E65100` | 주황 |
| 메밀면 | `#F3E5F5` | `#7B1FA2` | 보라 |
| 우동면 | `#FFF9C4` | `#F57F17` | 노랑 |
| 쌀국수면 | `#E0F7FA` | `#00838F` | 시안 |
| 냉면 | `#FCE4EC` | `#C62828` | 빨강 |

목적: 워커가 텍스트를 읽지 않고도 면 종류를 색상만으로 즉시 인지. 같은 색이면 같은 면을 삶는다.

### 1.4 Socket.io 연결 상태

모든 페이지 공통. 헤더 우측에 표시.

| 상태 | 표시 |
|---|---|
| 연결됨 | 초록 원 + "온라인" |
| 연결 끊김 | 빨간 원 + "오프라인" |
| 재연결 중 | 주황 원 + "연결 중..." |

자동 재연결: Socket.io 기본 설정 사용 (지수 백오프). 재연결 시 `cards:sync`로 전체 상태 복구.

---

## 2. 면 스테이션 KDS (`/station/noodle`)

### 2.1 컴포넌트 트리

```
NoodleStationPage
├── StationHeader
│   ├── 스테이션명 ("면 스테이션")
│   ├── ActiveBadge (active 카드 수)
│   ├── Clock (현재 시각)
│   └── ConnectionStatus
├── PortBar
│   └── PortIndicator × 7
├── CardGrid
│   └── CardColumn × 7
│       └── WorkCard × N (같은 lane의 카드, row 순)
│           ├── CardHeader (주문번호 + 메뉴명 + 경과시간)
│           ├── NoodleTypeBadge (면 종류 + 조리시간, 색상 강조)
│           ├── ProcessSteps (면처리 스텝 목록)
│           └── ActionButton (타이머/완료/전달)
└── ForceCompleteModal (전역, 한 번에 하나만 표시)
```

### 2.2 StationHeader

| prop | type | 설명 |
|---|---|---|
| stationName | string | "면 스테이션" |
| activeCount | number | status가 active/in_progress/completed인 카드 총 수 |
| isConnected | boolean | Socket.io 연결 상태 |

높이 고정 44px. 배경 `--header-bg`.

### 2.3 PortBar

7개 PortIndicator를 가로 배치. 카드 영역 바로 위에 고정.

**PortIndicator**:

| prop | type | 설명 |
|---|---|---|
| portNumber | 1~7 | 표시 숫자 |
| status | CardStatus \| "empty" | 해당 lane의 row=1 카드 상태. 카드 없으면 "empty" |

높이 36px. 숫자 크게 (18pt bold). 배경색 = 상태 연한 색. 테두리 = 상태 색.
포트에 카드가 있으면 하단에 작은 삼각형(▼) 표시하여 카드와 시각적 연결.

### 2.4 CardGrid + CardColumn

| prop | type | 설명 |
|---|---|---|
| cards | Card[] | 전체 카드 배열 |

**렌더링 로직**:
1. cards를 lane별로 그룹핑: `Map<lane, Card[]>` (row 오름차순 정렬)
2. 7개 CardColumn 렌더링 (lane 1~7)
3. 각 CardColumn 내에서 카드를 세로로 배치 (row=1이 위)
4. 카드 없는 lane은 빈 점선 영역 표시

### 2.5 WorkCard

| prop | type | 설명 |
|---|---|---|
| card | Card | 카드 데이터 |
| onStartTimer | (id) => void | 타이머 시작 |
| onManualComplete | (id) => void | 수동 완료 (우동용) |
| onComplete | (id) => void | 전달 완료 |
| onForceComplete | (id) => void | 즉시 완료 (long-press 후 팝업 확인 시 호출) |

**내부 구조**:

```
┌─────────────────────────┐
│ [CardHeader]             │  ← 상태 색상 배경
│  #001         01:15      │     주문번호(좌) + 경과시간(우)
│  잔치국수                 │     메뉴명
├─────────────────────────┤
│ 면 삶기                   │  ← 섹션 라벨
│ ┌─────────────────────┐  │  ← NoodleTypeBadge (색상 강조)
│ │ 생면1.0 (1:40)       │  │     bg = noodle_type_colors[type].bg
│ └─────────────────────┘  │     text = noodle_type_colors[type].text
│  · 면세척                 │  ← ProcessSteps (기본 텍스트 색)
│  · 냉각                   │
│  · 토렴                   │
├─────────────────────────┤
│ [ActionButton]           │
│  상태별 다른 버튼 표시     │
└─────────────────────────┘
```

**색상 강조 영역**: `noodle_type + cook_time` 라벨만 색상 강조 대상이다 (NoodleTypeBadge). 면처리 스텝은 기본 색상.

**FlowSteps 렌더링 로직**:

```typescript
function getNoodleBadge(card: Card): { label: string, bg: string, text: string } {
  const cookLabel = cookTimeLabels[card.cook_time_sec] || `${card.cook_time_sec}초`;
  const colors = noodleTypeColors[card.noodle_type];  // menu_data.json
  return {
    label: `${card.noodle_type} (${cookLabel})`,  // 예: "생면1.0 (1:40)"
    bg: colors.bg,
    text: colors.text,
  };
}

function getProcessSteps(card: Card): string[] {
  return processStepsMap[card.noodle_process];  // 예: ["면세척", "냉각", "토렴"]
}
```

**NoodleTypeBadge 컴포넌트**:

| prop | type | 설명 |
|---|---|---|
| noodleType | string | "생면1.0" 등 |
| cookTimeSec | number | 조리시간 (초) |

- 둥근 사각형 배경 (radius 3px, padding 4px 8px)
- 배경색/텍스트색을 menu_data.json의 `noodle_type_colors`에서 조회
- 텍스트: `{noodle_type} ({cook_time_label})`
- 카드 폭에 맞춰 가로 스트레치

**ActionButton 상태별**:

| card.status | cook_time_sec | 버튼 표시 | 색상 | 탭 동작 |
|---|---|---|---|---|
| active | > 0 | "{시간} 시작" (예: "1:40 시작") | `--active` | card:start_timer |
| active | -1 | "시작" | `--active` | card:start_timer |
| in_progress | > 0 | 카운트다운 표시 (예: "0:47") | `--progress` | 탭 불가 |
| in_progress | -1 | "완료" | `--progress` | card:manual_complete |
| completed | - | "전달 > 토핑" | `--complete` | card:complete |

**경과 시간 표시**: card.created_at으로부터 현재까지의 경과 시간. 클라이언트에서 매초 계산. 형식: "MM:SS".

**터치 영역**: ActionButton 최소 높이 44px (모바일 터치 가이드라인). 주방 장갑 착용 고려하여 넉넉하게.

### 2.6 Long-press 즉시 완료

WorkCard 전체를 길게 누르면 "즉시 완료" 팝업이 나타난다. 워커가 타이머를 기다리지 않고 카드를 즉시 종료해야 할 때 사용한다 (면이 예상보다 빨리 익은 경우, 잘못 시작한 카드 등).

**인터랙션 명세**:

| 항목 | 값 |
|---|---|
| 트리거 영역 | WorkCard 전체 (헤더 + 본문). ActionButton 영역은 제외 (오작동 방지). |
| Long-press 시간 | 600ms |
| 시각 피드백 | 누르기 시작 후 100ms부터 카드 전체에 살짝 어두운 오버레이. 600ms 도달 시 가벼운 진동(가능한 경우) + ForceCompleteModal 표시. |
| 취소 | 600ms 도달 전 손가락 떼면 취소. 시각 피드백 제거. |
| 상태 무관 | active / in_progress / completed 모두에서 동작. |

**구현 참고**:
- `onPointerDown` 시 타이머 설정 (600ms 후 모달 오픈)
- `onPointerUp` / `onPointerLeave` / `onPointerCancel` 시 타이머 해제
- ActionButton에는 `event.stopPropagation()` 또는 별도 영역으로 분리하여 long-press 트리거 제외

### 2.7 ForceCompleteModal

Long-press가 완료되면 표시되는 확인 팝업.

| prop | type | 설명 |
|---|---|---|
| card | Card \| null | 표시할 카드. null이면 모달 비표시. |
| onConfirm | (id) => void | "즉시 완료" 탭 → onForceComplete 호출 |
| onCancel | () => void | "취소" 탭 또는 배경 탭 |

**모달 내용**:

```
┌─────────────────────────────────┐
│                                 │
│   #001 잔치국수을(를)            │
│   즉시 완료하시겠습니까?         │
│                                 │
│   현재 상태: 진행중              │
│   남은 시간: 0:47                │
│                                 │
│   ┌──────────┐  ┌──────────┐    │
│   │  취소     │  │  즉시 완료 │   │
│   └──────────┘  └──────────┘    │
│                                 │
└─────────────────────────────────┘
```

**필드 표시**:
- 주문번호 + 메뉴명 (확인용)
- 현재 상태 라벨 ("대기", "진행중", "완료")
- 진행중일 경우 남은 시간 추가 표시 (실수 방지)

**버튼**:
- 취소: 회색 (`--neutral`). 모달 닫기.
- 즉시 완료: 빨간색 (`#DC2626`). `card:force_complete` 이벤트 전송. 일반 완료(`--complete`)와 색상 구분하여 destructive action임을 시각적으로 표시.

**배경 탭으로 닫기**: 모달 외부 영역 탭 시 취소와 동일하게 닫힘.

### 2.8 알림음

- `cards:sync` 수신 시 이전 카드 상태와 비교
- 특정 카드가 `in_progress → completed`로 변경됐으면 알림음 재생
- Web Audio API 또는 `<audio>` 태그 사용

---

## 3. 카드 입력 (`/controller`)

### 3.1 컴포넌트 트리

```
ControllerPage
├── ControllerHeader
│   ├── 타이틀 ("KitchenFlow — 카드 입력")
│   ├── Clock
│   └── ConnectionStatus
├── LeftPanel (카드 생성)
│   ├── MenuSelector
│   │   ├── MenuTabBar (면 종류별 6개 탭)
│   │   └── MenuGrid
│   │       └── MenuCard × N (선택된 탭의 메뉴 카드들)
│   ├── CookTimeSelector
│   ├── ProcessSelector
│   ├── CardSummary
│   └── CreateCardButton
└── RightPanel (현황)
    ├── PortBarMini
    └── CardListMini
        └── MiniCard × N
            └── ActionButtons (삭제/수정)
```

### 3.2 LeftPanel 상태 관리

```typescript
interface ControllerState {
  selectedNoodleType: NoodleType;       // 현재 선택된 탭 (기본: "생면1.0")
  selectedMenu: MenuTemplate | null;
  cookTimeSec: number | null;           // 선택된 조리시간
  noodleProcess: NoodleProcess | null;  // 선택된 면처리
}
```

**플로우**:
1. 초기: selectedNoodleType="생면1.0", selectedMenu=null, cookTimeSec=null, noodleProcess=null
2. 사용자가 탭 변경 → selectedNoodleType 변경 → 그리드가 해당 면 종류 메뉴만 표시. selectedMenu는 null로 리셋.
3. 메뉴 카드 탭 → selectedMenu 설정 + cookTimeSec/noodleProcess 자동 채움 (default값)
4. 점장이 조리시간/면처리 수동 변경 가능
5. "카드 생성" 탭 → card:create 전송 → 상태 초기화 (selectedMenu만 null로, 탭은 유지)

### 3.3 MenuSelector

검색 기반 선택 대신 POS 스타일 그리드를 사용한다. 메뉴를 면 종류로 미리 분류해 두고, 점장이 탭으로 그룹을 전환한 뒤 카드를 터치해 선택한다. 검색 입력의 인지 부하를 제거하고, 메뉴를 시각적으로 즉시 인지할 수 있게 한다.

**용어 주의**: 본 섹션의 "메뉴 카드"는 메뉴 선택용 UI 요소이며, 면 스테이션의 "워크 카드"(=액션 오더 카드)와는 다른 컴포넌트다.

#### 3.3.1 MenuTabBar

| prop | type | 설명 |
|---|---|---|
| tabs | NoodleType[] | ["생면1.0", "생면1.2", "메밀면", "우동면", "쌀국수면", "냉면"] |
| menuCounts | Record<NoodleType, number> | 각 면 종류별 메뉴 수 |
| selected | NoodleType | 현재 선택된 탭 |
| onChange | (type) => void | 탭 변경 콜백 |

**레이아웃**: 좌측 패널 상단. 6개 탭 가로 균등 배치.

**선택된 탭**:
- 배경: 해당 면 종류 `noodle_type_colors[type].bg` (연한 색)
- 테두리: `noodle_type_colors[type].text` (진한 색, 2px)
- 텍스트: `noodle_type_colors[type].text`

**미선택 탭**:
- 배경: 흰색
- 테두리: `--border` (1px)
- 텍스트: `--text-secondary`

**탭 내용**: 면 종류명 + 메뉴 개수 (예: "생면1.0\n10")

#### 3.3.2 MenuGrid

| prop | type | 설명 |
|---|---|---|
| menus | MenuTemplate[] | 현재 선택된 탭의 메뉴 목록 (이미 필터링됨) |
| selectedMenuId | string \| null | 선택된 메뉴의 id |
| onSelect | (menu) => void | 메뉴 선택 콜백 |

**레이아웃**: 4열 그리드 (gap 6px). 행 수는 메뉴 개수에 따라 자동 (10개면 3행, 5개면 2행 등).

**필터링**: 클라이언트 측에서 menus.filter(m => m.noodle_type === selectedNoodleType)로 미리 필터링한 후 prop으로 전달.

#### 3.3.3 MenuCard

| prop | type | 설명 |
|---|---|---|
| menu | MenuTemplate | 메뉴 데이터 |
| selected | boolean | 선택 상태 |
| onTap | () => void | 탭 콜백 |

**표시 내용**: 메뉴명만 (예: "잔치국수"). 조리시간/면처리는 표시 안 함. 카드 폭에 맞춰 자동 줄바꿈 (예: "김치듬뿍\n국수").

**미선택**:
- 배경: `noodle_type_colors[noodle_type].bg` (연한 색)
- 테두리: 더 진한 톤 (1px)
- 텍스트: `noodle_type_colors[noodle_type].text`

**선택**:
- 배경: `noodle_type_colors[noodle_type].text` (진한 색, 반전)
- 테두리: 동일 색 (2px)
- 텍스트: 흰색 + bold
- 우상단 작은 체크 표시 (✓)

**크기**: 최소 높이 46px (터치 타깃 확보). 가로는 그리드 폭/4.

### 3.4 CookTimeSelector

| prop | type | 설명 |
|---|---|---|
| value | number \| null | 현재 선택된 조리시간 (sec) |
| onChange | (sec) => void | 변경 콜백 |

6개 박스 가로 배치:

| 표시 | sec 값 |
|---|---|
| 1:40 | 100 |
| 2:30 | 150 |
| 3:00 | 180 |
| 1:00 | 60 |
| 0:50 | 50 |
| 풀어질때까지 | -1 |

- 선택된 박스: 파란 배경 + 파란 테두리 + 볼드
- 미선택: 흰 배경 + 회색 테두리
- 1개만 선택 가능 (radio)
- 우측 상단에 "레시피 자동 선택 ✓" 텍스트 (메뉴 선택으로 자동 채워진 경우)

### 3.5 ProcessSelector

| prop | type | 설명 |
|---|---|---|
| value | NoodleProcess \| null | 현재 선택된 면처리 |
| onChange | (process) => void | 변경 콜백 |

4개 박스 가로 배치 + 화살표 연결:

```
[없음] → [세척] → [냉각] → [토렴]
```

**누적 선택 로직**:
- "토렴" 탭 → value = "torim" → 세척+냉각+토렴 모두 파란색 활성
- "냉각" 탭 → value = "cool" → 세척+냉각 파란색, 토렴 회색
- "세척" 탭 → value = "wash" → 세척만 파란색
- "없음" 탭 → value = "none" → 모두 회색

**시각적 표현**:
- 활성 박스: 파란 배경 + 파란 테두리
- 비활성 박스: 흰 배경 + 회색 테두리
- 활성 구간의 화살표: 파란색
- 비활성 구간의 화살표: 회색
- 현재 선택 지점: 박스 위에 "▼ 선택" 표시

### 3.6 CreateCardButton

| prop | type | 설명 |
|---|---|---|
| selectedMenu | MenuTemplate \| null | 선택된 메뉴 |
| cookTimeSec | number \| null | 선택된 조리시간 |
| noodleProcess | NoodleProcess \| null | 선택된 면처리 |
| onSubmit | () => void | 카드 생성 실행 |

- 메뉴 미선택 시: 비활성 (회색), 탭 불가
- 메뉴 선택됨: 활성 (파란색), "카드 생성" + 메뉴명 요약 표시
- 탭 시: card:create 이벤트 전송 → 좌측 패널 초기화 (searchQuery 비우기, 선택 해제)

### 3.7 RightPanel — CardListMini

| prop | type | 설명 |
|---|---|---|
| cards | Card[] | 전체 카드 |
| onDelete | (id) => void | 삭제 콜백 |
| onUpdate | (id, fields) => void | 수정 콜백 |

7열 미니 레이아웃. PortBarMini (축소 포트 바) + MiniCard 배치.

**MiniCard**: WorkCard의 축소 버전. 하단에 "삭제" (빨간) + "수정" (파란) 버튼.

**수정 플로우**:
1. "수정" 탭 → 모달 팝업
2. 모달에 CookTimeSelector + ProcessSelector 표시 (현재 값 프리필)
3. "확인" 탭 → card:update 이벤트 → 모달 닫기

---

## 4. 인터랙션 시나리오

### 4.1 정상 플로우 (잔치국수)

```
[점장]                           [서버]                        [워커 태블릿]
  │                                │                               │
  │ "생면1.0" 탭 선택 (이미 디폴트)
  │ → 메뉴 그리드에서 "잔치국수" 카드 탭
  │ (자동: 1:40, torim)           │                               │
  │                                │                               │
  │ "카드 생성" 탭                  │                               │
  │──card:create──────────────────→│                               │
  │                                │ lane/row 배정                  │
  │                                │ card 생성                      │
  │                                │──cards:sync──────────────────→│
  │←──cards:sync───────────────────│                               │
  │                                │                    카드 표시 (active, 파랑)
  │                                │                               │
  │                                │                    워커: "1:40 시작" 탭
  │                                │←──card:start_timer────────────│
  │                                │ status → in_progress          │
  │                                │──cards:sync──────────────────→│
  │                                │                    카운트다운 표시 (주황)
  │                                │                               │
  │                                │ ... 매초 timer_remaining 감소 ...
  │                                │                               │
  │                                │ timer → 0                     │
  │                                │ status → completed            │
  │                                │──cards:sync──────────────────→│
  │                                │                    알림음 🔔
  │                                │                    "전달 > 토핑" 표시 (초록)
  │                                │                               │
  │                                │                    워커: "전달 > 토핑" 탭
  │                                │←──card:complete───────────────│
  │                                │ card 제거                     │
  │                                │──cards:sync──────────────────→│
  │←──cards:sync───────────────────│                    카드 사라짐
```

### 4.2 우동면 (풀어질때까지)

```
점장: 국수나무 우동 선택 (자동: -1, none)
→ card:create
→ 워커 태블릿에 카드 표시. 버튼: "시작"
→ 워커: "시작" 탭 → card:start_timer
→ status: in_progress. 카운트다운 없음. 버튼: "완료"
→ 워커가 면이 풀어졌다고 판단 → "완료" 탭 → card:manual_complete
→ status: completed. 버튼: "전달 > 토핑"
→ 워커: "전달 > 토핑" 탭 → card:complete → 카드 제거
```

### 4.3 점장 카드 수정

```
점장: 우측 현황에서 MiniCard의 "수정" 탭
→ 모달: CookTimeSelector + ProcessSelector (현재 값 프리필)
→ 점장: 조리시간 변경 (예: 1:40 → 2:30)
→ "확인" 탭 → card:update → 카드 업데이트 → 워커 태블릿 반영
```

### 4.4 워커 즉시 완료 (long-press)

```
[워커]                              [서버]
  │                                   │
  │ WorkCard를 길게 누름 (600ms)
  │ → ForceCompleteModal 표시
  │
  │ 모달에서 "즉시 완료" 탭
  │──card:force_complete──────────────→│
  │                                   │ source_status 기록 (active/in_progress/completed)
  │                                   │ store.remove(card_id)
  │                                   │ 이벤트 로그(NDJSON) 기록
  │←──cards:sync─────────────────────│
  │
  │ 카드 사라짐 + 모달 닫힘
```

대안 플로우 — 취소: 모달에서 "취소" 탭 또는 배경 탭 → 모달만 닫힘. 서버 호출 없음.

---

## 5. 엣지 케이스 (UI)

| 상황 | 처리 |
|---|---|
| 탭 전환 시 선택 유지 여부 | 탭 전환 시 selectedMenu는 null로 리셋. 다른 탭의 메뉴를 선택하려면 새로 탭해야 함. |
| 선택된 메뉴 카드의 탭을 다시 누름 | 탭만 표시 변경 없음. selectedMenu 유지. (현재 탭과 동일하면 no-op) |
| 메뉴 미선택 상태에서 카드 생성 탭 | 버튼 비활성. 탭 무시. |
| 카드 0건 상태 | 7레인 모두 빈 점선 표시. "주문을 기다리는 중..." 텍스트. |
| 카드 7건 (1행 가득) | 정상 표시. 8번째 카드 생성 시 lane 1, row 2에 배치. |
| Socket.io 연결 끊김 | 헤더에 "오프라인" 표시. 버튼 탭 시 "연결 끊김" 토스트. 재연결 시 자동 복구. |
| 카운트다운 중 연결 끊김 → 복구 | cards:sync로 서버 상태 수신. 서버가 타이머 관리하므로 시간 정확. |
| 같은 메뉴 연속 투입 | 각각 별도 카드. 주문번호(#001, #002...) 자동 증가로 구분. |
| Long-press 중 타이머 0 도달 → 카드 자동 completed 전환 | 모달 열린 상태 유지. card.status는 갱신됨. 워커가 그대로 "즉시 완료" 확인 시 force_complete 정상 처리. |
| 우발적 long-press (의도하지 않은 길게 누름) | 모달 표시되면 "취소" 또는 배경 탭으로 닫기. 서버 호출 없음. |

---

## 변경 이력

| 버전 | 일자 | 내용 |
|---|---|---|
| v1.0 | 2026-05-29 | 초안. 컴포넌트 트리, props/state 명세, 인터랙션 시나리오 3종, 엣지 케이스. |
| v1.1 | 2026-06-01 | 면 종류별 색상 강조 반영. §1.3 색상 토큰 추가, FlowSteps → NoodleTypeBadge + ProcessSteps로 분리, 렌더링 로직 명시. |
| v1.2 | 2026-06-01 | Long-press 즉시 완료 기능 추가. §2.6 인터랙션 명세, §2.7 ForceCompleteModal 컴포넌트, 시나리오 4.4, 엣지 케이스 2건 추가. 컴포넌트 트리에 ForceCompleteModal 추가. |
| v1.3 | 2026-06-02 | 점장용 메뉴 선택 방식을 검색 → POS 스타일 그리드로 변경. MenuSearch 컴포넌트 삭제, MenuSelector(MenuTabBar + MenuGrid + MenuCard) 신설. 컨트롤러 상태 관리에 selectedNoodleType 추가. 시나리오 4.1과 엣지 케이스 갱신. |
