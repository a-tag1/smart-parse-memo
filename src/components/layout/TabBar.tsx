import { useAppStore } from '../../store/appStore';
import { useFileAccess } from '../../hooks/useFileAccess';

export function TabBar() {
  const activeTab       = useAppStore((s) => s.activeTab);
  const setActiveTab    = useAppStore((s) => s.setActiveTab);
  const todayFileHandle = useAppStore((s) => s.todayFileHandle);
  const { performDayCopy } = useFileAccess();

  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-gray-900 border-b border-gray-800 shrink-0">
      {/* タブボタン */}
      <div className="flex gap-1">
        <TabButton
          label="本日"
          active={activeTab === 'today'}
          onClick={() => setActiveTab('today')}
        />
        <TabButton
          label="過去"
          active={activeTab === 'archive'}
          onClick={() => setActiveTab('archive')}
        />
      </div>

      {/* 前日コピーボタン（本日タブ＋ファイル接続時のみ表示） */}
      {activeTab === 'today' && todayFileHandle && (
        <button
          onClick={performDayCopy}
          className="flex items-center gap-1.5 px-3 py-1 rounded text-xs bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white transition-colors"
          title="前日データをアーカイブに保存し、本日の新規テンプレートを作成します"
        >
          前日コピー
        </button>
      )}
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1 rounded text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
      }`}
    >
      {label}
    </button>
  );
}
