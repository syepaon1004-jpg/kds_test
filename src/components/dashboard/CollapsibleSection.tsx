'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState, type ReactNode } from 'react';

// 접이식 섹션(상세 지표). 기본 접힘 → 평소 화면은 깔끔, 필요시 펼침.
export default function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-base font-semibold text-text">{title}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-text-secondary">
          ▾
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-5 py-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
