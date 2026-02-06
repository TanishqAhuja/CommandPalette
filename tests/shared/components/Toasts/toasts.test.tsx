import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "@shared/components/Toast";

function TestHarness() {
  const { addToast } = useToast();

  return (
    <div>
      <button onClick={() => addToast("Hello toast")}>Add</button>
      <button onClick={() => addToast("Quick toast", 1000)}>AddQuick</button>
      <button
        onClick={() => {
          addToast("Toast A");
          addToast("Toast B");
          addToast("Toast C");
        }}
      >
        AddMany
      </button>
    </div>
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("ToastProvider", () => {
  it("renders a toast when addToast is called", async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByText("Hello toast")).toBeInTheDocument();
  });

  it("auto-dismisses toast after duration", () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    // trigger toast
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "AddQuick" }));
    });

    expect(screen.getByText("Quick toast")).toBeInTheDocument();

    // advance timer
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByText("Quick toast")).not.toBeInTheDocument();
  });

  it("allows manual dismiss via button", async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByText("Hello toast")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dismiss toast" }));

    expect(screen.queryByText("Hello toast")).not.toBeInTheDocument();
  });

  it("stacks multiple toasts", async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "AddMany" }));

    expect(screen.getByText("Toast A")).toBeInTheDocument();
    expect(screen.getByText("Toast B")).toBeInTheDocument();
    expect(screen.getByText("Toast C")).toBeInTheDocument();
  });

  it("has accessible aria-live region and semantic dismiss button", async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    const liveRegion = document.querySelector(
      '[aria-live="polite"][aria-atomic="true"]',
    );

    expect(liveRegion).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(
      screen.getByRole("button", { name: "Dismiss toast" }),
    ).toBeInTheDocument();
  });
});
