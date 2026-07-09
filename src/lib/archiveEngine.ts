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
    } else if (/^###(?!#)/.test(trimmed) && inTasks) {
      break;
    }
    if (inTasks) taskLines.push(line);
  }

  // 前後の空行を除去
  while (taskLines.length && taskLines[0].trim() === '') taskLines.shift();
  while (taskLines.length && taskLines[taskLines.length - 1].trim() === '') taskLines.pop();
  return taskLines.join('\n');
}

/** rawText から ### ４．当月完了タスク セクションの中身を抽出する */
export function extractCompletedTasksSection(rawText: string): string {
  const lines = rawText.split('\n');
  let inSection = false;
  const sectionLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/###\s*[４4][\．.]?\s*当月完了タスク/.test(trimmed)) {
      inSection = true;
      continue;
    } else if (/^###(?!#)/.test(trimmed) && inSection) {
      break;
    }
    if (inSection) sectionLines.push(line);
  }

  while (sectionLines.length && sectionLines[0].trim() === '') sectionLines.shift();
  while (sectionLines.length && sectionLines[sectionLines.length - 1].trim() === '') sectionLines.pop();
  return sectionLines.join('\n');
}

/** daily_today.txt の新規テンプレートを生成する（予定・結果クリア、タスクは引継ぎ） */
export function buildTodayTemplate(
  date: string,
  tasksSectionText: string,
  completedTasksSectionText = '',
): string {
  const tasksContent = tasksSectionText ? `\n${tasksSectionText}` : '';
  const completedSection = completedTasksSectionText
    ? `\n\n### ４．当月完了タスク\n${completedTasksSectionText}`
    : '';
  return `DATE: ${date}\n\n### １．本日予定\n\n### ２．本日結果\n\n### ３．タスク${tasksContent}${completedSection}`;
}

/** 完了タスクセクションテキストを行リストに変換（空行・見出し除去） */
export function parseCompletedTaskLines(sectionText: string): string[] {
  return sectionText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/** 完了タスクセクションテキストの重複行を除去して返す */
export function deduplicateCompletedSection(text: string): string {
  const seen = new Set<string>();
  return text
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      if (t === '') return true; // 空行は保持
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    })
    .join('\n');
}

/**
 * 指定月のアーカイブエントリから「いつ完了したか」を差分ベースで集計する。
 * 各エントリの完了タスクを前エントリと比較し、新規追加分にのみ日付を付与する。
 * @param entries  全アーカイブエントリ
 * @param yearMonth  対象月 "YYYY-MM"
 */
export function aggregateMonthlyCompletedTasks(
  entries: ArchiveEntry[],
  yearMonth: string,
): { date: string; tasks: string[] }[] {
  // 当月エントリを昇順ソート
  const monthEntries = entries
    .filter((e) => e.date.startsWith(yearMonth))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (monthEntries.length === 0) return [];

  // 当月より前の最新エントリの完了タスクを初期ベースとする
  const prevEntry = entries
    .filter((e) => e.date < `${yearMonth}-01`)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);

  const knownTasks = new Set<string>(
    prevEntry
      ? parseCompletedTaskLines(extractCompletedTasksSection(prevEntry.rawText))
      : [],
  );

  const result: { date: string; tasks: string[] }[] = [];

  for (const entry of monthEntries) {
    const completedText = extractCompletedTasksSection(entry.rawText);
    // 表示用：インデントを保持した生行（空行除く）
    const rawLines     = completedText.split('\n').filter((l) => l.trim().length > 0);
    // 重複判定用：trimした文字列
    const trimmedLines = rawLines.map((l) => l.trim());

    const newRawLines = rawLines.filter((_, i) => !knownTasks.has(trimmedLines[i]));
    if (newRawLines.length > 0) {
      result.push({ date: entry.date, tasks: newRawLines });
    }
    // 今日の新規タスクも以降の比較ベースに追加
    for (const t of trimmedLines) knownTasks.add(t);
  }

  return result;
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
