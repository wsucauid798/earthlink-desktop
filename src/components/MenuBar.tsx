/**
 * MenuBar — top-level menu bar with dropdown menus.
 *
 * File | World | Agents | View | Tools | Help
 *
 * Wired to stores for simulation control and connection.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Brain,
  Bug,
  Cable,
  Camera,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Cloud,
  CloudSun,
  Compass,
  Database,
  Dices,
  Download,
  FileJson,
  FileSpreadsheet,
  FileUp,
  FlaskConical,
  Gauge,
  Globe,
  GraduationCap,
  Hash,
  History,
  Info,
  Keyboard,
  Landmark,
  Layers,
  LayoutPanelLeft,
  Lightbulb,
  LogOut,
  Map,
  MapPin,
  MessageCircle,
  MessageSquare,
  Monitor,
  Moon,
  Mountain,
  Network,
  Orbit,
  Palette,
  PanelBottom,
  PanelRight,
  PanelsTopLeft,
  Pause,
  Play,
  Plug,
  Radio,
  RefreshCw,
  Rocket,
  RotateCcw,
  Route,
  Scale,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Star,
  Sun,
  Tag,
  Target,
  Timer,
  Terminal,
  Undo2,
  Upload,
  Users,
  Wifi,
  WifiOff,
  Wind,
  Zap,
} from "lucide-react";
import type { ThemeMode } from "../hooks/useTheme";
import { useConnectionStore } from "../store/connectionStore";
import { useWorldStore } from "../store/worldStore";
import { client } from "../api/client";
import { useLogStore } from "../store/logStore";

/* ----- Types ----- */

interface MenuItemDef {
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  action?: () => void;
  checked?: boolean;
  disabled?: boolean;
  separator?: false;
  /** Nested submenu items */
  submenu?: MenuItem[];
}

interface MenuSeparator {
  separator: true;
}

type MenuItem = MenuItemDef | MenuSeparator;

interface MenuDef {
  label: string;
  items: MenuItem[];
}

/* ----- Props ----- */

export interface MenuBarProps {
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  showExplorer: boolean;
  onToggleExplorer: () => void;
  showInspector: boolean;
  onToggleInspector: () => void;
  showBottomPanel: boolean;
  onToggleBottomPanel: () => void;
}

const ICON_SIZE = 14;

/* ----- Connect dialog ----- */

function ConnectDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const { serverUrl, setServerUrl, connect, connecting, connected, disconnect } =
    useConnectionStore();
  const [url, setUrl] = useState(serverUrl);

  const handleConnect = async () => {
    setServerUrl(url);
    await connect();
    onClose();
  };

  const handleDisconnect = () => {
    disconnect();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "var(--el-backdrop)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-xl p-5 w-96"
        style={{
          background: "var(--el-bg-panel)",
          border: "1px solid var(--el-border-card)",
          boxShadow: "var(--el-shadow-lg)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Globe size={18} style={{ color: "var(--el-text-accent)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--el-text)" }}>
            Connect to Server
          </span>
        </div>

        <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--el-text-faint)" }}>
          Server URL
        </label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !connecting) handleConnect(); }}
          className="w-full px-3 py-2 rounded-md text-xs outline-none mb-4"
          style={{
            background: "var(--el-bg-input)",
            border: "1px solid var(--el-border-card)",
            color: "var(--el-text)",
          }}
          disabled={connecting}
          placeholder="http://localhost:8000"
        />

        <div className="flex gap-2 justify-end">
          {connected && (
            <button
              onClick={handleDisconnect}
              className="px-4 py-1.5 rounded-md text-xs font-medium cursor-default"
              style={{
                background: "var(--el-danger-soft)",
                color: "var(--el-danger)",
              }}
            >
              Disconnect
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-xs font-medium cursor-default"
            style={{
              background: "var(--el-bg-badge)",
              color: "var(--el-text-secondary)",
              border: "1px solid var(--el-border-card)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={connecting || !url.trim()}
            className="px-4 py-1.5 rounded-md text-xs font-medium cursor-default disabled:opacity-50"
            style={{
              background: "var(--el-accent)",
              color: "var(--el-text-on-accent)",
            }}
          >
            {connecting ? "Connecting..." : "Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----- Reusable menu button (used by menu items and submenu flyouts) ----- */

function MenuButton({ item, onClick }: { item: MenuItemDef; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center w-full gap-2.5 px-3 py-1.5 text-left transition-colors cursor-default rounded-sm"
      style={{
        color: item.disabled ? "var(--el-text-faint)" : "var(--el-text)",
        opacity: item.disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!item.disabled) e.currentTarget.style.background = "var(--el-bg-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <span className="w-4 flex items-center justify-center shrink-0" style={{ color: "var(--el-text-muted)" }}>
        {item.checked !== undefined ? (
          item.checked ? <Check size={12} style={{ color: "var(--el-accent)" }} /> : null
        ) : (
          item.icon
        )}
      </span>
      <span className="flex-1">{item.label}</span>
      {item.shortcut && (
        <span className="ml-4 text-[10px]" style={{ color: "var(--el-text-faint)" }}>
          {item.shortcut}
        </span>
      )}
    </button>
  );
}

/* ----- Submenu item with flyout ----- */

function SubmenuItem({
  item,
  onItemClick,
}: {
  item: MenuItemDef;
  onItemClick: (item: MenuItemDef) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div
        className="flex items-center w-full gap-2.5 px-3 py-1.5 text-left transition-colors cursor-default rounded-sm"
        style={{
          color: "var(--el-text)",
          background: open ? "var(--el-bg-hover)" : "transparent",
        }}
      >
        <span className="w-4 flex items-center justify-center shrink-0" style={{ color: "var(--el-text-muted)" }}>
          {item.icon}
        </span>
        <span className="flex-1">{item.label}</span>
        <ChevronRight size={10} style={{ color: "var(--el-text-faint)" }} />
      </div>

      {/* Flyout submenu */}
      {open && item.submenu && (
        <div
          className="absolute left-full top-0 z-50 min-w-44 py-1 rounded-lg"
          style={{
            background: "var(--el-bg-panel)",
            border: "1px solid var(--el-border-card)",
            boxShadow: "var(--el-shadow-lg)",
            marginLeft: 2,
          }}
        >
          {item.submenu.map((sub, sIdx) =>
            "separator" in sub && sub.separator ? (
              <div
                key={sIdx}
                className="my-1 mx-2"
                style={{ borderBottom: "1px solid var(--el-border-subtle)" }}
              />
            ) : (
              <MenuButton
                key={sIdx}
                item={sub as MenuItemDef}
                onClick={() => onItemClick(sub as MenuItemDef)}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

/* ----- Component ----- */

export default function MenuBar({
  themeMode,
  onThemeChange,
  showExplorer,
  onToggleExplorer,
  showInspector,
  onToggleInspector,
  showBottomPanel,
  onToggleBottomPanel,
}: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const { connected, disconnect } = useConnectionStore();
  const log = useLogStore.getState;

  /* Close menu on outside click */
  useEffect(() => {
    if (openMenu === null) return;
    const handler = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenu]);

  /* Close on Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setShowConnectDialog(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  /* Simulation control actions */
  const simControl = async (action: "start" | "pause" | "reset") => {
    try {
      const res = await client.controlSimulation(action);
      log().addConsole("success", `Simulation ${action}: ${res.status}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log().addConsole("error", `Simulation ${action} failed: ${msg}`);
    }
  };

  const setSpeed = async (multiplier: number) => {
    try {
      await client.configureSimulation({ tick_interval_seconds: 1.0 / multiplier });
      useWorldStore.getState().setSpeedMultiplier(multiplier);
      // Scale agent movement transition to match tick interval
      const transitionDuration = Math.max(0.05, 0.8 / multiplier);
      document.documentElement.style.setProperty(
        "--el-agent-transition-duration",
        `${transitionDuration}s`
      );
      log().addConsole("success", `Speed set to ${multiplier}x`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log().addConsole("error", `Speed change failed: ${msg}`);
    }
  };

  const stub = () => {};

  const menus: MenuDef[] = [
    /* ── FILE ── */
    {
      label: "File",
      items: [
        {
          label: connected ? "Change Server\u2026" : "Connect to Server\u2026",
          icon: <Wifi size={ICON_SIZE} />,
          action: () => setShowConnectDialog(true),
        },
        {
          label: "Disconnect",
          icon: <WifiOff size={ICON_SIZE} />,
          action: () => disconnect(),
          disabled: !connected,
        },
        { separator: true },
        { label: "Settings\u2026", icon: <Settings size={ICON_SIZE} />, shortcut: "Ctrl+,", action: stub },
        { separator: true },
        { label: "Exit", icon: <LogOut size={ICON_SIZE} />, action: stub },
      ],
    },
    /* ── WORLD ── */
    {
      label: "World",
      items: [
        {
          label: "Simulation",
          icon: <SlidersHorizontal size={ICON_SIZE} />,
          submenu: [
            { label: "Start", icon: <Play size={ICON_SIZE} />, action: () => simControl("start"), disabled: !connected },
            { label: "Pause", icon: <Pause size={ICON_SIZE} />, action: () => simControl("pause"), disabled: !connected },
            { label: "Reset", icon: <RotateCcw size={ICON_SIZE} />, action: () => simControl("reset"), disabled: !connected },
            { separator: true },
            { label: "1x (Normal)", action: () => setSpeed(1), icon: <Gauge size={ICON_SIZE} />, disabled: !connected },
            { label: "2x", action: () => setSpeed(2), icon: <Gauge size={ICON_SIZE} />, disabled: !connected },
            { label: "5x", action: () => setSpeed(5), icon: <Gauge size={ICON_SIZE} />, disabled: !connected },
            { label: "10x", action: () => setSpeed(10), icon: <Gauge size={ICON_SIZE} />, disabled: !connected },
            { label: "20x", action: () => setSpeed(20), icon: <Gauge size={ICON_SIZE} />, disabled: !connected },
          ],
        },
        { separator: true },
        {
          label: "Geography",
          icon: <MapPin size={ICON_SIZE} />,
          submenu: [
            { label: "Regions\u2026", icon: <Map size={ICON_SIZE} />, action: stub },
            { label: "Location Types\u2026", icon: <Landmark size={ICON_SIZE} />, action: stub },
            { label: "Connections\u2026", icon: <Route size={ICON_SIZE} />, action: stub },
          ],
        },
        {
          label: "Earth Systems",
          icon: <Globe size={ICON_SIZE} />,
          submenu: [
            { label: "Weather & Wind", icon: <CloudSun size={ICON_SIZE} />, action: stub },
            { label: "Atmosphere", icon: <Wind size={ICON_SIZE} />, action: stub },
            { label: "Astronomy", icon: <Star size={ICON_SIZE} />, action: stub },
            { label: "Geophysics", icon: <Mountain size={ICON_SIZE} />, action: stub },
            { label: "Orbital Mechanics", icon: <Orbit size={ICON_SIZE} />, action: stub },
          ],
        },
        {
          label: "Earth Proxy",
          icon: <Database size={ICON_SIZE} />,
          submenu: [
            { label: "Adapters\u2026", icon: <Plug size={ICON_SIZE} />, action: stub },
            { label: "Refresh Policies\u2026", icon: <Timer size={ICON_SIZE} />, action: stub },
            { label: "Data Sources\u2026", icon: <Database size={ICON_SIZE} />, action: stub },
          ],
        },
        {
          label: "Time",
          icon: <Clock size={ICON_SIZE} />,
          submenu: [
            { label: "Timezone\u2026", icon: <Globe size={ICON_SIZE} />, action: stub },
            { label: "Time Scale\u2026", icon: <Timer size={ICON_SIZE} />, action: stub },
          ],
        },
      ],
    },
    /* ── AGENTS ── */
    {
      label: "Agents",
      items: [
        { label: "Count\u2026", icon: <Hash size={ICON_SIZE} />, action: stub },
        {
          label: "Archetypes",
          icon: <Users size={ICON_SIZE} />,
          submenu: [
            { label: "Pathfinders", icon: <Compass size={ICON_SIZE} />, action: stub },
            { label: "Surveyors", icon: <Search size={ICON_SIZE} />, action: stub },
            { label: "Pioneers", icon: <Rocket size={ICON_SIZE} />, action: stub },
            { label: "Specialists", icon: <Target size={ICON_SIZE} />, action: stub },
          ],
        },
        {
          label: "Learning",
          icon: <GraduationCap size={ICON_SIZE} />,
          submenu: [
            { label: "Learning Rate\u2026", icon: <Gauge size={ICON_SIZE} />, action: stub },
            { label: "Exploration Bias\u2026", icon: <Scale size={ICON_SIZE} />, action: stub },
            { label: "Curiosity Weights\u2026", icon: <Sparkles size={ICON_SIZE} />, action: stub },
            { label: "Backtracking Tolerance\u2026", icon: <Undo2 size={ICON_SIZE} />, action: stub },
          ],
        },
        {
          label: "Memory",
          icon: <Brain size={ICON_SIZE} />,
          submenu: [
            { label: "Lifecycle\u2026", icon: <RefreshCw size={ICON_SIZE} />, action: stub },
            { label: "Semantic Memory\u2026", icon: <Database size={ICON_SIZE} />, action: stub },
            { label: "Episodic Memory\u2026", icon: <BookOpen size={ICON_SIZE} />, action: stub },
          ],
        },
        {
          label: "Social",
          icon: <MessageCircle size={ICON_SIZE} />,
          submenu: [
            { label: "Communication\u2026", icon: <MessageSquare size={ICON_SIZE} />, action: stub },
            { label: "Teaching\u2026", icon: <GraduationCap size={ICON_SIZE} />, action: stub },
            { label: "Network Formation\u2026", icon: <Network size={ICON_SIZE} />, action: stub },
          ],
        },
        {
          label: "Spawning",
          icon: <Zap size={ICON_SIZE} />,
          submenu: [
            { label: "Distribution\u2026", icon: <MapPin size={ICON_SIZE} />, action: stub },
            { label: "Seed\u2026", icon: <Dices size={ICON_SIZE} />, action: stub },
          ],
        },
      ],
    },
    /* ── VIEW ── */
    {
      label: "View",
      items: [
        {
          label: "Panels",
          icon: <PanelsTopLeft size={ICON_SIZE} />,
          submenu: [
            { label: "Explorer Panel", icon: <LayoutPanelLeft size={ICON_SIZE} />, shortcut: "Ctrl+B", checked: showExplorer, action: onToggleExplorer },
            { label: "Inspector Panel", icon: <PanelRight size={ICON_SIZE} />, shortcut: "Ctrl+Shift+I", checked: showInspector, action: onToggleInspector },
            { label: "Bottom Panel", icon: <PanelBottom size={ICON_SIZE} />, shortcut: "Ctrl+J", checked: showBottomPanel, action: onToggleBottomPanel },
          ],
        },
        {
          label: "Maps",
          icon: <Map size={ICON_SIZE} />,
          submenu: [
            { label: "2D Map", icon: <Map size={ICON_SIZE} />, action: stub },
            { label: "2.5D Map", icon: <Layers size={ICON_SIZE} />, action: stub },
            { label: "3D Globe", icon: <Globe size={ICON_SIZE} />, action: stub },
          ],
        },
        { separator: true },
        { label: "Weather Overlay", icon: <CloudSun size={ICON_SIZE} />, action: stub },
        { label: "Connection Lines", icon: <Cable size={ICON_SIZE} />, action: stub },
        { label: "Agent Labels", icon: <Tag size={ICON_SIZE} />, action: stub },
        { label: "Agent Trajectories", icon: <Route size={ICON_SIZE} />, action: stub },
        { separator: true },
        {
          label: "Appearance",
          icon: <Palette size={ICON_SIZE} />,
          submenu: [
            { label: "Light", icon: <Sun size={ICON_SIZE} />, checked: themeMode === "light", action: () => onThemeChange("light") },
            { label: "Dark", icon: <Moon size={ICON_SIZE} />, checked: themeMode === "dark", action: () => onThemeChange("dark") },
            { label: "System", icon: <Monitor size={ICON_SIZE} />, checked: themeMode === "system", action: () => onThemeChange("system") },
            { label: "Auto (Time of Day)", icon: <Clock size={ICON_SIZE} />, checked: themeMode === "auto", action: () => onThemeChange("auto") },
          ],
        },
        { separator: true },
        { label: "Terminal", icon: <Terminal size={ICON_SIZE} />, shortcut: "Ctrl+`", action: stub },
      ],
    },
    /* ── TOOLS ── */
    {
      label: "Tools",
      items: [
        {
          label: "Research",
          icon: <FlaskConical size={ICON_SIZE} />,
          submenu: [
            { label: "Knowledge Inspector\u2026", icon: <BookOpen size={ICON_SIZE} />, action: stub },
            { label: "Belief State Viewer\u2026", icon: <Brain size={ICON_SIZE} />, action: stub },
            { label: "Q&A Testing\u2026", icon: <MessageSquare size={ICON_SIZE} />, action: stub },
            { label: "Knowledge Gap Analysis\u2026", icon: <BarChart3 size={ICON_SIZE} />, action: stub },
            { label: "Agent Comparison\u2026", icon: <ArrowLeftRight size={ICON_SIZE} />, action: stub },
            { label: "Journey Replay\u2026", icon: <History size={ICON_SIZE} />, action: stub },
            { label: "Social Network\u2026", icon: <Network size={ICON_SIZE} />, action: stub },
            { label: "Readiness Evaluation\u2026", icon: <ClipboardCheck size={ICON_SIZE} />, action: stub },
          ],
        },
        { separator: true },
        {
          label: "Diagnostics",
          icon: <Activity size={ICON_SIZE} />,
          submenu: [
            { label: "Earth Proxy Monitor\u2026", icon: <Activity size={ICON_SIZE} />, action: stub },
            { label: "Data Feed Status\u2026", icon: <Radio size={ICON_SIZE} />, action: stub },
          ],
        },
        { separator: true },
        {
          label: "Export",
          icon: <Download size={ICON_SIZE} />,
          submenu: [
            { label: "Locations as GeoJSON\u2026", icon: <FileJson size={ICON_SIZE} />, action: stub },
            { label: "Agent History as CSV\u2026", icon: <FileSpreadsheet size={ICON_SIZE} />, action: stub },
            { label: "World Snapshot as JSON\u2026", icon: <FileJson size={ICON_SIZE} />, action: stub },
            { label: "Traces as JSON\u2026", icon: <FileJson size={ICON_SIZE} />, action: stub },
            { label: "Map Screenshot\u2026", icon: <Camera size={ICON_SIZE} />, action: stub },
          ],
        },
        {
          label: "Import",
          icon: <Upload size={ICON_SIZE} />,
          submenu: [
            { label: "Agent Exploration Traces\u2026", icon: <FileUp size={ICON_SIZE} />, action: stub },
          ],
        },
        { separator: true },
        {
          label: "Force Refresh",
          icon: <RefreshCw size={ICON_SIZE} />,
          submenu: [
            { label: "Weather", icon: <CloudSun size={ICON_SIZE} />, action: stub, disabled: !connected },
            { label: "Wind", icon: <Wind size={ICON_SIZE} />, action: stub, disabled: !connected },
            { label: "Astronomy", icon: <Star size={ICON_SIZE} />, action: stub, disabled: !connected },
            { label: "Atmosphere", icon: <Cloud size={ICON_SIZE} />, action: stub, disabled: !connected },
            { label: "Geography", icon: <MapPin size={ICON_SIZE} />, action: stub, disabled: !connected },
          ],
        },
      ],
    },
    /* ── HELP ── */
    {
      label: "Help",
      items: [
        { label: "Documentation", icon: <BookOpen size={ICON_SIZE} />, action: stub },
        { separator: true },
        { label: "Report a Bug\u2026", icon: <Bug size={ICON_SIZE} />, action: stub },
        { label: "Request a Feature\u2026", icon: <Lightbulb size={ICON_SIZE} />, action: stub },
        { separator: true },
        { label: "Keyboard Shortcuts", icon: <Keyboard size={ICON_SIZE} />, action: stub },
        { label: "About EarthLink", icon: <Info size={ICON_SIZE} />, action: stub },
      ],
    },
  ];

  const handleMenuClick = useCallback(
    (idx: number) => {
      setOpenMenu((prev) => (prev === idx ? null : idx));
    },
    [],
  );

  const handleItemClick = useCallback(
    (item: MenuItemDef) => {
      if (item.disabled) return;
      item.action?.();
      setOpenMenu(null);
    },
    [],
  );

  return (
    <>
      <div
        ref={barRef}
        className="el-no-select flex items-center shrink-0 text-xs"
        style={{
          height: "var(--el-menubar-h)",
          background: "var(--el-bg-panel)",
          borderBottom: "1px solid var(--el-border)",
          color: "var(--el-text)",
        }}
        data-tauri-drag-region
      >
        {/* Menus — no duplicate brand, the title bar already shows EarthLink */}
        <div className="pl-2" />
        {menus.map((menu, idx) => (
          <div key={menu.label} className="relative">
            <button
              onClick={() => handleMenuClick(idx)}
              onMouseEnter={() => {
                if (openMenu !== null) setOpenMenu(idx);
              }}
              className="px-2.5 py-1 rounded-md transition-colors cursor-default"
              style={{
                color: openMenu === idx ? "var(--el-text)" : "var(--el-text-secondary)",
                background: openMenu === idx ? "var(--el-bg-hover)" : "transparent",
              }}
            >
              {menu.label}
            </button>

            {openMenu === idx && (
              <div
                className="absolute left-0 top-full z-50 min-w-52 py-1 rounded-lg"
                style={{
                  background: "var(--el-bg-panel)",
                  border: "1px solid var(--el-border-card)",
                  boxShadow: "var(--el-shadow-lg)",
                }}
              >
                {menu.items.map((item, iIdx) =>
                  "separator" in item && item.separator ? (
                    <div
                      key={iIdx}
                      className="my-1 mx-2"
                      style={{ borderBottom: "1px solid var(--el-border-subtle)" }}
                    />
                  ) : (item as MenuItemDef).submenu ? (
                    <SubmenuItem
                      key={iIdx}
                      item={item as MenuItemDef}
                      onItemClick={handleItemClick}
                    />
                  ) : (
                    <MenuButton
                      key={iIdx}
                      item={item as MenuItemDef}
                      onClick={() => handleItemClick(item as MenuItemDef)}
                    />
                  ),
                )}
              </div>
            )}
          </div>
        ))}

        {/* Right side spacer for Tauri window controls */}
        <div className="ml-auto" />
      </div>

      {/* Connect dialog overlay */}
      {showConnectDialog && (
        <ConnectDialog onClose={() => setShowConnectDialog(false)} />
      )}
    </>
  );
}
