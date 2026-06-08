// in-memory 카드 저장소 (서버 설계서 §2). 서버 재시작 시 초기화.
import type { Card } from '../lib/types';

export class CardStore {
  private cards: Card[] = [];
  private nextOrderNum = 1; // 주문번호 자동 증가 (#001, #002 ...)
  private nextPosition = 0; // 순차 위치 카운터 (생성마다 +1, reset 시에만 0)

  getAll(): Card[] {
    return this.cards;
  }

  getById(id: string): Card | null {
    return this.cards.find((c) => c.id === id) ?? null;
  }

  add(card: Card): void {
    this.cards.push(card);
  }

  update(id: string, fields: Partial<Card>): void {
    const card = this.getById(id);
    if (card) Object.assign(card, fields);
  }

  remove(id: string): void {
    this.cards = this.cards.filter((c) => c.id !== id);
  }

  reset(): void {
    this.cards = [];
    this.nextOrderNum = 1;
    this.nextPosition = 0;
  }

  /**
   * 다음 주문번호 발급. "#001" 부터 시작.
   * (설계 스니펫은 nextOrderNum++ 이후 값을 포맷해 #002 부터 시작하는 오타가 있으나,
   *  본문 명세 "#001, #002..." 의도에 맞춰 #001 부터 발급한다.)
   */
  nextOrderNumber(): string {
    const n = this.nextOrderNum;
    this.nextOrderNum += 1;
    return `#${String(n).padStart(3, '0')}`;
  }

  /**
   * 순차 카운터 배정. 카드는 생성 순서대로 위치가 고정되며, 한번 배정되면 절대 이동/재사용되지 않는다.
   * 1→(l1,r1) 2→(l2,r1) … 7→(l7,r1) 8→(l1,r2) …  (lane 1~7, row 1,2,3…)
   * (이전 빈자리 탐색 방식 getNextLane / 서버 설계서 §2.1 은 사용자 요청으로 의도적 폐기.
   *  카드 위치 = 물리적 해면기 포트 1:1 고정, 완료/삭제해도 다른 카드 불이동.)
   */
  nextSlot(): { lane: number; row: number } {
    this.nextPosition += 1;
    const n = this.nextPosition;
    const lane = ((n - 1) % 7) + 1;
    const row = Math.floor((n - 1) / 7) + 1;
    return { lane, row };
  }
}
