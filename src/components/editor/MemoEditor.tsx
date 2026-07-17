import { useRef, useCallback, useState, useEffect, useDeferredValue, useLayoutEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { useFileAccess } from '../../hooks/useFileAccess';
import { useShortcuts } from '../../hooks/useShortcuts';
import { ActionMenu } from './ActionMenu';
import type { ActionType } from './ActionMenu';

/** ==== 名前 ==== 形式のセクション見出し（===== は除外） */
const SECTION_RE = /^={4}(?!=)\s+(.+?)\s+={4}(?!=)\s*$/;
/** ===== 名前 ===== 形式のサブセクション見出し */
const SUBSECTION_RE = /^={5}\s+(.+?)\s+={5}\s*$/;

export function MemoEditor() {
  const memoText          = useAppStore((s) => s.memoText);   // 保存済みテキスト（ハイライト・セクションナビ用）
  const memoFileHandle    = useAppStore((s) => s.memoFileHandle);
  const memoSaveStatus    = useAppStore((s) => s.memoSaveStatus);
  const setMemoSaveStatus = useAppStore((s) => s.setMemoSaveStatus);
  const setMemoText       = useAppStore((s) => s.setMemoText);
  const { saveMemo, openMemoFile } = useFileAccess();

  // ── ローカル編集テキスト（入力ラグ回避：storeには保存時のみ反映） ──
  const [localText, setLocalText] = useState(memoText);
  const localTextRef = useRef(localText);
  localTextRef.current = localText;

  // stale closure 回避用 ref（クリーンアップ内で最新値を参照するため）
  const memoFileHandleRef  = useRef(memoFileHandle);
  memoFileHandleRef.current = memoFileHandle;
  const memoSaveStatusRef  = useRef(memoSaveStatus);
  memoSaveStatusRef.current = memoSaveStatus;
  const saveMemoRef        = useRef(saveMemo);
  saveMemoRef.current       = saveMemo;

  const { handleAction } = useShortcuts();

  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // ダブルShift / Alt++ アクションメニュー
  const lastShiftPressRef               = useRef<number>(0);
  const [menuOpen, setMenuOpen]         = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // ファイルが開かれた / 再接続されたときにローカルテキストを同期
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setLocalText(memoText); }, [memoFileHandle]);

  // 外部更新によりファイルが再読み込みされた場合にローカルテキストを同期
  useEffect(() => {
    if (memoSaveStatus === 'reloaded') {
      setLocalText(memoText);
    }
  }, [memoSaveStatus, memoText]);

  // タブ離脱（アンマウント）時: store を更新 ＋ ファイルへ自動保存
  useEffect(() => {
    return () => {
      const text = localTextRef.current;
      setMemoText(text); // store を常に最新に保つ（タブ再訪時に復元）
      if (memoFileHandleRef.current && memoSaveStatusRef.current === 'unsaved') {
        saveMemoRef.current(text); // 未保存ならファイルにも自動保存
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setMemoText]);

  // ハイライト層はカーソルと常に同期させるため localText を直接使用
  const displayLines = localText.split('\n');
  // セクションナビはやや遅延してもよいので deferredValue で描画負荷を軽減
  const deferredText  = useDeferredValue(localText);
  const deferredLines = deferredText.split('\n');

  const [newSectionName, setNewSectionName] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSubsectionName, setNewSubsectionName] = useState('');
  const [showAddSubsection, setShowAddSubsection] = useState(false);
  const [expandedSectionLine, setExpandedSectionLine] = useState<number | null>(null);

  type SectionNode = { name: string; lineIndex: number; subsections: { name: string; lineIndex: number }[] };
  const sectionTree: SectionNode[] = [];
  deferredLines.forEach((line, i) => {
    const trimmed = line.trim();
    const sm  = trimmed.match(SECTION_RE);
    const ssm = trimmed.match(SUBSECTION_RE);
    if (sm) {
      sectionTree.push({ name: sm[1], lineIndex: i, subsections: [] });
    } else if (ssm && sectionTree.length > 0) {
      sectionTree[sectionTree.length - 1].subsections.push({ name: ssm[1], lineIndex: i });
    }
  });
  const expandedNode = expandedSectionLine !== null
    ? (sectionTree.find(s => s.lineIndex === expandedSectionLine) ?? null)
    : null;

  /** スクロール同期 */
  const syncScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // スクロールバー幅の同期
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    const hl = highlightRef.current;
    if (!ta || !hl) return;
    hl.style.paddingRight = `${ta.offsetWidth - ta.clientWidth + 16}px`; // 16 = px-4
  });

  /** テキスト変更（ローカルstateのみ更新。storeは保存時に更新） */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setLocalText(e.target.value);
      if (memoFileHandle) setMemoSaveStatus('unsaved');
    },
    [memoFileHandle, setMemoSaveStatus],
  );

  /** メニュー表示位置を計算してセット */
  const openMenu = useCallback((ta: HTMLTextAreaElement) => {
    const textBefore = ta.value.slice(0, ta.selectionStart);
    const lineNumber = textBefore.split('\n').length - 1;
    const rect       = ta.getBoundingClientRect();
    setMenuPosition({
      x: rect.left + 16,
      y: rect.top + 16 + (lineNumber + 1) * 24 - ta.scrollTop,
    });
    setMenuOpen(true);
  }, []);

  /** キーボードショートカット */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Shift キー単押し（キーリピートは除外）
      if (e.key === 'Shift' && !e.repeat) {
        const now  = Date.now();
        const last = lastShiftPressRef.current;
        if (last > 0 && now - last < 500) {
          lastShiftPressRef.current = 0;
          openMenu(e.currentTarget);
        } else {
          lastShiftPressRef.current = now;
        }
        return;
      }

      // Shift 以外でダブルShiftタイマーをリセット
      lastShiftPressRef.current = 0;

      if (menuOpen) setMenuOpen(false);

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveMemo(localTextRef.current);
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const ta    = e.currentTarget;
        const start = ta.selectionStart;
        const end   = ta.selectionEnd;
        // ta.value はブラウザが LF 正規化済みのため位置ズレが起きない
        const newText = ta.value.slice(0, start) + '  ' + ta.value.slice(end);
        setLocalText(newText);
        requestAnimationFrame(() => {
          ta.selectionStart = start + 2;
          ta.selectionEnd   = start + 2;
        });
      }
    },
    [menuOpen, openMenu, saveMemo],
  );

  /** アクションメニュー選択 */
  const handleMenuSelect = useCallback(
    (action: ActionType) => {
      setMenuOpen(false);
      const ta = textareaRef.current;
      if (ta) handleAction(ta, action, setLocalText);
    },
    [handleAction],
  );

  /** 指定行へジャンプ（localTextRefで精度確保） */
  const jumpToSection = useCallback(
    (lineIndex: number) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const LINE_HEIGHT = 24; // leading-6 = 1.5rem
      ta.scrollTop = Math.max(0, lineIndex * LINE_HEIGHT - 16);
      const localLines = localTextRef.current.split('\n');
      const offset = localLines.slice(0, lineIndex).reduce((acc, l) => acc + l.length + 1, 0);
      ta.focus();
      ta.setSelectionRange(offset, offset);
    },
    [],
  );

  /** セクションを末尾に追記して保存 */
  const handleAddSection = useCallback(() => {
    const name = newSectionName.trim();
    if (!name) return;
    const sectionBlock = `\n\n==== ${name} ====\n\n`;
    const newText = localTextRef.current.trimEnd() + sectionBlock;
    setLocalText(newText);
    saveMemo(newText);
    setNewSectionName('');
    setShowAddSection(false);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
      }
    });
  }, [newSectionName, saveMemo]);

  /** サブセクションを末尾に追記して保存 */
  const handleAddSubsection = useCallback(() => {
    const name = newSubsectionName.trim();
    if (!name) return;
    const block = `\n\n===== ${name} =====\n\n`;
    const newText = localTextRef.current.trimEnd() + block;
    setLocalText(newText);
    saveMemo(newText);
    setNewSubsectionName('');
    setShowAddSubsection(false);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
      }
    });
  }, [newSubsectionName, saveMemo]);

  return (
    <div className="flex flex-col h-full overflow-hidden font-mono text-sm bg-gray-950">

      {/* ── セクションナビゲーションバー ── */}
      <div className="shrink-0 bg-gray-900 border-b border-gray-800">
        {/* 第1行: 親セクションボタン + 追加ボタン */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto min-h-[36px]">
          {sectionTree.length === 0 && !showAddSection && !showAddSubsection && (
            <span className="text-xs text-gray-600 shrink-0 select-none">
              セクションなし（==== 名前 ==== で作成）
            </span>
          )}

          {sectionTree.map((node) => (
            <button
              key={node.lineIndex}
              onClick={() => {
                jumpToSection(node.lineIndex);
                if (node.subsections.length > 0) {
                  setExpandedSectionLine(prev => prev === node.lineIndex ? null : node.lineIndex);
                }
              }}
              className={`shrink-0 text-xs px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                expandedSectionLine === node.lineIndex
                  ? 'bg-emerald-900 text-emerald-200'
                  : 'bg-gray-800 hover:bg-gray-700 text-emerald-300'
              }`}
            >
              {node.subsections.length > 0 && (
                <span className="mr-1 text-emerald-500">
                  {expandedSectionLine === node.lineIndex ? '▾' : '▸'}
                </span>
              )}
              {node.name}
            </button>
          ))}

          {showAddSection ? (
            <div className="flex items-center gap-1 shrink-0 ml-1">
              <input
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter')  handleAddSection();
                  if (e.key === 'Escape') { setShowAddSection(false); setNewSectionName(''); }
                }}
                placeholder="セクション名"
                autoFocus
                className="text-xs bg-gray-800 border border-gray-600 rounded px-2 py-0.5
                           text-gray-200 outline-none w-32 focus:border-emerald-500 transition-colors"
              />
              <button
                onClick={handleAddSection}
                className="text-xs text-emerald-400 hover:text-emerald-300 px-1 transition-colors"
              >
                追加
              </button>
              <button
                onClick={() => { setShowAddSection(false); setNewSectionName(''); }}
                className="text-xs text-gray-500 hover:text-gray-300 px-1 transition-colors"
              >
                ✕
              </button>
            </div>
          ) : showAddSubsection ? (
            <div className="flex items-center gap-1 shrink-0 ml-1">
              <input
                type="text"
                value={newSubsectionName}
                onChange={(e) => setNewSubsectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter')  handleAddSubsection();
                  if (e.key === 'Escape') { setShowAddSubsection(false); setNewSubsectionName(''); }
                }}
                placeholder="サブセクション名"
                autoFocus
                className="text-xs bg-gray-800 border border-gray-600 rounded px-2 py-0.5
                           text-gray-200 outline-none w-36 focus:border-sky-500 transition-colors"
              />
              <button
                onClick={handleAddSubsection}
                className="text-xs text-sky-400 hover:text-sky-300 px-1 transition-colors"
              >
                追加
              </button>
              <button
                onClick={() => { setShowAddSubsection(false); setNewSubsectionName(''); }}
                className="text-xs text-gray-500 hover:text-gray-300 px-1 transition-colors"
              >
                ✕
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => { setShowAddSection(true); setShowAddSubsection(false); }}
                className="shrink-0 text-xs px-2 py-0.5 rounded border border-dashed border-gray-700
                           hover:border-emerald-600 text-gray-500 hover:text-emerald-400 transition-colors
                           whitespace-nowrap ml-1"
              >
                ＋ セクション
              </button>
              <button
                onClick={() => { setShowAddSubsection(true); setShowAddSection(false); }}
                className="shrink-0 text-xs px-2 py-0.5 rounded border border-dashed border-gray-700
                           hover:border-sky-600 text-gray-500 hover:text-sky-400 transition-colors
                           whitespace-nowrap"
              >
                ＋ サブセクション
              </button>
            </>
          )}

          {/* 保存ステータス（右端） */}
          {memoFileHandle && (
            <span className={`ml-auto shrink-0 text-xs select-none ${
              memoSaveStatus === 'saved'        ? 'text-green-500' :
              memoSaveStatus === 'unsaved'      ? 'text-orange-400' :
              memoSaveStatus === 'saving'       ? 'text-yellow-400' :
              memoSaveStatus === 'reloaded'     ? 'text-cyan-400' :
                                                  'text-gray-600'
            }`}>
              {memoSaveStatus === 'saved'    ? '保存済み' :
               memoSaveStatus === 'unsaved'  ? '未保存' :
               memoSaveStatus === 'saving'   ? '保存中...' :
               memoSaveStatus === 'reloaded' ? '外部変更を読み込み' : '未接続'}
            </span>
          )}
        </div>

        {/* 第2行: 展開されたサブセクションボタン */}
        {expandedNode && expandedNode.subsections.length > 0 && (
          <div className="flex items-center gap-1.5 px-6 py-1 overflow-x-auto border-t border-gray-800/60 min-h-[30px]">
            <span className="text-xs text-gray-600 shrink-0 select-none mr-1">└</span>
            {expandedNode.subsections.map((sub) => (
              <button
                key={sub.lineIndex}
                onClick={() => jumpToSection(sub.lineIndex)}
                className="shrink-0 text-xs px-2 py-0.5 rounded bg-gray-800/80 hover:bg-gray-700
                           text-sky-300 transition-colors whitespace-nowrap"
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── エディタ本体 ── */}
      {!memoFileHandle ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 text-sm mb-3">メモファイルが接続されていません</p>
            <button
              onClick={openMemoFile}
              className="text-sm px-4 py-2 rounded bg-blue-600 hover:bg-blue-500
                         active:bg-blue-700 text-white transition-colors"
            >
              memo_archive.txt を開く
            </button>
          </div>
        </div>
      ) : (
        <div className="relative flex-1 overflow-hidden">
          {/* ハイライトレイヤー（localTextの遅延値で非ブロッキング更新） */}
          <div
            ref={highlightRef}
            aria-hidden
            className="absolute inset-0 px-4 py-4 leading-6 overflow-hidden pointer-events-none
                       select-none whitespace-pre-wrap break-all"
            style={{ paddingRight: 16 }}  // useLayoutEffect で上書きされる
          >
            {displayLines.map((line, i) => {
              const trimmed     = line.trim();
              const isSection    = SECTION_RE.test(trimmed);
              const isSubsection = SUBSECTION_RE.test(trimmed);
              const isBlackSq    = trimmed.startsWith('■');
              return (
                <div
                  key={i}
                  className={`leading-6 ${
                    isSection    ? 'text-emerald-300 font-bold' :
                    isSubsection ? 'text-sky-300 font-semibold' :
                    isBlackSq    ? 'text-amber-300 font-semibold' :
                                   'text-gray-200'
                  }`}
                >
                  {line || '\u00a0'}
                </div>
              );
            })}
          </div>

          {/* テキストエリア（ローカルstateで管理） */}
          <textarea
            ref={textareaRef}
            value={localText}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onScroll={syncScroll}
            spellCheck={false}
            placeholder={'メモを入力...\n\n==== セクション名 ==== でセクションを作成できます'}
            className="absolute inset-0 w-full h-full bg-transparent text-transparent
                       caret-blue-400 px-4 py-4 resize-none outline-none leading-6 overflow-auto
                       break-all [scrollbar-gutter:stable]"
          />
        </div>
      )}

      {/* アクションメニュー（ダブルShift / Alt++ で表示） */}
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
