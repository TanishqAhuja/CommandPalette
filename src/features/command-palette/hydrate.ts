import type {
  CommandConfig,
  Command,
  HandlerConfig,
  HandlerContext,
} from "./types";

/**
 * Handler factory: takes handler config and context, returns executable handler.
 */
type HandlerFactory = (
  config: HandlerConfig,
  context: HandlerContext,
) => () => void;

/**
 * Handler registry: maps handler type names to factory functions.
 * Extensible for custom handler types in the future.
 */
const handlerRegistry: Record<string, HandlerFactory> = {
  toast: (config, context) => {
    // Type guard to ensure we have the right config shape
    if (config.type !== "toast") {
      throw new Error("Invalid handler config for toast handler");
    }
    return () => {
      context.toast.show(config.message, config.duration ?? 3000);
    };
  },
};

/**
 * Hydrate commands from JSON-serializable configs into executable Commands.
 * Binds handler context and resolves handler config to actual function.
 */
export function hydrateCommands(
  configs: CommandConfig[],
  context: HandlerContext,
): Command[] {
  return configs.map((config) => {
    const handlerFactory = handlerRegistry[config.handlerConfig.type];

    if (!handlerFactory) {
      throw new Error(`Unknown handler type: ${config.handlerConfig.type}`);
    }

    return {
      id: config.id,
      title: config.title,
      keywords: config.keywords,
      shortcut: config.shortcut,
      description: config.description,
      handler: handlerFactory(config.handlerConfig, context),
    };
  });
}

/**
 * Register a custom handler factory that can be used in command configs.
 * Allows extending handler types without modifying existing code.
 */
export function registerHandler(type: string, factory: HandlerFactory): void {
  handlerRegistry[type] = factory;
}
