'use client';

// 점장 · 카드 입력 (설계문서 §4.1, 화면 상세 설계서 §3).
import { useState } from 'react';
import type { Card, MenuTemplate, NoodleProcess, NoodleType, SoundType } from '@/lib/types';
import { useKdsSocket } from '@/lib/useKdsSocket';
import { useAudioUnlock, useClickSound } from '@/lib/useKdsAudio';
import ControllerHeader from '@/components/controller/ControllerHeader';
import MenuSelector from '@/components/controller/MenuSelector';
import CookTimeSelector from '@/components/controller/CookTimeSelector';
import ProcessSelector from '@/components/controller/ProcessSelector';
import CreateCardButton from '@/components/controller/CreateCardButton';
import EditModal from '@/components/controller/EditModal';
import SettingsModal from '@/components/controller/SettingsModal';
import NoodleStationView from '@/components/station/NoodleStationView';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import Toast from '@/components/common/Toast';

export default function ControllerPage() {
  const { connected, menus, cards, error, clearError, emit, soundManifest } =
    useKdsSocket('controller');
  useAudioUnlock(); // 첫 제스처에 오디오 깨우기
  useClickSound(); // 수정 6: 모든 버튼 터치음

  const [selectedNoodleType, setSelectedNoodleType] = useState<NoodleType>('생면1.0'); // 디폴트: 메뉴 가장 많음
  const [selectedMenu, setSelectedMenu] = useState<MenuTemplate | null>(null);
  const [cookTimeSec, setCookTimeSec] = useState<number | null>(null);
  const [noodleProcess, setNoodleProcess] = useState<NoodleProcess | null>(null);
  const [autoFilled, setAutoFilled] = useState(false);
  const [editing, setEditing] = useState<Card | null>(null);
  const [deleting, setDeleting] = useState<Card | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const selectMenu = (menu: MenuTemplate) => {
    setSelectedMenu(menu);
    setCookTimeSec(menu.default_cook_time_sec);
    setNoodleProcess(menu.default_process);
    setAutoFilled(true);
  };

  // 선택 초기화 (탭은 유지). 탭 전환 시 + 카드 생성 후 사용 (화면설계서 §3.2).
  const clearSelection = () => {
    setSelectedMenu(null);
    setCookTimeSec(null);
    setNoodleProcess(null);
    setAutoFilled(false);
  };

  const changeNoodleType = (type: NoodleType) => {
    setSelectedNoodleType(type);
    clearSelection(); // 탭 전환 시 선택 메뉴 리셋 (§3.2-2)
  };

  const createCard = () => {
    if (!selectedMenu || cookTimeSec === null || noodleProcess === null) return;
    emit('card:create', {
      menu_name: selectedMenu.name,
      noodle_type: selectedMenu.noodle_type,
      cook_time_sec: cookTimeSec,
      noodle_process: noodleProcess,
    });
    clearSelection(); // selectedMenu 만 null, 탭은 유지 (§3.2-5)
  };

  const onReset = () => {
    if (window.confirm('전체 카드를 초기화할까요? (테스트 리셋)')) {
      emit('cards:reset');
    }
  };

  const uploadSound = async (type: SoundType, file: File) => {
    const data = await file.arrayBuffer();
    emit('sound:upload', { type, mime: file.type || 'audio/mpeg', data });
  };

  return (
    <div className="flex h-screen flex-col bg-bg">
      <ControllerHeader
        isConnected={connected}
        onReset={onReset}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-2">
        {/* 좌측: 카드 생성 */}
        <section className="flex min-h-0 flex-col gap-4 overflow-auto">
          <MenuSelector
            menus={menus}
            selectedNoodleType={selectedNoodleType}
            selectedMenuId={selectedMenu?.id ?? null}
            onChangeNoodleType={changeNoodleType}
            onSelectMenu={selectMenu}
          />
          <CookTimeSelector
            value={cookTimeSec}
            onChange={(sec) => {
              setCookTimeSec(sec);
              setAutoFilled(false);
            }}
            autoFilled={autoFilled}
          />
          <ProcessSelector
            value={noodleProcess}
            onChange={(p) => {
              setNoodleProcess(p);
              setAutoFilled(false);
            }}
          />
          <CreateCardButton
            selectedMenu={selectedMenu}
            cookTimeSec={cookTimeSec}
            noodleProcess={noodleProcess}
            onSubmit={createCard}
          />
        </section>

        {/* 우측: 면 스테이션 KDS 실시간 복제 (워커 화면 미러, 읽기전용 + 삭제/수정 오버레이) */}
        <section className="flex min-h-0 flex-col gap-2 overflow-hidden">
          <h2 className="shrink-0 text-sm font-semibold text-text-secondary">
            면 스테이션 현황 (워커 화면 미러)
          </h2>
          <NoodleStationView
            cards={cards}
            mini
            interactive={false}
            onDelete={(card) => setDeleting(card)}
            onEdit={(card) => setEditing(card)}
          />
        </section>
      </div>

      {editing && (
        <EditModal
          card={editing}
          onConfirm={(sec, proc) => {
            emit('card:update', { card_id: editing.id, cook_time_sec: sec, noodle_process: proc });
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          message="정말 삭제하시겠습니까?"
          detail={`${deleting.order_number} · ${deleting.menu_name}`}
          confirmLabel="삭제"
          onConfirm={() => {
            emit('card:delete', { card_id: deleting.id });
            setDeleting(null);
          }}
          onCancel={() => setDeleting(null)}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          manifest={soundManifest}
          onUpload={uploadSound}
          onReset={(type) => emit('sound:reset', { type })}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      <Toast message={error} onClose={clearError} />
    </div>
  );
}
