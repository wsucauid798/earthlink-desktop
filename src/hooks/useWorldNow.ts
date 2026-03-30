import { useEffect, useRef, useState } from "react";
import { useConnectionStore } from "../store/connectionStore";
import { useWorldStore } from "../store/worldStore";

export function useWorldNow(): Date {
  const currentTime = useWorldStore((s) => s.time?.current_time ?? null);
  const connected = useConnectionStore((s) => s.connected);
  const [now, setNow] = useState(() => (currentTime ? new Date(currentTime) : new Date()));
  const anchorRef = useRef<{ serverMs: number; wallMs: number } | null>(null);

  useEffect(() => {
    if (!currentTime) return;
    const serverMs = new Date(currentTime).getTime();
    anchorRef.current = { serverMs, wallMs: Date.now() };
    setNow(new Date(serverMs));
  }, [currentTime]);

  useEffect(() => {
    if (!connected || !anchorRef.current) return;
    const id = window.setInterval(() => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      setNow(new Date(anchor.serverMs + (Date.now() - anchor.wallMs)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [connected, currentTime]);

  return now;
}
