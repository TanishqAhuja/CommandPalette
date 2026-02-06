/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from "vitest";
import {
  hydrateCommands,
  registerHandler,
} from "@features/command-palette/hydrate";
import { MockToastService } from "@services/toast";
import type { CommandConfig } from "@features/command-palette/types";

describe("hydrateCommands", () => {
  let mockToast: MockToastService;

  beforeEach(() => {
    mockToast = new MockToastService();
    mockToast.reset();
  });

  describe("basic hydration", () => {
    it("should hydrate toast handlers correctly", () => {
      const commands: CommandConfig[] = [
        {
          id: "test",
          title: "Test Command",
          keywords: ["test"],
          handlerConfig: { type: "toast", message: "Test message" },
        },
      ];

      const hydrated = hydrateCommands(commands, { toast: mockToast });

      expect(hydrated).toHaveLength(1);
      expect(hydrated[0].id).toBe("test");
      expect(hydrated[0].title).toBe("Test Command");
      expect(hydrated[0].keywords).toEqual(["test"]);
    });

    it("should preserve all command properties except handlerConfig", () => {
      const commands: CommandConfig[] = [
        {
          id: "full-cmd",
          title: "Full Command",
          keywords: ["full", "test"],
          shortcut: "Cmd+Shift+F",
          description: "A complete command",
          handlerConfig: { type: "toast", message: "Full command" },
        },
      ];

      const hydrated = hydrateCommands(commands, { toast: mockToast });
      const cmd = hydrated[0];

      expect(cmd.id).toBe("full-cmd");
      expect(cmd.title).toBe("Full Command");
      expect(cmd.keywords).toEqual(["full", "test"]);
      expect(cmd.shortcut).toBe("Cmd+Shift+F");
      expect(cmd.description).toBe("A complete command");
      expect(cmd.handler).toBeInstanceOf(Function);
    });

    it("should hydrate multiple commands", () => {
      const commands: CommandConfig[] = [
        {
          id: "cmd1",
          title: "Command 1",
          keywords: ["one"],
          handlerConfig: { type: "toast", message: "Message 1" },
        },
        {
          id: "cmd2",
          title: "Command 2",
          keywords: ["two"],
          handlerConfig: { type: "toast", message: "Message 2" },
        },
      ];

      const hydrated = hydrateCommands(commands, { toast: mockToast });

      expect(hydrated).toHaveLength(2);
      expect(hydrated[0].id).toBe("cmd1");
      expect(hydrated[1].id).toBe("cmd2");
    });
  });

  describe("handler execution", () => {
    it("should execute toast handler with correct message", () => {
      const commands: CommandConfig[] = [
        {
          id: "test",
          title: "Test",
          keywords: [],
          handlerConfig: {
            type: "toast",
            message: "Custom message",
            duration: 5000,
          },
        },
      ];

      const hydrated = hydrateCommands(commands, { toast: mockToast });
      hydrated[0].handler();

      expect(mockToast.calls).toHaveLength(1);
      expect(mockToast.calls[0].message).toBe("Custom message");
      expect(mockToast.calls[0].duration).toBe(5000);
    });

    it("should use default duration when not specified", () => {
      const commands: CommandConfig[] = [
        {
          id: "test",
          title: "Test",
          keywords: [],
          handlerConfig: { type: "toast", message: "Message" },
        },
      ];

      const hydrated = hydrateCommands(commands, { toast: mockToast });
      hydrated[0].handler();

      expect(mockToast.calls[0].duration).toBe(3000);
    });

    it("should support multiple handler executions", () => {
      const commands: CommandConfig[] = [
        {
          id: "test",
          title: "Test",
          keywords: [],
          handlerConfig: { type: "toast", message: "Message" },
        },
      ];

      const hydrated = hydrateCommands(commands, { toast: mockToast });
      hydrated[0].handler();
      hydrated[0].handler();
      hydrated[0].handler();

      expect(mockToast.calls).toHaveLength(3);
    });
  });

  describe("error handling", () => {
    it("should throw error for unknown handler type", () => {
      const commands: CommandConfig[] = [
        {
          id: "test",
          title: "Test",
          keywords: [],
          handlerConfig: { type: "unknown" } as any,
        },
      ];

      expect(() => hydrateCommands(commands, { toast: mockToast })).toThrow(
        "Unknown handler type: unknown",
      );
    });

    it("should throw error with descriptive message", () => {
      const commands: CommandConfig[] = [
        {
          id: "test",
          title: "Test",
          keywords: [],
          handlerConfig: { type: "nonexistent" } as any,
        },
      ];

      expect(() => hydrateCommands(commands, { toast: mockToast })).toThrow(
        /Unknown handler type:/,
      );
    });
  });

  describe("handler registration", () => {
    it("should register and use custom handlers", () => {
      const customCalls: string[] = [];

      registerHandler("custom", (_config, context) => {
        return () => {
          customCalls.push("executed");
          context.toast.show("Custom handler ran");
        };
      });

      const commands: CommandConfig[] = [
        {
          id: "test",
          title: "Test",
          keywords: [],
          handlerConfig: { type: "custom" } as any,
        },
      ];

      const hydrated = hydrateCommands(commands, { toast: mockToast });
      hydrated[0].handler();

      expect(customCalls).toContain("executed");
      expect(mockToast.calls).toHaveLength(1);
      expect(mockToast.calls[0].message).toBe("Custom handler ran");
    });

    it("should allow overriding existing handlers", () => {
      const calls: string[] = [];

      registerHandler("toast", (_config, context) => {
        return () => {
          calls.push("overridden");
          context.toast.show("Overridden");
        };
      });

      const commands: CommandConfig[] = [
        {
          id: "test",
          title: "Test",
          keywords: [],
          handlerConfig: { type: "toast", message: "Original" },
        },
      ];

      const hydrated = hydrateCommands(commands, { toast: mockToast });
      hydrated[0].handler();

      expect(calls).toContain("overridden");
      expect(mockToast.calls[0].message).toBe("Overridden");
    });

    it("custom handler should have access to context", () => {
      const contextCalls: string[] = [];

      registerHandler("contextaware", (_config, context) => {
        return () => {
          contextCalls.push("has-toast");
          context.toast.show("From context");
        };
      });

      const commands: CommandConfig[] = [
        {
          id: "test",
          title: "Test",
          keywords: [],
          handlerConfig: { type: "contextaware" } as any,
        },
      ];

      const hydrated = hydrateCommands(commands, { toast: mockToast });
      hydrated[0].handler();

      expect(contextCalls).toContain("has-toast");
      expect(mockToast.calls[0].message).toBe("From context");
    });
  });
});
