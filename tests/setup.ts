import "@testing-library/jest-dom";

// Do NOT override getComputedStyle completely.
// happy-dom implements it, but may miss getPropertyValue in some cases.
const originalGetComputedStyle = window.getComputedStyle;

Object.defineProperty(window, "getComputedStyle", {
  value: (el: Element): CSSStyleDeclaration => {
    const style = originalGetComputedStyle(el);

    if (typeof style.getPropertyValue !== "function") {
      Object.defineProperty(style, "getPropertyValue", {
        value: () => "",
      });
    }

    return style;
  },
});

// Optional: Some libraries check for window.CSS existence.
// But do not set CSS=null, it can break feature checks.
if (!("CSS" in window)) {
  Object.defineProperty(window, "CSS", {
    value: {},
  });
}
