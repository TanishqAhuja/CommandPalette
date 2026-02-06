import { useEffect } from "react";

export type UseGlobalCommandPaletteHotkeyArgs = {
  onTrigger: () => void;
  enabled?: boolean;
};

export function useGlobalCommandPaletteHotkey({
  onTrigger,
  enabled = true,
}: UseGlobalCommandPaletteHotkeyArgs): void {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      if (e.isComposing) return;

      if (e.key.toLowerCase() !== "k") return;

      // Robust: allow Ctrl+K or Cmd+K regardless of platform.
      // This avoids test flakiness and is acceptable UX.
      if (!e.ctrlKey && !e.metaKey) return;

      e.preventDefault();
      onTrigger();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, onTrigger]);
}
