# Command Palette

A VS Code–style command palette built as a small, self-contained React feature.

This documentation is **tied to the code in `commandPalette/`** from the provided archive. It describes only what exists today.

## What it does

- Opens a modal command palette UI (`CommandPalette`).
- Renders a searchable list of commands defined as **JSON-serializable configs** (`CommandConfig[]`).
- Hydrates configs into runtime commands with executable handlers (`hydrateCommands`).
- Uses an in-house fuzzy matcher (`searchCommands`) to rank results.
- Keyboard support:
  - `ArrowUp` / `ArrowDown` moves the active option (wrap-around)
  - `Enter` executes the active option
  - `Escape` closes the palette
- Optional global hotkey hook: `Ctrl+K` or `Cmd+K`.

## Folder layout

```
commandPalette/
  commandPalette.types.ts
  data/commands.ts

  components/CommandPalette.tsx

  hooks/
    useCommandPalette.ts
    useGlobalCommandPaletteHotkey.ts

  utils/
    hydrateCommands.ts
    fuzzySearch.ts
    focusTrap.ts

  adapters/
    index.ts
    toastAdapter.ts
```

## Feature Breakdown

### `CommandPalette` component

File: `commandPalette/components/CommandPalette.tsx`

Props:

```ts
export type CommandPaletteProps = {
  commandsConfig: CommandConfig[];
  placeholder?: string;
  resultLimit?: number;
  title?: string;
  description?: string;
  className?: string;
  isOpen: boolean;
  onClose: () => void;
};
```

Behavior:

- If `isOpen` is `false`, the component returns `null` (unmounted).
- To close, the component calls `onClose()` (directly or via the hook).
- Command execution closes the palette by calling `onOpenChange(false)` internally, which triggers `onClose()`.

## Quick start

Minimal example (controlled open state):

```tsx
import { useState } from "react";
import { CommandPalette } from "./commandPalette/components/CommandPalette";
import { SAMPLE_COMMANDS } from "./commandPalette/data/commands";

export function App() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open palette
      </button>

      <CommandPalette
        isOpen={open}
        onClose={() => setOpen(false)}
        commandsConfig={SAMPLE_COMMANDS}
      />
    </>
  );
}
```

## Global hotkey

File: `commandPalette/hooks/useGlobalCommandPaletteHotkey.ts`

API:

```ts
export type UseGlobalCommandPaletteHotkeyArgs = {
  onTrigger: () => void;
  enabled?: boolean;
};
```

Usage:

```tsx
import { useGlobalCommandPaletteHotkey } from "./commandPalette/hooks/useGlobalCommandPaletteHotkey";

useGlobalCommandPaletteHotkey({
  onTrigger: () => setOpen((v) => !v),
});
```

Hotkey behavior (exact):

- Triggers when `e.key` is `"k"` (case-insensitive) and **either** `Ctrl` or `Meta` is pressed.
- It intentionally allows both `Ctrl+K` and `Cmd+K` regardless of platform.

## Defining commands

File: `commandPalette/data/commands.ts`

Commands are plain objects (`CommandConfig[]`) and therefore can be loaded from a file or API later.

Example:

```ts
import type { CommandConfig } from "../commandPalette.types";

export const SAMPLE_COMMANDS: CommandConfig[] = [
  {
    id: "file.new",
    title: "New File",
    keywords: ["new", "file", "create"],
    shortcut: "Cmd+N",
    description: "Create a new file",
    handlerConfig: { type: "toast", message: "Creating new file..." },
  },
];
```

Rules enforced by current implementation:

- `id` must be unique (used for rendering keys and DOM option ids).
- `keywords` are used directly by search ranking.
- Only one handler type exists in the code today: `handlerConfig.type === "toast"`.

## How command execution works

1. `CommandPalette` creates a toast adapter from the app’s `addToast` function.
2. It calls `hydrateCommands(configs, context)` to turn configs into runtime `Command[]`.
3. The `useCommandPalette` hook:
   - runs fuzzy search while open,
   - tracks `query`, `activeIndex`, and `results`,
   - handles keyboard behavior,
   - executes the active command (or by id).

Execution (exact order in the hook):

- `command.handler()` runs
- `onExecute?.(command)` runs if provided
- state resets (`query=""`, `activeIndex=0`)
- the palette closes via `onOpenChange(false)`.

## Built for scale: handlers + adapters

### Why hydration exists

Configs are JSON-serializable and **cannot** store functions. Hydration attaches behavior at runtime by turning `handlerConfig` into a real `handler()`.

### Adapter boundary

File: `commandPalette/adapters/toastAdapter.ts`

The palette does not call your toast system directly. It depends on this interface:

```ts
export interface ToastAdapter {
  show: (message: string, durationMs?: number) => void;
}
```

`createToastAdapter(addToast)` bridges the host app to that interface.

Tradeoff:

- The palette becomes easy to reuse in another app by swapping the adapter.
- The palette still assumes a toast system exists (because `"toast"` is the only handler implemented).

### Handler registry

File: `commandPalette/utils/hydrateCommands.ts`

Hydration uses a small registry keyed by `handlerConfig.type`:

- Built-in: `toast`
- Extension point: `registerHandler(type, factory)`

This is intentionally simple:

- easy to audit,
- easy to test,
- no plugin framework required.
