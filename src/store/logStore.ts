/**
 * Log store — console messages, tick events, and agent log entries
 * for the BottomPanel tabs.
 */

import { create } from "zustand";
import type { AgentEvent, TickEvent } from "../api/types";

export type LogLevel = "info" | "success" | "warning" | "error";

export interface ConsoleEntry {
  id: number;
  time: string;
  level: LogLevel;
  message: string;
  detail?: string;
}

export interface TickLogEntry {
  id: number;
  tick: number;
  time: string;
  season: string;
  agentEventCount: number;
  weatherUpdated: boolean;
}

export interface AgentLogEntry {
  id: number;
  tick: number;
  time: string;
  agentId: string;
  fromLocationId: number;
  toLocationId: number;
  action: string;
  reward: number;
  knowledgeScore: number;
}

const MAX_ENTRIES = 500;

function now(): string {
  return new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

let _id = 0;
function nextId(): number {
  return ++_id;
}

export interface LogStoreState {
  consoleEntries: ConsoleEntry[];
  tickEntries: TickLogEntry[];
  agentEntries: AgentLogEntry[];

  addConsole: (level: LogLevel, message: string, detail?: string) => void;
  addTickEvent: (event: TickEvent) => void;
  clear: () => void;
}

export const useLogStore = create<LogStoreState>((set) => ({
  consoleEntries: [],
  tickEntries: [],
  agentEntries: [],

  addConsole: (level, message, detail) =>
    set((s) => ({
      consoleEntries: [
        { id: nextId(), time: now(), level, message, detail },
        ...s.consoleEntries,
      ].slice(0, MAX_ENTRIES),
    })),

  addTickEvent: (event) =>
    set((s) => {
      let tickTime: string;
      if (event.time?.current_time) {
        const utc = new Date(event.time.current_time);
        tickTime = `${String(utc.getUTCHours()).padStart(2, "0")}:${String(utc.getUTCMinutes()).padStart(2, "0")} UTC`;
      } else {
        tickTime = now();
      }

      const tickEntry: TickLogEntry = {
        id: nextId(),
        tick: event.tick,
        time: tickTime,
        season: event.time?.season ?? "",
        agentEventCount: event.agent_events.length,
        weatherUpdated: event.weather_updated,
      };

      const newAgentEntries: AgentLogEntry[] = event.agent_events.map(
        (ae: AgentEvent) => ({
          id: nextId(),
          tick: event.tick,
          time: tickTime,
          agentId: ae.agent_id,
          fromLocationId: ae.from_location_id,
          toLocationId: ae.to_location_id,
          action: ae.action,
          reward: ae.reward,
          knowledgeScore: ae.knowledge_score,
        }),
      );

      return {
        tickEntries: [tickEntry, ...s.tickEntries].slice(0, MAX_ENTRIES),
        agentEntries: [...newAgentEntries, ...s.agentEntries].slice(
          0,
          MAX_ENTRIES,
        ),
      };
    }),

  clear: () => set({ consoleEntries: [], tickEntries: [], agentEntries: [] }),
}));
