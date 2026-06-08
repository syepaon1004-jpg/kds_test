// 커스텀 서버 (서버 설계서 §1): Next.js 페이지 서빙 + Socket.io 를 단일 HTTP 서버/포트(:3000)로 호스팅.
// 노트북 1대가 같은 WiFi 의 태블릿들에게 두 화면 + 실시간 이벤트를 모두 제공한다.
import { createServer } from 'node:http';
import { parse } from 'node:url';
import { randomUUID } from 'node:crypto';
import next from 'next';
import { Server } from 'socket.io';
import type {
  CardCreatePayload,
  CardIdPayload,
  CardUpdatePayload,
  ClientToServerEvents,
  EventLog,
  NoodleProcess,
  ServerToClientEvents,
} from './src/lib/types';
import { CardStore } from './src/server/card-store';
import { TimerManager } from './src/server/timer-manager';
import { EventLogger } from './src/server/event-logger';
import { SoundStore } from './src/server/sound-store';
import { MenuRegistry } from './src/lib/menu-registry';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // 모든 인터페이스 바인딩 → WiFi 의 태블릿에서 접속 가능
const port = Number(process.env.PORT ?? 3000);

// 메뉴데이터 v1.4: 쌀국수면 = 40초 (50초에서 변경). 정의서 v1.4 §6.
const VALID_COOK_TIMES = new Set([100, 150, 180, 60, 40, -1]);
const VALID_PROCESS = new Set<NoodleProcess>(['none', 'wash', 'cool', 'torim']);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// ── 서버 상태 (in-memory) ──
const store = new CardStore();
const timer = new TimerManager();
const logger = new EventLogger();
const menus = new MenuRegistry();
const sounds = new SoundStore();

const MAX_SOUND_BYTES = 5_000_000; // 5MB

