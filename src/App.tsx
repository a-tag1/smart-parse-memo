import { Header } from './components/layout/Header';
import { TabBar } from './components/layout/TabBar';
import { TextEditor } from './components/editor/TextEditor';
import { ArchiveView } from './components/editor/ArchiveView';
import { MemoEditor } from './components/editor/MemoEditor';
import { InsightPanel } from './components/dashboard/InsightPanel';
import { ExternalChangeDialog } from './components/editor/ExternalChangeDialog';
import { useParser } from './hooks/useParser';
import { useFileWatcher } from './hooks/useFileWatcher';
import { useAppStore } from './store/appStore';

function App() {
  useParser();      // rawText / アーカイブ選択の変更を監視してパース結果を更新
  useFileWatcher(); // 外部変更を定期検知して自動リロード

  const activeTab = useAppStore((s) => s.activeTab);
  const fontFamily = useAppStore((s) => s.fontFamily);
  const fontStacks = {
    system: 'system-ui, sans-serif',
    sans: '"Yu Gothic", "Meiryo", sans-serif',
    serif: '"Yu Mincho", "MS PMincho", serif',
    mono: '"Cascadia Mono", "MS Gothic", monospace',
    'yu-gothic': '"Yu Gothic", "YuGothic", sans-serif',
    meiryo: 'Meiryo, "メイリオ", sans-serif',
    'biz-ud-gothic': '"BIZ UDPGothic", "BIZ UDPゴシック", sans-serif',
    'noto-sans-jp': '"Noto Sans JP", sans-serif',
    'hiragino-kaku': '"Hiragino Kaku Gothic ProN", sans-serif',
    'yu-mincho': '"Yu Mincho", "游明朝", serif',
    'biz-ud-mincho': '"BIZ UDPMincho", "BIZ UDP明朝", serif',
    'hiragino-mincho': '"Hiragino Mincho ProN", serif',
    consolas: 'Consolas, monospace',
    'ms-gothic': '"MS Gothic", "ＭＳ ゴシック", monospace',
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden" style={{ fontFamily: fontStacks[fontFamily] }}>
      <Header />
      <TabBar />
      <div className="flex flex-1 overflow-hidden">
        {activeTab === 'memo' ? (
          <div className="flex-1 overflow-hidden">
            <MemoEditor />
          </div>
        ) : (
          <>
            {/* 左ペイン：本日=エディタ / 過去=アーカイブビュー */}
            <div className="w-1/2 border-r border-gray-800 flex flex-col overflow-hidden">
              {activeTab === 'today' ? <TextEditor /> : <ArchiveView />}
            </div>
            {/* 右ペイン：インサイト */}
            <div className="w-1/2 flex flex-col overflow-hidden">
              <InsightPanel />
            </div>
          </>
        )}
      </div>
      <ExternalChangeDialog />
    </div>
  );
}

export default App;

