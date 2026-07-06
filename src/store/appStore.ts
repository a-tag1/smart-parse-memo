import { create } from 'zustand';
import type { ParsedData } from '../lib/parserEngine';
import type { ArchiveEntry } from '../lib/archiveEngine';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'disconnected';
export type ActiveTab  = 'today' | 'archive' | 'memo';

interface AppState {
  activeTab:            ActiveTab;
  rawText:              string;
  todayFileHandle:      FileSystemFileHandle | null;
  archiveFileHandle:    FileSystemFileHandle | null;
  parsedData:           ParsedData | null;
  archiveEntries:       ArchiveEntry[];
  selectedArchiveDate:  string | null;
  saveStatus:           SaveStatus;
  storedTodayName:      string | null;
  storedArchiveName:    string | null;
  pendingReconnect:     boolean;
  memoFileHandle:       FileSystemFileHandle | null;
  memoText:             string;
  storedMemoName:       string | null;
  memoSaveStatus:       SaveStatus;

  setActiveTab:           (tab: ActiveTab) => void;
  setRawText:             (text: string) => void;
  setTodayFileHandle:     (handle: FileSystemFileHandle | null) => void;
  setArchiveFileHandle:   (handle: FileSystemFileHandle | null) => void;
  setParsedData:          (data: ParsedData) => void;
  setArchiveEntries:      (entries: ArchiveEntry[]) => void;
  setSelectedArchiveDate: (date: string | null) => void;
  setSaveStatus:          (status: SaveStatus) => void;
  setStoredTodayName:     (name: string | null) => void;
  setStoredArchiveName:   (name: string | null) => void;
  setPendingReconnect:    (v: boolean) => void;
  setMemoFileHandle:      (handle: FileSystemFileHandle | null) => void;
  setMemoText:            (text: string) => void;
  setStoredMemoName:      (name: string | null) => void;
  setMemoSaveStatus:      (status: SaveStatus) => void;
  focusLineIndex:         number | null;
  setFocusLineIndex:      (idx: number | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab:            'today',
  rawText:              '',
  todayFileHandle:      null,
  archiveFileHandle:    null,
  parsedData:           null,
  archiveEntries:       [],
  selectedArchiveDate:  null,
  saveStatus:           'disconnected',
  storedTodayName:      localStorage.getItem('spm_today_name'),
  storedArchiveName:    localStorage.getItem('spm_archive_name'),
  pendingReconnect:     false,
  memoFileHandle:       null,
  memoText:             '',
  storedMemoName:       localStorage.getItem('spm_memo_name'),
  memoSaveStatus:       'disconnected' as SaveStatus,
  focusLineIndex:         null,

  setActiveTab:           (activeTab)           => set({ activeTab }),
  setRawText:             (rawText)             => set({ rawText }),
  setTodayFileHandle:     (todayFileHandle)     => set({ todayFileHandle }),
  setArchiveFileHandle:   (archiveFileHandle)   => set({ archiveFileHandle }),
  setParsedData:          (parsedData)          => set({ parsedData }),
  setArchiveEntries:      (archiveEntries)      => set({ archiveEntries }),
  setSelectedArchiveDate: (selectedArchiveDate) => set({ selectedArchiveDate }),
  setSaveStatus:          (saveStatus)          => set({ saveStatus }),
  setStoredTodayName:     (storedTodayName)     => set({ storedTodayName }),
  setStoredArchiveName:   (storedArchiveName)   => set({ storedArchiveName }),
  setPendingReconnect:    (pendingReconnect)    => set({ pendingReconnect }),
  setMemoFileHandle:      (memoFileHandle)      => set({ memoFileHandle }),
  setMemoText:            (memoText)            => set({ memoText }),
  setStoredMemoName:      (storedMemoName)      => set({ storedMemoName }),
  setMemoSaveStatus:      (memoSaveStatus)      => set({ memoSaveStatus }),
  setFocusLineIndex:      (focusLineIndex)      => set({ focusLineIndex }),
}));
