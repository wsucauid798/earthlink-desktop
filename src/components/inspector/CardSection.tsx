/**
 * CardSection — collapsible card wrapper with framer-motion expand/collapse.
 * Prop — single property row with icon, label, value.
 */

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function CardSection({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="el-card mx-3 mb-2 overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 w-full px-3 py-2 text-[10px] font-semibold uppercase tracking-wider cursor-default"
        style={{ color: "var(--el-text-muted)" }}
      >
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        {icon}
        {title}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="px-3 pb-3"
              style={{ borderTop: "1px solid var(--el-border-subtle)" }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Prop({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string | React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--el-text-muted)" }}>
        {icon}
        {label}
      </span>
      <span className="text-xs font-medium text-right" style={{ color: "var(--el-text)" }}>
        {value}
      </span>
    </div>
  );
}
