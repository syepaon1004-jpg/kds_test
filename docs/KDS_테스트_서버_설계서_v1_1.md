# KDS 테스트 프로그램 — 서버 설계서

**문서 버전**: v1.1
**작성일**: 2026-05-29 (v1.0) / 2026-06-01 (v1.1)
**참조 문서**: KDS_테스트프로그램_설계문서_v1_5.md, menu_data.json, KDS_테스트_메뉴데이터_정의서_v1_1.md

---

## 1. 서버 구조

```
server.ts
├── HTTP 서버 (Next.js)           — 페이지 서빙 (/controller, /station/noodle)
├── Socket.io 서버                — 실시간 이벤트
├── CardStore (in-memory)         — 카드 배열 관리
├── TimerManager                  — 1초 인터벌 타이머
└── MenuRegistry                  — menu_data.json 로드
```

---

## 2. 데이터 저장 (CardStore)

```typescript
// 서버 메모리. 서버 재시작 시 초기화.
class CardStore {
  private cards: Card[] = [];
  private nextOrderNum: number = 1;  // 주문번호 자동 증가 (#001, #002...)

  getAll(): Card[]                          // 전체 카드 (deleted 제외)
  getById(id: string): Card | null
  add(card: Card): void
  update(id: string, fields: Partial<Card>): void
  remove(id: string): void
  getNextLane(): { lane: number, row: number }  // 자동 배정
  reset(): void                              // 전체 초기화
}
```

### 2.1 자동 배정 알고리즘

```typescript
getNextLane(): { lane: number, row: number } {
  const occupied = new Set(
    this.cards.map(c => `${c.lane}-${c.row}`)
  );

  // row 1부터 순서대로 탐색
  for (let row = 1; row <= 10; row++) {
    for (let lane = 1; lane <= 7; lane++) {
      if (!occupied.has(`${lane}-${row}`)) {
        return { lane, row };
      }
    }
  }

  // 70건 초과 시 (비현실적) — 마지막 위치 반환
  return { lane: 7, row: 11 };
}
```

**동작**: 왼쪽 위(lane 1, row 1)부터 오른쪽으로 채우고, 7레인이 다 차면 다음 행으로.

---

## 3. Socket.io 이벤트 계약

### 3.1 연결

```typescript
// 클라이언트 접속 시
io.on("connection", (socket) => {
  // 즉시 현재 카드 목록 전송
  socket.emit("cards:sync", { cards: store.getAll() });
  // 메뉴 목록 전송 (컨트롤러용)
  socket.emit("menus:sync", { menus: menuRegistry.getAll() });
});
```

### 3.2 card:create (점장 → 서버)

```typescript
// 요청
{
  event: "card:create",
  payload: {
    menu_name: string,          // "잔치국수"
    cook_time_sec: number,      // 100
    noodle_process: NoodleProcess  // "torim"
  }
}

// 서버 처리
1. order_number 자동 생성 (nextOrderNum++)
2. getNextLane()으로 lane/row 배정
3. Card 생성:
   {
     id: uuid(),
     order_number: `#${String(nextOrderNum).padStart(3, '0')}`,
     menu_name, cook_time_sec, noodle_process,
     lane, row,
     status: "active",
     timer_remaining_sec: null,
     created_at: new Date().toISOString()
   }
4. store.add(card)
5. io.emit("cards:sync", { cards: store.getAll() })  // 전체 broadcast

// 에러
- menu_name이 빈 문자열 → socket.emit("error", { message: "메뉴명 필요" })
- cook_time_sec가 유효값 아닌 경우 → socket.emit("error", { message: "조리시간 오류" })
```

### 3.3 card:start_timer (워커 → 서버)

```typescript
// 요청
{
  event: "card:start_timer",
  payload: {
    card_id: string
  }
}

// 서버 처리
1. card = store.getById(card_id)
2. 검증: card 존재, card.status === "active"
3. card.status = "in_progress"
4. card.timer_remaining_sec = card.cook_time_sec
5. (cook_time_sec === -1인 경우: "풀어질때까지" → 타이머 없이 바로 수동 완료 대기.
    timer_remaining_sec = null, status = "in_progress"로 설정.
    워커가 수동으로 card:manual_complete 호출.)
6. store.update(card_id, { status, timer_remaining_sec })
7. io.emit("cards:sync", { cards: store.getAll() })

// 에러
- card 없음 → socket.emit("error", { message: "카드 없음" })
- card.status !== "active" → socket.emit("error", { message: "active 상태가 아님" })
```

### 3.4 card:manual_complete (워커 → 서버)

우동면("풀어질때까지") 전용. 타이머 없이 워커가 수동으로 완료 처리.

```typescript
// 요청
{
  event: "card:manual_complete",
  payload: {
    card_id: string
  }
}

