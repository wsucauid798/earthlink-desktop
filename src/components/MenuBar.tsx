/**
 * MenuBar — top-level menu bar with dropdown menus.
 *
 * File | View | World | Agents | Help
 *
 * Wired to stores for simulation control and connection.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Sun,
  Moon,
  Monitor,
  Clock,
  Settings,
  Info,
  Play,
  Pause,
  RotateCcw,
  Eye,
  EyeOff,
  LayoutPanelLeft,
  PanelBottom,
  PanelRight,
  Palette,
  Globe,
  Check,
  ChevronRight,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { ThemeMode } from "../hooks/useTheme";
import { useConnectionStore } from "../store/connectionStore";
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

function themeIcon(mode: ThemeMode) {
  switch (mode) {
    case "light":
      return <Sun size={ICON_SIZE} />;
    case "dark":
      return <Moon size={ICON_SIZE} />;
    case "system":
      return <Monitor size={ICON_SIZE} />;
    case "auto":
      return <Clock size={ICON_SIZE} />;
  }
}

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
      style={{ background: "rgba(0,0,0,0.4)" }}
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
  const { connected } = useConnectionStore();
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

  const menus: MenuDef[] = [
    {
      label: "File",
      items: [
        { label: "Settings", icon: <Settings size={ICON_SIZE} />, shortcut: "Ctrl+,", action: () => {} },
        { separator: true },
        { label: "Exit", action: () => {} },
      ],
    },
    {
      label: "View",
      items: [
        {
          label: "Explorer Panel",
          icon: <LayoutPanelLeft size={ICON_SIZE} />,
          shortcut: "Ctrl+B",
          checked: showExplorer,
          action: onToggleExplorer,
        },
        {
          label: "Inspector Panel",
          icon: <PanelRight size={ICON_SIZE} />,
          checked: showInspector,
          action: onToggleInspector,
        },
        {
          label: "Bottom Panel",
          icon: <PanelBottom size={ICON_SIZE} />,
          shortcut: "Ctrl+J",
          checked: showBottomPanel,
          action: onToggleBottomPanel,
        },
        { separator: true },
        {
          label: "Appearance",
          icon: <Palette size={ICON_SIZE} />,
          submenu: [
            {
              label: "Light",
              icon: <Sun size={ICON_SIZE} />,
              checked: themeMode === "light",
              action: () => onThemeChange("light"),
            },
            {
              label: "Dark",
              icon: <Moon size={ICON_SIZE} />,
              checked: themeMode === "dark",
              action: () => onThemeChange("dark"),
            },
            {
              label: "System",
              icon: <Monitor size={ICON_SIZE} />,
              checked: themeMode === "system",
              action: () => onThemeChange("system"),
            },
            {
              label: "Auto (Time of Day)",
              icon: <Clock size={ICON_SIZE} />,
              checked: themeMode === "auto",
              action: () => onThemeChange("auto"),
            },
          ],
        },
      ],
    },
    {
      label: "World",
      items: [
        {
          label: "Start",
          icon: <Play size={ICON_SIZE} />,
          action: () => simControl("start"),
          disabled: !connected,
        },
        {
          label: "Pause",
          icon: <Pause size={ICON_SIZE} />,
          action: () => simControl("pause"),
          disabled: !connected,
        },
        {
          label: "Reset",
          icon: <RotateCcw size={ICON_SIZE} />,
          action: () => simControl("reset"),
          disabled: !connected,
        },
        { separator: true },
        {
          label: connected ? "Change Server\u2026" : "Connect to Server\u2026",
          icon: connected ? <Wifi size={ICON_SIZE} /> : <WifiOff size={ICON_SIZE} />,
          action: () => setShowConnectDialog(true),
        },
      ],
    },
    {
      label: "Agents",
      items: [
        { label: "Show Labels", icon: <Eye size={ICON_SIZE} />, action: () => {}, disabled: !connected },
        { label: "Hide Labels", icon: <EyeOff size={ICON_SIZE} />, action: () => {}, disabled: !connected },
      ],
    },
    {
      label: "Help",
      items: [
        { label: "About EarthLink", icon: <Info size={ICON_SIZE} />, action: () => {} },
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
