import { useRef, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { useFileAccess } from '../../hooks/useFileAccess';
import { useShortcuts } from '../../hooks/useShortcuts';

export function TextEditor() {
  const rawText         = useAppStore((s) => s.rawText);
  const setRawText      = useAppStore((s) => s.setRawText);
  const setSaveStatus   = useAppStore((s) => s.setSaveStatus);
  const todayFileHandle = useAppStore((s) => s.todayFileHandle);

  const { saveToday }        = useFileAccess();
  const { handleShiftEnter } = useShortcuts();

  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const highlightRef   = useRef<HTMLDivElement>(null);
  const rawTextRef     = useRef(rawText);
  rawTextRef.current   = rawText;

  // スクロール同期
  const syncScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // テキスト変更
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      setRawText(text);
      if (todayFileHandle) setSaveStatus('unsaved');
    },
    [setRawText, todayFileHandle, setSaveStatus],
  );

  // キーボードショートカット（Shift+Enter / Ctrl+S）
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        handleShiftEnter(e.currentTarget);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveToday(rawTextRef.current);
      }
    },
    [handleShiftEnter, saveToday],
  );

  // Tab キー（インデント）
  const handleKeyDownTab = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const ta    = e.currentTarget;
        const start = ta.selectionStart;
        const end   = ta.selectionEnd;
        const newText = rawText.slice(0, start) + '  ' + rawText.slice(end);
        setRawText(newText);
        requestAnimationFrame(() => {
          ta.selectionStart = start + 2;
          ta.selectionEnd   = start + 2;
        });
      }
    },
    [rawText, setRawText],
  );

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

      {/* エディタ（ハイライトレイヤー + テキストエリア） */}
      <div className="relative flex-1 overflow-hidden">
        {/* ハイライトレイヤー（背面） */}
        <div
          ref={highlightRef}
          aria-hidden
          className="absolute inset-0 px-4 py-4 leading-6 overflow-hidden pointer-events-none
                     select-none whitespace-pre-wrap break-all"
        >
          {lines.map((line, i) => {
            const trimmed = line.trimStart();
            const isH3 = /^###(?!#)/.test(trimmed);
            const isH4 = /^####/.test(trimmed);
            return (
              <div
                key={i}
                className={`leading-6 ${
                  isH3 ? 'text-emerald-300 font-bold' :
                  isH4 ? 'text-yellow-400 font-semibold' :
                         'text-gray-200'
                }`}
              >
                {line || '\u00a0'}
              </div>
            );
          })}
        </div>

        {/* テキストエリア（文字は透明にしてキャレットのみ表示） */}
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
          className="absolute inset-0 w-full h-full bg-transparent text-transparent
                     caret-blue-400 px-4 py-4 resize-none outline-none leading-6 overflow-auto"
          placeholder={
            todayFileHandle
              ? ''
              : 'ファイルを開いて編集を開始してください...\n\nヒント: Shift+Enter で次の項番を自動挿入します'
          }
        />
      </div>
    </div>
  );
}