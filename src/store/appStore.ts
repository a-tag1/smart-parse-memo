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

  setActiveTab:           (tab: ActiveTab) => void;
  setRawText:             (text: string) => void;
  setTodayFileHandle:     (handle: FileSystemFileHandle | null) => void;
  setArchiveFileHandle:   (handle: FileSystemFileHandle | null) => void;
  setParsedData:          (data: ParsedData) => void;
  setArchiveEntries:      (entries: ArchiveEntry[]) => void;
  setSelectedArchiveDate: (date: string | null) => void;
  setSaveStatus:          (status: SaveStatus) => void;
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

  setActiveTab:           (activeTab)           => set({ activeTab }),
  setRawText:             (rawText)             => set({ rawText }),
  setTodayFileHandle:     (todayFileHandle)     => set({ todayFileHandle }),
  setArchiveFileHandle:   (archiveFileHandle)   => set({ archiveFileHandle }),
  setParsedData:          (parsedData)          => set({ parsedData }),
  setArchiveEntries:      (archiveEntries)      => set({ archiveEntries }),
  setSelectedArchiveDate: (selectedArchiveDate) => set({ selectedArchiveDate }),
  setSaveStatus:          (saveStatus)          => set({ saveStatus }),
}));
