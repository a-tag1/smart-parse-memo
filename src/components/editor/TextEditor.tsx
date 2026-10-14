import { useRef, useCallback, useLayoutEffect, useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { useFileAccess } from '../../hooks/useFileAccess';
import { useShortcuts } from '../../hooks/useShortcuts';
import { ActionMenu } from './ActionMenu';
import type { ActionType } from './ActionMenu';

export function TextEditor() {
  const rawText         = useAppStore((s) => s.rawText);
  const setRawText      = useAppStore((s) => s.setRawText);
  const setSaveStatus   = useAppStore((s) => s.setSaveStatus);
  const todayFileHandle = useAppStore((s) => s.todayFileHandle);
  const focusLineIndex    = useAppStore((s) => s.focusLineIndex);
  const setFocusLineIndex = useAppStore((s) => s.setFocusLineIndex);
  const parsedData          = useAppStore((s) => s.parsedData);
  const setFocusTaskLineIndex = useAppStore((s) => s.setFocusTaskLineIndex);

  const { saveToday }                  = useFileAccess();
  const { handleShiftEnter, handleAction } = useShortcuts();

  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const highlightRef   = useRef<HTMLDivElement>(null);
  const rawTextRef     = useRef(rawText);
  rawTextRef.current   = rawText;

  // ダブルShift検出用（最後に押した時刻。0 = 未押下）
  const lastShiftPressRef = useRef<number>(0);

  // アクションメニュー状態
  const [menuOpen, setMenuOpen]         = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [highlightedLineIndex, setHighlightedLineIndex] = useState<number | null>(null);

  // 行ジャンプ: focusLineIndex が設定されたらその行へスクロール＆カーソル移動
  useEffect(() => {
    if (focusLineIndex === null) return;
    const ta = textareaRef.current;
    if (!ta) return;
    setHighlightedLineIndex(focusLineIndex);
    const lines = rawText.split('\n');
    const charPos = lines
      .slice(0, focusLineIndex)
      .reduce((sum, l) => sum + l.length + 1, 0);
    ta.focus();
    ta.setSelectionRange(charPos, charPos);
    const lineHeight = 24; // leading-6
    const targetScroll = focusLineIndex * lineHeight;
    ta.scrollTop = Math.max(0, targetScroll);
    setFocusLineIndex(null);
  }, [focusLineIndex, rawText, setFocusLineIndex]);

  useEffect(() => {
    if (highlightedLineIndex === null) return;
    const timer = setTimeout(() => setHighlightedLineIndex(null), 1500);
    return () => clearTimeout(timer);
  }, [highlightedLineIndex]);

  // スクロール同期
  const syncScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // スクロールバー幅の同期
  // textarea にスクロールバーが出るとコンテンツ幅が縮小し、ハイライト層と折り返し位置がズレる。
  // レンダリング後に scrollbarWidth を測定して highlight の paddingRight を補正する。
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    const hl = highlightRef.current;
    if (!ta || !hl) return;
    hl.style.paddingRight = `${ta.offsetWidth - ta.clientWidth + 16}px`; // 16 = px-4
  });

  // テキスト変更
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      setRawText(text);
      if (todayFileHandle) setSaveStatus('unsaved');
    },
    [setRawText, todayFileHandle, setSaveStatus],
  );

  // キーボードショートカット（Shift+Enter / Ctrl+S / ダブルShiftでアクションメニュー）
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Shift キー単押し（キーリピートは除外）
      if (e.key === 'Shift' && !e.repeat) {
        const now = Date.now();
        const last = lastShiftPressRef.current;
        if (last > 0 && now - last < 500) {
          // ダブルShift確定: カーソル行の直下にメニューを表示
          lastShiftPressRef.current = 0;
          const ta         = e.currentTarget;
          const textBefore = ta.value.slice(0, ta.selectionStart);
          const lineNumber = textBefore.split('\n').length - 1;
          const rect       = ta.getBoundingClientRect();
          setMenuPosition({
            x: rect.left + 16,
            y: rect.top + 16 + (lineNumber + 1) * 24 - ta.scrollTop,
          });
          setMenuOpen(true);
        } else {
          lastShiftPressRef.current = now;
        }
        return;
      }

      // Shift 以外のキーが押されたらダブルShiftタイマーをリセット
      lastShiftPressRef.current = 0;

      // メニュー表示中は閉じる
      if (menuOpen) setMenuOpen(false);

      if (e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        handleShiftEnter(e.currentTarget);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveToday(rawTextRef.current);
      }
    },
    [menuOpen, handleShiftEnter, saveToday],
  );

  // アクションメニューの選択処理
  const handleMenuSelect = useCallback(
    (action: ActionType) => {
      setMenuOpen(false);
      const ta = textareaRef.current;
      if (ta) handleAction(ta, action);
    },
    [handleAction],
  );

  // クリック時: タスク行なら右パネルへジャンプ
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>) => {
      if (!parsedData) return;
      const ta = e.currentTarget;
      const textBefore = ta.value.slice(0, ta.selectionStart);
      const lineIndex = textBefore.split('\n').length - 1;
      const allTasks = [...parsedData.tasks, ...parsedData.completedTasks];
      if (allTasks.some((t) => t.lineIndex === lineIndex)) {
        setFocusTaskLineIndex(lineIndex);
      }
    },
    [parsedData, setFocusTaskLineIndex],
  );

  // Tab キー（インデント）
  const handleKeyDownTab = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const ta    = e.currentTarget;
        const start = ta.selectionStart;
        const end   = ta.selectionEnd;
        // ta.value はブラウザが LF 正規化済みのため位置ズレが起きない
        const newText = ta.value.slice(0, start) + '  ' + ta.value.slice(end);
        setRawText(newText);
        requestAnimationFrame(() => {
          ta.selectionStart = start + 2;
          ta.selectionEnd   = start + 2;
        });
      }
    },
    [setRawText],
  );

  const lines = rawText.split('\n');

  return (
    <div className="flex h-full overflow-hidden text-sm bg-gray-950">
      {/* 行番号 */}
      <div
        ref={lineNumbersRef}
        className="select-none text-right text-gray-600 bg-gray-900 border-r border-gray-800
                   px-2 pt-4 pb-4 min-w-[3.5rem] overflow-hidden shrink-0"
        aria-hidden
      >
        {lines.map((_, i) => (
          <div
            key={i}
            className={`leading-6 text-xs rounded-sm transition-colors duration-300 ${
              highlightedLineIndex === i
                ? 'text-yellow-100 bg-yellow-300/55 shadow-[0_0_18px_rgba(250,204,21,0.75)]'
                : ''
            }`}
          >
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
          style={{ paddingRight: 16 }}  // useLayoutEffect で上書きされる
        >
          {lines.map((line, i) => {
            const trimmed = line.trimStart();
            const isH3 = /^###(?!#)/.test(trimmed);
            const isH4 = /^####/.test(trimmed);
            return (
              <div
                key={i}
                className={`leading-6 rounded-sm transition-colors duration-300 ${
                  highlightedLineIndex === i
                    ? 'bg-yellow-300/40 shadow-[inset_4px_0_0_#fde047,0_0_20px_rgba(250,204,21,0.5)]'
                    : ''
                } ${
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
          onClick={handleClick}
          onScroll={syncScroll}
          spellCheck={false}
          className="absolute inset-0 w-full h-full bg-transparent text-transparent
                     caret-blue-400 px-4 py-4 resize-none outline-none leading-6 overflow-auto
                     break-all [scrollbar-gutter:stable]"
          placeholder={
            todayFileHandle
              ? ''
              : 'ファイルを開いて編集を開始してください...\n\nヒント: Shift+Enter で次の項番を自動挿入します\nヒント: Shift キーを素早く2回押してアクションメニューを表示'
          }
        />
      </div>

      {/* アクションメニュー（ダブルShiftで表示） */}
      {menuOpen && (
        <ActionMenu
          position={menuPosition}
          onSelect={handleMenuSelect}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}