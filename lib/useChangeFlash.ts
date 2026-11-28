"use client";
import { useEffect, useRef, useState } from "react";

/**
 * True for `ms` after `value` changes between renders, and never on the first
 * render, so a polled number only highlights when the data actually moved.
 */
export function useChangeFlash(value: unknown, ms = 2000): boolean {
  const prev = useRef(value);
  const [changed, setChanged] = useState(false);
  useEffect(() => {
    if (Object.is(prev.current, value)) return;
    prev.current = value;
    setChanged(true);
    const t = setTimeout(() => setChanged(false), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return changed;
}
