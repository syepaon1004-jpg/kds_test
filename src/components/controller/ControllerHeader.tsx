import Clock from '@/components/common/Clock';
import ConnectionStatus from '@/components/common/ConnectionStatus';

// 화면 상세 설계서 §3.1. 타이틀 + 시계 + 연결 상태 + 전체 리셋(테스트용).
export default function ControllerHeader({
  isConnected,
  onReset,
  onOpenSettings,
}: {
  isConnected: boolean;
  onReset: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <header className="flex h-11 shrink-0 items-center justify-between bg-header-bg px-4 text-white">
      <span className="text-base font-bold">KitchenFlow — 카드 입력</span>
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenSettings}
          title="효과음 설정"
          className="rounded bg-white/15 px-2 py-0.5 text-sm hover:bg-white/25"
        >
          ⚙️ 설정
        </button>
        <button
          onClick={onReset}
          className="rounded bg-white/15 px-2 py-0.5 text-sm hover:bg-white/25"
        >
          전체 리셋
        </button>
        <Clock />
        <ConnectionStatus isConnected={isConnected} />
      </div>
    </header>
  );
}
