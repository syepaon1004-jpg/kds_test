import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KitchenFlow KDS 테스트',
  description: '국수나무 노량진점 면 스테이션 현장 검증용 KDS 데모',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: 브라우저 확장/번역 기능이 html·body 속성을 주입해 생기는
    // 하이드레이션 경고를 무시 (앱 콘텐츠 하이드레이션에는 영향 없음).
    <html lang="ko" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
