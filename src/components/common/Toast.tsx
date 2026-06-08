'use client';

import { useEffect } from 'react';

// 일시적 에러 안내 (연결 끊김, 서버 error 이벤트). 2.5초 후 자동 사라짐.
export default function Toast({ message, onClose }: { message: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onClose, 2500);
    return () => clearTimeout(id);
  }, [message, onClose]);

  if (!message) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-header-bg px-4 py-2 text-sm text-white shadow-lg">
      {message}
    </div>
  );
}
