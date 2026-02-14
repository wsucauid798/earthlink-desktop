/**
 * Resizable panel hook.
 *
 * Returns a mouse-down handler for the resize handle and the current size
 * in pixels. Supports both horizontal (col-resize) and vertical (row-resize)
 * orientations.
 */

import { useCallback, useRef, useState } from "react";

interface UseResizableOptions {
  axis: "x" | "y";
  /** Initial size in pixels */
  initial: number;
  min?: number;
  max?: number;
  /** If true, growing the mouse in the positive axis direction shrinks the panel.
   *  Needed for right/bottom panels where drag-right = shrink. */
  invert?: boolean;
}

export function useResizable({ axis, initial, min = 100, max = 600, invert = false }: UseResizableOptions) {
  const [size, setSize] = useState(initial);
  const startPos = useRef(0);
  const startSize = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startPos.current = axis === "x" ? e.clientX : e.clientY;
      startSize.current = size;

      const onMouseMove = (ev: MouseEvent) => {
        const pos = axis === "x" ? ev.clientX : ev.clientY;
        const delta = invert ? startPos.current - pos : pos - startPos.current;
        const next = Math.max(min, Math.min(max, startSize.current + delta));
        setSize(next);
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = axis === "x" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [axis, size, min, max, invert],
  );

  return { size, onMouseDown };
}
