import { useCallback } from 'react';
import { calcNextItem } from '../lib/parserEngine';
import { useAppStore } from '../store/appStore';
import type { ActionType } from '../components/editor/ActionMenu';

const DIVIDER = 'ーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーー';

export function useShortcuts() {
  const setRawText = useAppStore((s) => s.setRawText);

  /**
   * Shift+Enter: カーソル位置に改行 + 次の項番プレフィックスを挿入
   * textarea.value を使用することでブラウザの LF 正規化済み文字列を参照し
   * CRLF ファイル読み込み時の位置ズレを防ぐ
   */
  const handleShiftEnter = useCallback(
    (textarea: HTMLTextAreaElement) => {
      const value      = textarea.value;          // 常に LF 正規化済み
      const { prefix } = calcNextItem(value);
      const cursorPos  = textarea.selectionStart;
      const insert     = '\n' + prefix;

      const newText = value.slice(0, cursorPos) + insert + value.slice(textarea.selectionEnd);

      setRawText(newText);

      // React の再レンダリング後にカーソルを移動
      requestAnimationFrame(() => {
        const newPos = cursorPos + insert.length;
        textarea.selectionStart = newPos;
        textarea.selectionEnd   = newPos;
        textarea.focus();
      });
    },
    [setRawText],
  );

  /**
   * アクションメニュー: 選択されたアクションに対応するテキストをカーソル行の末尾に挿入
   * setText を渡すとそちらを使用（MemoEditor のローカルstate対応）
   */
  const handleAction = useCallback(
    (textarea: HTMLTextAreaElement, action: ActionType, setText?: (t: string) => void) => {
      const value     = textarea.value;
      const cursorPos = textarea.selectionStart;

      // 挿入テキストとカーソル行末位置を決定
      const lineEnd  = value.indexOf('\n', cursorPos);
      const insertAt = lineEnd === -1 ? value.length : lineEnd;

      let insertText: string;
      let cursorOffsetInInsert: number;

      if (action === 'section') {
        insertText          = '====  ====';
        cursorOffsetInInsert = 5; // '==== ' の直後（スペース1個目）
      } else if (action === 'subsection') {
        insertText          = '=====  =====';
        cursorOffsetInInsert = 6; // '===== ' の直後（スペース1個目）
      } else if (action === 'divider') {
        insertText          = DIVIDER;
        cursorOffsetInInsert = insertText.length;
      } else {
        // date
        const today = new Date();
        const y = today.getFullYear();
        const m = today.getMonth() + 1;
        const d = today.getDate();
        insertText          = `${y}年${m}月${d}日`;
        cursorOffsetInInsert = insertText.length;
      }

      const insert  = '\n' + insertText;
      const newText = value.slice(0, insertAt) + insert + value.slice(insertAt);
      (setText ?? setRawText)(newText);

      requestAnimationFrame(() => {
        const newPos = insertAt + 1 + cursorOffsetInInsert;
        textarea.selectionStart = newPos;
        textarea.selectionEnd   = newPos;
        textarea.focus();
      });
    },
    [setRawText],
  );

  return { handleShiftEnter, handleAction };
}
