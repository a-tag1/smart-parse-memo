import { useAppStore } from '../../store/appStore';
import { TimelineChart } from './TimelineChart';
import { TaskProgress } from './TaskProgress';
import { WorkSummary } from './WorkSummary';
import { timeToMinutes, minutesToHHMM } from '../../lib/parserEngine';
import type { Schedule } from '../../lib/parserEngine';

function calcTotalMinutes(schedules: Schedule[]): number {
  return schedules.reduce((sum, s) => {
    const dur = timeToMinutes(s.endTime) - timeToMinutes(s.startTime);
    return sum + Math.max(0, dur);
  }, 0);
}

export function InsightPanel() {
  const parsedData = useAppStore((s) => s.parsedData);

  if (!parsedData) {
    return (
      <div className="flex h-full items-center justify-center text-gray-700 text-sm">
        テキストを入力すると解析結果が表示されます
      </div>
    );
  }

  const { schedules, tasks, completedTasks, workSummary } = parsedData;

  const planMinutes   = calcTotalMinutes(schedules.filter((s) => s.type === 'plan'));
  const resultMinutes = calcTotalMinutes(schedules.filter((s) => s.type === 'result'));
  const doneTasks     = tasks.filter((t) => t.status === 'done').length + completedTasks.length;
  const totalTasks    = tasks.length + completedTasks.length;

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-950 text-white">
      {/* ── サマリーカード ─────────────────────── */}
      <div className="flex gap-2 px-4 py-3 border-b border-gray-800">
        <SummaryCard label="予定時間" value={minutesToHHMM(planMinutes)} color="text-blue-400" />
        <SummaryCard label="実績時間" value={minutesToHHMM(resultMinutes)} color="text-emerald-400" />
        <SummaryCard
          label="完了タスク"
          value={`${doneTasks} / ${totalTasks}`}
          color="text-purple-400"
        />
      </div>

      {/* ── タイムライン ──────────────────────── */}
      <TimelineChart schedules={schedules} />

      {/* ── タスク進捗 ─────────────────────────── */}
      <TaskProgress tasks={tasks} completedTasks={completedTasks} />

      {/* ── 稼働サマリー（日報用）────────────── */}
      <WorkSummary entries={workSummary} />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex-1 bg-gray-900 rounded p-2 border border-gray-800">
      <div className="text-[10px] text-gray-500 mb-0.5">{label}</div>
      <div className={`text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}

