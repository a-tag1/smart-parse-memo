// ── 稼働サマリー生成（合算ロジック） ─────────────────────────────
// parserEngine.ts から Schedule / WorkSummaryEntry / timeToMinutes を import。
// parserEngine 側は summaryEngine に依存しないため循環参照なし。

import type { Schedule, WorkSummaryEntry } from './parserEngine';
import { timeToMinutes } from './parserEngine';

/**
 * result 区分のスケジュール行をタスク名でグルーピングし、
 * 合計稼働時間（分）を算出して返す。
 * 設計書 §5.2 の生成アルゴリズムに準拠。
 */
export function buildWorkSummary(schedules: Schedule[]): WorkSummaryEntry[] {
  return buildSummaryByType(schedules, 'result');
}

/**
 * plan 区分のスケジュール行をタスク名でグルーピングし、
 * 合計予定時間（分）を算出して返す。
 */
export function buildPlanSummary(schedules: Schedule[]): WorkSummaryEntry[] {
  return buildSummaryByType(schedules, 'plan');
}

function buildSummaryByType(
  schedules: Schedule[],
  type: 'plan' | 'result',
): WorkSummaryEntry[] {
  const filtered = schedules.filter((s) => s.type === type);
  const map = new Map<string, number>();

  for (const s of filtered) {
    const dur = timeToMinutes(s.endTime) - timeToMinutes(s.startTime);
    if (dur <= 0) continue;
    map.set(s.taskName, (map.get(s.taskName) ?? 0) + dur);
  }

  return Array.from(map.entries()).map(([label, totalMinutes]) => ({
    label,
    totalMinutes,
  }));
}
