/**
 * EarthLink Desktop — main application shell.
 *
 * Layout:
 *  ┌──────────────────────────────────────────┐
 *  │ MenuBar                                  │
 *  ├────────┬─────────────────────┬───────────┤
 *  │        │                     │           │
 *  │Explorer│   Main Viewport     │ Inspector │
 *  │        │                     │           │
 *  │        ├─────────────────────┤           │
 *  │        │   Bottom Panel      │           │
 *  ├────────┴─────────────────────┴───────────┤
 *  │ StatusBar                                │
 *  └──────────────────────────────────────────┘
 */

import { useState } from "react";
import "./App.css";
import { useTheme, type ThemeMode } from "./hooks/useTheme";
import { useResizable } from "./hooks/useResizable";
import MenuBar from "./components/MenuBar";
import Explorer from "./components/Explorer";
import Inspector from "./components/Inspector";
import MainViewport from "./components/MainViewport";
import BottomPanel from "./components/BottomPanel";
import StatusBar from "./components/StatusBar";

function App() {
  /* Theme */
  const { mode: themeMode, setMode: setThemeMode } = useTheme();

  /* View mode */
  const [viewMode, setViewMode] = useState<"2d" | "2.5d" | "3d">("2d");

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
        viewMode={viewMode}
        onViewModeChange={setViewMode}
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
          {/* Viewport */}
          <div className="flex-1 overflow-hidden">
            <MainViewport viewMode={viewMode} />
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
