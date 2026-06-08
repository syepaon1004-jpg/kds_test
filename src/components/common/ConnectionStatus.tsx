// Socket.io 연결 상태 (화면 상세 설계서 §1.3)
export default function ConnectionStatus({ isConnected }: { isConnected: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-sm">
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-complete' : 'bg-red-500'}`}
      />
      {isConnected ? '온라인' : '오프라인'}
    </span>
  );
}
