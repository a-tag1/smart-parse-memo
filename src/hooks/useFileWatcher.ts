import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';

/** ポーリング間隔（ms）。30 秒は負荷と鮮度のバランスが良い */
const POLL_INTERVAL_MS = 30_000;

/**
 * バックグラウンドでファイルの lastModified を監視し、
 * 外部（別マシン等）で変更されていれば確認ダイアログ経由で再読み込みする。
 *
 * - 30 秒ごとにポーリング
 * - タブがフォアグラウンドに戻った瞬間にも即時チェック
 * - 外部変更を検出したら pendingExternalToday / pendingExternalMemo をセットし
 *   ExternalChangeDialog でユーザーに確認する
 */
export function useFileWatcher() {
  // --- today ---
  const todayFileHandle        = useAppStore((s) => s.todayFileHandle);
  const todayLastModified      = useAppStore((s) => s.todayLastModified);
  const setTodayLastModified   = useAppStore((s) => s.setTodayLastModified);
  const pendingExternalToday   = useAppStore((s) => s.pendingExternalToday);
  const setPendingExternalToday = useAppStore((s) => s.setPendingExternalToday);

  // --- memo ---
  const memoFileHandle         = useAppStore((s) => s.memoFileHandle);
  const memoLastModified       = useAppStore((s) => s.memoLastModified);
  const setMemoLastModified    = useAppStore((s) => s.setMemoLastModified);
  const pendingExternalMemo    = useAppStore((s) => s.pendingExternalMemo);
  const setPendingExternalMemo  = useAppStore((s) => s.setPendingExternalMemo);

  // stale closure 対策: 最新値を ref に保持
  const todayHandleRef             = useRef(todayFileHandle);
  const todayLastModRef            = useRef(todayLastModified);
  const pendingExternalTodayRef    = useRef(pendingExternalToday);
  const memoHandleRef              = useRef(memoFileHandle);
  const memoLastModRef             = useRef(memoLastModified);
  const pendingExternalMemoRef     = useRef(pendingExternalMemo);

  useEffect(() => { todayHandleRef.current = todayFileHandle;             }, [todayFileHandle]);
  useEffect(() => { todayLastModRef.current = todayLastModified;           }, [todayLastModified]);
  useEffect(() => { pendingExternalTodayRef.current = pendingExternalToday; }, [pendingExternalToday]);
  useEffect(() => { memoHandleRef.current = memoFileHandle;               }, [memoFileHandle]);
  useEffect(() => { memoLastModRef.current = memoLastModified;             }, [memoLastModified]);
  useEffect(() => { pendingExternalMemoRef.current = pendingExternalMemo;   }, [pendingExternalMemo]);

  useEffect(() => {
    const checkFiles = async () => {
      // --- today ファイルチェック ---
      const todayHandle = todayHandleRef.current;
      const todayMod    = todayLastModRef.current;
      if (todayHandle && todayMod !== null && !pendingExternalTodayRef.current) {
        try {
          const file = await todayHandle.getFile();
          if (file.lastModified > todayMod) {
            const text = (await file.text()).replace(/\r\n/g, '\n');
            // lastModified を先に更新して save 関数の二重検出を防ぐ
            setTodayLastModified(file.lastModified);
            setPendingExternalToday({ content: text, lastModified: file.lastModified });
          }
        } catch {
          // 権限エラーや一時的な I/O 失敗は無視して次回以降に再試行
        }
      }

      // --- memo ファイルチェック ---
      const memoHandle = memoHandleRef.current;
      const memoMod    = memoLastModRef.current;
      if (memoHandle && memoMod !== null && !pendingExternalMemoRef.current) {
        try {
          const file = await memoHandle.getFile();
          if (file.lastModified > memoMod) {
            const text = (await file.text()).replace(/\r\n/g, '\n');
            // lastModified を先に更新して save 関数の二重検出を防ぐ
            setMemoLastModified(file.lastModified);
            setPendingExternalMemo({ content: text, lastModified: file.lastModified });
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
    setTodayLastModified,
    setPendingExternalToday,
    setMemoLastModified,
    setPendingExternalMemo,
  ]);
}
