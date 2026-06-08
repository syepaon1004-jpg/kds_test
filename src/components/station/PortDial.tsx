'use client';

// 카드별 "해면기 투입 포트" 표식 (1~6). 7구 해면기에서 가운데(7번)는 미사용 → 버튼 6개.
// 물리 바구니 배치를 흉내내 원형으로 둔다: 1번 = 11시 방향, 시계 반대방향(11→9→7→5→3→1시)으로 1→6.
// 기능 영향 없는 메모용. 1개만 선택, 같은 번호 재탭 시 해제.
const PORTS = [1, 2, 3, 4, 5, 6];

// 각 포트의 배치 각도(수학 각도, 0°=3시/우측, 반시계 양수).
// 11시=120°, 9시=180°, 7시=240°, 5시=300°, 3시=0°, 1시=60°.
const ANGLE_DEG: Record<number, number> = { 1: 120, 2: 180, 3: 240, 4: 300, 5: 0, 6: 60 };

export default function PortDial({
  value,
  onChange,
  size = 96,
  buttonSize = 30,
}: {
  value: number | null;
  onChange: (port: number | null) => void;
  size?: number;
  buttonSize?: number;
}) {
  const R = size / 2 - buttonSize / 2 - 2; // 버튼 중심이 도는 반지름

  return (
    <div
      className="relative mx-auto select-none"
      style={{ width: size, height: size }}
      // 포트 다이얼은 롱프레스(즉시완료) 트리거에서 제외
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* 가운데(미사용 7번) 표시 */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-border"
        style={{ width: buttonSize * 0.78, height: buttonSize * 0.78 }}
      />
      {PORTS.map((p) => {
        const rad = (ANGLE_DEG[p] * Math.PI) / 180;
        const dx = R * Math.cos(rad);
        const dy = -R * Math.sin(rad); // 화면 y는 아래로 증가 → 위쪽이 음수
        const selected = value === p;
        return (
          <button
            key={p}
            onClick={() => onChange(selected ? null : p)}
            aria-pressed={selected}
            title={`해면기 ${p}번 포트`}
            className={`absolute flex items-center justify-center rounded-full border-2 font-bold tabular-nums transition-colors ${
              selected
                ? 'border-text bg-text text-white'
                : 'border-border bg-white text-text-secondary'
            }`}
            style={{
              width: buttonSize,
              height: buttonSize,
              left: `calc(50% + ${dx}px)`,
              top: `calc(50% + ${dy}px)`,
              transform: 'translate(-50%, -50%)',
              fontSize: buttonSize * 0.42,
            }}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}
