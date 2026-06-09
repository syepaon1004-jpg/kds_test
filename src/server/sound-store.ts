// 사용자 업로드 효과음 저장 (서버 공유). 파일은 data/sounds/{type}, 메타는 manifest.json.
// 서버 재시작에도 유지. 업로드 없는 종류는 기본 합성음(클라이언트) 사용.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SoundManifest, SoundType } from '../lib/types';

const TYPES: SoundType[] = ['click', 'newCard', 'timerStart', 'timerDone'];

interface Entry {
  mime: string;
  version: number;
}

export class SoundStore {
  private dir: string;
  private manifestPath: string;
  private entries: Partial<Record<SoundType, Entry>> = {};

  constructor(dir = join(process.cwd(), 'data', 'sounds')) {
    this.dir = dir;
    this.manifestPath = join(dir, 'manifest.json');
    mkdirSync(dir, { recursive: true });
    if (existsSync(this.manifestPath)) {
      try {
        this.entries = JSON.parse(readFileSync(this.manifestPath, 'utf-8'));
      } catch {
        this.entries = {};
      }
    }
  }

  private persist(): void {
    writeFileSync(this.manifestPath, JSON.stringify(this.entries));
  }

  private filePath(type: SoundType): string {
    return join(this.dir, type);
  }

  isValidType(t: string): t is SoundType {
    return (TYPES as string[]).includes(t);
  }

  /** 클라이언트용 manifest (3종 전부, hasCustom 플래그) */
  getManifest(): SoundManifest {
    const m = {} as SoundManifest;
    for (const t of TYPES) {
      const e = this.entries[t];
      m[t] = { hasCustom: !!e, version: e?.version ?? 0 };
    }
    return m;
  }

  save(type: SoundType, mime: string, buf: Buffer): void {
    const prev = this.entries[type];
    writeFileSync(this.filePath(type), buf);
    this.entries[type] = { mime, version: (prev?.version ?? 0) + 1 };
    this.persist();
  }

  remove(type: SoundType): void {
    if (this.entries[type]) {
      try {
        rmSync(this.filePath(type));
      } catch {
        // 파일 없으면 무시
      }
      delete this.entries[type];
      this.persist();
    }
  }

  getFile(type: SoundType): { buf: Buffer; mime: string } | null {
    const e = this.entries[type];
    if (!e) return null;
    try {
      return { buf: readFileSync(this.filePath(type)), mime: e.mime };
    } catch {
      return null;
    }
  }
}
