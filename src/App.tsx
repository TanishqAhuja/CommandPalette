import { useCallback, useState } from "react";
import { useGlobalCommandPaletteHotkey } from "@features/commandPalette/hooks/useGlobalCommandPaletteHotkey";
import { SAMPLE_COMMANDS } from "@features/commandPalette/data/commands";
import { CommandPalette } from "@features/commandPalette/components/CommandPalette";
import { ToastProvider } from "@shared/components/Toast";

export default function App() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  const togglePalette = useCallback(() => {
    setPaletteOpen((prev) => !prev);
  }, []);

  const closePalette = useCallback(() => {
    setPaletteOpen(false);
  }, []);

  useGlobalCommandPaletteHotkey({
    onTrigger: togglePalette,
    enabled: true,
  });

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-bold">Command Palette Demo</h1>

          <p className="mt-2 text-sm text-slate-600">
            Try <kbd className="rounded border bg-white px-1">Ctrl+K</kbd>{" "}
            (Windows/Linux) or{" "}
            <kbd className="rounded border bg-white px-1">Cmd+K</kbd> (Mac).
          </p>

          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-700">
              This is a demo app to showcase an accessible command palette.
            </p>
          </div>
        </div>

        <CommandPalette
          commandsConfig={SAMPLE_COMMANDS}
          isOpen={paletteOpen}
          onClose={closePalette}
        />
      </div>
    </ToastProvider>
  );
}
