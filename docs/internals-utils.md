# Command Palette Internals

This document covers:

- Fuzzy search (`utils/fuzzySearch.ts`)
- Focus trap (`utils/focusTrap.ts`)
- Keyboard behavior (`hooks/useCommandPalette.ts`)
- Accessibility semantics in the UI (`components/CommandPalette.tsx`)

Everything here matches the current code.

## 1) Fuzzy search

File: `commandPalette/utils/fuzzySearch.ts`

### Public API

```ts
export function normalize(text: string): string;

export function searchCommands(
  query: string,
  commands: Command[],
  limit?: number,
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

### Indexing

Search builds a normalized index for each command:

- `normalizedTitle`
- `normalizedKeywords` (keywords joined with `" "`)
- `normalizedHaystack` (title + keywords)

Note: `normalizedHaystack` is currently computed but **not used** in scoring.

### Matching model

Matching uses **subsequence** logic:

A query matches a candidate string if each query character appears in order in the candidate. Characters do not need to be adjacent.

If any character cannot be found in sequence, the score is `0`.

### Scoring

The overall score is a weighted sum:

- title score: 0.7
- keyword score: 0.3

```ts
titleScore * 0.7 + keywordScore * 0.3;
```

`scoreSubsequence(query, candidate)` produces 0..1 using:

- **Base score** (earlier first match scores higher)
- **Contiguity bonus** (if consecutive matches are within 2 positions)
- **Length bonus**
  - `0.3` if query length equals candidate length
  - otherwise up to `0.1` based on `queryLen / candidateLen`

Scores are capped:

```ts
Math.min(1, baseScore + contiguityBonus + lengthBonus);
```

#### Accuracy notes

- The contiguity logic tracks a `consecutiveCount` that reflects the final streak encountered in the loop, not necessarily the maximum streak. This is fine for basic ranking but matters if you later add match highlighting or more nuanced ranking.
- `searchCommands` sorts `commands` in-place when the query is empty because it calls `commands.sort(...)`. If the caller reuses the same array elsewhere, that order will be mutated.

### Sorting and stability

Non-empty query:

- sort by `score` (descending)
- tie-break by `command.id` (ascending)

Empty query:

- return all commands sorted by `id`, score is `0`.

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

- must not have `disabled`
- must not have an `aria-hidden` attribute **at all** (the code checks `!el.getAttribute("aria-hidden")`, so even `aria-hidden="false"` is treated as present and will be filtered out)

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
