# Command Palette Internals

This document covers:

- Fuzzy search (`utils/fuzzySearch.ts`)
- Focus trap (`utils/focusTrap.ts`)
- Keyboard behavior (`hooks/useCommandPalette.ts`)
- Accessibility semantics in the UI (`components/CommandPalette.tsx`)

## 1) Fuzzy search

File: `commandPalette/utils/fuzzySearch.ts`

### Public API

```ts
export function normalize(text: string): string;

export function buildCommandIndex(commands: Command[]): IndexedCommand[];

export function searchCommands(
  query: string,
  commands: Command[],
  limit?: number,
  config?: {
    indexedCommands?: IndexedCommand[];
    weights?: Partial<SearchWeights>;
  },
): SearchResult[];
```

### Normalization (exact)

`normalize(text)`:

- lowercases
- trims
- collapses internal whitespace to a single space

```ts
text.toLowerCase().trim().replace(/\s+/g, " ");
```

### Indexing (optimization)

Search supports building a normalized index once and reusing it across keystrokes.

Index structure:

- `normalizedTitle`
- `normalizedKeywords` (keywords joined with `" "`)

```ts
export interface IndexedCommand {
  command: Command;
  normalizedTitle: string;
  normalizedKeywords: string;
}
```

This avoids repeated normalization work during incremental search and makes the algorithm scale better for large command lists.

### Query tokenization

Queries are split into whitespace-separated tokens:

Example:

- `"git   com"` → `["git", "com"]`

Tokens are scored independently and then combined.

### Matching model (Option B)

Token scoring follows a clear priority model:

1. Prefix match (`candidate.startsWith(token)`)
2. Substring match (`candidate.includes(token)`)
3. Subsequence fallback (linear scan)

Subsequence matching is only used as a fallback so it cannot outrank true prefix/substring matches.

### Scoring

Each token is scored against both title and keywords:

- title weight: 0.7
- keyword weight: 0.3

The final score is computed as:

- average token score across all tokens

Tokens that do not match contribute `0`, so commands matching more tokens naturally rank higher without requiring a separate coverage bonus.

The default scoring config is:

```ts
{
  titleWeight: 0.7,
  keywordWeight: 0.3,

  prefixScore: 1.0,
  substringScore: 0.8,

  maxSubsequenceScore: 0.6,
}
```

All scores are clamped to the range `0..1`.

### Sorting and stability

Non-empty query:

- sort by `score` (descending)
- tie-break by `command.id` (ascending)

Empty query:

- return all commands sorted by `id`, score is `0`

### Immutability guarantee

`searchCommands` never mutates the input `commands` array (including the empty query case). It always sorts a copy.

## 2) Focus trap

File: `commandPalette/utils/focusTrap.ts`

### Public API

```ts
export function activateFocusTrap(
  container: HTMLElement,
  options?: { onEscape?: () => void },
): () => void;
```

### What it does

On activation:

1. Captures the previously focused element (`document.activeElement`).
2. Ensures the container is focusable (adds `tabindex="-1"` if missing).
3. Focuses the first focusable element inside the container on the next microtask.
4. Adds a `document` keydown listener that:
   - calls `onEscape()` when `Escape` is pressed
   - traps `Tab` / `Shift+Tab` inside the container
5. Returns a cleanup function that:
   - removes the keydown listener
   - restores focus to the previously focused element if possible

### Focusable elements (exact selector list)

Focusable candidates inside the container:

- `a[href]`
- `button:not([disabled])`
- `input:not([disabled])`
- `select:not([disabled])`
- `textarea:not([disabled])`
- `[tabindex]:not([tabindex="-1"])`

Filtered by:

- must not have `disabled`.
- must not have an `aria-hidden="true"` attribute.

### Interaction with CommandPalette option buttons

In the palette UI, each result row is a `<button>` with `tabIndex={-1}`.

- Users cannot reach options by normal tabbing.
- However, the focus trap still considers those buttons focusable because it matches `button:not([disabled])`.
- When wrapping focus on Tab/Shift+Tab, the trap may programmatically focus an option button.

This is current behavior.

## 3) Keyboard behavior (hook)

File: `commandPalette/hooks/useCommandPalette.ts`

Handled keys (while open):

- `Escape`: closes (resets state, calls `onOpenChange(false)`)
- `Enter`: executes the active command
- `ArrowDown`: moves selection forward (wrap-around)
- `ArrowUp`: moves selection backward (wrap-around)

Selection wrap-around uses modular arithmetic (`wrapIndex`).

Execution (exact):

- run `command.handler()`
- run `onExecute?.(command)`
- reset state
- close via `onOpenChange(false)`

## 4) Accessibility semantics (UI)

File: `commandPalette/components/CommandPalette.tsx`

### Dialog

The dialog container:

- `role="dialog"`
- `aria-modal="true"`
- `aria-labelledby={headingId}`
- `aria-describedby={descId}`

### Search input (combobox-ish semantics)

The input includes:

- a real `<label>` (sr-only) "Search commands"
- `role="combobox"`
- `aria-expanded="true"`
- `aria-controls={listboxId}`
- `aria-autocomplete="list"`
- `aria-activedescendant={activeOptionId | undefined}`

### Results list

The results container:

- `role="listbox"`
- `aria-label="Command results"`

Each option:

- `role="option"`
- `aria-selected={true | false}`
- `id="cp-option-${command.id}"`

### Active option visibility

When `activeIndex` changes, the active option button is scrolled into view:

```ts
el.scrollIntoView({ block: "nearest" });
```

This is scheduled in a microtask (`queueMicrotask`).
