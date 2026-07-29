import { RefreshCw } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

/**
 * 外部変更確認ダイアログ
 * pendingExternalToday または pendingExternalMemo がセットされたときに表示する。
 * - はい  → 外部変更を読み込む
 * - いいえ → 現在の編集内容を保持し、次回保存で上書き
 */
export function ExternalChangeDialog() {
  const pendingExternalToday     = useAppStore((s) => s.pendingExternalToday);
  const pendingExternalMemo      = useAppStore((s) => s.pendingExternalMemo);
  const setPendingExternalToday  = useAppStore((s) => s.setPendingExternalToday);
  const setPendingExternalMemo   = useAppStore((s) => s.setPendingExternalMemo);
  const storedTodayName          = useAppStore((s) => s.storedTodayName);
  const storedMemoName           = useAppStore((s) => s.storedMemoName);
  const setRawText               = useAppStore((s) => s.setRawText);
  const setSaveStatus            = useAppStore((s) => s.setSaveStatus);
  const setMemoText              = useAppStore((s) => s.setMemoText);
  const setMemoSaveStatus        = useAppStore((s) => s.setMemoSaveStatus);

  // today を優先、次に memo
  const isToday  = !!pendingExternalToday;
  const pending  = pendingExternalToday ?? pendingExternalMemo;

  if (!pending) return null;

  const fileName = isToday
    ? (storedTodayName ?? '本日ファイル')
    : (storedMemoName  ?? 'メモファイル');

  const handleYes = () => {
    if (isToday) {
      setRawText(pending.content);
      setSaveStatus('reloaded');
      setPendingExternalToday(null);
    } else {
      setMemoText(pending.content);
      setMemoSaveStatus('reloaded');
      setPendingExternalMemo(null);
    }
  };

  const handleNo = () => {
    // lastModified はウォッチャーがセット済みのため、pending をクリアするだけでよい
    if (isToday) {
      setPendingExternalToday(null);
    } else {
      setPendingExternalMemo(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg w-80 p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ext-change-title"
      >
        {/* ヘッダ */}
        <div
          id="ext-change-title"
          className="flex items-center gap-2 text-amber-400 font-semibold text-sm mb-3"
        >
          <RefreshCw size={14} />
          外部変更を検出
        </div>

        {/* メッセージ */}
        <p className="text-gray-300 text-sm mb-1">
          <span className="text-white font-medium">{fileName}</span>{' '}
          が外部で変更されました。外部の変更を読み込みますか？
        </p>
        <p className="text-gray-500 text-xs mb-5">
          「いいえ」を選択すると、次回保存時に現在の内容で上書きします。
        </p>

        {/* ボタン */}
        <div className="flex justify-end gap-2">
          <button
            onClick={handleNo}
            className="px-4 py-1.5 text-sm rounded border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
          >
            いいえ
          </button>
          <button
            onClick={handleYes}
            className="px-4 py-1.5 text-sm rounded bg-amber-600 hover:bg-amber-500 text-white transition-colors"
          >
            はい
          </button>
        </div>
      </div>
    </div>
  );
}
