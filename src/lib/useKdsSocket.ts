'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  Card,
  ClientToServerEvents,
  MenuTemplate,
  ServerToClientEvents,
  SoundManifest,
} from './types';
import { setSoundConfig } from './sounds';

type Role = 'controller' | 'station';

const DEFAULT_SOUND_MANIFEST: SoundManifest = {
  click: { hasCustom: false, version: 0 },
  newCard: { hasCustom: false, version: 0 },
  timerDone: { hasCustom: false, version: 0 },
};
type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type Emit = <E extends keyof ClientToServerEvents>(
  event: E,
  ...args: Parameters<ClientToServerEvents[E]>
) => void;

/**
 * 단일 Socket.io 연결 훅. 두 화면 공용.
 * 서버가 타이머 단일 소스이므로 클라이언트는 cards 를 표시만 한다 (자체 카운트다운 없음).
 */
export function useKdsSocket(role: Role) {
  const [connected, setConnected] = useState(false);
  const [menus, setMenus] = useState<MenuTemplate[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [soundManifest, setSoundManifest] = useState<SoundManifest>(DEFAULT_SOUND_MANIFEST);
  const socketRef = useRef<TypedSocket | null>(null);

  useEffect(() => {
    const socket: TypedSocket = io({ query: { role } });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('menus:sync', (p) => setMenus(p.menus));
    socket.on('cards:sync', (p) => setCards(p.cards));
    socket.on('sounds:sync', (p) => {
      setSoundManifest(p.manifest);
      setSoundConfig(p.manifest); // sounds.ts 재생 함수가 참조
    });
    socket.on('error', (p) => setError(p.message));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [role]);

  const emit = useCallback<Emit>((event, ...args) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      setError('연결 끊김 — 잠시 후 다시 시도하세요.');
      return;
    }
    socket.emit(event, ...args);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { connected, menus, cards, error, clearError, emit, soundManifest };
}
