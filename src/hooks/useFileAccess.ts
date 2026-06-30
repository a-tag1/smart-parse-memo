import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import {
  getTodayDate,
  extractDateFromText,
  extractTasksSection,
  extractCompletedTasksSection,
  buildTodayTemplate,
  appendToArchive,
  parseArchive,
} from '../lib/archiveEngine';
import {
  saveHandle,
  loadHandle,
  removeHandle,
  HANDLE_KEY_TODAY,
  HANDLE_KEY_ARCHIVE,
  HANDLE_KEY_MEMO,
  LS_KEY_TODAY_NAME,
  LS_KEY_ARCHIVE_NAME,
  LS_KEY_MEMO_NAME,
} from '../lib/fileHandleStorage';

export function useFileAccess() {
  const setRawText            = useAppStore((s) => s.setRawText);
  const setTodayFileHandle    = useAppStore((s) => s.setTodayFileHandle);
  const setArchiveFileHandle  = useAppStore((s) => s.setArchiveFileHandle);
  const setArchiveEntries     = useAppStore((s) => s.setArchiveEntries);
  const setSaveStatus         = useAppStore((s) => s.setSaveStatus);
  const setStoredTodayName    = useAppStore((s) => s.setStoredTodayName);
  const setStoredArchiveName  = useAppStore((s) => s.setStoredArchiveName);
  const setPendingReconnect   = useAppStore((s) => s.setPendingReconnect);
  const todayFileHandle       = useAppStore((s) => s.todayFileHandle);
  const archiveFileHandle     = useAppStore((s) => s.archiveFileHandle);
  const rawText               = useAppStore((s) => s.rawText);
  const memoFileHandle        = useAppStore((s) => s.memoFileHandle);
  const setMemoFileHandle     = useAppStore((s) => s.setMemoFileHandle);
  const setMemoText           = useAppStore((s) => s.setMemoText);
  const setStoredMemoName     = useAppStore((s) => s.setStoredMemoName);
  const setMemoSaveStatus     = useAppStore((s) => s.setMemoSaveStatus);

  /** daily_today.txt を開く。日付不一致の場合は通知を出す */
  const openTodayFile = useCallback(async () => {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'テキスト / Markdown', accept: { 'text/plain': ['.txt', '.md'] } }],
        multiple: false,
      });

      const file  = await handle.getFile();
      const text  = await file.text();
      const today = getTodayDate();
      const fileDate = extractDateFromText(text);

      setTodayFileHandle(handle);
      setRawText(text);
      setSaveStatus('saved');
      await saveHandle(HANDLE_KEY_TODAY, handle);
      localStorage.setItem(LS_KEY_TODAY_NAME, handle.name);
      setStoredTodayName(handle.name);
      setPendingReconnect(false);

      if (fileDate && fileDate !== today) {
        window.alert(
          `ファイルの日付（${fileDate}）が今日（${today}）と異なります。\n` +
          `「前日コピー」ボタンを押して本日分に移行してください。`,
        );
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('ファイルを開けませんでした:', err);
      }
    }
  }, [setRawText, setTodayFileHandle, setSaveStatus, setStoredTodayName, setPendingReconnect]);

  /** archive_YYYY_MM.txt を開いてエントリを読み込む */
  const openArchiveFile = useCallback(async () => {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'アーカイブ（テキスト）', accept: { 'text/plain': ['.txt'] } }],
        multiple: false,
      });

      const file = await handle.getFile();
      const text = await file.text();

      setArchiveFileHandle(handle);
      setArchiveEntries(parseArchive(text));
      await saveHandle(HANDLE_KEY_ARCHIVE, handle);
      localStorage.setItem(LS_KEY_ARCHIVE_NAME, handle.name);
      setStoredArchiveName(handle.name);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('アーカイブファイルを開けませんでした:', err);
      }
    }
  }, [setArchiveFileHandle, setArchiveEntries, setStoredArchiveName]);

  /** memo_archive.txt を開く */
  const openMemoFile = useCallback(async () => {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'メモ（テキスト）', accept: { 'text/plain': ['.txt'] } }],
        multiple: false,
      });
      const file = await handle.getFile();
      const text = await file.text();
      setMemoFileHandle(handle);
      setMemoText(text);
      setMemoSaveStatus('saved');
      await saveHandle(HANDLE_KEY_MEMO, handle);
      localStorage.setItem(LS_KEY_MEMO_NAME, handle.name);
      setStoredMemoName(handle.name);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('メモファイルを開けませんでした:', err);
      }
    }
  }, [setMemoFileHandle, setMemoText, setMemoSaveStatus, setStoredMemoName]);

  /** memo_archive.txt に保存する */
  const saveMemo = useCallback(
    async (text: string) => {
      if (!memoFileHandle) return;
      setMemoSaveStatus('saving');
      try {
        const writable = await memoFileHandle.createWritable();
        await writable.write(text);
        await writable.close();
        setMemoText(text);           // ハイライト・セクションナビを保存済み内容に屏止
        setMemoSaveStatus('saved');
      } catch (err) {
        console.error('メモ保存に失敗しました:', err);
        setMemoSaveStatus('disconnected');
      }
    },
    [memoFileHandle, setMemoSaveStatus, setMemoText],
  );

  /** daily_today.txt にデバウンス保存する */
  const saveToday = useCallback(
    async (text: string) => {
      if (!todayFileHandle) return;
      setSaveStatus('saving');
      try {
        const writable = await todayFileHandle.createWritable();
        await writable.write(text);
        await writable.close();
        setSaveStatus('saved');
      } catch (err) {
        console.error('保存に失敗しました:', err);
        setSaveStatus('disconnected');
      }
    },
    [todayFileHandle, setSaveStatus],
  );

  /**
   * 前日コピー処理（設計書 §4.3）
   *  1. 現 rawText をアーカイブに追記
   *  2. daily_today.txt を新規テンプレートで上書き（タスク引継ぎ・予定結果クリア）
   *  3. rawText state を更新
   */
  const performDayCopy = useCallback(async () => {
    if (!todayFileHandle) {
      window.alert('本日のファイルが開かれていません。');
      return;
    }

    // アーカイブハンドルが未取得の場合はファイル選択を促す
    let archHandle = archiveFileHandle;
    if (!archHandle) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: 'アーカイブ（テキスト）', accept: { 'text/plain': ['.txt'] } }],
          multiple: false,
        });
        archHandle = handle;
        setArchiveFileHandle(handle);
        await saveHandle(HANDLE_KEY_ARCHIVE, handle);
        localStorage.setItem(LS_KEY_ARCHIVE_NAME, handle.name);
        setStoredArchiveName(handle.name);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('アーカイブファイルを開けませんでした:', err);
        }
        return;
      }
    }

    try {
      const prevDate = extractDateFromText(rawText) ?? getTodayDate();

      // 1. 既存アーカイブを読み込んで追記
      const archFile        = await archHandle.getFile();
      const existingArchive = await archFile.text();
      const newArchiveText  = appendToArchive(existingArchive, prevDate, rawText);

      const archWritable = await archHandle.createWritable();
      await archWritable.write(newArchiveText);
      await archWritable.close();

      setArchiveEntries(parseArchive(newArchiveText));

      // 2. 新しい daily_today.txt を生成（タスク・当月完了タスクは引継ぎ）
      const today                  = getTodayDate();
      const tasksSectionText           = extractTasksSection(rawText);
      const completedTasksSectionText  = extractCompletedTasksSection(rawText);
      const newTodayText           = buildTodayTemplate(today, tasksSectionText, completedTasksSectionText);

      const todayWritable = await todayFileHandle.createWritable();
      await todayWritable.write(newTodayText);
      await todayWritable.close();

      // 3. state 更新
      setRawText(newTodayText);
      setSaveStatus('saved');
    } catch (err) {
      console.error('前日コピーに失敗しました:', err);
      setSaveStatus('disconnected');
    }
  }, [
    todayFileHandle,
    archiveFileHandle,
    rawText,
    setRawText,
    setArchiveFileHandle,
    setArchiveEntries,
    setSaveStatus,
    setStoredArchiveName,
  ]);

  /**
   * 起動時: IndexedDB のハンドルを復元し、権限があれば自動読み込み。
   * 権限が 'prompt' の場合は pendingReconnect = true にする。
   */
  const tryAutoReconnect = useCallback(async () => {
    let hasPending = false;

    try {
      const todayHandle = await loadHandle(HANDLE_KEY_TODAY);
      if (todayHandle) {
        const perm = await todayHandle.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          const file = await todayHandle.getFile();
          const text = await file.text();
          setTodayFileHandle(todayHandle);
          setRawText(text);
          setSaveStatus('saved');
        } else {
          hasPending = true;
        }
      }
    } catch (e) {
      console.warn('本日ハンドル復元失敗:', e);
    }

    try {
      const archHandle = await loadHandle(HANDLE_KEY_ARCHIVE);
      if (archHandle) {
        const perm = await archHandle.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          const file = await archHandle.getFile();
          const text = await file.text();
          setArchiveFileHandle(archHandle);
          setArchiveEntries(parseArchive(text));
        } else {
          hasPending = true;
        }
      }
    } catch (e) {
      console.warn('アーカイブハンドル復元失敗:', e);
    }

    try {
      const memoHandle = await loadHandle(HANDLE_KEY_MEMO);
      if (memoHandle) {
        const perm = await memoHandle.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          const file = await memoHandle.getFile();
          const text = await file.text();
          setMemoFileHandle(memoHandle);
          setMemoText(text);
          setMemoSaveStatus('saved');
        } else {
          hasPending = true;
        }
      }
    } catch (e) {
      console.warn('メモハンドル復元失敗:', e);
    }

    setPendingReconnect(hasPending);
  }, [
    setRawText,
    setTodayFileHandle,
    setArchiveFileHandle,
    setArchiveEntries,
    setSaveStatus,
    setPendingReconnect,
    setMemoFileHandle,
    setMemoText,
    setMemoSaveStatus,
  ]);

  /**
   * ユーザー操作で権限を再リクエストし、保存済みファイルを再読み込みする。
   * ※ 必ずユーザーの明示的な操作（ボタンクリック等）から呼び出すこと
   */
  const reconnect = useCallback(async () => {
    let anyConnected = false;

    try {
      const todayHandle = await loadHandle(HANDLE_KEY_TODAY);
      if (todayHandle) {
        const perm = await todayHandle.requestPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          const file = await todayHandle.getFile();
          const text = await file.text();
          setTodayFileHandle(todayHandle);
          setRawText(text);
          setSaveStatus('saved');
          anyConnected = true;
        }
      }
    } catch (e) {
      console.warn('本日ファイル再接続失敗:', e);
    }

    try {
      const archHandle = await loadHandle(HANDLE_KEY_ARCHIVE);
      if (archHandle) {
        const perm = await archHandle.requestPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          const file = await archHandle.getFile();
          const text = await file.text();
          setArchiveFileHandle(archHandle);
          setArchiveEntries(parseArchive(text));
        }
      }
    } catch (e) {
      console.warn('アーカイブファイル再接続失敗:', e);
    }

    try {
      const memoHandle = await loadHandle(HANDLE_KEY_MEMO);
      if (memoHandle) {
        const perm = await memoHandle.requestPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          const file = await memoHandle.getFile();
          const text = await file.text();
          setMemoFileHandle(memoHandle);
          setMemoText(text);
          setMemoSaveStatus('saved');
        }
      }
    } catch (e) {
      console.warn('メモファイル再接続失敗:', e);
    }

    if (anyConnected) setPendingReconnect(false);
  }, [
    setRawText,
    setTodayFileHandle,
    setArchiveFileHandle,
    setArchiveEntries,
    setSaveStatus,
    setPendingReconnect,
    setMemoFileHandle,
    setMemoText,
    setMemoSaveStatus,
  ]);

  /** 保存済みの本日ファイルハンドルをクリアする */
  const clearStoredTodayHandle = useCallback(async () => {
    await removeHandle(HANDLE_KEY_TODAY);
    localStorage.removeItem(LS_KEY_TODAY_NAME);
    setStoredTodayName(null);
    setTodayFileHandle(null);
    setSaveStatus('disconnected');
  }, [setTodayFileHandle, setSaveStatus, setStoredTodayName]);

  /** 保存済みのアーカイブファイルハンドルをクリアする */
  const clearStoredArchiveHandle = useCallback(async () => {
    await removeHandle(HANDLE_KEY_ARCHIVE);
    localStorage.removeItem(LS_KEY_ARCHIVE_NAME);
    setStoredArchiveName(null);
    setArchiveFileHandle(null);
  }, [setArchiveFileHandle, setStoredArchiveName]);

  /** 保存済みのメモファイルハンドルをクリアする */
  const clearStoredMemoHandle = useCallback(async () => {
    await removeHandle(HANDLE_KEY_MEMO);
    localStorage.removeItem(LS_KEY_MEMO_NAME);
    setStoredMemoName(null);
    setMemoFileHandle(null);
    setMemoSaveStatus('disconnected');
  }, [setMemoFileHandle, setMemoSaveStatus, setStoredMemoName]);

  return {
    openTodayFile,
    openArchiveFile,
    openMemoFile,
    saveToday,
    saveMemo,
    performDayCopy,
    tryAutoReconnect,
    reconnect,
    clearStoredTodayHandle,
    clearStoredArchiveHandle,
    clearStoredMemoHandle,
  };
}

