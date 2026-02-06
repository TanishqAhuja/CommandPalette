import type { Command, SearchResult } from "../types";

/**
 * Normalized command with pre-computed searchable fields.
 * Avoids repeated normalization during scoring.
 */
interface IndexedCommand {
  command: Command;
  normalizedTitle: string;
  normalizedKeywords: string;
  normalizedHaystack: string; // title + " " + keywords for combined search
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
function buildCommandIndex(commands: Command[]): IndexedCommand[] {
  return commands.map((command) => ({
    command,
    normalizedTitle: normalize(command.title),
    normalizedKeywords: normalize(command.keywords.join(" ")),
    normalizedHaystack: `${normalize(command.title)} ${normalize(command.keywords.join(" "))}`,
  }));
}

/**
 * Calculate relevance score for a query against a candidate string.
 *
 * Scoring logic:
 * - Subsequence matching: looks for query characters in order within the candidate
 * - Title bias: matches in title (first arg) weighted at 0.7, keywords at 0.3
 * - Position bonus: earlier matches in the string score higher
 * - Contiguity bonus: consecutive matches score higher than scattered matches
 *
 * Returns 0 for no match, up to 1 for perfect/early matches.
 */
function score(
  query: string,
  titleCandidate: string,
  keywordCandidate: string,
): number {
  if (!query) return 0;

  // Score title match
  const titleScore = scoreSubsequence(query, titleCandidate);

  // Score keywords match
  const keywordScore = scoreSubsequence(query, keywordCandidate);

  // Weighted combination: title is more important
  return titleScore * 0.7 + keywordScore * 0.3;
}

/**
 * Score a subsequence match within a single string.
 * Returns a score from 0 (no match) to 1 (perfect match at start).
 *
 * Bonuses:
 * - Early matches: character position influences score
 * - Contiguous matches: consecutive character matches score higher
 */
function scoreSubsequence(query: string, candidate: string): number {
  const queryLen = query.length;
  const candidateLen = candidate.length;

  if (queryLen === 0) return 0;
  if (queryLen > candidateLen) return 0;

  // Find all matching positions
  const matches: number[] = [];
  let candidateIdx = 0;

  for (let queryIdx = 0; queryIdx < queryLen; queryIdx++) {
    const foundIdx = candidate.indexOf(query[queryIdx], candidateIdx);
    if (foundIdx === -1) return 0; // No match for this query character

    matches.push(foundIdx);
    candidateIdx = foundIdx + 1;
  }

  // Calculate base match score (higher if match appears early)
  const firstMatchPos = matches[0];
  const baseScore = Math.max(0, 1 - firstMatchPos / (candidateLen * 0.5));

  // Contiguity bonus: consecutive matches within 2 positions
  let contiguityBonus = 0;
  let consecutiveCount = 1;

  for (let i = 1; i < matches.length; i++) {
    if (matches[i] - matches[i - 1] <= 2) {
      consecutiveCount++;
    } else {
      consecutiveCount = 1;
    }
  }

  // Bonus scales with how many characters match consecutively
  contiguityBonus = (consecutiveCount / queryLen) * 0.2;

  // Length match bonus: perfect substring match gets max score
  const lengthBonus =
    queryLen === candidateLen
      ? 0.3
      : Math.min(0.1, (queryLen / candidateLen) * 0.1);

  return Math.min(1, baseScore + contiguityBonus + lengthBonus);
}

/**
 * Search commands by query, returning ranked results sorted by score (desc) then id (asc).
 * Optional limit caps the number of results returned.
 *
 * Empty query returns all commands sorted by id.
 */
export function searchCommands(
  query: string,
  commands: Command[],
  limit?: number,
): SearchResult[] {
  const normalizedQuery = normalize(query);

  // Empty query: return all, sorted by id
  if (!normalizedQuery) {
    return commands
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, limit)
      .map((command) => ({
        command,
        score: 0, // No score for empty query
      }));
  }

  // Build index once
  const index = buildCommandIndex(commands);

  // Score all commands
  const results = index
    .map(({ command, normalizedTitle, normalizedKeywords }) => ({
      command,
      score: score(normalizedQuery, normalizedTitle, normalizedKeywords),
    }))
    .filter(({ score: s }) => s > 0) // Only keep matches
    .sort((a, b) => {
      // Sort by score (desc), then by id (asc)
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return a.command.id.localeCompare(b.command.id);
    });

  // Apply limit if provided
  if (limit !== undefined) {
    return results.slice(0, limit);
  }

  return results;
}
