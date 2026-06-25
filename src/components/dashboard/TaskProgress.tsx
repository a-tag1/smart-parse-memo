import type { Task } from '../../lib/parserEngine';

interface Props {
  tasks: Task[];
}

export function TaskProgress({ tasks }: Props) {
  // プロジェクト別にグループ化
  const groups = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    (acc[t.project] ??= []).push(t);
    return acc;
  }, {});

  const entries = Object.entries(groups);

  return (
    <section className="px-4 py-3 border-b border-gray-800">
      <h2 className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wider">
        案件別タスク進捗
      </h2>

      {entries.length === 0 ? (
        <p className="text-gray-700 text-xs py-3 text-center">
          タスク行（X-XX：）が見つかりません
        </p>
      ) : (
        <div className="space-y-2.5">
          {entries.map(([project, projectTasks]) => {
            const done    = projectTasks.filter((t) => t.status === 'done').length;
            const total   = projectTasks.length;
            const percent = Math.round((done / total) * 100);

            return (
              <div key={project}>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-xs text-gray-300 truncate max-w-[70%]">
                    {project}
                  </span>
                  <span className="text-[10px] text-gray-500 shrink-0">
                    {done}/{total}（{percent}%）
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-[width] duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                {/* タスク一覧（折りたたみなし） */}
                <div className="mt-1 space-y-0.5">
                  {projectTasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-1.5 text-[10px]">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          t.status === 'done' ? 'bg-emerald-500' : 'bg-gray-600'
                        }`}
                      />
                      <span
                        className={
                          t.status === 'done'
                            ? 'text-gray-600 line-through'
                            : 'text-gray-400'
                        }
                      >
                        [{t.id}] {t.title}
                        {t.doneDate && (
                          <span className="ml-1 text-emerald-700">済({t.doneDate})</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
