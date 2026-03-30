type AgentActionCarrier = {
  last_action?: string | null;
};

export function normalizeAgentAction(action: string | null | undefined, fallback = "unknown"): string {
  if (typeof action !== "string") return fallback;
  const trimmed = action.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function agentActionLabel(action: string | null | undefined, fallback = "unknown"): string {
  return normalizeAgentAction(action, fallback).split(":")[0];
}

export function withNormalizedAgentAction<T extends AgentActionCarrier>(agent: T): T & { last_action: string } {
  return {
    ...agent,
    last_action: normalizeAgentAction(agent.last_action),
  };
}
