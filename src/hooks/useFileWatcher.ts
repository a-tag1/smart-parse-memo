import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';

/** ポーリング間隔（ms）。30 秒は負荷と鮮度のバランスが良い */
const POLL_INTERVAL_MS = 30_000;

/**
 * バックグラウンドでファイルの lastModified を監視し、
 * 外部（別マシン等）で変更されていれば自動で再読み込みする。
 *
 * - 30 秒ごとにポーリング
 * - タブがフォアグラウンドに戻った瞬間にも即時チェック
 * - 未保存編集がある場合（saveStatus / memoSaveStatus === 'unsaved'）は上書きしない
 */
export function useFileWatcher() {
  // --- today ---
  const todayFileHandle      = useAppStore((s) => s.todayFileHandle);
  const todayLastModified    = useAppStore((s) => s.todayLastModified);
  const saveStatus           = useAppStore((s) => s.saveStatus);
  const setRawText           = useAppStore((s) => s.setRawText);
  const setTodayLastModified = useAppStore((s) => s.setTodayLastModified);
  const setSaveStatus        = useAppStore((s) => s.setSaveStatus);

  // --- memo ---
  const memoFileHandle      = useAppStore((s) => s.memoFileHandle);
  const memoLastModified    = useAppStore((s) => s.memoLastModified);
  const memoSaveStatus      = useAppStore((s) => s.memoSaveStatus);
  const setMemoText         = useAppStore((s) => s.setMemoText);
  const setMemoLastModified = useAppStore((s) => s.setMemoLastModified);
  const setMemoSaveStatus   = useAppStore((s) => s.setMemoSaveStatus);

  // stale closure 対策: 最新値を ref に保持
  const todayHandleRef      = useRef(todayFileHandle);
  const todayLastModRef     = useRef(todayLastModified);
  const saveStatusRef       = useRef(saveStatus);
  const memoHandleRef       = useRef(memoFileHandle);
  const memoLastModRef      = useRef(memoLastModified);
  const memoSaveStatusRef   = useRef(memoSaveStatus);

  useEffect(() => { todayHandleRef.current = todayFileHandle;   }, [todayFileHandle]);
  useEffect(() => { todayLastModRef.current = todayLastModified; }, [todayLastModified]);
  useEffect(() => { saveStatusRef.current = saveStatus;         }, [saveStatus]);
  useEffect(() => { memoHandleRef.current = memoFileHandle;     }, [memoFileHandle]);
  useEffect(() => { memoLastModRef.current = memoLastModified;  }, [memoLastModified]);
  useEffect(() => { memoSaveStatusRef.current = memoSaveStatus; }, [memoSaveStatus]);

  useEffect(() => {
    const checkFiles = async () => {
      // --- today ファイルチェック ---
      const todayHandle = todayHandleRef.current;
      const todayMod    = todayLastModRef.current;
      if (todayHandle && todayMod !== null) {
        try {
          const file = await todayHandle.getFile();
          if (file.lastModified > todayMod) {
            if (saveStatusRef.current !== 'unsaved') {
              const text = (await file.text()).replace(/\r\n/g, '\n');
              setRawText(text);
              setTodayLastModified(file.lastModified);
              setSaveStatus('reloaded');
            }
            // unsaved の場合は次回ポーリングまで待機（編集中を守る）
          }
        } catch {
          // 権限エラーや一時的な I/O 失敗は無視して次回以降に再試行
        }
      }

      // --- memo ファイルチェック ---
      const memoHandle = memoHandleRef.current;
      const memoMod    = memoLastModRef.current;
      if (memoHandle && memoMod !== null) {
        try {
          const file = await memoHandle.getFile();
          if (file.lastModified > memoMod) {
            if (memoSaveStatusRef.current !== 'unsaved') {
              const text = (await file.text()).replace(/\r\n/g, '\n');
              setMemoText(text);
              setMemoLastModified(file.lastModified);
              setMemoSaveStatus('reloaded');
            }
          }
        } catch {
          // 同上
        }
      }
    };

    // 定期ポーリング
    const timerId = setInterval(checkFiles, POLL_INTERVAL_MS);

    // タブがアクティブになった瞬間に即時チェック
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkFiles();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(timerId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [
    setRawText,
    setTodayLastModified,
    setSaveStatus,
    setMemoText,
    setMemoLastModified,
    setMemoSaveStatus,
  ]);
}
