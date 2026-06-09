// 로그 파일(I/O) → 시간 윈도우로 필터된 EventLog[]. 순수 집계(analytics.ts)와 분리.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { EventLog } from '@/lib/types';
import { kstDateOf } from '@/lib/time';
import type { AnalyticsRange } from '@/lib/analytics-types';

const LOG_DIR = join(process.cwd(), 'logs');
const FILE_RE = /^events_(\d{4}-\d{2}-\d{2})\.jsonl$/;
const DAY = 24 * 60 * 60 * 1000;
const UNBOUNDED_MAX = Number.MAX_SAFE_INTEGER;

export interface TimeWindow {
  fromMs: number;
  toMs: number; // 상한(미포함). 'all' 이면 UNBOUNDED_MAX
}

interface LogFile {
  date: string;
  path: string;
}

// KST 자정 epoch
function startOfKstDay(epochMs: number): number {
  return Date.parse(`${kstDateOf(epochMs)}T00:00:00+09:00`);
}

// range/커스텀 from·to → 절대 시간 윈도우 [fromMs, toMs)
export function resolveWindow(range: AnalyticsRange, fromMs?: number, toMs?: number): TimeWindow {
  const now = Date.now();
  if (range === 'custom' && typeof fromMs === 'number' && typeof toMs === 'number') {
    return { fromMs: Math.min(fromMs, toMs), toMs: Math.max(fromMs, toMs) };
  }
  if (range === 'all') return { fromMs: 0, toMs: UNBOUNDED_MAX };
  if (range === '7d') return { fromMs: startOfKstDay(now) - 6 * DAY, toMs: now + 1 };
  return { fromMs: startOfKstDay(now), toMs: now + 1 }; // today
}

function listLogFiles(win: TimeWindow): LogFile[] {
  let names: string[];
  try {
    names = readdirSync(LOG_DIR);
  } catch {
    return []; // logs 디렉터리 없음
  }
  // 파일명 날짜는 구버전 'Z'(UTC) 라인의 경우 UTC 날짜라, KST 윈도우 날짜와 최대 ±1일 어긋날 수 있다.
  // (event-logger 가 timestamp.split('T')[0] 로 파일명 생성 → UTC ts 는 UTC 날짜로 들어감)
  // → 파일 스캔을 ±1일 넓히고, 정확한 경계는 아래 loadEntries 의 epoch 필터가 보장한다.
  const fromD = kstDateOf(win.fromMs - DAY);
  const toD = win.toMs >= UNBOUNDED_MAX ? '9999-99-99' : kstDateOf(win.toMs + DAY);
  return names
    .map((n) => {
      const m = FILE_RE.exec(n);
      return m ? { date: m[1], path: join(LOG_DIR, n) } : null;
    })
    .filter((x): x is LogFile => x !== null && x.date >= fromD && x.date <= toD)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function loadEntries(
  range: AnalyticsRange,
  fromMs?: number,
  toMs?: number,
): { entries: EventLog[]; daysCovered: string[]; window: TimeWindow } {
  const window = resolveWindow(range, fromMs, toMs);
  const files = listLogFiles(window);
  const entries: EventLog[] = [];
  const days = new Set<string>(); // 실제 채택된 엔트리의 KST 날짜 (파일명 기준 아님)
  for (const f of files) {
    let text: string;
    try {
      text = readFileSync(f.path, 'utf-8');
    } catch {
      continue;
    }
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (!t) continue;
      let obj: EventLog;
      try {
        obj = JSON.parse(t) as EventLog;
      } catch {
        continue; // 잘린/손상 줄 스킵
      }
      const epoch = Date.parse(obj.timestamp);
      if (Number.isNaN(epoch) || epoch < window.fromMs || epoch >= window.toMs) continue;
      entries.push(obj);
      days.add(kstDateOf(epoch));
    }
  }
  return { entries, daysCovered: [...days].sort(), window };
}
