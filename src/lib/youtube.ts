import {
  buildChannelSearchQuery,
  extractChannelHandle,
  extractVideoId,
  labelFromChannelReference,
} from "@/lib/filters";
import type {
  ChannelReference,
  FeaturedVideo,
  SearchResult,
} from "@/lib/types";

const YOUTUBE_HEADERS = {
  "accept-language": "en-US,en;q=0.9",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

function runsToText(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "";
  }

  const source = value as {
    simpleText?: string;
    runs?: Array<{ text?: string }>;
  };

  if (source.simpleText) {
    return source.simpleText;
  }

  if (!Array.isArray(source.runs)) {
    return "";
  }

  return source.runs.map((item) => item.text ?? "").join("").trim();
}

function normalizeThumbnail(url: string | undefined): string {
  if (!url) {
    return "";
  }

  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  return url;
}

function normalizeUrl(url: string | undefined): string {
  if (!url) {
    return "";
  }

  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  if (url.startsWith("/")) {
    return `https://www.youtube.com${url}`;
  }

  return url;
}

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

function includesTerm(text: string, term: string): boolean {
  const normalizedText = normalizeForComparison(text);
  const normalizedTerm = normalizeForComparison(term);

  if (!normalizedText || !normalizedTerm) {
    return false;
  }

  return normalizedText.includes(normalizedTerm);
}

function extractMetaContent(
  html: string,
  attribute: "name" | "property",
  value: string,
): string | undefined {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+${attribute}=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+${attribute}=["']${escaped}["']`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return match[1].replace(/&amp;/g, "&");
    }
  }

  return undefined;
}

function extractLinkHref(html: string, rel: string): string | undefined {
  const escaped = rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<link[^>]+rel=["']${escaped}["'][^>]+href=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<link[^>]+href=["']([^"']+)["'][^>]+rel=["']${escaped}["']`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return match[1].replace(/&amp;/g, "&");
    }
  }

  return undefined;
}

function stripYouTubeSuffix(value: string | undefined): string {
  if (!value) {
    return "";
  }

  return value.replace(/\s*-\s*YouTube$/i, "").trim();
}

function findObjectByKey(
  node: unknown,
  key: string,
): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const match = findObjectByKey(item, key);

      if (match) {
        return match;
      }
    }

    return null;
  }

  if (!node || typeof node !== "object") {
    return null;
  }

  const record = node as Record<string, unknown>;
  const directValue = record[key];

  if (directValue && typeof directValue === "object") {
    return directValue as Record<string, unknown>;
  }

  for (const value of Object.values(record)) {
    const match = findObjectByKey(value, key);

    if (match) {
      return match;
    }
  }

  return null;
}

function channelReferenceMatches(
  reference: string,
  result: SearchResult,
): boolean {
  const terms = [
    reference,
    labelFromChannelReference(reference),
    extractChannelHandle(reference),
  ].filter((value): value is string => Boolean(value));
  const candidates = [
    result.channelTitle,
    result.channelHandle,
    result.channelUrl,
  ].filter((value): value is string => Boolean(value));

  return candidates.some((candidate) =>
    terms.some((term) => includesTerm(candidate, term)),
  );
}

function resolveDirectChannelUrl(reference: string): string | undefined {
  const trimmed = reference.trim();

  if (!trimmed) {
    return undefined;
  }

  const handle = extractChannelHandle(trimmed);

  if (handle) {
    return `https://www.youtube.com/${handle}`;
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    return undefined;
  }
}

function extractChannelMetadata(html: string): {
  label?: string;
  channelUrl?: string;
  thumbnailUrl?: string;
} {
  let label = stripYouTubeSuffix(extractMetaContent(html, "property", "og:title"));
  let channelUrl = normalizeUrl(extractLinkHref(html, "canonical"));
  let thumbnailUrl = normalizeThumbnail(
    extractMetaContent(html, "property", "og:image"),
  );

  try {
    const data = extractInitialData(html);
    const metadata = findObjectByKey(data, "channelMetadataRenderer");

    if (metadata) {
      const title =
        typeof metadata.title === "string" ? metadata.title.trim() : "";
      const ownerUrls = Array.isArray(metadata.ownerUrls)
        ? metadata.ownerUrls
        : [];
      const firstOwnerUrl = ownerUrls.find(
        (item): item is string => typeof item === "string",
      );
      const avatarThumbnails =
        ((metadata.avatar as { thumbnails?: Array<{ url?: string }> })
          ?.thumbnails ?? []) || [];

      label = title || label;
      channelUrl = normalizeUrl(firstOwnerUrl ?? channelUrl);
      thumbnailUrl = normalizeThumbnail(
        avatarThumbnails.at(-1)?.url ?? avatarThumbnails[0]?.url ?? thumbnailUrl,
      );
    }
  } catch {
    // The meta-tag fallback is enough when channel page JSON changes.
  }

  return {
    label: label || undefined,
    channelUrl: channelUrl || undefined,
    thumbnailUrl: thumbnailUrl || undefined,
  };
}

