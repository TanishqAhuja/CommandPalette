# Command Palette

A VS Code–style command palette feature for React + TypeScript.

Implemented features:

- Config-driven commands (`CommandConfig[]`)
- Hydration into runtime commands with executable handlers
- In-house fuzzy subsequence search
- Minimal focus trap utility
- Accessible dialog + listbox semantics with `aria-activedescendant`
- Keyboard support (Arrow keys, Enter, Escape)
- Optional global hotkey: `Ctrl+K` or `Cmd+K`
- Toast demo handler (`handlerConfig.type: "toast"`)

## Install / setup (local development)

### Versions used in this app

This repository is based on the standard **Vite + React + TypeScript** setup.

```
├── react@19.2.4
├── typescript@5.9.3
├── react-dom@19.2.4
└── vite@7.3.1
```

### Runtime requirements

- **Node.js:** 20+ (recommended: latest LTS)
- **Package manager:** npm (or pnpm/yarn if you prefer)

> If you use `nvm`, you can pin a specific Node version by adding a `.nvmrc` file (e.g., `20` or `22`).

### Install and run

```bash
npm install
npm run dev
```

### Build and preview

```bash
npm run build
npm run preview
```

## Running tests

This project uses **Vitest**.

Run the full test suite once:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Quick overview

This feature expects:

- React + TypeScript
- Tailwind classes are used in the component markup (you can replace them if needed)
- A Toast hook at `@shared/components/Toast` that provides:

```ts
type UseToastReturn = {
  addToast: (message: string, durationMs?: number) => void;
};
```

The command palette uses `addToast` through an adapter.

```tsx
import { useState } from "react";
import { CommandPalette } from "./commandPalette/components/CommandPalette";
import { SAMPLE_COMMANDS } from "./commandPalette/data/commands";
import { useGlobalCommandPaletteHotkey } from "./commandPalette/hooks/useGlobalCommandPaletteHotkey";

export function App() {
  const [open, setOpen] = useState(false);

  useGlobalCommandPaletteHotkey({
    onTrigger: () => setOpen((v) => !v),
  });

  return (
    <CommandPalette
      isOpen={open}
      onClose={() => setOpen(false)}
      commandsConfig={SAMPLE_COMMANDS}
    />
  );
}
```

## Where to edit things

- Add/edit commands: `commandPalette/data/commands.ts`
- UI: `commandPalette/components/CommandPalette.tsx`
- Keyboard + execution: `commandPalette/hooks/useCommandPalette.ts`
- Global hotkey: `commandPalette/hooks/useGlobalCommandPaletteHotkey.ts`
- Fuzzy search: `commandPalette/utils/fuzzySearch.ts`
- Focus trap: `commandPalette/utils/focusTrap.ts`
- Hydration + handler registry: `commandPalette/utils/hydrateCommands.ts`
- Adapter(s): `commandPalette/adapters/toastAdapter.ts`

## Scale strategy (current design)

- Commands are plain objects (serializable), so they can later be loaded from a file or API.
- Hydration attaches runtime behavior (handlers) without putting functions in configs.
- Integrations are isolated behind adapters (today: Toast).
- Handler types are selected by `handlerConfig.type` through a small registry.
  - Built-in handler: `toast`
  - Extension point: `registerHandler(type, factory)` in `hydrateCommands.ts`

## Future scope (not implemented)

These fit the current architecture but do not exist in code today:

- Highlight matched characters in results (requires search to return match positions).
- Group commands into sections (would add a `group?: string` field to configs).
- Command List virtualization using `react-virtualized` npm package.
- Recently used / history section (store executed IDs and render a "Recent" block).
- Add reliable Backdrop click-to-close.
- More handler types:
  - navigation (router)
  - clipboard
  - API calls
  - open another modal
