/**
 * Command palette utilities barrel export.
 * Provides fuzzy search and command hydration functionality.
 */

export { normalize, searchCommands } from "./fuzzy";
export { hydrateCommands, registerHandler } from "./hydrate";