async function fetchChannelMetadata(url: string): Promise<{
  label?: string;
  channelUrl?: string;
  thumbnailUrl?: string;
} | null> {
  try {
    const response = await fetch(url, {
      headers: YOUTUBE_HEADERS,
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return null;
    }

    return extractChannelMetadata(await response.text());
  } catch {
    return null;
  }
}

function extractJsonBlock(html: string, token: string): string | null {
  const tokenIndex = html.indexOf(token);
  if (tokenIndex === -1) {
    return null;
  }

  const firstBrace = html.indexOf("{", tokenIndex + token.length);
  if (firstBrace === -1) {
    return null;
  }

  let depth = 0;
  let quote: '"' | "'" | null = null;
  let escaped = false;

  for (let index = firstBrace; index < html.length; index += 1) {
    const character = html[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }

      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }

    if (character === "{") {
      depth += 1;
      continue;
    }

    if (character === "}") {
      depth -= 1;

      if (depth === 0) {
        return html.slice(firstBrace, index + 1);
      }
    }
  }

  return null;
}

function extractInitialData(html: string): unknown {
  const tokens = ['var ytInitialData = ', 'window["ytInitialData"] = '];

  for (const token of tokens) {
    const block = extractJsonBlock(html, token);
    if (block) {
      return JSON.parse(block);
    }
  }

  throw new Error("Could not find search results in the YouTube response.");
}

function collectVideoRenderers(
  node: unknown,
  output: Array<Record<string, unknown>>,
): void {
  if (Array.isArray(node)) {
    node.forEach((item) => collectVideoRenderers(item, output));
    return;
  }

  if (!node || typeof node !== "object") {
    return;
  }

  const record = node as Record<string, unknown>;

  if (record.videoRenderer && typeof record.videoRenderer === "object") {
    output.push(record.videoRenderer as Record<string, unknown>);
  }

  for (const value of Object.values(record)) {
    collectVideoRenderers(value, output);
  }
}

function mapRendererToSearchResult(
  renderer: Record<string, unknown>,
): SearchResult | null {
  const videoId =
    typeof renderer.videoId === "string" ? renderer.videoId : undefined;

  if (!videoId) {
    return null;
  }

  const thumbnailList =
    ((renderer.thumbnail as { thumbnails?: Array<{ url?: string }> })
      ?.thumbnails ??
      (renderer.richThumbnail as {
        movingThumbnailRenderer?: {
          movingThumbnailDetails?: { thumbnails?: Array<{ url?: string }> };
        };
      })?.movingThumbnailRenderer?.movingThumbnailDetails?.thumbnails) || [];

  const ownerRuns =
    ((renderer.ownerText as { runs?: Array<{ navigationEndpoint?: unknown }> })
      ?.runs ??
      (renderer.longBylineText as {
        runs?: Array<{ navigationEndpoint?: unknown }>;
      })?.runs ??
      (renderer.shortBylineText as {
        runs?: Array<{ navigationEndpoint?: unknown }>;
      })?.runs) || [];

  const ownerUrl = ownerRuns
    .map((item) => {
      const endpoint = item.navigationEndpoint as {
        browseEndpoint?: { canonicalBaseUrl?: string };
      };
      return endpoint?.browseEndpoint?.canonicalBaseUrl;
    })
    .find((value): value is string => Boolean(value));

  const channelUrl = ownerUrl ? `https://www.youtube.com${ownerUrl}` : undefined;
  const channelHandle =
    extractChannelHandle(ownerUrl ?? "") ?? extractChannelHandle(channelUrl ?? "");

  return {
    videoId,
    title: runsToText(renderer.title),
    description:
      runsToText(
        ((renderer.detailedMetadataSnippets as Array<{
          snippetText?: unknown;
        }>)?.[0] ?? {})?.snippetText,
      ) || runsToText(renderer.descriptionSnippet),
    channelTitle:
      runsToText(renderer.ownerText) ||
      runsToText(renderer.longBylineText) ||
      runsToText(renderer.shortBylineText),
    channelHandle,
    channelUrl,
    thumbnailUrl: normalizeThumbnail(
      thumbnailList.at(-1)?.url ?? thumbnailList[0]?.url,
    ),
    lengthText: runsToText(renderer.lengthText),
    publishedText: runsToText(renderer.publishedTimeText),
    viewCountText: runsToText(renderer.viewCountText),
  };
}

