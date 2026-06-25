import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';

/** アーカイブエントリの選択・参照を行うフック */
export function useArchive() {
  const archiveEntries         = useAppStore((s) => s.archiveEntries);
  const selectedArchiveDate    = useAppStore((s) => s.selectedArchiveDate);
  const setSelectedArchiveDate = useAppStore((s) => s.setSelectedArchiveDate);

  const selectDate = useCallback(
    (date: string | null) => {
      setSelectedArchiveDate(date);
    },
    [setSelectedArchiveDate],
  );

  return { archiveEntries, selectedArchiveDate, selectDate };
}
