import { useAppStore } from '../../store/appStore';
import type { Task } from '../../lib/parserEngine';

interface Props {
  tasks: Task[];
}

/** "M/D" 文字列を今年の Date オブジェクトに変換 */
function deadlineToDate(deadline: string): Date {
  const [m, d] = deadline.split('/').map(Number);
  const now = new Date();
  const date = new Date(now.getFullYear(), m - 1, d);
  // 年を跨ぐ場合（例: 1/5 が現在月より前で来年とみなすケース）は対応しない（同年固定）
  return date;
}

/** 今日の0時0分0秒 */
function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function TaskDeadline({ tasks }: Props) {
  const setFocusLineIndex = useAppStore((s) => s.setFocusLineIndex);

  // 未完了タスクを期限あり・なしに分ける
  const incompleteTasks = tasks.filter((t) => t.status !== 'done');
  const tasksWithDeadline = incompleteTasks.filter((t) => t.deadline);
  const tasksWithoutDeadline = incompleteTasks.filter((t) => !t.deadline);

  if (tasksWithDeadline.length === 0 && tasksWithoutDeadline.length === 0) {
    return (
      <section className="px-4 py-3">
        <h2 className="text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
          タスク期限
        </h2>
        <p className="text-gray-700 text-xs py-2 text-center">
          期限付きタスク（[M/D]）が見つかりません
        </p>
      </section>
    );
  }

  // 日付でグループ化
  const groups = new Map<string, Task[]>();
  for (const task of tasksWithDeadline) {
    const key = task.deadline!;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(task);
  }

  // 日付順（昇順）にソート
  const sortedKeys = [...groups.keys()].sort((a, b) => {
    return deadlineToDate(a).getTime() - deadlineToDate(b).getTime();
  });

  const todayDate = today();

  return (
    <section className="px-4 py-3">
      <h2 className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wider">
        タスク期限
      </h2>
      <div className="space-y-4">
        {sortedKeys.map((dateKey) => {
          const deadlineDate = deadlineToDate(dateKey);
          deadlineDate.setHours(0, 0, 0, 0);
          const diffDays = Math.round(
            (deadlineDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24),
          );

          let dateColor: string;
          let badge: string | null = null;
          if (diffDays < 0) {
            dateColor = 'text-red-400';
            badge = `${Math.abs(diffDays)}日超過`;
          } else if (diffDays === 0) {
            dateColor = 'text-orange-400';
            badge = '今日';
          } else if (diffDays <= 3) {
            dateColor = 'text-yellow-400';
            badge = `あと${diffDays}日`;
          } else {
            dateColor = 'text-gray-300';
            badge = `あと${diffDays}日`;
          }

          const groupTasks = groups.get(dateKey)!;

          return (
            <div key={dateKey}>
              {/* 日付ヘッダ */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-sm font-semibold ${dateColor}`}>
                  {dateKey}
                </span>
                {badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                      diffDays < 0
                        ? 'border-red-700 text-red-400 bg-red-950/40'
                        : diffDays === 0
                        ? 'border-orange-700 text-orange-400 bg-orange-950/40'
                        : diffDays <= 3
                        ? 'border-yellow-700 text-yellow-400 bg-yellow-950/40'
                        : 'border-gray-700 text-gray-400 bg-gray-900/40'
                    }`}
                  >
                    {badge}
                  </span>
                )}
                <div className="flex-1 h-px bg-gray-800" />
              </div>

              {/* タスク一覧 */}
              <div className="space-y-1.5 pl-1">
                {groupTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-1.5">
                    <span className="text-[10px] text-gray-600 mt-0.5 shrink-0">
                      [{task.id}]
                    </span>
                    <div className="flex-1 min-w-0">
                      {task.project && (
                        <span className="text-xs text-blue-400 mr-1">
                          {task.project}:
                        </span>
                      )}
                      <span
                        className={`text-sm cursor-pointer select-none ${
                          task.starred ? 'text-amber-200 font-semibold' : 'text-gray-200'
                        }`}
                        title="ダブルクリックでエディタの該当行へジャンプ"
                        onDoubleClick={() => setFocusLineIndex(task.lineIndex)}
                      >
                        {task.starred && (
                          <span className="text-amber-400 mr-0.5">★</span>
                        )}
                        {task.title}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* 期限未設定タスク */}
        {tasksWithoutDeadline.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-semibold text-gray-500">
                期限未設定
              </span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>
            <div className="space-y-1.5 pl-1">
              {tasksWithoutDeadline.map((task) => (
                <div key={task.id} className="flex items-start gap-1.5">
                  <span className="text-[10px] text-gray-600 mt-0.5 shrink-0">
                    [{task.id}]
                  </span>
                  <div className="flex-1 min-w-0">
                    {task.project && (
                      <span className="text-xs text-blue-400 mr-1">
                        {task.project}:
                      </span>
                    )}
                    <span
                      className={`text-sm cursor-pointer select-none ${
                        task.starred ? 'text-amber-200 font-semibold' : 'text-gray-400'
                      }`}
                      title="ダブルクリックでエディタの該当行へジャンプ"
                      onDoubleClick={() => setFocusLineIndex(task.lineIndex)}
                    >
                      {task.starred && (
                        <span className="text-amber-400 mr-0.5">★</span>
                      )}
                      {task.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
