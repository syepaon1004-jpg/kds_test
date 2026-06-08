import Clock from '@/components/common/Clock';
import ConnectionStatus from '@/components/common/ConnectionStatus';

// 화면 상세 설계서 §2.2. 높이 고정 44px, 배경 --header-bg.
export default function StationHeader({
  stationName,
  activeCount,
  isConnected,
}: {
  stationName: string;
  activeCount: number;
  isConnected: boolean;
}) {
  return (
    <header className="flex h-11 shrink-0 items-center justify-between bg-header-bg px-4 text-white">
      <div className="flex items-center gap-3">
        <span className="text-base font-bold">{stationName}</span>
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-sm tabular-nums">
          카드 {activeCount}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <Clock />
        <ConnectionStatus isConnected={isConnected} />
      </div>
    </header>
  );
}
