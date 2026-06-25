import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { parseText } from '../lib/parserEngine';
import { buildWorkSummary } from '../lib/summaryEngine';

export function useParser() {
  const rawText             = useAppStore((s) => s.rawText);
  const activeTab           = useAppStore((s) => s.activeTab);
  const archiveEntries      = useAppStore((s) => s.archiveEntries);
  const selectedArchiveDate = useAppStore((s) => s.selectedArchiveDate);
  const setParsedData       = useAppStore((s) => s.setParsedData);

  useEffect(() => {
    // 過去タブで日付が選択されている場合はそのエントリをパース
    let textToParse: string;
    if (activeTab === 'archive' && selectedArchiveDate) {
      const entry = archiveEntries.find((e) => e.date === selectedArchiveDate);
      textToParse = entry?.rawText ?? '';
    } else {
      textToParse = rawText;
    }

    const parsed      = parseText(textToParse);
    const workSummary = buildWorkSummary(parsed.schedules);
    setParsedData({ ...parsed, workSummary });
  }, [rawText, activeTab, archiveEntries, selectedArchiveDate, setParsedData]);
}
