'use client';

// 면 스테이션 KDS (설계문서 §4.2, 화면 상세 설계서 §2).
import { useState } from 'react';
import { useKdsSocket } from '@/lib/useKdsSocket';
import {
  useAudioUnlock,
  useClickSound,
  useNewCardChime,
  useTimerStartChime,
  useTimerDoneAlarm,
} from '@/lib/useKdsAudio';
import StationHeader from '@/components/station/StationHeader';
import NoodleStationView from '@/components/station/NoodleStationView';
import ForceCompleteModal from '@/components/station/ForceCompleteModal';
import Toast from '@/components/common/Toast';

export default function NoodleStationPage() {
  const { connected, cards, error, clearError, emit } = useKdsSocket('station');
  useAudioUnlock(); // 첫 제스처에 오디오 깨우기 (자동재생 정책)
  useClickSound(); // 수정 6: 모든 버튼 터치음
  useNewCardChime(cards); // 수정 5: 새 카드 도착음 "띠링띠링"
  useTimerStartChime(cards); // 타이머 시작음 (active→in_progress)
  useTimerDoneAlarm(cards); // 수정 7: 타이머 완료 반복 경고음

  // 모달은 id 만 보관하고 라이브 cards 에서 파생 — 모달 열린 채 상태/남은시간이 갱신되고
  // (§2.6 엣지: 타이머 0 도달 시 completed 갱신), 카드가 사라지면 모달 자동 닫힘.
  const [forceCompletingId, setForceCompletingId] = useState<string | null>(null);
  const forceCompleting = cards.find((c) => c.id === forceCompletingId) ?? null;

  return (
    <div className="flex h-screen flex-col bg-bg">
      <StationHeader stationName="면 스테이션" activeCount={cards.length} isConnected={connected} />
      <NoodleStationView
        cards={cards}
        interactive
        onStartTimer={(id) => emit('card:start_timer', { card_id: id })}
        onManualComplete={(id) => emit('card:manual_complete', { card_id: id })}
        onComplete={(id) => emit('card:complete', { card_id: id })}
        onPauseTimer={(id) => emit('card:pause_timer', { card_id: id })}
        onResumeTimer={(id) => emit('card:resume_timer', { card_id: id })}
        onResetTimer={(id) => emit('card:reset_timer', { card_id: id })}
        onForceComplete={(card) => setForceCompletingId(card.id)}
        onSetPort={(id, port) => emit('card:set_port', { card_id: id, port })}
      />

      <ForceCompleteModal
        card={forceCompleting}
        onConfirm={(id) => {
          emit('card:force_complete', { card_id: id });
          setForceCompletingId(null);
        }}
        onCancel={() => setForceCompletingId(null)}
      />

      <Toast message={error} onClose={clearError} />
    </div>
  );
}
