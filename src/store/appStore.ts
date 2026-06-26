import { create } from 'zustand';
import type { ParsedData } from '../lib/parserEngine';
import type { ArchiveEntry } from '../lib/archiveEngine';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'disconnected';
export type ActiveTab  = 'today' | 'archive';

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
}));
