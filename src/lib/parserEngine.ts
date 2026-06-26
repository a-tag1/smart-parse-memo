export interface Schedule {
  taskName:  string;
  startTime: string; // "H:MM" or "HH:MM"
  endTime:   string;
  type:      'plan' | 'result';
  itemId?:   string;
}

export interface SubTask {
  text:      string;
  done:      boolean;
  doneDate?: string;
  lineIndex: number;  // rawText 内の行番号 (0-based)
}

export interface Task {
  id:        string;
  title:     string;
  project:   string;   // 明示指定がある場合のみ。なければ空文字
  status:    'todo' | 'done';
  doneDate?: string;
  subTasks:  SubTask[];
  lineIndex: number;   // rawText 内の行番号 (0-based)
  priority:  'high' | 'low'; // #### 優先度高/低 セクションによる分類
}

export interface WorkSummaryEntry {
  label:        string;
  totalMinutes: number;
}

export interface ParsedData {
  schedules:      Schedule[];
  tasks:          Task[];        // ### ３．タスク（アクティブ）
  completedTasks: Task[];        // ### ４．当月完了タスク
  workSummary:    WorkSummaryEntry[];
}

// ── メインのパース関数 ──────────────────────────────────────────
export function parseText(rawText: string): ParsedData {
  const lines = rawText.split('\n');

  type Section = 'none' | 'plan' | 'result' | 'tasks' | 'completedTasks';
  let currentSection: Section = 'none';

  const planLines:                string[] = [];
  const resultLines:              string[] = [];
  const taskLines:                string[] = [];
  const taskLineIndices:          number[] = [];
  const completedTaskLines:       string[] = [];
  const completedTaskLineIndices: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line    = lines[i];
    const trimmed = line.trim();

    if (/###\s*[１1][\．.]?\s*本日予定/.test(trimmed)) {
      currentSection = 'plan'; continue;
    } else if (/###\s*[２2][\．.]?\s*本日結果/.test(trimmed)) {
      currentSection = 'result'; continue;
    } else if (/###\s*[４4][\．.]?\s*当月完了タスク/.test(trimmed)) {
      currentSection = 'completedTasks'; continue;
    } else if (/###\s*[３3][\．.]?\s*タスク/.test(trimmed)) {
      currentSection = 'tasks'; continue;
    } else if (/^###(?!#)/.test(trimmed) && trimmed.length > 3) {
      currentSection = 'none'; continue;
    }

    switch (currentSection) {
      case 'plan':   planLines.push(line);   break;
      case 'result': resultLines.push(line); break;
      case 'tasks':
        taskLines.push(line);
        taskLineIndices.push(i);
        break;
      case 'completedTasks':
        completedTaskLines.push(line);
        completedTaskLineIndices.push(i);
        break;
    }
  }

  return {
    schedules: [
      ...extractSchedules(planLines, 'plan'),
      ...extractSchedules(resultLines, 'result'),
    ],
    tasks:          extractTasks(taskLines, taskLineIndices),
    completedTasks: extractTasks(completedTaskLines, completedTaskLineIndices),
    workSummary:    [],
  };
}

// ── スケジュール抽出 ────────────────────────────────────────────
// 書式例: 6-22：北海道信連：9:30-10:00
const TIME_RANGE_RE = /(\d{1,2}:\d{2})\s*[-－]\s*(\d{1,2}:\d{2})/;
const ITEM_ID_RE    = /^(\d+-\d+)(?:_[A-Za-z]+)?\s*[\uff1a:]\s*/;

function extractSchedules(lines: string[], type: 'plan' | 'result'): Schedule[] {
  const results: Schedule[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const timeMatch = trimmed.match(TIME_RANGE_RE);
    if (!timeMatch) continue;

    const startTime = timeMatch[1];
    const endTime   = timeMatch[2];

    const beforeTime = trimmed.slice(0, trimmed.indexOf(timeMatch[0]));
    let remainder    = beforeTime;

    let itemId: string | undefined;
    const idMatch = remainder.match(ITEM_ID_RE);
    if (idMatch) {
      itemId    = idMatch[1];
      remainder = remainder.slice(idMatch[0].length);
    }

    const parts = remainder
      .split(/[\uff1a:]/)
      .map(p => p.trim())
      .filter(Boolean);

    const taskName = parts.at(-1) ?? itemId ?? '不明';

    results.push({ taskName, startTime, endTime, type, itemId });
  }

  return results;
}

// ── タスク抽出 ────────────────────────────────────────────────
// メイン:    6-23_C：タスク名 / 6-23：プロジェクト：タスク名 / 6-23：タスク名 済(6/24)
// サブタスク: 　・タスク名 / 　済(6/19)・タスク名
const TASK_ID_RE      = /^(\d+-\d+(?:_[A-Za-z]+)?)\s*[\uff1a:]/;
const DONE_MARK_RE    = /\s*済\((\d+\/\d+)\)/;
const SUBTASK_DONE_RE = /^(\s+)済\((\d+\/\d+)\)\s*[・•]\s*(.*)/;
const SUBTASK_TODO_RE = /^(\s+)[・•]\s*(.*)/;
const PRIORITY_HIGH_RE = /^####\s*優先度高/;
const PRIORITY_LOW_RE  = /^####\s*優先度低/;

