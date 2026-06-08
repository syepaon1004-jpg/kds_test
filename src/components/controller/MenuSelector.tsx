'use client';

import type { MenuTemplate, NoodleType } from '@/lib/types';
import { NOODLE_TYPES, NOODLE_TYPE_COLORS } from '@/lib/labels';

// 화면 상세 설계서 §3.3. POS 스타일 메뉴 선택 (기존 MenuSearch 검색 방식 대체).
// 면 종류 6개 탭으로 그룹 전환 → 4열 그리드에서 메뉴 카드 터치로 선택.
// 용어 주의: 여기의 "메뉴 카드"(MenuCard)는 선택용 UI이며, 면 스테이션의 워크 카드(WorkCard)와는 다른 컴포넌트다.
export default function MenuSelector({
  menus,
  selectedNoodleType,
  selectedMenuId,
  onChangeNoodleType,
  onSelectMenu,
}: {
  menus: MenuTemplate[];
  selectedNoodleType: NoodleType;
  selectedMenuId: string | null;
  onChangeNoodleType: (type: NoodleType) => void;
  onSelectMenu: (menu: MenuTemplate) => void;
}) {
  const counts = countByType(menus);
  const filtered = menus.filter((m) => m.noodle_type === selectedNoodleType);
  const colors = NOODLE_TYPE_COLORS[selectedNoodleType];

  return (
    <div>
      <MenuTabBar selected={selectedNoodleType} counts={counts} onChange={onChangeNoodleType} />
      <div className="mt-2">
        <MenuGrid
          menus={filtered}
          colors={colors}
          selectedMenuId={selectedMenuId}
          onSelect={onSelectMenu}
        />
      </div>
    </div>
  );
}

function countByType(menus: MenuTemplate[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const m of menus) c[m.noodle_type] = (c[m.noodle_type] ?? 0) + 1;
  return c;
}

// §3.3.1 면 종류별 6개 탭. 가로 균등 배치. 선택 탭 = 해당 면 색으로 강조 (bg + 2px 진한 테두리 + 진한 텍스트).
function MenuTabBar({
  selected,
  counts,
  onChange,
}: {
  selected: NoodleType;
  counts: Record<string, number>;
  onChange: (type: NoodleType) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-1">
      {NOODLE_TYPES.map((type) => {
        const isSel = type === selected;
        const colors = NOODLE_TYPE_COLORS[type];
        return (
          <button
            key={type}
            onClick={() => onChange(type)}
            className={`rounded-md px-1 py-1.5 text-center leading-tight ${
              isSel ? 'font-bold' : 'border border-border bg-white text-text-secondary'
            }`}
            style={
              isSel
                ? { backgroundColor: colors.bg, color: colors.text, border: `2px solid ${colors.text}` }
                : undefined
            }
          >
            <div className="text-xs">{type}</div>
            <div className="text-[11px] tabular-nums opacity-80">{counts[type] ?? 0}</div>
          </button>
        );
      })}
    </div>
  );
}

// §3.3.2 4열 그리드. 현재 탭의 메뉴만 (이미 필터됨). 빈 탭(예: 활성 메뉴 0개)은 안내 문구.
function MenuGrid({
  menus,
  colors,
  selectedMenuId,
  onSelect,
}: {
  menus: MenuTemplate[];
  colors: { bg: string; text: string };
  selectedMenuId: string | null;
  onSelect: (menu: MenuTemplate) => void;
}) {
  if (menus.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border py-8 text-center text-sm text-text-secondary">
        활성 메뉴 없음
      </div>
    );
  }
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {menus.map((m) => (
        <MenuCard
          key={m.id}
          menu={m}
          colors={colors}
          selected={selectedMenuId === m.id}
          onTap={() => onSelect(m)}
        />
      ))}
    </div>
  );
}

// §3.3.3 메뉴명만 표시 (조리시간/면처리 X). 미선택=연한 배경, 선택=진한 배경 반전 + 흰 bold + ✓.
function MenuCard({
  menu,
  colors,
  selected,
  onTap,
}: {
  menu: MenuTemplate;
  colors: { bg: string; text: string };
  selected: boolean;
  onTap: () => void;
}) {
  return (
    <button
      onClick={onTap}
      className="relative flex min-h-[46px] items-center justify-center rounded-md px-1.5 py-1 text-center text-sm leading-tight"
      style={
        selected
          ? { backgroundColor: colors.text, color: '#ffffff', border: `2px solid ${colors.text}`, fontWeight: 700 }
          : { backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.text}` }
      }
    >
      {selected && <span className="absolute right-1 top-0.5 text-xs leading-none">✓</span>}
      {menu.name}
    </button>
  );
}