async function searchYouTubeInternal(
  query: string,
  options: RequestInit & { next?: { revalidate?: number } },
): Promise<SearchResult[]> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=en&persist_hl=1`;

  const response = await fetch(url, {
    ...options,
    headers: YOUTUBE_HEADERS,
  });

  if (!response.ok) {
    throw new Error("YouTube did not return a usable response.");
  }

  const html = await response.text();
  const data = extractInitialData(html);
  const renderers: Array<Record<string, unknown>> = [];

  collectVideoRenderers(data, renderers);

  const results = renderers
    .map((renderer) => mapRendererToSearchResult(renderer))
    .filter((result): result is SearchResult => Boolean(result));

  const seen = new Set<string>();

  return results.filter((result) => {
    if (seen.has(result.videoId)) {
      return false;
    }

    seen.add(result.videoId);
    return Boolean(result.title && result.thumbnailUrl);
  });
}

export async function searchYouTube(query: string): Promise<SearchResult[]> {
  return searchYouTubeInternal(query, {
    cache: "no-store",
  });
}

interface OEmbedData {
  title?: string;
  author_name?: string;
  author_url?: string;
}

async function getVideoOEmbed(url: string): Promise<OEmbedData | null> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      {
        next: { revalidate: 3600 },
      },
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as OEmbedData;
  } catch {
    return null;
  }
}

export async function getFeaturedVideos(
  items: string[],
): Promise<FeaturedVideo[]> {
  const results: Array<FeaturedVideo | null> = await Promise.all(
    items.map(async (item): Promise<FeaturedVideo | null> => {
      const videoId = extractVideoId(item);

      if (!videoId) {
        return null;
      }

      const url = item.startsWith("http")
        ? item
        : `https://www.youtube.com/watch?v=${videoId}`;
      const oEmbed = await getVideoOEmbed(url);

      return {
        videoId,
        url,
        title: oEmbed?.title ?? "Approved YouTube video",
        channelTitle: oEmbed?.author_name,
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      } satisfies FeaturedVideo;
    }),
  );

  return results.filter((item): item is FeaturedVideo => item !== null);
}

export async function getVideoPreview(
  videoIdOrUrl: string,
): Promise<SearchResult | null> {
  const videoId = extractVideoId(videoIdOrUrl);

  if (!videoId) {
    return null;
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const oEmbed = await getVideoOEmbed(url);

  return {
    videoId,
    title: oEmbed?.title ?? "YouTube video",
    description: "",
    channelTitle: oEmbed?.author_name ?? "Unknown channel",
    channelHandle: extractChannelHandle(oEmbed?.author_url ?? ""),
    channelUrl: oEmbed?.author_url,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };
}

export function getChannelReferences(items: string[]): ChannelReference[] {
  return items.map((item) => ({
    raw: item,
    label: labelFromChannelReference(item),
    searchQuery: buildChannelSearchQuery(item),
  }));
}

async function resolveFeaturedChannel(item: string): Promise<ChannelReference> {
  const fallback: ChannelReference = {
    raw: item,
    label: labelFromChannelReference(item),
    searchQuery: buildChannelSearchQuery(item),
  };
  const directChannelUrl = resolveDirectChannelUrl(item);

  if (directChannelUrl) {
    const metadata = await fetchChannelMetadata(directChannelUrl);

    return {
      ...fallback,
      label: metadata?.label ?? fallback.label,
      channelUrl: metadata?.channelUrl ?? directChannelUrl,
      thumbnailUrl: metadata?.thumbnailUrl,
    };
  }

  try {
    const searchResults = await searchYouTubeInternal(fallback.searchQuery, {
      next: { revalidate: 3600 },
    });
    const matchedResult =
      searchResults.find((result) => channelReferenceMatches(item, result)) ??
      searchResults[0];

    if (!matchedResult) {
      return fallback;
    }

    const matchedChannelUrl = normalizeUrl(matchedResult.channelUrl);
    const metadata = matchedChannelUrl
      ? await fetchChannelMetadata(matchedChannelUrl)
      : null;

    return {
      ...fallback,
      label: metadata?.label ?? matchedResult.channelTitle ?? fallback.label,
      channelUrl:
        metadata?.channelUrl ?? matchedChannelUrl ?? undefined,
      thumbnailUrl: metadata?.thumbnailUrl,
    };
  } catch {
    return fallback;
  }
}

export async function getFeaturedChannels(
  items: string[],
): Promise<ChannelReference[]> {
  return Promise.all(items.map((item) => resolveFeaturedChannel(item)));
}
