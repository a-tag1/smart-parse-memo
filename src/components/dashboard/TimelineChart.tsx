import type { Schedule } from '../../lib/parserEngine';
import { timeToMinutes } from '../../lib/parserEngine';

const DAY_START_H = 8;
const DAY_END_H   = 21;
const TOTAL_MIN   = (DAY_END_H - DAY_START_H) * 60;

function toPercent(time: string): number {
  const minutes = timeToMinutes(time) - DAY_START_H * 60;
  return Math.max(0, Math.min(100, (minutes / TOTAL_MIN) * 100));
}

function durationPercent(start: string, end: string): number {
  const dur = timeToMinutes(end) - timeToMinutes(start);
  return Math.max(0, Math.min(100, (dur / TOTAL_MIN) * 100));
}

const hours = Array.from(
  { length: DAY_END_H - DAY_START_H + 1 },
  (_, i) => DAY_START_H + i,
);

interface TimelineRowProps {
  label: string;
  schedules: Schedule[];
  barColor: string;
}

function TimelineRow({ label, schedules, barColor }: TimelineRowProps) {
  return (
    <div className="mb-2">
      <div className="text-[10px] text-gray-500 mb-0.5">{label}</div>
      <div className="relative h-7 bg-gray-800 rounded overflow-hidden">
        {schedules.map((s, i) => (
          <div
            key={i}
            className={`absolute top-0 h-full ${barColor} flex items-center px-1 text-[10px] text-white overflow-hidden`}
            style={{
              left:  `${toPercent(s.startTime)}%`,
              width: `${durationPercent(s.startTime, s.endTime)}%`,
              minWidth: '2px',
            }}
            title={`${s.taskName}  ${s.startTime}–${s.endTime}`}
          >
            <span className="truncate">{s.taskName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Props {
  schedules: Schedule[];
}

export function TimelineChart({ schedules }: Props) {
  const planItems   = schedules.filter((s) => s.type === 'plan');
  const resultItems = schedules.filter((s) => s.type === 'result');

  return (
    <section className="px-4 py-3 border-b border-gray-800">
      <h2 className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wider">
        本日のタイムライン
      </h2>

      {/* 時刻目盛り */}
      <div className="flex mb-1 border-b border-gray-700 pb-1">
        {hours.map((h) => (
          <div
            key={h}
            className="flex-1 text-[9px] text-gray-600 text-center"
            style={{ minWidth: 0 }}
          >
            {h}
          </div>
        ))}
      </div>

      {schedules.length === 0 ? (
        <p className="text-gray-700 text-xs py-3 text-center">
          スケジュール行（HH:MM-HH:MM）が見つかりません
        </p>
      ) : (
        <>
          {planItems.length > 0 && (
            <TimelineRow label="予定" schedules={planItems} barColor="bg-blue-500" />
          )}
          {resultItems.length > 0 && (
            <TimelineRow label="実績" schedules={resultItems} barColor="bg-emerald-500" />
          )}
        </>
      )}

      {/* 凡例 */}
      <div className="flex gap-4 mt-1">
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="inline-block w-3 h-2 rounded-sm bg-blue-500" /> 予定
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="inline-block w-3 h-2 rounded-sm bg-emerald-500" /> 実績
        </span>
      </div>
    </section>
  );
}