// 서버 처리
1. card = store.getById(card_id)
2. 검증: card 존재, card.status === "in_progress"
3. card.status = "completed"
4. store.update(card_id, { status: "completed" })
5. io.emit("cards:sync", { cards: store.getAll() })
```

### 3.5 card:complete (워커 → 서버)

"전달 > 토핑" 버튼. 카드를 최종 제거.

```typescript
// 요청
{
  event: "card:complete",
  payload: {
    card_id: string
  }
}

// 서버 처리
1. card = store.getById(card_id)
2. 검증: card 존재, card.status === "completed"
3. store.remove(card_id)
4. io.emit("cards:sync", { cards: store.getAll() })
```

### 3.5b card:force_complete (워커 → 서버)

워커가 카드를 길게 눌러(long-press) "즉시 완료" 팝업에서 확인을 누른 경우. 어떤 상태(active / in_progress / completed)에서든 카드를 즉시 제거한다.

용도:
- 면이 예상보다 빨리 익어서 타이머 기다릴 필요 없는 경우
- 잘못 시작한 카드를 즉시 빼야 하는 경우
- 진행중인 타이머를 강제로 종료하고 카드를 제거해야 하는 경우

```typescript
// 요청
{
  event: "card:force_complete",
  payload: {
    card_id: string
  }
}

// 서버 처리
1. card = store.getById(card_id)
2. 검증: card 존재 (상태 무관)
3. store.remove(card_id)
4. io.emit("cards:sync", { cards: store.getAll() })
// 이벤트 로그(§7)에는 force_complete의 source_status(제거 직전 상태) 기록
```

`card:complete`와 차이: `card:complete`는 status === "completed"만 허용. `card:force_complete`는 상태 무관 즉시 제거. 워커의 의도적 강제 종료를 별도 이벤트로 분리하여 로그에서 구분 가능하게 한다.

### 3.6 card:delete (점장 → 서버)

점장이 잘못 투입한 카드를 삭제.

```typescript
// 요청
{
  event: "card:delete",
  payload: {
    card_id: string
  }
}

// 서버 처리
1. store.remove(card_id)
2. io.emit("cards:sync", { cards: store.getAll() })
// 어떤 상태의 카드든 삭제 가능 (active, in_progress, completed 모두)
```

### 3.7 card:update (점장 → 서버)

점장이 카드의 조리시간/면처리를 수정.

```typescript
// 요청
{
  event: "card:update",
  payload: {
    card_id: string,
    cook_time_sec?: number,
    noodle_process?: NoodleProcess
  }
}

// 서버 처리
1. card = store.getById(card_id)
2. 검증: card 존재
3. 변경 가능 조건:
   - status === "active" → cook_time_sec, noodle_process 모두 변경 가능
   - status === "in_progress" → 변경 불가 (타이머 진행중)
   - status === "completed" → 변경 불가
4. store.update(card_id, payload)
5. io.emit("cards:sync", { cards: store.getAll() })
```

### 3.8 cards:reset (점장 → 서버)

테스트 리셋. 전체 카드 초기화.

```typescript
// 요청
{ event: "cards:reset" }

// 서버 처리
1. store.reset()
2. io.emit("cards:sync", { cards: [] })
```

---

## 4. TimerManager

```typescript
class TimerManager {
  private interval: NodeJS.Timer | null = null;

