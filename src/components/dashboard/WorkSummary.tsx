import type { WorkSummaryEntry } from '../../lib/parserEngine';
import { minutesToHHMM } from '../../lib/parserEngine';

interface Props {
  entries:     WorkSummaryEntry[];
  planEntries: WorkSummaryEntry[];
}

function SummaryList({
  items,
  totalLabel,
  valueColor,
}: {
  items:      WorkSummaryEntry[];
  totalLabel: string;
  valueColor: string;
}) {
  const sorted       = [...items].sort((a, b) => b.totalMinutes - a.totalMinutes);
  const totalMinutes = items.reduce((s, e) => s + e.totalMinutes, 0);
  return (
    <div className="space-y-1">
      {sorted.map((entry) => (
        <div key={entry.label} className="flex items-center justify-between">
          <span className="text-sm text-gray-300 truncate flex-1 mr-2">{entry.label}</span>
          <span className={`text-xs shrink-0 ${valueColor}`}>
            {minutesToHHMM(entry.totalMinutes)}
          </span>
        </div>
      ))}
      <div className="border-t border-gray-800 pt-1.5 mt-1.5 flex justify-between">
        <span className="text-xs text-gray-500">{totalLabel}</span>
        <span className="text-xs text-white font-semibold">{minutesToHHMM(totalMinutes)}</span>
      </div>
    </div>
  );
}

/** 稼働サマリー：予定・実績をタスク名で合算して表示（設計書 §5.2） */
export function WorkSummary({ entries, planEntries }: Props) {
  return (
    <section className="px-4 py-3 space-y-4">
      {/* 予定サマリー */}
      <div>
        <h2 className="text-xs font-semibold text-blue-400 mb-2 uppercase tracking-wider">
          予定サマリー
        </h2>
        {planEntries.length === 0 ? (
          <p className="text-gray-700 text-xs py-2 text-center">
            本日予定のスケジュール行が見つかりません
          </p>
        ) : (
          <SummaryList items={planEntries} totalLabel="合計予定" valueColor="text-blue-400" />
        )}
      </div>

      {/* 稼働サマリー */}
      <div>
        <h2 className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wider">
          稼働サマリー（日報用）
        </h2>
        {entries.length === 0 ? (
          <p className="text-gray-700 text-xs py-2 text-center">
            本日結果のスケジュール行が見つかりません
          </p>
        ) : (
          <SummaryList items={entries} totalLabel="合計稼働" valueColor="text-emerald-400" />
        )}
      </div>
    </section>
  );
}
