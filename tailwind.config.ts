import type { Config } from 'tailwindcss';

// 디자인 토큰: 화면 상세 설계서 §1.1 (Okabe-Ito 색맹 안전 팔레트)
// 실제 색상값은 src/app/globals.css 의 CSS 변수로 정의. 여기서는 그 변수를 참조한다.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        card: 'var(--card)',
        border: 'var(--border)',
        text: {
          DEFAULT: 'var(--text)',
          secondary: 'var(--text-secondary)',
        },
        active: 'var(--active)',
        progress: 'var(--progress)',
        complete: 'var(--complete)',
        neutral: 'var(--neutral)',
        'active-soft': 'var(--active-soft)',
        'progress-soft': 'var(--progress-soft)',
        'complete-soft': 'var(--complete-soft)',
        'neutral-soft': 'var(--neutral-soft)',
        'header-bg': 'var(--header-bg)',
      },
      // 수정 7: 타이머 완료 카드 헤더 붉은 점멸 (모션이 신호 → 색맹 환경에서도 식별)
      keyframes: {
        'blink-red': {
          '0%, 49%': { backgroundColor: '#dc2626' },
          '50%, 100%': { backgroundColor: '#7f1d1d' },
        },
      },
      animation: {
        'blink-red': 'blink-red 0.7s steps(1, end) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
