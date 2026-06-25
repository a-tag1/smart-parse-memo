import { useCallback } from 'react';
import { calcNextItem } from '../lib/parserEngine';
import { useAppStore } from '../store/appStore';

export function useShortcuts() {
  const rawText    = useAppStore((s) => s.rawText);
  const setRawText = useAppStore((s) => s.setRawText);

  /**
   * Shift+Enter: カーソル位置に改行 + 次の項番プレフィックスを挿入
   */
  const handleShiftEnter = useCallback(
    (textarea: HTMLTextAreaElement) => {
      const { prefix } = calcNextItem(rawText);
      const cursorPos  = textarea.selectionStart;
      const insert     = '\n' + prefix;

      const newText =
        rawText.slice(0, cursorPos) + insert + rawText.slice(textarea.selectionEnd);

      setRawText(newText);

      // React の再レンダリング後にカーソルを移動
      requestAnimationFrame(() => {
        const newPos = cursorPos + insert.length;
        textarea.selectionStart = newPos;
        textarea.selectionEnd   = newPos;
        textarea.focus();
      });
    },
    [rawText, setRawText],
  );

  return { handleShiftEnter };
}
