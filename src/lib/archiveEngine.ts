// ── アーカイブ操作ロジック（UIに依存しない純粋関数） ────────────

export interface ArchiveEntry {
  date: string;    // "YYYY-MM-DD"
  rawText: string;
}

const SEPARATOR_RE = /^==== DATE: (\d{4}-\d{2}-\d{2}) ====$/;

/** archive_YYYY_MM.txt をパースして日別エントリ配列を返す */
export function parseArchive(text: string): ArchiveEntry[] {
  const lines = text.split('\n');
  const entries: ArchiveEntry[] = [];
  let currentDate: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    const match = line.trim().match(SEPARATOR_RE);
    if (match) {
      if (currentDate !== null) {
        entries.push({ date: currentDate, rawText: currentLines.join('\n').trim() });
      }
      currentDate = match[1];
      currentLines = [];
    } else if (currentDate !== null) {
      currentLines.push(line);
    }
  }

  if (currentDate !== null) {
    entries.push({ date: currentDate, rawText: currentLines.join('\n').trim() });
  }

  return entries;
}

/** 既存のアーカイブテキストに新しいエントリを追記する */
export function appendToArchive(existingText: string, date: string, entryText: string): string {
  const block = `==== DATE: ${date} ====\n${entryText}`;
  return existingText.trim() ? `${existingText.trimEnd()}\n\n${block}` : block;
}

/** rawText から ### ３．タスク セクションの中身を抽出する */
export function extractTasksSection(rawText: string): string {
  const lines = rawText.split('\n');
  let inTasks = false;
  const taskLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/###\s*[３3]\s*[．.]?\s*タスク/.test(trimmed)) {
      inTasks = true;
      continue;
    } else if (/^###/.test(trimmed) && inTasks) {
      break;
    }
    if (inTasks) taskLines.push(line);
  }

  // 前後の空行を除去
  while (taskLines.length && taskLines[0].trim() === '') taskLines.shift();
  while (taskLines.length && taskLines[taskLines.length - 1].trim() === '') taskLines.pop();
  return taskLines.join('\n');
}

/** daily_today.txt の新規テンプレートを生成する（予定・結果クリア、タスクは引継ぎ） */
export function buildTodayTemplate(date: string, tasksSectionText: string): string {
  const tasksContent = tasksSectionText ? `\n${tasksSectionText}` : '';
  return `DATE: ${date}\n\n### １．本日予定\n\n### ２．本日結果\n\n### ３．タスク${tasksContent}`;
}

/** 今日の日付を "YYYY-MM-DD" で返す */
export function getTodayDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** rawText の先頭から "DATE: YYYY-MM-DD" を抽出して返す。なければ null */
export function extractDateFromText(rawText: string): string | null {
  const match = rawText.match(/^DATE:\s*(\d{4}-\d{2}-\d{2})/m);
  return match ? match[1] : null;
}
