import { useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { useFileAccess } from '../../hooks/useFileAccess';
import { useShortcuts } from '../../hooks/useShortcuts';

const DEBOUNCE_MS = 1000;

export function TextEditor() {
  const rawText    = useAppStore((s) => s.rawText);
  const setRawText = useAppStore((s) => s.setRawText);
  const todayFileHandle = useAppStore((s) => s.todayFileHandle);

  const { saveToday }        = useFileAccess();
  const { handleShiftEnter } = useShortcuts();

  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const saveTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // スクロール同期
  const syncScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // テキスト変更 + デバウンス保存
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      setRawText(text);

      if (todayFileHandle) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          saveToday(text);
        }, DEBOUNCE_MS);
      }
    },
    [setRawText, saveToday, todayFileHandle],
  );

  // キーボードショートカット
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        handleShiftEnter(e.currentTarget);
      }
    },
    [handleShiftEnter],
  );

  // Tab キー（インデント）
  const handleKeyDownTab = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const ta    = e.currentTarget;
        const start = ta.selectionStart;
        const end   = ta.selectionEnd;
        const newText =
          rawText.slice(0, start) + '  ' + rawText.slice(end);
        setRawText(newText);
        requestAnimationFrame(() => {
          ta.selectionStart = start + 2;
          ta.selectionEnd   = start + 2;
        });
      }
    },
    [rawText, setRawText],
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const lines = rawText.split('\n');

  return (
    <div className="flex h-full overflow-hidden font-mono text-sm bg-gray-950">
      {/* 行番号 */}
      <div
        ref={lineNumbersRef}
        className="select-none text-right text-gray-600 bg-gray-900 border-r border-gray-800
                   px-2 pt-4 pb-4 min-w-[3.5rem] overflow-hidden shrink-0"
        aria-hidden
      >
        {lines.map((_, i) => (
          <div key={i} className="leading-6 text-xs">
            {i + 1}
          </div>
        ))}
      </div>

      {/* テキストエリア */}
      <textarea
        ref={textareaRef}
        value={rawText}
        onChange={handleChange}
        onKeyDown={(e) => {
          handleKeyDown(e);
          handleKeyDownTab(e);
        }}
        onScroll={syncScroll}
        spellCheck={false}
        className="flex-1 bg-transparent text-gray-200 px-4 py-4 resize-none outline-none
                   leading-6 overflow-auto caret-blue-400"
        placeholder={
          todayFileHandle
            ? ''
            : 'ファイルを開いて編集を開始してください...\n\nヒント: Shift+Enter で次の項番を自動挿入します'
        }
      />
    </div>
  );
}
