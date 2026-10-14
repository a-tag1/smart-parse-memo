import { useState, useCallback, useEffect, useMemo } from 'react';
import { Link2 } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useFileAccess } from '../../hooks/useFileAccess';
import { toggleSubTaskDone, completeAndMoveTask, toggleTaskStar, toggleSubTaskStar } from '../../lib/parserEngine';
import type { Task, SubTask } from '../../lib/parserEngine';

interface Props {
  tasks:          Task[];
  completedTasks: Task[];
}

export function TaskProgress({ tasks, completedTasks }: Props) {
  const rawText       = useAppStore((s) => s.rawText);
  const setRawText    = useAppStore((s) => s.setRawText);
  const activeTab     = useAppStore((s) => s.activeTab);
  const memoText      = useAppStore((s) => s.memoText);
  const memoFileHandle = useAppStore((s) => s.memoFileHandle);
  const setActiveTab  = useAppStore((s) => s.setActiveTab);
  const setPendingMemoLinkId = useAppStore((s) => s.setPendingMemoLinkId);
  const focusTaskLineIndex    = useAppStore((s) => s.focusTaskLineIndex);
  const setFocusTaskLineIndex = useAppStore((s) => s.setFocusTaskLineIndex);
  const { saveToday } = useFileAccess();

  const [showCompleted, setShowCompleted] = useState(false);
  const [showLowPriority, setShowLowPriority] = useState(false);
  const [highlightedLineIndex, setHighlightedLineIndex] = useState<number | null>(null);
  const readonly = activeTab === 'archive';
  const memoLinkIds = useMemo(() => {
    const ids = new Set<string>();
    for (const line of memoText.split('\n')) {
      const match = line.trimStart().match(/^■(\d+-\d+(?:_[A-Za-z]+)?)(?=$|[\s：:])/);
      if (match) ids.add(match[1]);
    }
    return ids;
  }, [memoText]);

  const handleMemoLink = useCallback((task: Task) => {
    setPendingMemoLinkId(task.id);
    setActiveTab('memo');
  }, [setActiveTab, setPendingMemoLinkId]);

  // タスク行ジャンプ: 折りたたみセクションを展開→スクロール→ハイライト
  useEffect(() => {
    if (focusTaskLineIndex === null) return;
    const inCompleted = completedTasks.some((t) => t.lineIndex === focusTaskLineIndex);
    const inLow       = tasks.some((t) => t.lineIndex === focusTaskLineIndex && t.priority === 'low');
    if (inCompleted) setShowCompleted(true);
    if (inLow)       setShowLowPriority(true);
    setFocusTaskLineIndex(null);
    setHighlightedLineIndex(focusTaskLineIndex);
  }, [focusTaskLineIndex, tasks, completedTasks, setFocusTaskLineIndex]);

  useEffect(() => {
    if (highlightedLineIndex === null) return;
    const scrollTimer = setTimeout(() => {
      document
        .getElementById(`task-row-${highlightedLineIndex}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
    const clearTimer = setTimeout(() => setHighlightedLineIndex(null), 1500);
    return () => { clearTimeout(scrollTimer); clearTimeout(clearTimer); };
  }, [highlightedLineIndex]);

  const handleCompleteTask = useCallback(
    (task: Task) => {
      if (readonly) return;
      const next = completeAndMoveTask(rawText, task);
      setRawText(next);
      saveToday(next);
    },
    [rawText, setRawText, saveToday, readonly],
  );

  const handleToggleSubTask = useCallback(
    (subTask: SubTask) => {
      if (readonly) return;
      const next = toggleSubTaskDone(rawText, subTask);
      setRawText(next);
      saveToday(next);
    },
    [rawText, setRawText, saveToday, readonly],
  );

  const handleToggleStar = useCallback(
    (task: Task) => {
      if (readonly) return;
      const next = toggleTaskStar(rawText, task);
      setRawText(next);
      saveToday(next);
    },
    [rawText, setRawText, saveToday, readonly],
  );

  const handleToggleSubTaskStar = useCallback(
    (subTask: SubTask) => {
      if (readonly) return;
      const next = toggleSubTaskStar(rawText, subTask);
      setRawText(next);
      saveToday(next);
    },
    [rawText, setRawText, saveToday, readonly],
  );

  const totalDone = tasks.filter((t) => t.status === 'done').length + completedTasks.length;
  const totalAll  = tasks.length + completedTasks.length;
  const percent   = totalAll === 0 ? 0 : Math.round((totalDone / totalAll) * 100);

  return (
    <section className="px-4 py-3 border-b border-gray-800">
      <h2 className="text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
        タスク進捗
      </h2>

      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>全体</span>
          <span>{totalDone} / {totalAll}（{percent}%）</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {tasks.length === 0 ? (
        <p className="text-gray-700 text-xs py-2 text-center">
          タスク行（X-XX：）が見つかりません
        </p>
      ) : (() => {
        const highTasks = tasks.filter((t) => t.priority !== 'low');
        const lowTasks  = tasks.filter((t) => t.priority === 'low');
        const hasPriority = lowTasks.length > 0;
        return (
          <div>
            {hasPriority && (
              <div className="text-[10px] font-semibold text-yellow-500 uppercase tracking-wider mb-1.5">
                優先度高
              </div>
            )}
            <div className="space-y-2">
              {highTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  readonly={readonly}
                  highlighted={highlightedLineIndex === task.lineIndex}
                  onComplete={handleCompleteTask}
                  onToggleSubTask={handleToggleSubTask}
                  onToggleStar={handleToggleStar}
                  onToggleSubTaskStar={handleToggleSubTaskStar}
                  hasMemoLink={activeTab === 'today' && !!memoFileHandle && memoLinkIds.has(task.id)}
                  onMemoLink={handleMemoLink}
                />
              ))}
            </div>
            {hasPriority && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowLowPriority((v) => !v)}
                  className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
                >
                  <span>{showLowPriority ? '▼' : '▶'}</span>
                  <span>優先度低（{lowTasks.length}件）</span>
                </button>
                {showLowPriority && (
                  <div className="mt-1.5 space-y-2">
                    {lowTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        readonly={readonly}
                        highlighted={highlightedLineIndex === task.lineIndex}
                        onComplete={handleCompleteTask}
                        onToggleSubTask={handleToggleSubTask}
                        onToggleStar={handleToggleStar}
                        onToggleSubTaskStar={handleToggleSubTaskStar}
                        hasMemoLink={activeTab === 'today' && !!memoFileHandle && memoLinkIds.has(task.id)}
                        onMemoLink={handleMemoLink}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {completedTasks.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
          >
            <span>{showCompleted ? '▼' : '▶'}</span>
            <span>当月完了タスク（{completedTasks.length}件）</span>
          </button>
          {showCompleted && (
            <div className="mt-1.5 space-y-1.5 pl-2 border-l border-gray-800">
              {completedTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  readonly={readonly}
                  faded
                  highlighted={highlightedLineIndex === task.lineIndex}
                  onComplete={handleCompleteTask}
                  onToggleSubTask={handleToggleSubTask}
                  onToggleStar={handleToggleStar}
                  onToggleSubTaskStar={handleToggleSubTaskStar}
                  hasMemoLink={activeTab === 'today' && !!memoFileHandle && memoLinkIds.has(task.id)}
                  onMemoLink={handleMemoLink}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

interface TaskRowProps {
  task:               Task;
  readonly:           boolean;
  faded?:             boolean;
  highlighted?:       boolean;
  onComplete:         (task: Task) => void;
  onToggleSubTask:    (sub: SubTask) => void;
  onToggleStar:       (task: Task) => void;
  onToggleSubTaskStar:(sub: SubTask) => void;
  hasMemoLink:        boolean;
  onMemoLink:         (task: Task) => void;
}

function TaskRow({ task, readonly, faded = false, highlighted = false, onComplete, onToggleSubTask, onToggleStar, onToggleSubTaskStar, hasMemoLink, onMemoLink }: TaskRowProps) {
  const isDone = task.status === 'done';
  const [subtasksOpen, setSubtasksOpen] = useState(task.starred);
  const setFocusLineIndex = useAppStore((s) => s.setFocusLineIndex);

  const handleTitleDoubleClick = useCallback(() => {
    setFocusLineIndex(task.lineIndex);
  }, [setFocusLineIndex, task.lineIndex]);

  return (
    <div
      id={`task-row-${task.lineIndex}`}
      className={`rounded transition-colors duration-300 ${faded ? 'opacity-60' : ''} ${highlighted ? 'bg-yellow-300/15 ring-1 ring-inset ring-yellow-300/60 shadow-[0_0_16px_rgba(250,204,21,0.25)]' : ''}`}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          disabled={readonly || isDone}
          onClick={() => onComplete(task)}
          title={isDone ? '完了済み' : 'タスクを完了にして移動'}
          className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
            isDone
              ? 'bg-emerald-700 border-emerald-600 cursor-default'
              : readonly
              ? 'border-gray-700 cursor-default'
              : 'border-gray-600 hover:border-emerald-400 hover:bg-emerald-900/30 cursor-pointer'
          }`}
        >
          {isDone && (
            <svg className="w-2 h-2 text-emerald-300" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <span className="text-sm text-gray-500 mr-1">[{task.id}]</span>
          {task.project && (
            <span className="text-xs text-blue-400 mr-1">{task.project}:</span>
          )}
          <span
            className={`text-sm cursor-pointer select-none ${
              isDone           ? 'line-through text-gray-600' :
              task.starred     ? 'text-amber-200 font-semibold' :
                                 'text-gray-200'
            }`}
            title="ダブルクリックでエディタの該当行へジャンプ"
            onDoubleClick={handleTitleDoubleClick}
          >
            {task.title}
          </span>
          {task.doneDate && (
            <span className="text-xs text-gray-600 ml-1">({task.doneDate})</span>
          )}
          {task.deadline && !isDone && (
            <DeadlineBadge deadline={task.deadline} />
          )}
          {/* ★ トグルボタン */}
          <button
            type="button"
            disabled={readonly}
            onClick={() => onToggleStar(task)}
            title={task.starred ? '★を解除' : '★をつける'}
            className={`ml-1 text-sm leading-none transition-colors ${
              task.starred
                ? 'text-amber-400' + (readonly ? '' : ' hover:text-amber-300 cursor-pointer')
                : 'text-gray-700'  + (readonly ? '' : ' hover:text-amber-400 cursor-pointer')
            }`}
          >
            {task.starred ? '★' : '☆'}
          </button>
          {task.subTasks.length > 0 && (
            <button
              type="button"
              onClick={() => setSubtasksOpen((v) => !v)}
              className="ml-1.5 text-[10px] text-gray-600 hover:text-gray-400 inline-flex items-center gap-0.5 transition-colors"
            >
              <span>{subtasksOpen ? '▼' : '▶'}</span>
              <span>{task.subTasks.length}件</span>
            </button>
          )}
        </div>
        {hasMemoLink && (
          <button
            type="button"
            onClick={() => onMemoLink(task)}
            title={`メモの ■${task.id} へ移動`}
            aria-label={`メモの ■${task.id} へ移動`}
            className="shrink-0 p-1 text-gray-500 hover:text-sky-300 transition-colors"
          >
            <Link2 size={14} />
          </button>
        )}
      </div>

      {task.subTasks.length > 0 && subtasksOpen && (
        <div className="ml-5 mt-0.5 space-y-0.5">
          {task.subTasks.map((sub, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={readonly}
                onClick={() => onToggleSubTask(sub)}
                title={sub.done ? '未完了に戻す' : '完了にする'}
                className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  sub.done
                    ? 'bg-emerald-800 border-emerald-600'
                    : readonly
                    ? 'border-gray-700 cursor-default'
                    : 'border-gray-600 hover:border-emerald-400 hover:bg-emerald-900/30 cursor-pointer'
                }`}
              >
                {sub.done && (
                  <svg className="w-1.5 h-1.5 text-emerald-300" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              {(() => {
                const isHighlight = sub.starred;
                if (isHighlight) {
                  return (
                    <span className={`text-sm font-bold px-1 rounded ${sub.done ? 'line-through text-blue-800 bg-blue-950' : 'text-blue-200 bg-blue-900'}`}>
                      {sub.text}
                      {sub.doneDate && <span className="font-normal text-blue-700 ml-1">({sub.doneDate})</span>}
                    </span>
                  );
                }
                return (
                  <span className={sub.done ? 'text-xs line-through text-gray-600' : 'text-sm text-400'}>
                    {sub.text}
                    {sub.doneDate && <span className="text-gray-600 ml-1">({sub.doneDate})</span>}
                  </span>
                );
              })()}
              {/* サブタスク ★ トグル */}
              <button
                type="button"
                disabled={readonly}
                onClick={() => onToggleSubTaskStar(sub)}
                title={sub.starred ? '★を解除' : '★をつける'}
                className={`text-xs leading-none transition-colors ${
                  sub.starred
                    ? 'text-blue-400'  + (readonly ? '' : ' hover:text-blue-300 cursor-pointer')
                    : 'text-gray-700' + (readonly ? '' : ' hover:text-blue-400 cursor-pointer')
                }`}
              >
                {sub.starred ? '★' : '☆'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DeadlineBadge({ deadline }: { deadline: string }) {
  const [m, d] = deadline.split('/').map(Number);
  const now = new Date();
  const deadlineDate = new Date(now.getFullYear(), m - 1, d);
  deadlineDate.setHours(0, 0, 0, 0);
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (deadlineDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  let colorClass: string;
  if (diffDays < 0) {
    colorClass = 'text-red-400 border-red-700 bg-red-950/40';
  } else if (diffDays === 0) {
    colorClass = 'text-orange-400 border-orange-700 bg-orange-950/40';
  } else if (diffDays <= 3) {
    colorClass = 'text-yellow-400 border-yellow-700 bg-yellow-950/40';
  } else {
    colorClass = 'text-gray-400 border-gray-700 bg-gray-800/40';
  }

  return (
    <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full border ${colorClass}`}>
      {deadline}
    </span>
  );
}