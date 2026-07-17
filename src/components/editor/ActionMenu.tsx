import { useEffect, useRef } from 'react';

export type ActionType = 'section' | 'subsection' | 'divider' | 'date';

interface ActionMenuProps {
  position: { x: number; y: number };
  onSelect: (action: ActionType) => void;
  onClose: () => void;
}

const MENU_ITEMS: { id: ActionType; label: string }[] = [
  { id: 'section',    label: '+ セクション' },
  { id: 'subsection', label: '+ サブセクション' },
  { id: 'divider',    label: '+ 区切り線' },
  { id: 'date',       label: '日付' },
];

export function ActionMenu({ position, onSelect, onClose }: ActionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onClose]);

  // ビューポートからはみ出さないよう位置を調整
  const menuWidth  = 172;
  const menuHeight = MENU_ITEMS.length * 36 + 8;
  const adjustedX  = Math.min(position.x, window.innerWidth  - menuWidth  - 8);
  const adjustedY  = Math.min(position.y, window.innerHeight - menuHeight - 8);

  return (
    <div
      ref={menuRef}
      style={{ left: adjustedX, top: adjustedY }}
      className="fixed z-50 bg-gray-800 border border-gray-600 rounded-md shadow-2xl py-1"
      role="menu"
      aria-label="アクションメニュー"
    >
      <div className="px-3 py-1 text-xs text-gray-500 border-b border-gray-700 mb-1">
        アクション <span className="text-gray-600">(Shift×2)</span>
      </div>
      {MENU_ITEMS.map((item) => (
        <button
          key={item.id}
          role="menuitem"
          onMouseDown={(e) => {
            e.preventDefault(); // フォーカスを textarea から奪わない
            onSelect(item.id);
          }}
          className="w-full text-left px-4 py-1.5 text-sm text-gray-200
                     hover:bg-gray-700 hover:text-white transition-colors"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
