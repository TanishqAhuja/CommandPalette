import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Command } from "@features/commandPalette/commandPalette.types";
import { useCommandPalette } from "@features/commandPalette/hooks/useCommandPalette";

function makeCommand(
  id: string,
  title: string,
  keywords: string[],
  handler: () => void,
): Command {
  return {
    id,
    title,
    keywords,
    handler,
  };
}

function renderUseCommandPalette(
  commands: Command[],
  onExecute?: (c: Command) => void,
) {
  const onOpenChange = vi.fn();

  const { result, rerender } = renderHook(
    ({ isOpen }: { isOpen: boolean }) =>
      useCommandPalette({
        commands,
        isOpen,
        onOpenChange,
        onExecute,
        options: { resultLimit: 50 },
      }),
    {
      initialProps: { isOpen: false },
    },
  );

  const setOpen = (next: boolean) => {
    rerender({ isOpen: next });
  };

  return { result, onOpenChange, setOpen };
}

describe("useCommandPalette", () => {
  it("query updates results", () => {
    const handlers = {
      settings: vi.fn(),
      commit: vi.fn(),
      help: vi.fn(),
    };

    const commands: Command[] = [
      makeCommand(
        "settings",
        "Open Settings",
        ["preferences", "config"],
        handlers.settings,
      ),
      makeCommand(
        "git.commit",
        "Git: Commit",
        ["git", "commit"],
        handlers.commit,
      ),
      makeCommand("help", "Help", ["docs"], handlers.help),
    ];

    const { result, setOpen } = renderUseCommandPalette(commands);

    act(() => {
      setOpen(true);
    });

    act(() => {
      result.current.setQuery("git");
    });

    expect(result.current.results.length).toBeGreaterThan(0);
    expect(result.current.results[0].command.id).toBe("git.commit");
  });

  it("arrow navigation wraps around", () => {
    const commands: Command[] = [
      makeCommand("a", "Alpha", ["a"], vi.fn()),
      makeCommand("b", "Beta", ["b"], vi.fn()),
      makeCommand("c", "Gamma", ["c"], vi.fn()),
    ];

    const { result, setOpen } = renderUseCommandPalette(commands);

    act(() => {
      setOpen(true);
    });

    act(() => {
      result.current.setQuery("");
    });

    expect(result.current.results).toHaveLength(3);
    expect(result.current.activeIndex).toBe(0);

    act(() => {
      result.current.moveActive(-1);
    });
    expect(result.current.activeIndex).toBe(2);

    act(() => {
      result.current.moveActive(1);
    });
    expect(result.current.activeIndex).toBe(0);
  });

  it("executeActive triggers handler for selected command and calls onOpenChange(false)", () => {
    const onExecute = vi.fn();
    const commit = vi.fn();
    const settings = vi.fn();

    const commands: Command[] = [
      makeCommand("settings", "Open Settings", ["preferences"], settings),
      makeCommand("git.commit", "Git: Commit", ["git", "commit"], commit),
    ];

    const { result, setOpen, onOpenChange } = renderUseCommandPalette(
      commands,
      onExecute,
    );

    act(() => {
      setOpen(true);
    });

    act(() => {
      result.current.setQuery("git");
    });

    expect(result.current.results[0].command.id).toBe("git.commit");

    act(() => {
      result.current.executeActive();
    });

    expect(commit).toHaveBeenCalledTimes(1);
    expect(settings).not.toHaveBeenCalled();

    expect(onExecute).toHaveBeenCalledTimes(1);
    expect(onExecute).toHaveBeenCalledWith(
      expect.objectContaining({ id: "git.commit" }),
    );

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("executeById executes correct command and calls onOpenChange(false)", () => {
    const commit = vi.fn();
    const settings = vi.fn();

    const commands: Command[] = [
      makeCommand("settings", "Open Settings", ["preferences"], settings),
      makeCommand("git.commit", "Git: Commit", ["git", "commit"], commit),
    ];

    const { result, setOpen, onOpenChange } = renderUseCommandPalette(commands);

    act(() => {
      setOpen(true);
    });

    act(() => {
      result.current.executeById("settings");
    });

    expect(settings).toHaveBeenCalledTimes(1);
    expect(commit).not.toHaveBeenCalled();

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Esc closes and resets state (calls onOpenChange(false))", () => {
    const commands: Command[] = [
      makeCommand("git.commit", "Git: Commit", ["git", "commit"], vi.fn()),
      makeCommand("git.checkout", "Git: Checkout", ["git", "branch"], vi.fn()),
      makeCommand("settings", "Open Settings", ["preferences"], vi.fn()),
    ];

    const { result, setOpen, onOpenChange } = renderUseCommandPalette(commands);

    act(() => {
      setOpen(true);
    });

    act(() => {
      result.current.setQuery("git");
      result.current.moveActive(1);
    });

    expect(result.current.query).toBe("git");
    expect(result.current.activeIndex).toBe(1);

    act(() => {
      result.current.onKeyDown({
        key: "Escape",
        preventDefault: () => undefined,
      } as unknown as React.KeyboardEvent<HTMLElement>);
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Enter executes active command (calls handler and closes)", () => {
    const settings = vi.fn();
    const commit = vi.fn();

    const commands: Command[] = [
      makeCommand("settings", "Open Settings", ["preferences"], settings),
      makeCommand("git.commit", "Git: Commit", ["git", "commit"], commit),
    ];

    const { result, setOpen, onOpenChange } = renderUseCommandPalette(commands);

    act(() => {
      setOpen(true);
    });

    act(() => {
      result.current.setQuery("git");
    });

    act(() => {
      result.current.onKeyDown({
        key: "Enter",
        preventDefault: () => undefined,
      } as unknown as React.KeyboardEvent<HTMLElement>);
    });

    expect(commit).toHaveBeenCalledTimes(1);
    expect(settings).not.toHaveBeenCalled();

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
