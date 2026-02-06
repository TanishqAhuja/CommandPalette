import { describe, it, expect } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";

function pressCtrlK() {
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true }),
    );
  });
}

describe("App", () => {
  it("renders the demo title and instruction hint", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /command palette demo/i }),
    ).toBeInTheDocument();

    expect(screen.getByText(/try/i)).toBeInTheDocument();
    expect(screen.getByText(/ctrl\+k/i)).toBeInTheDocument();
    expect(screen.getByText(/cmd\+k/i)).toBeInTheDocument();
  });

  it("includes the toast live region container (ToastProvider wired)", () => {
    render(<App />);

    expect(
      document.querySelector('[aria-live="polite"][aria-atomic="true"]'),
    ).not.toBeNull();
  });

  it("opens the command palette on Ctrl+K and focuses the search input", async () => {
    render(<App />);

    pressCtrlK();

    const input = await screen.findByRole("combobox", {
      name: /search commands/i,
    });

    await waitFor(() => {
      expect(input).toHaveFocus();
    });
  });

  it("closes the command palette on Esc", async () => {
    const user = userEvent.setup();

    render(<App />);

    pressCtrlK();

    const input = await screen.findByRole("combobox", {
      name: /search commands/i,
    });

    await waitFor(() => {
      expect(input).toHaveFocus();
    });

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /command palette/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("close button closes the palette", async () => {
    const user = userEvent.setup();

    render(<App />);

    pressCtrlK();

    const closeBtn = await screen.findByRole("button", { name: /^close$/i });

    await user.click(closeBtn);

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /command palette/i }),
      ).not.toBeInTheDocument();
    });
  });
});