app.prepare().then(() => {
  // dev HMR 웹소켓(/_next/webpack-hmr)을 Next 에 위임하기 위한 핸들러. prepare() 이후에만 호출 가능.
  const upgrade =
    typeof (app as { getUpgradeHandler?: () => unknown }).getUpgradeHandler === 'function'
      ? app.getUpgradeHandler()
      : null;

  const httpServer = createServer((req, res) => {
    // 업로드된 효과음 파일 서빙 (/_sound/{type}). 그 외는 Next 가 처리.
    if (req.url && req.url.startsWith('/_sound/')) {
      const type = parse(req.url, true).pathname?.replace('/_sound/', '') ?? '';
      if (sounds.isValidType(type)) {
        const f = sounds.getFile(type);
        if (f) {
          // 버전 쿼리(?v=)로 캐시 무효화하므로 장기 캐시 허용 (반복 재생 시 재다운로드 방지)
          res.writeHead(200, {
            'Content-Type': f.mime,
            'Cache-Control': 'public, max-age=31536000, immutable',
          });
          res.end(f.buf);
          return;
        }
      }
      res.writeHead(404);
      res.end();
      return;
    }
    handle(req, res);
  });

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    maxHttpBufferSize: MAX_SOUND_BYTES + 200_000, // 효과음 업로드(최대 5MB) 허용
  });

  const broadcast = () => io.emit('cards:sync', { cards: store.getAll() });

  // 이벤트 로그 헬퍼 (서버 설계서 §7). cards:sync broadcast 는 기록하지 않는다.
  const record = (
    event: string,
    source: 'controller' | 'station',
    payload: Record<string, unknown>,
    result?: EventLog['result'],
  ) => {
    const entry: EventLog = {
      timestamp: new Date().toISOString(),
      event,
      source,
      payload,
      active_cards_count: store.getAll().length,
    };
    if (result) entry.result = result;
    logger.log(entry);
  };

  io.on('connection', (socket) => {
    const role: 'controller' | 'station' =
      socket.handshake.query.role === 'station' ? 'station' : 'controller';

    // 접속 즉시 현재 상태 전송 (서버 설계서 §3.1)
    socket.emit('cards:sync', { cards: store.getAll() });
    socket.emit('menus:sync', { menus: menus.getAll() });
    socket.emit('sounds:sync', { manifest: sounds.getManifest() });
    record('connection', role, { socket_id: socket.id, role });

    // ── card:create (점장) — §3.2 ──
    socket.on('card:create', (payload: CardCreatePayload) => {
      if (!payload?.menu_name?.trim()) {
        socket.emit('error', { message: '메뉴명 필요' });
        return;
      }
      if (!VALID_COOK_TIMES.has(payload.cook_time_sec)) {
        socket.emit('error', { message: '조리시간 오류' });
        return;
      }
      const order_number = store.nextOrderNumber();
      const { lane, row } = store.nextSlot();
      const card = {
        id: randomUUID(),
        order_number,
        menu_name: payload.menu_name,
        noodle_type: payload.noodle_type ?? '',
        cook_time_sec: payload.cook_time_sec,
        noodle_process: VALID_PROCESS.has(payload.noodle_process) ? payload.noodle_process : 'none',
        lane,
        row,
        status: 'active' as const,
        timer_remaining_sec: null,
        paused: false,
        created_at: new Date().toISOString(),
      };
      store.add(card);
      broadcast();
      record('card:create', role, { ...payload }, { card_id: card.id, order_number, lane, row });
    });

    // ── card:start_timer (워커) — §3.3 ──
    socket.on('card:start_timer', ({ card_id }: CardIdPayload) => {
      const card = store.getById(card_id);
      if (!card) return socket.emit('error', { message: '카드 없음' });
      if (card.status !== 'active') return socket.emit('error', { message: 'active 상태가 아님' });
      const status_before = card.status;
      const timer_remaining_sec = card.cook_time_sec === -1 ? null : card.cook_time_sec;
      store.update(card_id, { status: 'in_progress', timer_remaining_sec });
      broadcast();
      record('card:start_timer', role, { card_id }, {
        card_id,
        status_before,
        status_after: 'in_progress',
      });
    });

    // ── card:pause_timer (워커) — 진행 중 타이머 일시중지 ──
    socket.on('card:pause_timer', ({ card_id }: CardIdPayload) => {
      const card = store.getById(card_id);
      if (!card) return socket.emit('error', { message: '카드 없음' });
      if (card.status !== 'in_progress' || card.timer_remaining_sec === null)
        return socket.emit('error', { message: '타이머 진행 중이 아님' });
      if (card.paused) return;
      store.update(card_id, { paused: true });
      broadcast();
      record('card:pause_timer', role, { card_id }, { card_id });
    });

    // ── card:resume_timer (워커) — 일시중지 타이머 재시작 ──
    socket.on('card:resume_timer', ({ card_id }: CardIdPayload) => {
      const card = store.getById(card_id);
      if (!card) return socket.emit('error', { message: '카드 없음' });
      if (card.status !== 'in_progress' || !card.paused)
        return socket.emit('error', { message: '일시중지 상태가 아님' });
      store.update(card_id, { paused: false });
      broadcast();
      record('card:resume_timer', role, { card_id }, { card_id });
    });

    // ── card:reset_timer (워커) — 일시중지 중 남은 시간을 원래 조리시간으로 되돌림 (일시중지 유지) ──
    socket.on('card:reset_timer', ({ card_id }: CardIdPayload) => {
      const card = store.getById(card_id);
      if (!card) return socket.emit('error', { message: '카드 없음' });
      if (card.status !== 'in_progress' || card.timer_remaining_sec === null || !card.paused)
        return socket.emit('error', { message: '일시중지 상태에서만 초기화 가능' });
      store.update(card_id, { timer_remaining_sec: card.cook_time_sec });
      broadcast();
      record('card:reset_timer', role, { card_id }, { card_id });
    });

    // ── card:manual_complete (워커, 우동 "풀어질때까지") — §3.4 ──
    socket.on('card:manual_complete', ({ card_id }: CardIdPayload) => {
      const card = store.getById(card_id);
      if (!card) return socket.emit('error', { message: '카드 없음' });
      if (card.status !== 'in_progress')
        return socket.emit('error', { message: 'in_progress 상태가 아님' });
      store.update(card_id, { status: 'completed' });
      broadcast();
      record('card:manual_complete', role, { card_id }, {
        card_id,
        status_before: 'in_progress',
        status_after: 'completed',
      });
    });

    // ── card:complete (워커, "전달 > 토핑") — §3.5 ──
    socket.on('card:complete', ({ card_id }: CardIdPayload) => {
      const card = store.getById(card_id);
      if (!card) return socket.emit('error', { message: '카드 없음' });
      if (card.status !== 'completed')
        return socket.emit('error', { message: 'completed 상태가 아님' });
      store.remove(card_id);
      broadcast();
      record('card:complete', role, { card_id }, { card_id });
    });

    // ── card:force_complete (워커, 롱프레스 "즉시 완료") — 상태 무관 즉시 제거 ──
    socket.on('card:force_complete', ({ card_id }: CardIdPayload) => {
      const card = store.getById(card_id);
      if (!card) return socket.emit('error', { message: '카드 없음' });
      const status_before = card.status;
      store.remove(card_id);
      broadcast();
      record('card:force_complete', role, { card_id }, { card_id, status_before });
    });

    // ── card:delete (점장) — §3.6, 상태 무관 삭제 ──
    socket.on('card:delete', ({ card_id }: CardIdPayload) => {
      const card = store.getById(card_id);
      const status_before = card?.status;
      store.remove(card_id);
      broadcast();
      record('card:delete', role, { card_id }, { card_id, status_before });
    });

    // ── card:update (점장) — §3.7, active 일 때만 변경 ──
    socket.on('card:update', (payload: CardUpdatePayload) => {
      const card = store.getById(payload.card_id);
      if (!card) return socket.emit('error', { message: '카드 없음' });
      if (card.status !== 'active')
        return socket.emit('error', { message: 'active 상태에서만 수정 가능' });
      const fields: Partial<typeof card> = {};
      if (payload.cook_time_sec !== undefined) {
        if (!VALID_COOK_TIMES.has(payload.cook_time_sec))
          return socket.emit('error', { message: '조리시간 오류' });
        fields.cook_time_sec = payload.cook_time_sec;
      }
      if (payload.noodle_process !== undefined && VALID_PROCESS.has(payload.noodle_process)) {
        fields.noodle_process = payload.noodle_process;
      }
      store.update(payload.card_id, fields);
      broadcast();
      record('card:update', role, { ...payload }, { card_id: payload.card_id });
    });

    // ── cards:reset (점장) — §3.8 ──
    socket.on('cards:reset', () => {
      const cards_before = store.getAll().length;
      store.reset();
      broadcast();
      record('cards:reset', role, { cards_before });
    });

    // ── sound:upload (효과음 업로드) — 서버 저장 후 전 기기에 broadcast ──
    socket.on('sound:upload', ({ type, mime, data }) => {
      if (!sounds.isValidType(type)) return socket.emit('error', { message: '잘못된 사운드 종류' });
      if (!mime?.startsWith('audio/'))
        return socket.emit('error', { message: '오디오 파일만 업로드 가능' });
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
      if (buf.length === 0 || buf.length > MAX_SOUND_BYTES)
        return socket.emit('error', { message: '파일 크기 오류 (최대 5MB)' });
      sounds.save(type, mime, buf);
      io.emit('sounds:sync', { manifest: sounds.getManifest() });
      record('sound:upload', role, { type, mime, bytes: buf.length });
    });

    // ── sound:reset (기본음으로 되돌리기) ──
    socket.on('sound:reset', ({ type }) => {
      if (!sounds.isValidType(type)) return;
      sounds.remove(type);
      io.emit('sounds:sync', { manifest: sounds.getManifest() });
      record('sound:reset', role, { type });
    });

    socket.on('disconnect', () => {
      record('disconnection', role, { socket_id: socket.id });
    });
  });

  // 서버 단일 소스 타이머 시작 (서버 설계서 §4)
  timer.start(store, broadcast);

  // HMR 웹소켓만 Next 로 위임. Socket.io 는 자체 경로(/socket.io)만 처리.
  httpServer.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url || '/', true);
    if (pathname === '/_next/webpack-hmr' && upgrade) {
      (upgrade as (req: unknown, socket: unknown, head: unknown) => void)(req, socket, head);
    }
  });

  httpServer.listen(port, hostname, () => {
    console.log(`▶ KDS 서버 실행: http://localhost:${port}`);
    console.log(`  점장:        http://<서버IP>:${port}/controller`);
    console.log(`  면 스테이션: http://<서버IP>:${port}/station/noodle`);
  });
});
