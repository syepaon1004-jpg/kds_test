// 행동 데이터 아카이브 (서버 설계서 §7). NDJSON append-only.
// 모든 상태 변화 이벤트를 ./logs/events_YYYY-MM-DD.jsonl 에 기록. (cards:sync broadcast 는 제외)
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { EventLog } from '../lib/types';

export class EventLogger {
  private logDir: string;

  constructor(logDir = join(process.cwd(), 'logs')) {
    this.logDir = logDir;
    mkdirSync(this.logDir, { recursive: true });
  }

  log(entry: EventLog): void {
    const date = new Date().toISOString().split('T')[0];
    const path = join(this.logDir, `events_${date}.jsonl`);
    appendFileSync(path, JSON.stringify(entry) + '\n');
  }
}
