import { describe, it, expect } from "vitest";

describe("sanity dom", () => {
  it("has a document body", () => {
    expect(document).toBeDefined();
    expect(document.body).toBeDefined();
  });

  it("can create an element", () => {
    const div = document.createElement("div");
    div.textContent = "hello";
    document.body.appendChild(div);

    expect(document.body.textContent).toContain("hello");
  });
});
