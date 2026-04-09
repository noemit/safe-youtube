import type { SearchResult, SiteConfig } from "@/lib/types";

function normalizeForComparison(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/i, "")
    .replace(/[^a-z0-9@]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractVideoId(value: string): string | null {
  const trimmed = value.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

export function extractChannelHandle(value: string): string | undefined {
  const match = value.match(/@([a-zA-Z0-9._-]+)/);
  return match ? `@${match[1]}` : undefined;
}

export function labelFromChannelReference(value: string): string {
  const handle = extractChannelHandle(value);

  if (handle) {
    return handle;
  }

  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts.at(-1) ?? value;
  } catch {
    return value;
  }
}

function includesTerm(text: string, term: string): boolean {
  const normalizedText = normalizeForComparison(text);
  const normalizedTerm = normalizeForComparison(term);

  if (!normalizedText || !normalizedTerm) {
    return false;
  }

  return normalizedText.includes(normalizedTerm);
}

function channelMatches(reference: string, result: SearchResult): boolean {
  const candidates = [
    result.channelTitle,
    result.channelHandle,
    result.channelUrl,
  ].filter((value): value is string => Boolean(value));

  return candidates.some((candidate) => includesTerm(candidate, reference));
}

function resultMatchesWord(term: string, result: SearchResult): boolean {
  return includesTerm(
    [result.title, result.description, result.channelTitle, result.channelHandle]
      .filter(Boolean)
      .join(" "),
    term,
  );
}

export function isQueryAllowed(
  query: string,
  config: SiteConfig,
): { allowed: boolean; reason?: string } {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return { allowed: true };
  }

  for (const blockedWord of config.blockedWords) {
    if (includesTerm(normalizedQuery, blockedWord)) {
      return {
        allowed: false,
        reason: `The search "${normalizedQuery}" contains a blocked word.`,
      };
    }
  }

  if (
    config.mode === "allowlist" &&
    config.allowedSearchTerms.length > 0 &&
    !config.allowedSearchTerms.some((term) => includesTerm(normalizedQuery, term))
  ) {
    return {
      allowed: false,
      reason:
        "This search is not in your approved search list. Add it to allowedSearchTerms or switch to blocklist mode.",
    };
  }

  return { allowed: true };
}

export function filterSearchResults(
  results: SearchResult[],
  config: SiteConfig,
): SearchResult[] {
  const blockedVideoIds = new Set(
    config.blockedVideos
      .map((item) => extractVideoId(item))
      .filter((value): value is string => Boolean(value)),
  );

  const allowedVideoIds = new Set(
    config.allowedVideos
      .map((item) => extractVideoId(item))
      .filter((value): value is string => Boolean(value)),
  );

  return results.filter((result) => {
    const isBlockedByWord = config.blockedWords.some((term) =>
      resultMatchesWord(term, result),
    );
    const isBlockedByChannel = config.blockedChannels.some((reference) =>
      channelMatches(reference, result),
    );
    const isBlockedByVideo = blockedVideoIds.has(result.videoId);

    if (config.mode === "blocklist") {
      return !isBlockedByWord && !isBlockedByChannel && !isBlockedByVideo;
    }

    const hasAllowRules =
      config.allowedSearchTerms.length > 0 ||
      config.allowedChannels.length > 0 ||
      config.allowedVideos.length > 0;

    if (!hasAllowRules) {
      return false;
    }

    const isAllowedByVideo = allowedVideoIds.has(result.videoId);
    const isAllowedByChannel = config.allowedChannels.some((reference) =>
      channelMatches(reference, result),
    );
    const isAllowedByWord = config.allowedSearchTerms.some((term) =>
      resultMatchesWord(term, result),
    );

    return (
      !isBlockedByWord &&
      !isBlockedByChannel &&
      !isBlockedByVideo &&
      (isAllowedByVideo || isAllowedByChannel || isAllowedByWord)
    );
  });
}

export function buildChannelSearchQuery(reference: string): string {
  const handle = extractChannelHandle(reference);
  return handle ?? labelFromChannelReference(reference);
}

