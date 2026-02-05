import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../src/App";

describe("App", () => {
  it("renders the app with title", () => {
    render(<App />);
    expect(screen.getByText("Command Palette")).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    render(<App />);
    expect(
      screen.getByText(/Keyboard-first VS Code-style command palette/),
    ).toBeInTheDocument();
  });
});
describe("App", () => {
  it("title exists using queryByText", () => {
    render(<App />);
    expect(screen.queryByText("Command Palette")).not.toBeNull();
  });

  it("subtitle exists using queryByText", () => {
    render(<App />);
    expect(
      screen.queryByText(/Keyboard-first VS Code-style command palette/),
    ).not.toBeNull();
  });
});
