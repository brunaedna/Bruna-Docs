"use client";

import { useEffect, useRef } from "react";

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!cursor || !finePointer.matches || reducedMotion.matches) return;

    const root = document.documentElement;
    const handleMove = (event: PointerEvent) => {
      cursor.style.setProperty("--cursor-x", `${event.clientX}px`);
      cursor.style.setProperty("--cursor-y", `${event.clientY}px`);
      cursor.classList.add("visible");
      cursor.classList.toggle(
        "interactive",
        event.target instanceof Element && Boolean(event.target.closest("a, button")),
      );
    };
    const handleDown = () => cursor.classList.add("pressed");
    const handleUp = () => cursor.classList.remove("pressed");
    const handleLeave = () => cursor.classList.remove("visible");

    root.classList.add("custom-cursor-enabled");
    window.addEventListener("pointermove", handleMove, { passive: true });
    window.addEventListener("pointerdown", handleDown);
    window.addEventListener("pointerup", handleUp);
    root.addEventListener("mouseleave", handleLeave);

    return () => {
      root.classList.remove("custom-cursor-enabled");
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerdown", handleDown);
      window.removeEventListener("pointerup", handleUp);
      root.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  return <div ref={cursorRef} className="custom-cursor" aria-hidden="true"><span /></div>;
}
