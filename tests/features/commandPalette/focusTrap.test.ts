import { activateFocusTrap } from "@features/commandPalette/utils/focusTrap";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

function makeContainer() {
  const container = document.createElement("div");

  // Typical modal content:
  const input = document.createElement("input");
  input.setAttribute("aria-label", "Search");

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";

  container.appendChild(input);
  container.appendChild(closeBtn);

  document.body.appendChild(container);

  return { container, input, closeBtn };
}

function keydown(key: string, opts: Partial<KeyboardEventInit> = {}) {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, ...opts }),
  );
}

describe("activateFocusTrap", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("moves focus into the container (first focusable) on activation", async () => {
    const outside = document.createElement("button");
    outside.textContent = "Outside";
    document.body.appendChild(outside);
    outside.focus();
    expect(document.activeElement).toBe(outside);

    const { container, input } = makeContainer();
    const cleanup = activateFocusTrap(container);

    // activation focuses via queueMicrotask, so flush once
    await Promise.resolve();

    expect(document.activeElement).toBe(input);

    cleanup();
  });

  it("wraps Tab from last focusable back to first", async () => {
    const { container, input, closeBtn } = makeContainer();
    const cleanup = activateFocusTrap(container);

    await Promise.resolve();

    // move focus to last
    closeBtn.focus();
    expect(document.activeElement).toBe(closeBtn);

    // Tab should wrap to first
    keydown("Tab");
    expect(document.activeElement).toBe(input);

    cleanup();
  });

  it("wraps Shift+Tab from first focusable to last", async () => {
    const { container, input, closeBtn } = makeContainer();
    const cleanup = activateFocusTrap(container);

    await Promise.resolve();

    // start on first
    input.focus();
    expect(document.activeElement).toBe(input);

    // Shift+Tab should wrap to last
    keydown("Tab", { shiftKey: true });
    expect(document.activeElement).toBe(closeBtn);

    cleanup();
  });

  it("calls onEscape when Escape is pressed", async () => {
    const { container } = makeContainer();
    const onEscape = vi.fn();
    const cleanup = activateFocusTrap(container, { onEscape });

    await Promise.resolve();

    keydown("Escape");
    expect(onEscape).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it("restores focus to the previously focused element on cleanup", async () => {
    const outside = document.createElement("button");
    outside.textContent = "Outside";
    document.body.appendChild(outside);
    outside.focus();
    expect(document.activeElement).toBe(outside);

    const { container } = makeContainer();
    const cleanup = activateFocusTrap(container);

    await Promise.resolve();
    expect(document.activeElement).not.toBe(outside);

    cleanup();
    expect(document.activeElement).toBe(outside);
  });

  it("does not include elements with tabindex=-1 as tabbable targets (if filtered)", async () => {
    const container = document.createElement("div");

    const input = document.createElement("input");
    input.setAttribute("aria-label", "Search");

    // This simulates your option rows: focusable by tag, but removed from tab order
    const optionBtn = document.createElement("button");
    optionBtn.textContent = "Option";
    optionBtn.setAttribute("tabindex", "-1");

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Close";

    container.appendChild(input);
    container.appendChild(optionBtn);
    container.appendChild(closeBtn);
    document.body.appendChild(container);

    const cleanup = activateFocusTrap(container);
    await Promise.resolve();

    // Put focus on last tabbable
    closeBtn.focus();
    expect(document.activeElement).toBe(closeBtn);

    // Tab should wrap to input, NOT to optionBtn
    keydown("Tab");
    expect(document.activeElement).toBe(input);

    cleanup();
  });
});
