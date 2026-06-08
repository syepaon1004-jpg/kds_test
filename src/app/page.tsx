import Link from 'next/link';

// 스캐폴드 부팅 확인용 랜딩. 현장에서는 각 기기가 아래 두 경로로 직접 접속한다.
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">KitchenFlow — KDS 테스트</h1>
        <p className="mt-2 text-text-secondary">면 스테이션 현장 검증 데모 · 화면을 선택하세요</p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          href="/controller"
          className="rounded-xl bg-active px-8 py-4 text-center text-lg font-semibold text-white"
        >
          점장 · 카드 입력
          <span className="block text-sm font-normal opacity-90">/controller</span>
        </Link>
        <Link
          href="/station/noodle"
          className="rounded-xl bg-complete px-8 py-4 text-center text-lg font-semibold text-white"
        >
          면 스테이션 KDS
          <span className="block text-sm font-normal opacity-90">/station/noodle</span>
        </Link>
      </div>
    </main>
  );
}
