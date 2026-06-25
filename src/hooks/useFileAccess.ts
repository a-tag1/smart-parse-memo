import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import {
  getTodayDate,
  extractDateFromText,
  extractTasksSection,
  buildTodayTemplate,
  appendToArchive,
  parseArchive,
} from '../lib/archiveEngine';

export function useFileAccess() {
  const setRawText           = useAppStore((s) => s.setRawText);
  const setTodayFileHandle   = useAppStore((s) => s.setTodayFileHandle);
  const setArchiveFileHandle = useAppStore((s) => s.setArchiveFileHandle);
  const setArchiveEntries    = useAppStore((s) => s.setArchiveEntries);
  const setSaveStatus        = useAppStore((s) => s.setSaveStatus);
  const todayFileHandle      = useAppStore((s) => s.todayFileHandle);
  const archiveFileHandle    = useAppStore((s) => s.archiveFileHandle);
  const rawText              = useAppStore((s) => s.rawText);

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
  }, [setRawText, setTodayFileHandle, setSaveStatus]);

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
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('アーカイブファイルを開けませんでした:', err);
      }
    }
  }, [setArchiveFileHandle, setArchiveEntries]);

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

      // 2. 新しい daily_today.txt を生成（タスクのみ引継ぎ）
      const today          = getTodayDate();
      const tasksSectionText = extractTasksSection(rawText);
      const newTodayText   = buildTodayTemplate(today, tasksSectionText);

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
  ]);

  return { openTodayFile, openArchiveFile, saveToday, performDayCopy };
}

