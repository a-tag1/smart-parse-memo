import { useMemo } from 'react';
import type { Schedule } from '../../lib/parserEngine';
import { timeToMinutes } from '../../lib/parserEngine';

const DAY_START_H = 8;
const DAY_END_H   = 22;
const TOTAL_MIN   = (DAY_END_H - DAY_START_H) * 60;

const HOUR_LABELS = Array.from(
  { length: DAY_END_H - DAY_START_H + 1 },
  (_, i) => DAY_START_H + i,
);

function relPercent(time: string): number {
  const rel = timeToMinutes(time) - DAY_START_H * 60;
  return Math.max(0, Math.min(100, (rel / TOTAL_MIN) * 100));
}

function durPercent(start: string, end: string): number {
  const dur = timeToMinutes(end) - timeToMinutes(start);
  return Math.max(0, Math.min(100 - relPercent(start), (dur / TOTAL_MIN) * 100));
}

function getNowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function isActive(s: Schedule, nowMin: number): boolean {
  return timeToMinutes(s.startTime) <= nowMin && nowMin < timeToMinutes(s.endTime);
}

function padTime(t: string): string {
  const [h, m] = t.split(':');
  return `${h.padStart(2, '0')}:${m}`;
}

// ── ミニガントバー（テキストなし・ツールチップ付き）──────────────
interface MiniBarProps {
  items:    Schedule[];
  nowMin:   number;
  nowPct:   number;
  typeLabel: string;
  barColor: string;
}

function MiniBar({ items, nowMin, nowPct, typeLabel, barColor }: MiniBarProps) {
  return (
    <div className="relative h-3 bg-gray-800 rounded overflow-hidden">
      {items.map((s, i) => (
        <div
          key={i}
          className={`absolute top-0 h-full rounded-sm ${
            isActive(s, nowMin) ? 'bg-amber-400' : barColor
          }`}
          style={{
            left:     `${relPercent(s.startTime)}%`,
            width:    `${durPercent(s.startTime, s.endTime)}%`,
            minWidth: '2px',
          }}
          title={`${typeLabel}: ${s.taskName}  ${padTime(s.startTime)}–${padTime(s.endTime)}`}
        />
      ))}
      {/* 現在時刻ライン */}
      {nowPct >= 0 && nowPct <= 100 && (
        <div
          className="absolute top-0 h-full w-0.5 bg-amber-400 z-10"
          style={{ left: `${nowPct}%` }}
        />
      )}
    </div>
  );
}

// ── 縦リスト ────────────────────────────────────────────────────
interface ScheduleListProps {
  items:    Schedule[];
  nowMin:   number;
  dotColor: string;
}

function ScheduleList({ items, nowMin, dotColor }: ScheduleListProps) {
  return (
    <div className="space-y-0.5">
      {items.map((s, i) => {
        const active = isActive(s, nowMin);
        return (
          <div
            key={i}
            className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
              active
                ? 'bg-amber-950/50 border border-amber-700/60'
                : 'border border-transparent'
            }`}
          >
            <span
              className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                active ? 'bg-amber-400' : dotColor
              }`}
            />
            <span
              className={`shrink-0 font-mono tabular-nums ${
                active ? 'text-amber-300' : 'text-gray-500'
              }`}
            >
              {padTime(s.startTime)}–{padTime(s.endTime)}
            </span>
            <span
              className={`truncate ${
                active ? 'text-amber-200 font-semibold' : 'text-gray-300'
              }`}
            >
              {s.taskName}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── メイン ───────────────────────────────────────────────────────
interface Props {
  schedules: Schedule[];
}

export function TimelineChart({ schedules }: Props) {
  const nowMin = useMemo(() => getNowMinutes(), []);
  const nowPct = useMemo(() => {
    const rel = nowMin - DAY_START_H * 60;
    return Math.max(-1, Math.min(101, (rel / TOTAL_MIN) * 100));
  }, [nowMin]);

  const planItems   = schedules.filter((s) => s.type === 'plan');
  const resultItems = schedules.filter((s) => s.type === 'result');

  return (
    <section className="px-4 py-3">
      <h2 className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wider">
        本日のタイムライン
      </h2>

      {schedules.length === 0 ? (
        <p className="text-gray-700 text-xs py-3 text-center">
          スケジュール行（HH:MM-HH:MM）が見つかりません
        </p>
      ) : (
        <>
          {/* ── ミニガントバー ── */}
          <div className="mb-4">
            {/* 時刻目盛り */}
            <div className="flex mb-1">
              {HOUR_LABELS.map((h) => (
                <div
                  key={h}
                  className="flex-1 text-[9px] text-gray-600"
                  style={{ minWidth: 0 }}
                >
                  {h}
                </div>
              ))}
            </div>
            {planItems.length > 0 && (
              <div className="mb-1">
                <MiniBar
                  items={planItems}
                  nowMin={nowMin}
                  nowPct={nowPct}
                  typeLabel="予定"
                  barColor="bg-blue-500"
                />
              </div>
            )}
            {resultItems.length > 0 && (
              <MiniBar
                items={resultItems}
                nowMin={nowMin}
                nowPct={nowPct}
                typeLabel="実績"
                barColor="bg-emerald-500"
              />
            )}
          </div>

          {/* ── 縦リスト ── */}
          <div className="space-y-3">
            {planItems.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-1">
                  <span className="inline-block w-2 h-2 rounded-sm bg-blue-500" />
                  予定
                </div>
                <ScheduleList items={planItems} nowMin={nowMin} dotColor="bg-blue-500" />
              </div>
            )}
            {resultItems.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                  <span className="inline-block w-2 h-2 rounded-sm bg-emerald-500" />
                  実績
                </div>
                <ScheduleList items={resultItems} nowMin={nowMin} dotColor="bg-emerald-500" />
              </div>
            )}
          </div>

          {/* 凡例 */}
          <div className="flex gap-4 mt-3 pt-2 border-t border-gray-800">
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className="inline-block w-3 h-2 rounded-sm bg-blue-500" /> 予定
            </span>
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className="inline-block w-3 h-2 rounded-sm bg-emerald-500" /> 実績
            </span>
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className="inline-block w-3 h-2 rounded-sm bg-amber-400" /> 進行中
            </span>
          </div>
        </>
      )}
    </section>
  );
}
