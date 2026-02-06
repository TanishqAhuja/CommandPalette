type FocusTrapOptions = {
  onEscape?: () => void;
};

/**
 * Minimal focus trap for a modal/dialog.
 * - Focuses first focusable element (or container) on activate
 * - Traps Tab/Shift+Tab within container
 * - Calls onEscape on Escape
 *
 * Returns a cleanup function.
 */
export function activateFocusTrap(
  container: HTMLElement,
  options?: FocusTrapOptions,
): () => void {
  const previouslyFocused = document.activeElement as HTMLElement | null;

  const getFocusable = (): HTMLElement[] => {
    const selectors = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ].join(",");

    return Array.from(
      container.querySelectorAll<HTMLElement>(selectors),
    ).filter((el) => {
      if (el.hasAttribute("disabled")) return false;
      if (el.getAttribute("aria-hidden") === "true") return false;
      if (el.getAttribute("tabindex") === "-1") return false; // <-- key line
      return true;
    });
  };

  const focusFirst = () => {
    const focusables = getFocusable();
    if (focusables.length > 0) {
      focusables[0].focus();
      return;
    }
    // fallback: focus container itself
    container.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      options?.onEscape?.();
      return;
    }

    if (e.key !== "Tab") return;

    const focusables = getFocusable();
    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (e.shiftKey) {
      // shift+tab
      if (!active || active === first || !container.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // tab
      if (!active || active === last || !container.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  // Ensure container can be focused (fallback)
  if (!container.hasAttribute("tabindex")) {
    container.setAttribute("tabindex", "-1");
  }

  // Focus on next tick to allow React paint
  queueMicrotask(focusFirst);

  document.addEventListener("keydown", onKeyDown);

  return () => {
    document.removeEventListener("keydown", onKeyDown);
    previouslyFocused?.focus?.();
  };
}
