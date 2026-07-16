import { Header } from './components/layout/Header';
import { TabBar } from './components/layout/TabBar';
import { TextEditor } from './components/editor/TextEditor';
import { ArchiveView } from './components/editor/ArchiveView';
import { MemoEditor } from './components/editor/MemoEditor';
import { InsightPanel } from './components/dashboard/InsightPanel';
import { useParser } from './hooks/useParser';
import { useFileWatcher } from './hooks/useFileWatcher';
import { useAppStore } from './store/appStore';

function App() {
  useParser();      // rawText / アーカイブ選択の変更を監視してパース結果を更新
  useFileWatcher(); // 外部変更を定期検知して自動リロード

  const activeTab = useAppStore((s) => s.activeTab);

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">
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
    </div>
  );
}

export default App;

