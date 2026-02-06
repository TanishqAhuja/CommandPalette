import { useCallback, useMemo, useState } from "react";
import type { Command, SearchResult } from "../commandPalette.types";
import { buildCommandIndex, searchCommands } from "../utils/fuzzySearch";

export type UseCommandPaletteOptions = {
  resultLimit?: number;
};

export type UseCommandPaletteArgs = {
  commands: Command[];
  isOpen: boolean;
  onOpenChange: (next: boolean) => void;
  onExecute?: (command: Command) => void;
  options?: UseCommandPaletteOptions;
};

export type UseCommandPaletteReturn = {
  // state
  isOpen: boolean;
  query: string;
  results: SearchResult[];
  activeIndex: number;

  // actions
  open: () => void;
  close: () => void;
  toggle: () => void;
  setQuery: (next: string) => void;
  moveActive: (delta: number) => void;
  executeActive: () => void;
  executeById: (commandId: string) => void;

  // UI helper
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
};

const DEFAULT_RESULT_LIMIT = 50;

function wrapIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

export function useCommandPalette({
  commands,
  isOpen,
  onOpenChange,
  onExecute,
  options,
}: UseCommandPaletteArgs): UseCommandPaletteReturn {
  const resultLimit = options?.resultLimit ?? DEFAULT_RESULT_LIMIT;

  const [query, setQueryState] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const indexedCommands = useMemo(
    () => buildCommandIndex(commands),
    [commands],
  );

  const results = useMemo(() => {
    if (!isOpen) return [];
    return searchCommands(query, commands, resultLimit, { indexedCommands });
  }, [commands, indexedCommands, isOpen, query, resultLimit]);

  const safeActiveIndex = useMemo(() => {
    if (results.length === 0) return 0;
    return wrapIndex(activeIndex, results.length);
  }, [activeIndex, results.length]);

  const resetState = useCallback(() => {
    setQueryState("");
    setActiveIndex(0);
  }, []);

  const open = useCallback(() => {
    resetState();
    onOpenChange(true);
  }, [onOpenChange, resetState]);

  const close = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [onOpenChange, resetState]);

  const toggle = useCallback(() => {
    resetState();
    onOpenChange(!isOpen);
  }, [isOpen, onOpenChange, resetState]);

  const setQuery = useCallback((next: string) => {
    setQueryState(next);
    setActiveIndex(0);
  }, []);

  const moveActive = useCallback(
    (delta: number) => {
      if (!isOpen) return;
      if (results.length === 0) return;

      setActiveIndex((prev) => wrapIndex(prev + delta, results.length));
    },
    [isOpen, results.length],
  );

  const executeCommand = useCallback(
    (command: Command | undefined) => {
      if (!isOpen) return;
      if (!command) return;

      command.handler();
      onExecute?.(command);

      resetState();
      onOpenChange(false);
    },
    [isOpen, onExecute, onOpenChange, resetState],
  );

  const executeActive = useCallback(() => {
    const command = results[safeActiveIndex]?.command;
    executeCommand(command);
  }, [executeCommand, results, safeActiveIndex]);

  const executeById = useCallback(
    (commandId: string) => {
      const command = commands.find((c) => c.id === commandId);
      executeCommand(command);
    },
    [commands, executeCommand],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (!isOpen) return;

      switch (e.key) {
        case "Escape": {
          e.preventDefault();
          close();
          break;
        }
        case "Enter": {
          e.preventDefault();
          executeActive();
          break;
        }
        case "ArrowDown": {
          e.preventDefault();
          moveActive(1);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          moveActive(-1);
          break;
        }
        default:
          break;
      }
    },
    [close, executeActive, isOpen, moveActive],
  );

  return {
    isOpen,
    query,
    results,
    activeIndex: safeActiveIndex,

    open,
    close,
    toggle,
    setQuery,
    moveActive,
    executeActive,
    executeById,

    onKeyDown,
  };
}
