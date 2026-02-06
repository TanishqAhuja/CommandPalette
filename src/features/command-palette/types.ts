import type { ToastService } from "@services/toast";

/**
 * Handler context: extensible container for any context needed by handlers.
 * Currently contains toast, but can include anything in the future.
 */
export interface HandlerContext {
  toast: ToastService;
}

/**
 * Handler config: object with required "type" and handler-specific properties.
 * Each handler type defines its own required/optional fields.
 */
export type HandlerConfig = {
  type: "toast";
  message: string;
  duration?: number;
};
// Future handler types can be added here
// | { type: 'api'; endpoint: string; method: string }
// | { type: 'dialog'; title: string; content: string }

/**
 * CommandConfig: JSON-serializable command configuration.
 */
export interface CommandConfig {
  id: string;
  title: string;
  keywords: string[];
  shortcut?: string;
  description?: string;
  handlerConfig: HandlerConfig;
}

/**
 * Command: Runtime version with an executable handler function.
 * Hydrated from CommandConfig with bound context.
 */
export interface Command extends Omit<CommandConfig, "handlerConfig"> {
  handler: () => void;
}

/**
 * SearchResult: Command with relevance score.
 */
export interface SearchResult {
  command: Command;
  score: number;
}
