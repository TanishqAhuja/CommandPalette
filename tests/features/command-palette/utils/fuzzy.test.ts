import { describe, it, expect } from "vitest";
import {
  normalize,
  searchCommands,
} from "@features/command-palette/utils/fuzzy";
import type { Command } from "@features/command-palette/types";

// Mock commands for testing
const mockCommands: Command[] = [
  {
    id: "cmd.palette.open",
    title: "Toggle Command Palette",
    keywords: ["command", "palette", "open"],
    handler: () => {},
  },
  {
    id: "git.commit",
    title: "Git: Commit",
    keywords: ["git", "commit", "save"],
    handler: () => {},
  },
  {
    id: "file.new",
    title: "New File",
    keywords: ["new", "file", "create"],
    handler: () => {},
  },
  {
    id: "settings.open",
    title: "Open Settings",
    keywords: ["settings", "preferences", "config"],
    handler: () => {},
  },
  {
    id: "editor.format",
    title: "Format Document",
    keywords: ["format", "prettier", "lint"],
    handler: () => {},
  },
];

describe("normalize", () => {
  it("should lowercase text", () => {
    expect(normalize("HELLO")).toBe("hello");
    expect(normalize("HeLLo WoRLd")).toBe("hello world");
  });

  it("should trim leading and trailing whitespace", () => {
    expect(normalize("  hello  ")).toBe("hello");
    expect(normalize("\t world \n")).toBe("world");
  });

  it("should collapse multiple spaces into single space", () => {
    expect(normalize("hello    world")).toBe("hello world");
    expect(normalize("a  b   c    d")).toBe("a b c d");
  });

  it("should handle empty strings", () => {
    expect(normalize("")).toBe("");
    expect(normalize("   ")).toBe("");
  });
});

describe("searchCommands", () => {
  describe("title matching", () => {
    it("should rank title matches higher than keyword matches", () => {
      const results = searchCommands("git", mockCommands);
      // "Git: Commit" has "git" in title, should rank first
      expect(results[0].command.id).toBe("git.commit");
      expect(results[0].score).toBeGreaterThan(0);
    });

    it("should support partial title matches", () => {
      const results = searchCommands("set", mockCommands);
      // Should match "Settings" (keyword) and potentially other commands
      const ids = results.map((r) => r.command.id);
      expect(ids).toContain("settings.open");
    });

    it("should match case-insensitively", () => {
      const lowercaseResults = searchCommands("toggle", mockCommands);
      const uppercaseResults = searchCommands("TOGGLE", mockCommands);
      expect(lowercaseResults).toEqual(uppercaseResults);
    });
  });

  describe("keyword matching", () => {
    it("should match keywords even if title does not contain query", () => {
      const results = searchCommands("save", mockCommands);
      // "save" is in git.commit keywords
      const ids = results.map((r) => r.command.id);
      expect(ids).toContain("git.commit");
    });

    it("should find commands by multiple keywords", () => {
      const results = searchCommands("create", mockCommands);
      const ids = results.map((r) => r.command.id);
      // "create" is in file.new keywords
      expect(ids).toContain("file.new");
    });
  });

  describe("ranking and scoring", () => {
    it("should rank exact/early matches higher", () => {
      const results = searchCommands("format", mockCommands);
      // "Format Document" has "format" at the beginning
      if (results.length > 0) {
        expect(results[0].command.id).toBe("editor.format");
      }
    });

    it("should sort by score descending, then id ascending", () => {
      const results = searchCommands("o", mockCommands);
      // "o" matches multiple commands; verify stable sort
      for (let i = 1; i < results.length; i++) {
        const prevScore = results[i - 1].score;
        const currScore = results[i].score;
        if (Math.abs(prevScore - currScore) < 0.0001) {
          // Same score: should be sorted by id
          expect(
            results[i - 1].command.id.localeCompare(results[i].command.id),
          ).toBeLessThanOrEqual(0);
        } else {
          // Different scores: descending
          expect(prevScore).toBeGreaterThanOrEqual(currScore);
        }
      }
    });
  });

  describe("empty query", () => {
    it("should return all commands sorted by id when query is empty", () => {
      const results = searchCommands("", mockCommands);
      expect(results).toHaveLength(mockCommands.length);
      const ids = results.map((r) => r.command.id);
      const expectedIds = [...mockCommands]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((c) => c.id);
      expect(ids).toEqual(expectedIds);
    });

    it("should return all commands sorted by id when query is only whitespace", () => {
      const results = searchCommands("   ", mockCommands);
      expect(results).toHaveLength(mockCommands.length);
      const ids = results.map((r) => r.command.id);
      const expectedIds = [...mockCommands]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((c) => c.id);
      expect(ids).toEqual(expectedIds);
    });

    it("should assign score 0 for empty query results", () => {
      const results = searchCommands("", mockCommands);
      results.forEach((result) => {
        expect(result.score).toBe(0);
      });
    });
  });

  describe("non-matches and filtering", () => {
    it("should return empty array for non-matching query", () => {
      const results = searchCommands("xyz123notfound", mockCommands);
      expect(results).toHaveLength(0);
    });

    it("should filter out non-matching commands", () => {
      const results = searchCommands("xyzunique", mockCommands);
      expect(results).toHaveLength(0);
    });
  });

  describe("limit parameter", () => {
    it("should limit results when limit is provided", () => {
      const results = searchCommands("o", mockCommands, 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("should return all results when limit is not provided", () => {
      const results = searchCommands("o", mockCommands);
      const resultsWithoutLimit = searchCommands("o", mockCommands, undefined);
      expect(results).toEqual(resultsWithoutLimit);
    });

    it("should respect limit with empty query", () => {
      const results = searchCommands("", mockCommands, 2);
      expect(results).toHaveLength(2);
    });

    it("should return fewer results if not enough commands match", () => {
      const results = searchCommands("git", mockCommands, 100);
      expect(results.length).toBeLessThanOrEqual(mockCommands.length);
    });
  });

  describe("edge cases", () => {
    it("should handle single character queries", () => {
      const results = searchCommands("g", mockCommands);
      expect(results.length).toBeGreaterThan(0);
    });

    it("should handle commands with special characters in title", () => {
      const special: Command[] = [
        {
          id: "special.colon",
          title: "Git: Commit",
          keywords: [],
          handler: () => {},
        },
      ];
      const results = searchCommands("git", special);
      expect(results).toHaveLength(1);
      expect(results[0].command.id).toBe("special.colon");
    });

    it("should handle empty command list", () => {
      const results = searchCommands("test", []);
      expect(results).toHaveLength(0);
    });
  });
});
