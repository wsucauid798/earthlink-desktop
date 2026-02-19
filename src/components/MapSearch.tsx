/**
 * MapSearch — floating search overlay on the map viewport.
 *
 * Like Google Earth's search bar — sits on top of the map,
 * searches locations and agents via the server, and flies
 * the map to the selected result.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Search,
  X,
  Bot,
  Crown,
  Building2,
  Church,
  TreePine,
  Loader,
  Navigation,
} from "lucide-react";
import { client } from "../api/client";
import { useSelectionStore } from "../store/selectionStore";
import type { AgentSummary, Location } from "../api/types";

const ICON_SIZE = 13;

function locationIcon(type: string) {
  switch (type) {
    case "capital": return <Crown size={ICON_SIZE} />;
    case "city": return <Building2 size={ICON_SIZE} />;
    case "town": return <Church size={ICON_SIZE} />;
    default: return <TreePine size={ICON_SIZE} />;
  }
}

function typeBadgeClass(type: string) {
  switch (type) {
    case "capital": return "el-badge el-badge-warning";
    case "city": return "el-badge el-badge-accent";
    default: return "el-badge el-badge-muted";
  }
}

function formatPop(pop?: number | null): string {
  if (!pop) return "";
  if (pop >= 1_000_000) return `${(pop / 1_000_000).toFixed(1)}M`;
  if (pop >= 1_000) return `${(pop / 1_000).toFixed(0)}K`;
  return pop.toString();
}

export default function MapSearch() {
  const [query, setQuery] = useState("");
  const [locationResults, setLocationResults] = useState<Location[]>([]);
  const [agentResults, setAgentResults] = useState<AgentSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { selectLocation, selectAgent } = useSelectionStore();

  const doSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!q.trim()) {
      setLocationResults([]);
      setAgentResults([]);
      setSearching(false);
      setShowResults(false);
      return;
    }

    setSearching(true);
    setShowResults(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const [locs, agents] = await Promise.all([
          client.getLocations({ search: q.trim(), limit: 15 }),
          client.getAgents({ search: q.trim(), limit: 10 }),
        ]);
        setLocationResults(locs);
        setAgentResults(agents);
      } catch {
        setLocationResults([]);
        setAgentResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    doSearch(value);
  };

  const clearSearch = () => {
    setQuery("");
    setLocationResults([]);
    setAgentResults([]);
    setSearching(false);
    setShowResults(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };

  const handleSelectLocation = (loc: Location) => {
    selectLocation(loc.id);
    clearSearch();
  };

  const handleSelectAgent = (agent: AgentSummary) => {
    selectAgent(agent.id);
    clearSearch();
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Global keyboard shortcut: "/" or Ctrl+K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger if already typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") {
        // Escape blurs the search input
        if (e.key === "Escape" && e.target === inputRef.current) {
          inputRef.current?.blur();
          setShowResults(false);
        }
        return;
      }
      if (e.key === "/" || (e.key === "k" && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const hasResults = locationResults.length > 0 || agentResults.length > 0;
  const hasQuery = query.trim().length > 0;

  return (
    <div ref={containerRef} className="absolute top-3 left-1/2 -translate-x-1/2 z-20" style={{ width: 340 }}>
      {/* Search input */}
      <div
        className="flex items-center gap-2 px-3 py-2 text-xs"
        style={{
          background: "var(--el-bg-panel)",
          border: "1px solid var(--el-border-card)",
          borderRadius: showResults && (hasResults || searching)
            ? "var(--el-radius-md) var(--el-radius-md) 0 0"
            : "var(--el-radius-md)",
          boxShadow: "var(--el-shadow-md)",
        }}
      >
        {searching ? (
          <Loader size={14} className="animate-spin" style={{ color: "var(--el-text-faint)" }} />
        ) : (
          <Search size={14} style={{ color: "var(--el-text-faint)" }} />
        )}
        <input
          ref={inputRef}
          type="text"
          placeholder="Search locations, agents...  /"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (hasQuery) setShowResults(true); }}
          className="flex-1 bg-transparent outline-none text-xs"
          style={{ color: "var(--el-text)" }}
        />
        {hasQuery && (
          <button
            onClick={clearSearch}
            className="flex items-center justify-center rounded p-0.5 cursor-default"
            style={{ color: "var(--el-text-faint)" }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {showResults && (hasResults || searching) && (
        <div
          className="overflow-y-auto"
          style={{
            maxHeight: 360,
            background: "var(--el-bg-panel)",
            border: "1px solid var(--el-border-card)",
            borderTop: "none",
            borderRadius: "0 0 var(--el-radius-md) var(--el-radius-md)",
            boxShadow: "var(--el-shadow-md)",
          }}
        >
          {searching && !hasResults && (
            <div className="flex items-center gap-2 px-3 py-4 text-[11px]" style={{ color: "var(--el-text-faint)" }}>
              <Loader size={12} className="animate-spin" />
              Searching...
            </div>
          )}

          {!searching && hasQuery && !hasResults && (
            <div className="px-3 py-4 text-[11px] text-center" style={{ color: "var(--el-text-faint)" }}>
              No results for "{query}"
            </div>
          )}

          {/* Location results */}
          {locationResults.length > 0 && (
            <>
              <div
                className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-widest"
                style={{
                  color: "var(--el-text-faint)",
                  borderBottom: "1px solid var(--el-border-subtle)",
                }}
              >
                Locations
              </div>
              {locationResults.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => handleSelectLocation(loc)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-left cursor-default transition-colors"
                  style={{ borderBottom: "1px solid var(--el-border-subtle)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--el-bg-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ color: "var(--el-text-muted)" }}>{locationIcon(loc.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium truncate" style={{ color: "var(--el-text)" }}>
                      {loc.name}
                    </div>
                    <div className="text-[9px]" style={{ color: "var(--el-text-faint)" }}>
                      {loc.admin_level_2 ?? ""}{loc.population ? ` \u00b7 ${formatPop(loc.population)} pop.` : ""}
                    </div>
                  </div>
                  <span className={typeBadgeClass(loc.type)}>{loc.type}</span>
                </button>
              ))}
            </>
          )}

          {/* Agent results */}
          {agentResults.length > 0 && (
            <>
              <div
                className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-widest"
                style={{
                  color: "var(--el-text-faint)",
                  borderBottom: "1px solid var(--el-border-subtle)",
                }}
              >
                Agents
              </div>
              {agentResults.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleSelectAgent(agent)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-left cursor-default transition-colors"
                  style={{ borderBottom: "1px solid var(--el-border-subtle)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--el-bg-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full"
                    style={{
                      width: 24,
                      height: 24,
                      background: "var(--el-accent-soft)",
                      color: "var(--el-text-accent)",
                    }}
                  >
                    <Bot size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium truncate" style={{ color: "var(--el-text)" }}>
                      {agent.name}
                    </div>
                    <div className="flex items-center gap-1 text-[9px]" style={{ color: "var(--el-text-faint)" }}>
                      <Navigation size={8} />
                      {agent.location_name || `Loc ${agent.location_id}`}
                    </div>
                  </div>
                  <span className="el-badge el-badge-muted" style={{ fontSize: "9px" }}>
                    {agent.last_action}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
