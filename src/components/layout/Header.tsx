import { FolderOpen, Save, WifiOff, Loader } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useFileAccess } from '../../hooks/useFileAccess';

export function Header() {
  const activeTab         = useAppStore((s) => s.activeTab);
  const todayFileHandle   = useAppStore((s) => s.todayFileHandle);
  const archiveFileHandle = useAppStore((s) => s.archiveFileHandle);
  const saveStatus        = useAppStore((s) => s.saveStatus);
  const { openTodayFile, openArchiveFile } = useFileAccess();

  // タブに応じてファイル名とボタン動作を切り替え
  const currentFileName =
    activeTab === 'today'
      ? (todayFileHandle?.name ?? 'ファイル未接続')
      : (archiveFileHandle?.name ?? 'アーカイブ未接続');

  const handleOpen = activeTab === 'today' ? openTodayFile : openArchiveFile;

  return (
    <header className="h-[50px] flex items-center justify-between px-4 shrink-0 border-b border-gray-800 bg-gray-900">
      {/* 左: タイトル・ファイル名 */}
      <div className="flex items-center gap-3">
        <h1 className="text-white font-bold text-base tracking-wide">
          Smart Parse Memo
        </h1>
        <span className="text-gray-400 text-sm truncate max-w-[40vw]">
          {currentFileName}
        </span>
      </div>

      {/* 右: 保存ステータス・ファイルボタン */}
      <div className="flex items-center gap-3 shrink-0">
        {activeTab === 'today' && <StatusBadge status={saveStatus} />}
        <button
          onClick={handleOpen}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white transition-colors"
        >
          <FolderOpen size={14} />
          ファイルを開く
        </button>
      </div>
    </header>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'saved':
      return (
        <span className="flex items-center gap-1 text-green-400 text-xs">
          <Save size={13} /> 保存済み
        </span>
      );
    case 'saving':
      return (
        <span className="flex items-center gap-1 text-yellow-400 text-xs">
          <Loader size={13} className="animate-spin" /> 保存中...
        </span>
      );
    case 'unsaved':
      return (
        <span className="flex items-center gap-1 text-orange-400 text-xs">
          <Save size={13} /> 未保存
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1 text-gray-500 text-xs">
          <WifiOff size={13} /> 未接続
        </span>
      );
  }
}
