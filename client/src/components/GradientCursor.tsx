import { useEffect } from "react";

export function GradientCursor() {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Update CSS variable for cursor position (для wet-reflect эффекта)
      document.documentElement.style.setProperty('--cursor-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--cursor-y', `${e.clientY}px`);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return null;
}
