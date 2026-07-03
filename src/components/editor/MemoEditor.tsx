import { useRef, useCallback, useState, useEffect, useDeferredValue, useLayoutEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { useFileAccess } from '../../hooks/useFileAccess';

/** ==== 名前 ==== 形式のセクション見出しにマッチ */
const SECTION_RE = /^====\s+(.+?)\s+====\s*$/;

export function MemoEditor() {
  const memoText          = useAppStore((s) => s.memoText);   // 保存済みテキスト（ハイライト・セクションナビ用）
  const memoFileHandle    = useAppStore((s) => s.memoFileHandle);
  const memoSaveStatus    = useAppStore((s) => s.memoSaveStatus);
  const setMemoSaveStatus = useAppStore((s) => s.setMemoSaveStatus);
  const { saveMemo, openMemoFile } = useFileAccess();

  // ── ローカル編集テキスト（入力ラグ回避：storeには保存時のみ反映） ──
  const [localText, setLocalText] = useState(memoText);
  const localTextRef = useRef(localText);
  localTextRef.current = localText;

  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // ファイルが開かれた / 再接続されたときにローカルテキストを同期
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setLocalText(memoText); }, [memoFileHandle]);

  // ハイライト層はカーソルと常に同期させるため localText を直接使用
  const displayLines = localText.split('\n');
  // セクションナビはやや遅延してもよいので deferredValue で描画負荷を軽減
  const deferredText  = useDeferredValue(localText);
  const deferredLines = deferredText.split('\n');

  const [newSectionName, setNewSectionName] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);

  const sections: { name: string; lineIndex: number }[] = [];
  deferredLines.forEach((line, i) => {
    const m = line.trim().match(SECTION_RE);
    if (m) sections.push({ name: m[1], lineIndex: i });
  });

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

  /** キーボードショートカット */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    [saveMemo],
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

  return (
    <div className="flex flex-col h-full overflow-hidden font-mono text-sm bg-gray-950">

      {/* ── セクションナビゲーションバー ── */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 border-b border-gray-800
                      overflow-x-auto shrink-0 min-h-[36px]">
        {sections.length === 0 && !showAddSection && (
          <span className="text-xs text-gray-600 shrink-0 select-none">
            セクションなし（==== 名前 ==== で作成）
          </span>
        )}

        {sections.map((s) => (
          <button
            key={s.lineIndex}
            onClick={() => jumpToSection(s.lineIndex)}
            className="shrink-0 text-xs px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700
                       text-emerald-300 transition-colors whitespace-nowrap"
          >
            {s.name}
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
                         text-gray-200 outline-none w-36 focus:border-emerald-500 transition-colors"
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
        ) : (
          <button
            onClick={() => setShowAddSection(true)}
            className="shrink-0 text-xs px-2 py-0.5 rounded border border-dashed border-gray-700
                       hover:border-emerald-600 text-gray-500 hover:text-emerald-400 transition-colors
                       whitespace-nowrap ml-1"
          >
            ＋ セクション追加
          </button>
        )}

        {/* 保存ステータス（右端） */}
        {memoFileHandle && (
          <span className={`ml-auto shrink-0 text-xs select-none ${
            memoSaveStatus === 'saved'        ? 'text-green-500' :
            memoSaveStatus === 'unsaved'      ? 'text-orange-400' :
            memoSaveStatus === 'saving'       ? 'text-yellow-400' :
                                                'text-gray-600'
          }`}>
            {memoSaveStatus === 'saved'   ? '保存済み' :
             memoSaveStatus === 'unsaved' ? '未保存' :
             memoSaveStatus === 'saving'  ? '保存中...' : '未接続'}
          </span>
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
              const isSection = SECTION_RE.test(line.trim());
              return (
                <div
                  key={i}
                  className={`leading-6 ${isSection ? 'text-emerald-300 font-bold' : 'text-gray-200'}`}
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
    </div>
  );
}
