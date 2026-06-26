import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { TimelineChart } from './TimelineChart';
import { TaskProgress } from './TaskProgress';
import { WorkSummary } from './WorkSummary';
import { timeToMinutes, minutesToHHMM } from '../../lib/parserEngine';
import type { Schedule } from '../../lib/parserEngine';

type PanelTab = 'task' | 'summary' | 'timeline';

function calcTotalMinutes(schedules: Schedule[]): number {
  return schedules.reduce((sum, s) => {
    const dur = timeToMinutes(s.endTime) - timeToMinutes(s.startTime);
    return sum + Math.max(0, dur);
  }, 0);
}

const TABS: { id: PanelTab; label: string }[] = [
  { id: 'task',     label: 'タスク進捗' },
  { id: 'summary',  label: '稼働サマリー' },
  { id: 'timeline', label: 'タイムライン' },
];

export function InsightPanel() {
  const parsedData = useAppStore((s) => s.parsedData);
  const [activeTab, setActiveTab] = useState<PanelTab>('task');

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
    <div className="flex flex-col h-full bg-gray-950 text-white">
      {/* ── サマリーカード ─────────────────────── */}
      <div className="flex gap-2 px-4 py-3 border-b border-gray-800 shrink-0">
        <SummaryCard label="予定時間" value={minutesToHHMM(planMinutes)} color="text-blue-400" />
        <SummaryCard label="実績時間" value={minutesToHHMM(resultMinutes)} color="text-emerald-400" />
        <SummaryCard
          label="完了タスク"
          value={`${doneTasks} / ${totalTasks}`}
          color="text-purple-400"
        />
      </div>

      {/* ── タブバー ──────────────────────────── */}
      <div className="flex shrink-0 border-b border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── タブコンテンツ ────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'task' && (
          <TaskProgress tasks={tasks} completedTasks={completedTasks} />
        )}
        {activeTab === 'summary' && (
          <WorkSummary entries={workSummary} />
        )}
        {activeTab === 'timeline' && (
          <TimelineChart schedules={schedules} />
        )}
      </div>
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

