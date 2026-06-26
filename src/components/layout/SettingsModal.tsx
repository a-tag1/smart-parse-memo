import { X, FolderOpen, Trash2, Settings } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useFileAccess } from '../../hooks/useFileAccess';

interface Props {
  onClose: () => void;
}

export function SettingsModal({ onClose }: Props) {
  const storedTodayName   = useAppStore((s) => s.storedTodayName);
  const storedArchiveName = useAppStore((s) => s.storedArchiveName);
  const {
    openTodayFile,
    openArchiveFile,
    clearStoredTodayHandle,
    clearStoredArchiveHandle,
  } = useFileAccess();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg w-80 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダ */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Settings size={14} />
            設定
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* 本日ファイル */}
        <FileRow
          label="本日ファイル"
          name={storedTodayName}
          onOpen={openTodayFile}
          onClear={clearStoredTodayHandle}
        />

        {/* アーカイブファイル */}
        <FileRow
          label="アーカイブファイル"
          name={storedArchiveName}
          onOpen={openArchiveFile}
          onClear={clearStoredArchiveHandle}
        />

        {/* 注記 */}
        <p className="text-[10px] text-gray-600 leading-4 mt-4 border-t border-gray-800 pt-3">
          ブラウザのセキュリティ制限により、再読み込み後はアクセス許可が必要です。
          ヘッダの「再接続」ボタンで前回のファイルに再接続できます（クリック1回）。
        </p>
      </div>
    </div>
  );
}

function FileRow({
  label,
  name,
  onOpen,
  onClear,
}: {
  label:   string;
  name:    string | null;
  onOpen:  () => void;
  onClear: () => void;
}) {
  return (
    <div className="mb-4">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
        {label}
      </div>
      <div className="flex items-center gap-1">
        <span className={`flex-1 text-sm truncate ${name ? 'text-gray-300' : 'text-gray-600'}`}>
          {name ?? '未設定'}
        </span>
        <button
          onClick={onOpen}
          title="ファイルを選択"
          className="p-1.5 text-blue-400 hover:text-blue-300 transition-colors"
        >
          <FolderOpen size={13} />
        </button>
        {name && (
          <button
            onClick={onClear}
            title="設定をクリア"
            className="p-1.5 text-red-500 hover:text-red-400 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
