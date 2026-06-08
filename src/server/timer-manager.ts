// 서버 단일 소스 타이머 (서버 설계서 §4). 1초 인터벌.
// 클라이언트는 cards:sync 로 받은 timer_remaining_sec 을 표시만 한다.
import type { CardStore } from './card-store';

export class TimerManager {
  private interval: ReturnType<typeof setInterval> | null = null;

  start(store: CardStore, broadcast: () => void): void {
    if (this.interval) return;
    this.interval = setInterval(() => {
      let changed = false;

      for (const card of store.getAll()) {
        // 일시중지(paused) 카드는 감소시키지 않음
        if (card.status === 'in_progress' && card.timer_remaining_sec !== null && !card.paused) {
          if (card.timer_remaining_sec > 0) {
            card.timer_remaining_sec -= 1;
            changed = true;
          }
          if (card.timer_remaining_sec === 0) {
            card.status = 'completed';
            changed = true;
          }
        }
      }

      // 변경이 있을 때만 broadcast (매초 무조건 전송하지 않음)
      if (changed) broadcast();
    }, 1000);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
