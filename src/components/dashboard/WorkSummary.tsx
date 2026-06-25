import type { WorkSummaryEntry } from '../../lib/parserEngine';
import { minutesToHHMM } from '../../lib/parserEngine';

interface Props {
  entries: WorkSummaryEntry[];
}

/** 稼働サマリー：時刻なし・同一タスク名を合算して表示（設計書 §5.2） */
export function WorkSummary({ entries }: Props) {
  const totalMinutes = entries.reduce((s, e) => s + e.totalMinutes, 0);

  return (
    <section className="px-4 py-3">
      <h2 className="text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
        稼働サマリー（日報用）
      </h2>

      {entries.length === 0 ? (
        <p className="text-gray-700 text-xs py-3 text-center">
          本日結果のスケジュール行が見つかりません
        </p>
      ) : (
        <>
          {/* 一覧表示 */}
          <div className="space-y-1 mb-3">
            {entries.map((entry) => (
              <div key={entry.label} className="flex items-center justify-between">
                <span className="text-sm text-gray-300 truncate flex-1 mr-2">{entry.label}</span>
                <span className="text-xs text-emerald-400 shrink-0">
                  {minutesToHHMM(entry.totalMinutes)}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-800 pt-1.5 mt-1.5 flex justify-between">
              <span className="text-xs text-gray-500">合計稼働</span>
              <span className="text-xs text-white font-semibold">{minutesToHHMM(totalMinutes)}</span>
            </div>
          </div>

          {/* 日報コピー用テキスト（select-all でまとめてコピー可能） */}
          <pre className="whitespace-pre-wrap font-mono text-[11px] text-gray-500 bg-gray-900 rounded p-3 leading-5 select-all">
            {entries.map((e) => `${e.label}：${minutesToHHMM(e.totalMinutes)}`).join('\n')}
            {`\n合計稼働：${minutesToHHMM(totalMinutes)}`}
          </pre>
        </>
      )}
    </section>
  );
}
