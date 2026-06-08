// 서버 전용. menu_data.json 을 메모리에 로드 (설계문서 §3.1, 서버 설계서 §1).
// 메뉴 데이터는 하드코딩하지 않는다 — 항상 이 파일에서 로드.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MenuData, MenuTemplate, NoodleProcess } from './types';

export class MenuRegistry {
  private data: MenuData;

  constructor(path = join(process.cwd(), 'data', 'menu_data.json')) {
    this.data = JSON.parse(readFileSync(path, 'utf-8')) as MenuData;
  }

  /** 점장 화면용 메뉴 템플릿 목록 (menus:sync payload).
   *  v1.4: active=false 메뉴는 카드 생성 대상에서 제외 (데이터는 보존, 정의서 §3). */
  getAll(): MenuTemplate[] {
    return this.data.menus
      .filter((m) => m.active !== false)
      .map((m) => ({
        id: m.id,
        name: m.name,
        noodle_type: m.noodle_type,
        default_cook_time_sec: m.default_cook_time_sec,
        default_process: m.default_process,
      }));
  }

  /** cook_time_sec → 표시 라벨 ("100" → "1:40") */
  getCookTimeLabels(): Record<string, string> {
    return this.data.cook_time_labels;
  }

  /** noodle_process → 표시 스텝 배열 */
  getProcessSteps(): Record<NoodleProcess, string[]> {
    return this.data.process_steps;
  }
}
