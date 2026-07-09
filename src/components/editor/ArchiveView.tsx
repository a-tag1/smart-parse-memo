import { useState, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { useFileAccess } from '../../hooks/useFileAccess';
import { useArchive } from '../../hooks/useArchive';
import { aggregateMonthlyCompletedTasks } from '../../lib/archiveEngine';

type ViewMode = 'daily' | 'monthly-completed';

/** 過去タブ用の左ペイン：日付リスト + 選択エントリの読み取り専用表示 */
export function ArchiveView() {
  const archiveFileHandle = useAppStore((s) => s.archiveFileHandle);
  const { openArchiveFile } = useFileAccess();
  const { archiveEntries, selectedArchiveDate, selectDate } = useArchive();

  const [viewMode, setViewMode] = useState<ViewMode>('daily');

  const selectedEntry = archiveEntries.find((e) => e.date === selectedArchiveDate);

  // 選択日付から月を導出（未選択は最新月）
  const selectedMonth = useMemo(() => {
    if (selectedArchiveDate) return selectedArchiveDate.slice(0, 7);
    const sorted = archiveEntries.slice().sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0]?.date.slice(0, 7) ?? '';
  }, [selectedArchiveDate, archiveEntries]);

  // 利用可能な月リスト（降順）
  const availableMonths = useMemo(() => {
    const months = new Set(archiveEntries.map((e) => e.date.slice(0, 7)));
    return [...months].sort((a, b) => b.localeCompare(a));
  }, [archiveEntries]);

  const [selectedMonthForView, setSelectedMonthForView] = useState<string>('');
  const activeMonth = selectedMonthForView || selectedMonth;

  // 月次完了タスク集計
  const monthlyTasks = useMemo(() => {
    if (!activeMonth) return [];
    return aggregateMonthlyCompletedTasks(archiveEntries, activeMonth);
  }, [archiveEntries, activeMonth]);

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

      {/* ビュー切替タブ */}
      <div className="shrink-0 flex border-b border-gray-800 bg-gray-900">
        <button
          onClick={() => setViewMode('daily')}
          className={`px-4 py-1.5 text-xs font-medium transition-colors ${
            viewMode === 'daily'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          日別テキスト
        </button>
        <button
          onClick={() => setViewMode('monthly-completed')}
          className={`px-4 py-1.5 text-xs font-medium transition-colors ${
            viewMode === 'monthly-completed'
              ? 'text-white border-b-2 border-emerald-500'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          月次完了タスク
        </button>
      </div>

      {/* 日別テキストビュー */}
      {viewMode === 'daily' && (
        selectedEntry ? (
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
        )
      )}

      {/* 月次完了タスクビュー */}
      {viewMode === 'monthly-completed' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* 月セレクター */}
          <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-gray-800 bg-gray-900">
            <span className="text-xs text-gray-500">対象月：</span>
            <select
              value={activeMonth}
              onChange={(e) => setSelectedMonthForView(e.target.value)}
              className="bg-gray-800 text-gray-200 text-xs px-2 py-1 rounded border border-gray-700 outline-none"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <span className="text-xs text-gray-600 ml-auto">
              {monthlyTasks.reduce((s, d) => s + d.tasks.length, 0)} 件完了
            </span>
          </div>

          {/* タスク一覧 */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {monthlyTasks.length === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-700 text-xs">
                {activeMonth} の完了タスクが見つかりません
              </div>
            ) : (
              monthlyTasks.map(({ date, tasks }) => (
                <div key={date} className="mb-5">
                  <div className="text-xs text-emerald-500 font-semibold mb-1.5 tracking-wide">
                    {date}
                  </div>
                  <ul className="space-y-0.5">
                    {tasks.map((task, i) => {
                      const isSubtask = /^\s/.test(task);
                      const label = task.trim();
                      return isSubtask ? (
                        <li
                          key={i}
                          className="flex items-start gap-1.5 pl-6 text-[11px] text-gray-500 leading-5"
                        >
                          <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full bg-gray-600" />
                          <span>{label}</span>
                        </li>
                      ) : (
                        <li
                          key={i}
                          className="flex items-start gap-1.5 pl-2 border-l-2 border-emerald-700 text-xs text-gray-200 font-medium leading-5"
                        >
                          <span>{label}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
