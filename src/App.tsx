/**
 * EarthLink Desktop — main application shell.
 *
 * Layout:
 *  ┌──────────────────────────────────────────────┐
 *  │ MenuBar                                      │
 *  ├────────┬────────────────────────┬────────────┤
 *  │        │ ViewportTabs (if >1)   │            │
 *  │Explorer│────────────────────────│  Inspector  │
 *  │        │ ViewportContent        │            │
 *  │        │ (Map / Analytics /     │            │
 *  │        │  Decisions / Traces)   │            │
 *  │        ├────────────────────────┤            │
 *  │        │ Bottom Panel           │            │
 *  ├────────┴────────────────────────┴────────────┤
 *  │ StatusBar                                    │
 *  └──────────────────────────────────────────────┘
 */

import { useEffect, useState } from "react";
import "./App.css";
import { useTheme, type ThemeMode } from "./hooks/useTheme";
import { useResizable } from "./hooks/useResizable";
import { useConnectionStore } from "./store/connectionStore";
import MenuBar from "./components/MenuBar";
import Explorer from "./components/Explorer";
import Inspector from "./components/Inspector";
import ViewportTabs from "./components/ViewportTabs";
import ViewportContent from "./components/ViewportContent";
import BottomPanel from "./components/BottomPanel";
import StatusBar from "./components/StatusBar";

function App() {
  /* Auto-connect on boot */
  const autoConnect = useConnectionStore((s) => s.autoConnect);
  useEffect(() => { autoConnect(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Theme */
  const { mode: themeMode, setMode: setThemeMode } = useTheme();

  /* Panel visibility */
  const [showExplorer, setShowExplorer] = useState(true);
  const [showInspector, setShowInspector] = useState(true);
  const [showBottomPanel, setShowBottomPanel] = useState(true);

  /* Resizable panels */
  const explorer = useResizable({ axis: "x", initial: 200, min: 140, max: 400 });
  const inspector = useResizable({ axis: "x", initial: 260, min: 180, max: 450, invert: true });
  const bottom = useResizable({ axis: "y", initial: 180, min: 100, max: 500, invert: true });

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden" style={{ background: "var(--el-bg-app)" }}>
      {/* Menu bar */}
      <MenuBar
        themeMode={themeMode}
        onThemeChange={(m: ThemeMode) => setThemeMode(m)}
        showExplorer={showExplorer}
        onToggleExplorer={() => setShowExplorer((p) => !p)}
        showInspector={showInspector}
        onToggleInspector={() => setShowInspector((p) => !p)}
        showBottomPanel={showBottomPanel}
        onToggleBottomPanel={() => setShowBottomPanel((p) => !p)}
      />

      {/* Main body: explorer | (viewport + bottom) | inspector */}
      <div className="flex flex-1 overflow-hidden">
        {/* Explorer */}
        {showExplorer && (
          <>
            <div style={{ width: explorer.size, minWidth: explorer.size }} className="shrink-0 overflow-hidden">
              <Explorer />
            </div>
            <div className="el-resize-h" onMouseDown={explorer.onMouseDown} />
          </>
        )}

        {/* Centre column: viewport + bottom panel */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Viewport tab bar (only visible when >1 tab open) */}
          <ViewportTabs />

          {/* Active viewport content */}
          <div className="flex-1 overflow-hidden">
            <ViewportContent />
          </div>

          {/* Bottom panel */}
          {showBottomPanel && (
            <>
              <div className="el-resize-v" onMouseDown={bottom.onMouseDown} />
              <div style={{ height: bottom.size, minHeight: bottom.size }} className="shrink-0 overflow-hidden">
                <BottomPanel />
              </div>
            </>
          )}
        </div>

        {/* Inspector */}
        {showInspector && (
          <>
            <div className="el-resize-h" onMouseDown={inspector.onMouseDown} />
            <div style={{ width: inspector.size, minWidth: inspector.size }} className="shrink-0 overflow-hidden">
              <Inspector />
            </div>
          </>
        )}
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  );
}

export default App;
