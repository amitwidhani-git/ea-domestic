"use client";
import { useChangeFlash } from "@/lib/useChangeFlash";

/** Wraps a polled value; tints it briefly when `value` changes (see .ea-flash in globals.css). */
export default function Flash({ value, children, className = "" }: { value: unknown; children: React.ReactNode; className?: string }) {
  const changed = useChangeFlash(value);
  return <span className={`ea-flash ${className}`} data-changed={changed}>{children}</span>;
}
