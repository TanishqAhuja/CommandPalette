import type { Command, SearchResult } from "../commandPalette.types";

/**
 * Normalized command with pre-computed searchable fields.
 * Avoids repeated normalization during scoring.
 */
export interface IndexedCommand {
  command: Command;
  normalizedTitle: string;
  normalizedKeywords: string;
}

export type SearchWeights = {
  titleWeight: number;
  keywordWeight: number;

  prefixScore: number;
  substringScore: number;

  /**
   * Max score allowed from subsequence fallback.
   * Keeps subsequence from beating substring/prefix.
   */
  maxSubsequenceScore: number;
};

const DEFAULT_WEIGHTS: SearchWeights = {
  titleWeight: 0.7,
  keywordWeight: 0.3,

  prefixScore: 1.0,
  substringScore: 0.8,

  maxSubsequenceScore: 0.6,
};

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * Normalize text for comparison:
 * - Lowercase
 * - Trim leading/trailing whitespace
 * - Collapse multiple spaces to single space
 */
export function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Build an index of normalized commands.
 * Pre-computing normalized fields avoids repeated allocations in searchCommands.
 */
export function buildCommandIndex(commands: Command[]): IndexedCommand[] {
  return commands.map((command) => {
    const normalizedTitle = normalize(command.title);
    const normalizedKeywords = normalize(command.keywords.join(" "));

    return {
      command,
      normalizedTitle,
      normalizedKeywords,
    };
  });
}

/**
 * Split query into tokens.
 * Example: "git   com" -> ["git", "com"]
 */
function tokenize(query: string): string[] {
  return query
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Linear subsequence scoring (fallback only).
 *
 * Returns [0..maxScore].
 */
function scoreSubsequence(
  token: string,
  candidate: string,
  maxScore: number,
): number {
  if (!token) return 0;
  if (token.length > candidate.length) return 0;

  let tokenIdx = 0;
  let firstMatchIndex = -1;

  for (let i = 0; i < candidate.length && tokenIdx < token.length; i++) {
    if (candidate[i] === token[tokenIdx]) {
      if (firstMatchIndex === -1) {
        firstMatchIndex = i;
      }
      tokenIdx++;
    }
  }

  if (tokenIdx !== token.length) return 0;
  if (firstMatchIndex === -1) return 0;

  // Earlier match = better score.
  const positionFactor = 1 - firstMatchIndex / candidate.length;

  return clamp01(positionFactor) * maxScore;
}

/**
 * Score a single token against a candidate string.
 *
 * Ranking:
 * - prefix dominates
 * - substring dominates
 * - subsequence fallback only
 */
function scoreTokenAgainstCandidate(
  token: string,
  candidate: string,
  weights: SearchWeights,
): number {
  if (!token) return 0;
  if (!candidate) return 0;

  if (candidate.startsWith(token)) {
    return weights.prefixScore;
  }

  if (candidate.includes(token)) {
    return weights.substringScore;
  }

  return scoreSubsequence(token, candidate, weights.maxSubsequenceScore);
}

/**
 * Score a token against a command (title + keywords).
 */
function scoreToken(
  token: string,
  indexed: IndexedCommand,
  weights: SearchWeights,
): number {
  const titleScore = scoreTokenAgainstCandidate(
    token,
    indexed.normalizedTitle,
    weights,
  );

  const keywordScore = scoreTokenAgainstCandidate(
    token,
    indexed.normalizedKeywords,
    weights,
  );

  const combined =
    titleScore * weights.titleWeight + keywordScore * weights.keywordWeight;

  return clamp01(combined);
}

/**
 * Score query tokens against a command.
 *
 * Final score = average token score.
 * Tokens that don't match contribute 0, so partial matches rank lower naturally.
 */
function scoreQueryTokens(
  tokens: string[],
  indexed: IndexedCommand,
  weights: SearchWeights,
): number {
  if (tokens.length === 0) return 0;

  let sum = 0;

  for (const token of tokens) {
    sum += scoreToken(token, indexed, weights);
  }

  return clamp01(sum / tokens.length);
}

/**
 * Search commands by query, returning ranked results sorted by score (desc) then id (asc).
 * Optional limit caps the number of results returned.
 *
 * Empty query returns all commands sorted by id.
 *
 * NOTE: This function does NOT mutate input arrays.
 */
export function searchCommands(
  query: string,
  commands: Command[],
  limit?: number,
  config?: {
    indexedCommands?: IndexedCommand[];
    weights?: Partial<SearchWeights>;
  },
): SearchResult[] {
  const normalizedQuery = normalize(query);

  // Empty query: return all, sorted by id
  if (!normalizedQuery) {
    return [...commands]
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, limit)
      .map((command) => ({
        command,
        score: 0,
      }));
  }

  const weights: SearchWeights = {
    ...DEFAULT_WEIGHTS,
    ...(config?.weights ?? {}),
  };

  const tokens = tokenize(normalizedQuery);
  if (tokens.length === 0) return [];

  // Reuse cached index if caller provides it (recommended for keystroke usage)
  const indexedCommands =
    config?.indexedCommands ?? buildCommandIndex(commands);

  const results: SearchResult[] = indexedCommands
    .map((indexed) => ({
      command: indexed.command,
      score: scoreQueryTokens(tokens, indexed, weights),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.command.id.localeCompare(b.command.id);
    });

  return limit !== undefined ? results.slice(0, limit) : results;
}
