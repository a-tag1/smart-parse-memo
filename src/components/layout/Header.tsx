import { useEffect, useRef, useState } from 'react';
import { FolderOpen, Save, WifiOff, Loader, Settings, RefreshCw } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useFileAccess } from '../../hooks/useFileAccess';
import { SettingsModal } from './SettingsModal';

export function Header() {
  const activeTab         = useAppStore((s) => s.activeTab);
  const todayFileHandle   = useAppStore((s) => s.todayFileHandle);
  const archiveFileHandle = useAppStore((s) => s.archiveFileHandle);
  const memoFileHandle    = useAppStore((s) => s.memoFileHandle);
  const saveStatus        = useAppStore((s) => s.saveStatus);
  const memoSaveStatus    = useAppStore((s) => s.memoSaveStatus);
  const pendingReconnect  = useAppStore((s) => s.pendingReconnect);
  const storedTodayName   = useAppStore((s) => s.storedTodayName);
  const storedArchiveName = useAppStore((s) => s.storedArchiveName);
  const storedMemoName    = useAppStore((s) => s.storedMemoName);

  const { openTodayFile, openArchiveFile, openMemoFile, tryAutoReconnect, reconnect } = useFileAccess();
  const [showSettings, setShowSettings] = useState(false);

  // マウント時に1回だけ自動復元を試みる
  const autoReconnectDone = useRef(false);
  useEffect(() => {
    if (autoReconnectDone.current) return;
    autoReconnectDone.current = true;
    tryAutoReconnect();
  }, [tryAutoReconnect]);

  const currentFileName =
    activeTab === 'today'
      ? (todayFileHandle?.name ?? storedTodayName ?? 'ファイル未接続')
      : activeTab === 'archive'
      ? (archiveFileHandle?.name ?? storedArchiveName ?? 'アーカイブ未接続')
      : (memoFileHandle?.name ?? storedMemoName ?? 'メモファイル未接続');

  const isConnected = activeTab === 'today' ? !!todayFileHandle
                    : activeTab === 'archive' ? !!archiveFileHandle
                    : !!memoFileHandle;
  const handleOpen  = activeTab === 'today' ? openTodayFile
                    : activeTab === 'archive' ? openArchiveFile
                    : openMemoFile;

  return (
    <>
      <header className="h-[50px] flex items-center justify-between px-4 shrink-0 border-b border-gray-800 bg-gray-900">
        {/* 左: タイトル・ファイル名 */}
        <div className="flex items-center gap-3">
          <h1 className="text-white font-bold text-base tracking-wide">
            Smart Parse Memo
          </h1>
          <span className={`text-sm truncate max-w-[40vw] ${isConnected ? 'text-gray-400' : 'text-gray-600'}`}>
            {currentFileName}
          </span>
        </div>

        {/* 右: 保存ステータス・ボタン群 */}
        <div className="flex items-center gap-2 shrink-0">
          {activeTab === 'today' && <StatusBadge status={saveStatus} />}
          {activeTab === 'memo' && <StatusBadge status={memoSaveStatus} />}

          {/* 再接続ボタン（IndexedDB にハンドルがあるが未接続の場合のみ表示） */}
          {pendingReconnect && (
            <button
              onClick={reconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white transition-colors"
            >
              <RefreshCw size={13} />
              再接続
            </button>
          )}

          <button
            onClick={handleOpen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white transition-colors"
          >
            <FolderOpen size={14} />
            ファイルを開く
          </button>

          {/* 設定ボタン */}
          <button
            onClick={() => setShowSettings(true)}
            title="設定"
            className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'reloaded':
      return (
        <span className="flex items-center gap-1 text-cyan-400 text-xs">
          <RefreshCw size={13} /> 外部変更を読み込み
        </span>
      );
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
