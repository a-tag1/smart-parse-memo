import { useAppStore } from '../../store/appStore';
import { useFileAccess } from '../../hooks/useFileAccess';
import { useArchive } from '../../hooks/useArchive';

/** 過去タブ用の左ペイン：日付リスト + 選択エントリの読み取り専用表示 */
export function ArchiveView() {
  const archiveFileHandle = useAppStore((s) => s.archiveFileHandle);
  const { openArchiveFile } = useFileAccess();
  const { archiveEntries, selectedArchiveDate, selectDate } = useArchive();

  const selectedEntry = archiveEntries.find((e) => e.date === selectedArchiveDate);

  // アーカイブ未接続
  if (!archiveFileHandle) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 text-gray-600">
        <p className="text-sm">アーカイブファイルが接続されていません</p>
        <button
          onClick={openArchiveFile}
          className="px-4 py-2 rounded text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors"
        >
          アーカイブを開く（archive_YYYY_MM.txt）
        </button>
      </div>
    );
  }

  // アーカイブが空
  if (archiveEntries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-600 text-sm">
        アーカイブにエントリがありません
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-950 font-mono text-sm">
      {/* 日付リスト（新しい日付が上） */}
      <div className="shrink-0 overflow-y-auto border-b border-gray-800 bg-gray-900 max-h-52">
        {archiveEntries
          .slice()
          .reverse()
          .map((entry) => (
            <button
              key={entry.date}
              onClick={() => selectDate(entry.date)}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                entry.date === selectedArchiveDate
                  ? 'bg-blue-700 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              {entry.date}
            </button>
          ))}
      </div>

      {/* 選択エントリの内容（読み取り専用・グレーアウト） */}
      {selectedEntry ? (
        <textarea
          value={selectedEntry.rawText}
          readOnly
          aria-readonly
          className="flex-1 bg-gray-950 text-gray-500 px-4 py-4 resize-none outline-none
                     leading-6 overflow-auto cursor-default select-text opacity-75"
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-gray-700 text-sm">
          上のリストから日付を選択してください
        </div>
      )}
    </div>
  );
}
