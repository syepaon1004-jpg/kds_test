# KitchenFlow KDS 테스트 프로그램

국수나무 노량진점 면 스테이션 현장 검증용 KDS 데모. POS 연동 없이 점장이 수동으로 카드를 투입하고, 면 워커가 태블릿 KDS에서 조리한다.

- **점장 · 카드 입력**: `http://<서버IP>:3000/controller`
- **면 스테이션 KDS**: `http://<서버IP>:3000/station/noodle`

## 스택

Next.js (App Router) + TypeScript + Tailwind CSS + Socket.io. 커스텀 서버(`server.ts`)가 단일 포트(:3000)에서 페이지와 Socket.io를 함께 호스팅한다. 데이터는 서버 메모리(재시작 시 초기화), 이벤트는 `./logs/events_YYYY-MM-DD.jsonl`(NDJSON)로 기록.

## 현장 세팅

```bash
npm install
npm run dev            # 개발 (HMR)
# 또는 현장용
npm run build && npm run start
```

1. 노트북과 태블릿을 같은 WiFi에 연결
2. 노트북 IP 확인 (`ipconfig`)
3. 각 기기 브라우저에서 위 두 URL로 접속

## 구조

```
server.ts                 커스텀 서버 (Next + Socket.io)
data/menu_data.json       메뉴 26개 (서버 시작 시 로드)
src/lib/types.ts          공유 타입 계약
src/lib/menu-registry.ts  메뉴 로더
src/server/               CardStore · TimerManager · EventLogger
src/app/                  라우트 (/ , /controller , /station/noodle)
src/components/            화면 컴포넌트
docs/                     설계 문서 (권위)
```

## 현재 상태

부팅·검증 가능한 스캐폴드. **남은 작업**: ① 서버의 8개 Socket 이벤트 핸들러 본문(서버 설계서 §3.2~§3.8), ② 실제 화면 컴포넌트(화면 상세 설계서 §2·§3). 두 화면은 현재 배선 확인용 플레이스홀더(`ConnectionProbe`)다.
