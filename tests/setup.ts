import '@testing-library/jest-dom'

// Mock CSS imports during test environment to avoid Tailwind ESM issues
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'CSS', {value: null});
  Object.defineProperty(window, 'getComputedStyle', {
    value: () => ({
      display: 'none',
      appearance: ['-webkit-appearance']
    })
  });
}
