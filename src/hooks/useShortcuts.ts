import { useCallback } from 'react';
import { calcNextItem } from '../lib/parserEngine';
import { useAppStore } from '../store/appStore';

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

  return { handleShiftEnter };
}
