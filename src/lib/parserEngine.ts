export interface Schedule {
  taskName: string;
  startTime: string; // "H:MM" or "HH:MM"
  endTime: string;
  type: 'plan' | 'result';
  itemId?: string;
}

export interface Task {
  id: string;
  title: string;
  project: string;
  status: 'todo' | 'done';
  doneDate?: string;
}

export interface WorkSummaryEntry {
  label: string;        // タスク名（時刻なし）
  totalMinutes: number; // 同一ラベルの合計分数
}

export interface ParsedData {
  schedules:   Schedule[];
  tasks:       Task[];
  workSummary: WorkSummaryEntry[];
}

// ── メインのパース関数 ──────────────────────────────────────────
export function parseText(rawText: string): ParsedData {
  const lines = rawText.split('\n');

  type Section = 'none' | 'plan' | 'result' | 'tasks';
  let currentSection: Section = 'none';

  const planLines: string[] = [];
  const resultLines: string[] = [];
  const taskLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // セクション見出し検出（全角・半角対応）
    if (/###\s*[１1１][\．\.]?\s*本日予定/.test(trimmed)) {
      currentSection = 'plan';
      continue;
    } else if (/###\s*[２2２][\．\.]?\s*本日結果/.test(trimmed)) {
      currentSection = 'result';
      continue;
    } else if (/###\s*[３3３][\．\.]?\s*タスク/.test(trimmed)) {
      currentSection = 'tasks';
      continue;
    } else if (/^###/.test(trimmed) && trimmed.length > 3) {
      currentSection = 'none';
      continue;
    }

    switch (currentSection) {
      case 'plan':   planLines.push(line);   break;
      case 'result': resultLines.push(line); break;
      case 'tasks':  taskLines.push(line);   break;
    }
  }

  return {
    schedules: [
      ...extractSchedules(planLines, 'plan'),
      ...extractSchedules(resultLines, 'result'),
    ],
    tasks:       extractTasks(taskLines),
    workSummary: [], // summaryEngineにて useParser 内で計算
  };
}

// ── スケジュール抽出 ────────────────────────────────────────────
// 書式例: 6-22：北海道信連：9:30-10:00
const TIME_RANGE_RE = /(\d{1,2}:\d{2})\s*[-－]\s*(\d{1,2}:\d{2})/;
const ITEM_ID_RE = /^(\d+-\d+)(?:_[A-Za-z]+)?\s*[\uff1a:]\s*/; // 行頭の "X-XX：" または "X-XX_A："

function extractSchedules(lines: string[], type: 'plan' | 'result'): Schedule[] {
  const results: Schedule[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const timeMatch = trimmed.match(TIME_RANGE_RE);
    if (!timeMatch) continue;

    const startTime = timeMatch[1];
    const endTime   = timeMatch[2];

    // 時間範囲より前の部分でタスク名を組み立てる
    const beforeTime = trimmed.slice(0, trimmed.indexOf(timeMatch[0]));
    let remainder = beforeTime;

    let itemId: string | undefined;
    const idMatch = remainder.match(ITEM_ID_RE);
    if (idMatch) {
      itemId    = idMatch[1];
      remainder = remainder.slice(idMatch[0].length);
    }

    // ：で区切られた最後のトークンをタスク名とする
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
// 書式例: 6-23：北海道信連：やること  / 6-23：やること 済(6/24)
const TASK_ID_RE   = /^(\d+-\d+)(?:_[A-Za-z]+)?\s*[\uff1a:\s]/;
const DONE_MARK_RE = /済\((\d+\/\d+)\)/;

function extractTasks(lines: string[]): Task[] {
  const results: Task[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const idMatch = trimmed.match(TASK_ID_RE);
    if (!idMatch) continue;

    const id = idMatch[1];
    let body = trimmed.slice(idMatch[0].length).trim();

    // 済マーク検出
    const doneMatch = body.match(DONE_MARK_RE);
    const isDone    = doneMatch !== null;
    const doneDate  = doneMatch?.[1];
    if (isDone) body = body.replace(DONE_MARK_RE, '').trim();

    // プロジェクト名：タスク名 に分割
    const colonIdx = body.search(/[\uff1a:]/);
    let project: string;
    let title: string;

    if (colonIdx !== -1) {
      project = body.slice(0, colonIdx).trim();
      title   = body.slice(colonIdx + 1).trim();
    } else {
      project = 'その他';
      title   = body;
    }

    results.push({
      id,
      title: title || body,
      project: project || 'その他',
      status: isDone ? 'done' : 'todo',
      doneDate,
    });
  }

  return results;
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