  start(store: CardStore, broadcast: () => void) {
    this.interval = setInterval(() => {
      let changed = false;

      for (const card of store.getAll()) {
        if (card.status === "in_progress" && card.timer_remaining_sec !== null) {
          if (card.timer_remaining_sec > 0) {
            card.timer_remaining_sec -= 1;
            changed = true;
          }
          if (card.timer_remaining_sec === 0) {
            card.status = "completed";
            changed = true;
          }
        }
      }

      if (changed) {
        broadcast();  // io.emit("cards:sync", { cards: store.getAll() })
      }
    }, 1000);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }
}
```

**핵심 규칙**:
- 타이머는 서버가 단일 소스로 관리. 클라이언트는 수신한 값을 표시만 함.
- 매초 `cards:sync` broadcast는 변경이 있을 때만. 변경 없으면 전송 안 함.
- `cook_time_sec === -1` (풀어질때까지)인 카드는 `timer_remaining_sec = null`이므로 자동 감소 대상 아님.

---

## 5. 엣지 케이스

| 상황 | 처리 |
|---|---|
| 7레인 전부 차고 2행까지 찬 상태에서 카드 생성 | 3행에 배정. 이론상 70건까지 수용 가능. 현실적으로 발생하지 않음. |
| 점장이 같은 메뉴를 빠르게 연속 탭 | 각각 별도 카드 생성. 중복 방지 안 함 (같은 메뉴 여러 건은 정상). |
| 워커가 타이머 진행중(in_progress) 카드를 점장이 삭제 | 허용. card:delete는 상태 무관하게 삭제. |
| 타이머 0 도달 시 | status → completed. 클라이언트에서 알림음 재생 (서버는 상태만 변경). |
| 풀어질때까지(cook_time_sec=-1) 메뉴 | in_progress 진입 시 timer_remaining_sec=null. 카운트다운 없음. 워커가 "완료" 버튼으로 수동 완료. |
| 클라이언트 재접속 (WiFi 끊김 후 복구) | connection 이벤트에서 cards:sync로 전체 상태 재전송. 클라이언트가 전체 교체. |
| 서버 재시작 | 모든 카드 소멸. 테스트 리셋과 동일. |
| 카드 제거 후 레인 빈자리 | 자동 배정은 현재 존재하는 카드의 점유만 확인. 중간에 빠진 자리는 재사용됨. |
| 워커가 in_progress 카드를 long-press → 즉시 완료 | card:force_complete 이벤트로 카드 즉시 제거. 타이머도 자동 정지(카드가 없으니 TimerManager 루프에서 제외). 로그에 source_status="in_progress" 기록. |

---

## 6. 알림음

서버에서 처리하지 않음. 클라이언트(면 스테이션)에서 처리:

- `cards:sync` 수신 시 이전 상태와 비교
- in_progress → completed로 변경된 카드가 있으면 알림음 재생
- 알림음 파일: `/public/sounds/timer-done.mp3` (짧은 비프음)

---

## 7. 이벤트 로그 (행동 데이터 아카이브)

모든 Socket.io 이벤트를 서버에서 파일로 기록한다. 테스트 후 분석에 활용.

### 7.1 로그 스키마

```typescript
interface EventLog {
  timestamp: string;                  // ISO 8601 (예: "2026-06-02T12:34:56.789Z")
  event: string;                      // "card:create", "card:start_timer" 등
  source: "controller" | "station";   // 이벤트 발신자
  payload: Record<string, any>;       // 이벤트 원본 payload
  result?: {                          // 서버 처리 결과 (card:create, card:start_timer 등)
    card_id?: string;
    order_number?: string;
    lane?: number;
    row?: number;
    status_before?: string;
    status_after?: string;
  };
  active_cards_count: number;         // 이벤트 처리 후 전체 카드 수
}
```

### 7.2 기록 대상

| 이벤트 | 기록 여부 | result에 포함되는 값 |
|---|---|---|
| card:create | ✅ | card_id, order_number, lane, row |
| card:start_timer | ✅ | card_id, status_before→status_after |
| card:manual_complete | ✅ | card_id, status_before→status_after |
| card:complete | ✅ | card_id (제거됨) |
| card:force_complete | ✅ | card_id, source_status (어떤 상태에서 강제 종료됐는지) |
| card:delete | ✅ | card_id, status_before (어떤 상태에서 삭제됐는지) |
| card:update | ✅ | card_id, 변경된 필드 |
| cards:reset | ✅ | 초기화 전 카드 수 |
| connection | ✅ | socket.id, 접속 URL (controller/station 구분) |
| disconnection | ✅ | socket.id |

`cards:sync`(broadcast)는 기록하지 않음 — 매초 발생할 수 있어 로그가 비대해짐. 상태 변화를 유발한 이벤트만 기록.

### 7.3 저장 방식

**NDJSON (Newline Delimited JSON)**: 한 줄에 하나의 JSON 객체. 추가 전용(append-only). 별도 라이브러리 불필요.

```
파일 경로: ./logs/events_YYYY-MM-DD.jsonl
예: ./logs/events_2026-06-02.jsonl
```

```typescript
// 서버 구현
import { appendFileSync, mkdirSync } from 'fs';

class EventLogger {
  private logDir = './logs';

  constructor() {
    mkdirSync(this.logDir, { recursive: true });
  }

  log(entry: EventLog): void {
    const date = new Date().toISOString().split('T')[0];
    const path = `${this.logDir}/events_${date}.jsonl`;
    appendFileSync(path, JSON.stringify(entry) + '\n');
  }
}
```

### 7.4 활용 예시

테스트 후 `.jsonl` 파일을 파싱하면 다음을 산출할 수 있다:

- 주문 투입~타이머 시작 간 대기 시간 (워커 반응 속도)
- 주문 투입~전달 완료 간 총 소요 시간 (서빙 시간)
- 타이머 초과 빈도 (completed 후 전달까지 지연)
- 점장 카드 삭제/수정 빈도 (투입 오류율)
- 시간대별 카드 생성 밀도 (피크 패턴)

---

## 변경 이력

| 버전 | 일자 | 내용 |
|---|---|---|
| v1.0 | 2026-05-29 | 초안. Socket.io 이벤트 8종, 자동 배정, 타이머, 엣지 케이스. 이벤트 로그 아카이브 추가. |
| v1.1 | 2026-06-01 | `card:force_complete` 이벤트 추가 (long-press 즉시 완료). 어떤 상태에서든 카드 즉시 제거. 로그 기록 시 source_status 포함. 엣지 케이스 1건 추가. |
