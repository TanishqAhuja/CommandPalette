import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { act, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import "@testing-library/jest-dom";

import { CommandPalette } from "@features/commandPalette/components/CommandPalette";
import { useGlobalCommandPaletteHotkey } from "@features/commandPalette/hooks/useGlobalCommandPaletteHotkey";
import type { CommandConfig } from "@features/commandPalette/commandPalette.types";
import { ToastProvider } from "@shared/components/Toast";

function TestApp({ commands }: { commands: CommandConfig[] }) {
  const [isOpen, setIsOpen] = React.useState(false);

  useGlobalCommandPaletteHotkey({
    onTrigger: () => setIsOpen((prev) => !prev),
  });

  return (
    <ToastProvider>
      <div>
        <button type="button">Before</button>

        <CommandPalette
          commandsConfig={commands}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />

        <button type="button">After</button>
      </div>
    </ToastProvider>
  );
}

const testCommands: CommandConfig[] = [
  {
    id: "git.commit",
    title: "Git: Commit",
    keywords: ["git", "commit"],
    shortcut: "Cmd+Enter",
    handlerConfig: {
      type: "toast",
      message: "Would open commit dialog",
      duration: 1000,
    },
  },
  {
    id: "git.checkout",
    title: "Git: Checkout Branch",
    keywords: ["git", "checkout", "branch"],
    shortcut: "Cmd+B",
    handlerConfig: {
      type: "toast",
      message: "Would open checkout picker",
      duration: 1000,
    },
  },
  {
    id: "nav.settings",
    title: "Open Settings",
    keywords: ["settings", "preferences", "config"],
    shortcut: "Cmd+,",
    handlerConfig: {
      type: "toast",
      message: "Would navigate to Settings",
      duration: 1000,
    },
  },
];

function pressCtrlK() {
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true }),
    );
  });
}

function pressCmdK() {
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true }),
    );
  });
}

describe("CommandPalette integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("opens on Ctrl+K", async () => {
    render(<TestApp commands={testCommands} />);

    pressCtrlK();

    expect(
      await screen.findByRole("dialog", { name: /command palette/i }),
    ).toBeInTheDocument();
  });

  it("opens on Cmd+K (macOS only)", async () => {
    vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");

    render(<TestApp commands={testCommands} />);

    pressCmdK();

    expect(
      await screen.findByRole("dialog", { name: /command palette/i }),
    ).toBeInTheDocument();
  });

  it("focuses the search input on open", async () => {
    render(<TestApp commands={testCommands} />);

    const beforeButton = screen.getByRole("button", { name: "Before" });
    beforeButton.focus();

    pressCtrlK();

    const input = await screen.findByRole("combobox", {
      name: /search commands/i,
    });

    await waitFor(() => expect(input).toHaveFocus());
  });

  it("typing filters results and ranks expected command first", async () => {
    const user = userEvent.setup();

    render(<TestApp commands={testCommands} />);

    pressCtrlK();

    const input = await screen.findByRole("combobox", {
      name: /search commands/i,
    });

    await waitFor(() => expect(input).toHaveFocus());

    await user.type(input, "commit");

    const listbox = screen.getByRole("listbox", { name: /command results/i });
    const options = within(listbox).getAllByRole("option");

    expect(options.length).toBeGreaterThan(0);
    expect(options[0]).toHaveTextContent("Git: Commit");
  });

  it("ArrowDown/ArrowUp updates aria-selected correctly", async () => {
    const user = userEvent.setup();

    render(<TestApp commands={testCommands} />);

    pressCtrlK();

    const input = await screen.findByRole("combobox", {
      name: /search commands/i,
    });

    await waitFor(() => expect(input).toHaveFocus());

    const listbox = screen.getByRole("listbox", { name: /command results/i });

    let options = within(listbox).getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowDown}");

    options = within(listbox).getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "false");
    expect(options[1]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowUp}");

    options = within(listbox).getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
  });

  it("Enter executes active command and shows toast", async () => {
    const user = userEvent.setup();

    render(<TestApp commands={testCommands} />);

    pressCtrlK();

    const input = await screen.findByRole("combobox", {
      name: /search commands/i,
    });

    await user.type(input, "settings");
    await user.keyboard("{Enter}");

    expect(
      await screen.findByText("Would navigate to Settings"),
    ).toBeInTheDocument();
  });

  it("Esc closes palette and restores focus to previously focused element", async () => {
    const user = userEvent.setup();

    render(<TestApp commands={testCommands} />);

    const afterButton = screen.getByRole("button", { name: "After" });
    afterButton.focus();
    expect(afterButton).toHaveFocus();

    pressCtrlK();

    const input = await screen.findByRole("combobox", {
      name: /search commands/i,
    });

    await waitFor(() => expect(input).toHaveFocus());

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    expect(afterButton).toHaveFocus();
  });

  it("traps focus inside dialog when open (Tab cycling)", async () => {
    const user = userEvent.setup();

    render(<TestApp commands={testCommands} />);

    pressCtrlK();

    const input = await screen.findByRole("combobox", {
      name: /search commands/i,
    });

    await waitFor(() => expect(input).toHaveFocus());

    const closeBtn = screen.getByRole("button", { name: /^close$/i });

    // Correct combobox pattern: options are NOT tabbable (tabIndex=-1)
    await user.tab();
    expect(closeBtn).toHaveFocus();

    await user.tab();
    expect(input).toHaveFocus();

    await user.tab({ shift: true });
    expect(closeBtn).toHaveFocus();
  });

  it("clicking an option executes it (mouse support)", async () => {
    const user = userEvent.setup();

    render(<TestApp commands={testCommands} />);

    pressCtrlK();

    const listbox = await screen.findByRole("listbox", {
      name: /command results/i,
    });

    const options = within(listbox).getAllByRole("option");

    const settingsOption = options.find((el) =>
      el.textContent?.includes("Open Settings"),
    );

    expect(settingsOption).toBeTruthy();

    await user.click(settingsOption!);

    expect(
      await screen.findByText("Would navigate to Settings"),
    ).toBeInTheDocument();
  });

  it("closes when clicking the overlay background", async () => {
    const user = userEvent.setup();

    render(<TestApp commands={testCommands} />);

    pressCtrlK();
    await screen.findByRole("dialog", { name: /command palette/i });

    const overlay = screen.getByTestId("cp-overlay");
    await user.pointer([{ target: overlay, keys: "[MouseLeft]" }]);

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /command palette/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("closes when clicking the Close button (CTA)", async () => {
    const user = userEvent.setup();

    render(<TestApp commands={testCommands} />);

    pressCtrlK();

    // ensure open
    await screen.findByRole("dialog", { name: /command palette/i });

    const closeBtn = screen.getByRole("button", { name: /^close$/i });
    await user.click(closeBtn);

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /command palette/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("shows empty state when no results match the query", async () => {
    const user = userEvent.setup();

    render(<TestApp commands={testCommands} />);

    pressCtrlK();

    const input = await screen.findByRole("combobox", {
      name: /search commands/i,
    });

    await waitFor(() => expect(input).toHaveFocus());

    await user.type(input, "zzzzzzzzzzzz");

    expect(screen.getByText(/no commands found/i)).toBeInTheDocument();

    expect(
      screen.queryByRole("listbox", { name: /command results/i }),
    ).not.toBeInTheDocument();
  });
});
