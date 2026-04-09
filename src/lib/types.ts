export type FilterMode = "allowlist" | "blocklist";

export interface SiteTheme {
  accentColor: string;
  accentTint: string;
}

export interface SiteConfig {
  siteTitle: string;
  siteDescription: string;
  welcomeMessage: string;
  mode: FilterMode;
  quickSearches: string[];
  featuredVideos: string[];
  featuredChannels: string[];
  blockedWords: string[];
  blockedChannels: string[];
  blockedVideos: string[];
  allowedSearchTerms: string[];
  allowedChannels: string[];
  allowedVideos: string[];
  theme: SiteTheme;
}

export interface SearchResult {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  channelHandle?: string;
  channelUrl?: string;
  thumbnailUrl: string;
  lengthText?: string;
  publishedText?: string;
  viewCountText?: string;
}

export interface FeaturedVideo {
  videoId: string;
  url: string;
  title: string;
  channelTitle?: string;
  thumbnailUrl: string;
}

export interface ChannelReference {
  raw: string;
  label: string;
  searchQuery: string;
}

export interface SearchSummary {
  hiddenCount: number;
  visibleCount: number;
  wasQueryBlocked: boolean;
  queryBlockReason?: string;
}

export interface MaybePromiseProps<T> {
  params?: Promise<T> | T;
  searchParams?: Promise<T> | T;
}

