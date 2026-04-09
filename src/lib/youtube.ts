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

export async function searchYouTube(query: string): Promise<SearchResult[]> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=en&persist_hl=1`;

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "accept-language": "en-US,en;q=0.9",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
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