function extractTasks(lines: string[], lineIndices: number[]): Task[] {
  const results: Task[]  = [];
  let currentTask: Task | null = null;
  let currentPriority: 'high' | 'low' = 'high';

  for (let i = 0; i < lines.length; i++) {
    const line    = lines[i];
    const lineIdx = lineIndices[i];
    const trimmed = line.trim();

    // #### 優先度高 / #### 優先度低 セクションヘッダを検出
    if (PRIORITY_HIGH_RE.test(trimmed)) {
      if (currentTask) { results.push(currentTask); currentTask = null; }
      currentPriority = 'high';
      continue;
    }
    if (PRIORITY_LOW_RE.test(trimmed)) {
      if (currentTask) { results.push(currentTask); currentTask = null; }
      currentPriority = 'low';
      continue;
    }

    if (currentTask) {
      const doneSubMatch = line.match(SUBTASK_DONE_RE);
      const todoSubMatch = doneSubMatch ? null : line.match(SUBTASK_TODO_RE);

      if (doneSubMatch) {
        currentTask.subTasks.push({
          text:      doneSubMatch[3].trim(),
          done:      true,
          doneDate:  doneSubMatch[2],
          lineIndex: lineIdx,
        });
        continue;
      } else if (todoSubMatch) {
        currentTask.subTasks.push({
          text:      todoSubMatch[2].trim(),
          done:      false,
          lineIndex: lineIdx,
        });
        continue;
      }
    }

    if (!trimmed) continue;

    const idMatch = trimmed.match(TASK_ID_RE);
    if (!idMatch) continue;

    if (currentTask) results.push(currentTask);

    const id  = idMatch[1];
    let body  = trimmed.slice(idMatch[0].length).trim();

    const doneMatch = body.match(DONE_MARK_RE);
    const isDone    = doneMatch !== null;
    const doneDate  = doneMatch?.[1];
    if (isDone) body = body.replace(DONE_MARK_RE, '').trim();

    const colonIdx = body.search(/[\uff1a:]/);
    let project: string;
    let title:   string;

    if (colonIdx !== -1) {
      project = body.slice(0, colonIdx).trim();
      title   = body.slice(colonIdx + 1).trim();
    } else {
      project = '';
      title   = body;
    }

    currentTask = {
      id,
      title:     title || body,
      project,
      status:    isDone ? 'done' : 'todo',
      doneDate,
      subTasks:  [],
      lineIndex: lineIdx,
      priority:  currentPriority,
    };
  }

  if (currentTask) results.push(currentTask);
  return results;
}

// ── テキスト操作ユーティリティ ─────────────────────────────────

/** 済マーク用の今日日付を返す（例: "6/25"） */
export function getTodayMarkDate(): string {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * サブタスクの完了状態をトグルし、更新後の rawText を返す。
 *  done=false → 行頭に `済(M/D)` を付加
 *  done=true  → 行頭の `済(...)` を除去
 */
export function toggleSubTaskDone(rawText: string, subTask: SubTask): string {
  const lines = rawText.split('\n');
  const line  = lines[subTask.lineIndex];
  if (line === undefined) return rawText;

  if (subTask.done) {
    lines[subTask.lineIndex] = line.replace(/^(\s*)済\(\d+\/\d+\)\s*/, '$1');
  } else {
    const today = getTodayMarkDate();
    lines[subTask.lineIndex] = line.replace(/^(\s*)([・•])/, `$1済(${today})$2`);
  }
  return lines.join('\n');
}

/**
 * メインタスクに済マークを付加し、タスクブロック（メイン＋サブタスク）を
 * "### ４．当月完了タスク" セクションへ移動した rawText を返す。
 */
export function completeAndMoveTask(rawText: string, task: Task): string {
  const lines = rawText.split('\n');
  const today = getTodayMarkDate();

  if (task.status !== 'done') {
    const mainLine = lines[task.lineIndex] ?? '';
    lines[task.lineIndex] = `${mainLine.trimEnd()} 済(${today})`;
  }

  const allIndices = [task.lineIndex, ...task.subTasks.map(s => s.lineIndex)].sort((a, b) => a - b);
  const blockStart = allIndices[0];
  const blockEnd   = allIndices[allIndices.length - 1];
  const taskBlock  = lines.slice(blockStart, blockEnd + 1);
  lines.splice(blockStart, blockEnd - blockStart + 1);

  const completedRe = /^###\s*[４4][\．.]?\s*当月完了タスク/;
  let sectionIdx = lines.findIndex(l => completedRe.test(l.trim()));

  if (sectionIdx === -1) {
    if (lines[lines.length - 1]?.trim() !== '') lines.push('');
    lines.push('### ４．当月完了タスク');
    sectionIdx = lines.length - 1;
  }

  let insertAt = sectionIdx + 1;
  while (insertAt < lines.length && !lines[insertAt].trim().startsWith('###')) {
    insertAt++;
  }
  lines.splice(insertAt, 0, ...taskBlock, '');
  return lines.join('\n');
}

// ── 入力アシスト用ユーティリティ ─────────────────────────────
export interface NextItemResult {
  prefix: string;  // 挿入すべき文字列（例: "6-24："）
}

export function calcNextItem(rawText: string): NextItemResult {
  const pattern = /(\d+)-(\d+)(?:_[A-Za-z]+)?\s*[\uff1a:]/g;
  let match: RegExpExecArray | null;
  let maxSecond = -1;
  let firstNum  = `${new Date().getMonth() + 1}`;

  while ((match = pattern.exec(rawText)) !== null) {
    const second = parseInt(match[2], 10);
    if (second > maxSecond) {
      maxSecond = second;
      firstNum  = match[1];
    }
  }

  const next = maxSecond >= 0 ? maxSecond + 1 : 1;
  return { prefix: `${firstNum}-${next}： ` };
}

// ── 稼働時間計算 ──────────────────────────────────────────────
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}分`;
  return `${h}時間${m}分`;
}