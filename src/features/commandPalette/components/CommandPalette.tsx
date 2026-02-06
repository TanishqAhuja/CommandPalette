import React, { useEffect, useId, useMemo, useRef } from "react";
import type { CommandConfig, SearchResult } from "../commandPalette.types";
import { hydrateCommands } from "../utils/hydrateCommands";
import { useCommandPalette } from "../hooks/useCommandPalette";
import { activateFocusTrap } from "../utils/focusTrap";

import { createToastAdapter } from "../adapters";
import { useToast } from "@shared/components/Toast";

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

function optionId(commandId: string): string {
  return `cp-option-${commandId}`;
}

export function CommandPalette({
  commandsConfig,
  placeholder = "Type a command…",
  resultLimit = 50,
  title = "Command Palette",
  description = "Search and run a command. Use ↑/↓ to navigate, Enter to run, Esc to close.",
  className,
  isOpen,
  onClose,
}: CommandPaletteProps) {
  const { addToast } = useToast();

  const ToastAdapter = useMemo(() => createToastAdapter(addToast), [addToast]);

  const commands = useMemo(() => {
    return hydrateCommands(commandsConfig, { toast: ToastAdapter });
  }, [commandsConfig, ToastAdapter]);

  const { query, results, activeIndex, setQuery, executeById, onKeyDown } =
    useCommandPalette({
      commands,
      isOpen,
      onOpenChange: (nextOpen) => {
        if (!nextOpen) onClose();
      },
      options: { resultLimit },
    });

  // IDs for ARIA
  const headingId = useId();
  const descId = useId();
  const listboxId = useId();

  // refs
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // scrolling refs (no state, no rerenders)
  const optionRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Focus trap + restore focus
  useEffect(() => {
    if (!isOpen) return;

    const dialogEl = dialogRef.current;
    if (!dialogEl) return;

    queueMicrotask(() => inputRef.current?.focus());

    const cleanup = activateFocusTrap(dialogEl, {
      onEscape: () => onClose(),
    });

    return cleanup;
  }, [onClose, isOpen]);

  // Close on overlay click
  const onOverlayMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Keyboard handling on input + list navigation
  const onInputKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    onKeyDown(e);
  };

  const activeOption = results[activeIndex]?.command;
  const activeDescendantId = activeOption
    ? optionId(activeOption.id)
    : undefined;

  /**
   * Ensure active option is always visible when navigating with ArrowUp/ArrowDown.
   * This prevents "selection moving behind the scroll viewport".
   */
  useEffect(() => {
    if (!isOpen) return;
    if (!activeOption) return;

    const el = optionRefs.current.get(activeOption.id);
    if (!el) return;

    queueMicrotask(() => {
      el.scrollIntoView({ block: "nearest" });
    });
  }, [activeOption, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 py-10"
      onMouseDown={onOverlayMouseDown}
      aria-hidden={false}
    >
      {/* overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descId}
        className={[
          "relative w-full max-w-xl rounded-lg border border-slate-200 bg-white shadow-2xl",
          className ?? "",
        ].join(" ")}
      >
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 id={headingId} className="text-sm font-semibold text-slate-900">
            {title}
          </h2>
          <p id={descId} className="mt-1 text-xs text-slate-600">
            {description}
          </p>
        </div>

        <div className="px-4 py-3">
          <label htmlFor="cp-input" className="sr-only">
            Search commands
          </label>

          <input
            id="cp-input"
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-400"
            role="combobox"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-activedescendant={activeDescendantId}
            aria-autocomplete="list"
          />
        </div>

        <div className="max-h-[50vh] overflow-auto px-2 pb-2">
          {results.length === 0 ? (
            <div className="px-3 py-6 text-sm text-slate-600">
              No commands found.
            </div>
          ) : (
            <div
              id={listboxId}
              role="listbox"
              aria-label="Command results"
              className="flex flex-col gap-1"
            >
              {results.map((r: SearchResult, index: number) => {
                const cmd = r.command;
                const isActive = index === activeIndex;

                return (
                  <button
                    key={cmd.id}
                    ref={(el) => {
                      if (!el) {
                        optionRefs.current.delete(cmd.id);
                        return;
                      }
                      optionRefs.current.set(cmd.id, el);
                    }}
                    id={optionId(cmd.id)}
                    role="option"
                    aria-selected={isActive}
                    tabIndex={-1}
                    type="button"
                    onClick={() => executeById(cmd.id)}
                    className={[
                      "flex w-full items-start justify-between gap-3 rounded-md px-3 py-2 text-left text-sm",
                      isActive
                        ? "bg-slate-100 text-slate-900"
                        : "bg-white text-slate-800 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {cmd.title}
                      </span>
                      {cmd.description ? (
                        <span className="mt-0.5 block truncate text-xs text-slate-600">
                          {cmd.description}
                        </span>
                      ) : null}
                    </span>

                    {cmd.shortcut ? (
                      <span className="shrink-0 rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600">
                        {cmd.shortcut}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
