import { cache } from "react";
import fs from "node:fs/promises";
import path from "node:path";
import JSON5 from "json5";
import type { SiteConfig } from "@/lib/types";

const CONFIG_PATH = path.join(process.cwd(), "safe-youtube.config.jsonc");

const DEFAULT_CONFIG: SiteConfig = {
  siteTitle: "Youtube - Safe",
  siteDescription:
    "A parent-friendly YouTube wrapper with common-sense controls for kids.",
  topNote: "",
  welcomeMessage:
    "Set safer search rules, approve good channels, and make video hopping less rewarding.",
  simpleSettings: {
    allowSearching: true,
    allowOnlyApprovedChannels: false,
    allowOnlyApprovedVideos: false,
    slowDownFastSwitching: false,
  },
  categories: [
    {
      label: "🐘 Animals",
      searchFor: "animal facts for kids",
    },
    {
      label: "🚀 Space",
      searchFor: "space documentary for kids",
    },
    {
      label: "🎨 Drawing",
      searchFor: "drawing tutorial for beginners",
    },
    {
      label: "🧱 Lego",
      searchFor: "lego building ideas",
    },
  ],
  mode: "blocklist",
  quickSearches: [
    "animal facts for kids",
    "space documentary for kids",
    "drawing tutorial for beginners",
    "lego building ideas",
  ],
  featuredVideos: [],
  featuredChannels: [],
  watchSuggestions: [],
  blockedWords: ["horror", "gore", "violence", "prank"],
  blockedChannels: [],
  blockedVideos: [],
  allowedSearchTerms: [],
  allowedChannels: [],
  allowedVideos: [],
  watchExperience: {
    blockUnexpectedVideoChanges: true,
    revealSuggestionsAfterSeconds: 5,
    autoPlayNextSuggestion: true,
    autoPlayNextSuggestionSeconds: 10,
  },
  videoSwitchingControl: {
    enabled: false,
    mode: "cooldown",
    maxSwitchesInWindow: 4,
    windowSeconds: 180,
    cooldownSeconds: 15,
    title: "Pause before the next video",
    message:
      "Fast switching can make YouTube harder to stop. Take a short pause before opening another video.",
    buttonText: "Continue to the video",
  },
  theme: {
    accentColor: "#ff0033",
    accentTint: "#2b1217",
  },
};

function sanitizeText(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function sanitizeTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function sanitizeCategories(
  value: unknown,
): Array<{ label: string; searchFor: string }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const category = item as {
        label?: unknown;
        searchFor?: unknown;
        query?: unknown;
      };
      const label = sanitizeText(category.label, "");
      const searchFor = sanitizeText(
        category.searchFor ?? category.query,
        "",
      );

      if (!label || !searchFor) {
        return null;
      }

      return { label, searchFor };
    })
    .filter(
      (item): item is { label: string; searchFor: string } => item !== null,
    );
}

function sanitizeColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : fallback;
}

function sanitizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value !== "boolean") {
    return fallback;
  }

  return value;
}

function sanitizeOptionalFlag(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }
  }

  return undefined;
}

function sanitizePositiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : fallback;
}

function sanitizeNonNegativeInteger(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.floor(value);
  return normalized >= 0 ? normalized : fallback;
}

function normalizeConfig(raw: unknown): SiteConfig {
  const source = raw && typeof raw === "object" ? raw : {};
  const config = source as Partial<SiteConfig> & {
    simpleSettings?: {
      allowSearching?: unknown;
      allowOnlyApprovedChannels?: unknown;
      allowOnlyApprovedVideos?: unknown;
      slowDownFastSwitching?: unknown;
    };
    watchExperience?: Partial<SiteConfig["watchExperience"]>;
    videoSwitchingControl?: Partial<SiteConfig["videoSwitchingControl"]>;
    theme?: Partial<SiteConfig["theme"]>;
  };

  const allowSearchingOverride = sanitizeOptionalFlag(
    config.simpleSettings?.allowSearching,
  );
  const allowOnlyApprovedChannelsOverride = sanitizeOptionalFlag(
    config.simpleSettings?.allowOnlyApprovedChannels,
  );
  const allowOnlyApprovedVideosOverride = sanitizeOptionalFlag(
    config.simpleSettings?.allowOnlyApprovedVideos,
  );
  const slowDownFastSwitchingOverride = sanitizeOptionalFlag(
    config.simpleSettings?.slowDownFastSwitching,
  );
  const simpleSettings = {
    allowSearching:
      allowSearchingOverride ?? DEFAULT_CONFIG.simpleSettings.allowSearching,
    allowOnlyApprovedChannels:
      allowOnlyApprovedChannelsOverride ??
      DEFAULT_CONFIG.simpleSettings.allowOnlyApprovedChannels,
    allowOnlyApprovedVideos:
      allowOnlyApprovedVideosOverride ??
      DEFAULT_CONFIG.simpleSettings.allowOnlyApprovedVideos,
    slowDownFastSwitching:
      slowDownFastSwitchingOverride ??
      config.videoSwitchingControl?.enabled ??
      DEFAULT_CONFIG.simpleSettings.slowDownFastSwitching,
  };
  const shouldUseSimpleAllowlist =
    allowOnlyApprovedChannelsOverride === true ||
    allowOnlyApprovedVideosOverride === true;
  const mode = shouldUseSimpleAllowlist
    ? "allowlist"
    : config.mode === "allowlist"
      ? "allowlist"
      : "blocklist";
  const quickSearches = sanitizeTextArray(config.quickSearches);
  const hasCategories = Array.isArray(config.categories);
  const categories = hasCategories
    ? sanitizeCategories(config.categories)
    : quickSearches.length > 0
      ? quickSearches.map((term) => ({
          label: term,
          searchFor: term,
        }))
      : DEFAULT_CONFIG.categories;
  const rawAllowedSearchTerms = sanitizeTextArray(config.allowedSearchTerms);
  const rawAllowedChannels = sanitizeTextArray(config.allowedChannels);
  const rawAllowedVideos = sanitizeTextArray(config.allowedVideos);
  const allowedSearchTerms = shouldUseSimpleAllowlist ? [] : rawAllowedSearchTerms;
  const allowedChannels =
    allowOnlyApprovedChannelsOverride === true
      ? rawAllowedChannels
      : shouldUseSimpleAllowlist
        ? []
        : rawAllowedChannels;
  const allowedVideos =
    allowOnlyApprovedVideosOverride === true
      ? rawAllowedVideos
      : shouldUseSimpleAllowlist
        ? []
        : rawAllowedVideos;

  return {
    siteTitle: sanitizeText(config.siteTitle, DEFAULT_CONFIG.siteTitle),
    siteDescription: sanitizeText(
      config.siteDescription,
      DEFAULT_CONFIG.siteDescription,
    ),
    topNote: sanitizeText(config.topNote, DEFAULT_CONFIG.topNote),
    welcomeMessage: sanitizeText(
      config.welcomeMessage,
      DEFAULT_CONFIG.welcomeMessage,
    ),
    simpleSettings,
    categories,
    mode,
    quickSearches,
    featuredVideos: sanitizeTextArray(config.featuredVideos),
    featuredChannels: sanitizeTextArray(config.featuredChannels),
    watchSuggestions: sanitizeTextArray(config.watchSuggestions),
    blockedWords: sanitizeTextArray(config.blockedWords),
    blockedChannels: sanitizeTextArray(config.blockedChannels),
    blockedVideos: sanitizeTextArray(config.blockedVideos),
    allowedSearchTerms,
    allowedChannels,
    allowedVideos,
    watchExperience: {
      blockUnexpectedVideoChanges: sanitizeBoolean(
        config.watchExperience?.blockUnexpectedVideoChanges,
        DEFAULT_CONFIG.watchExperience.blockUnexpectedVideoChanges,
      ),
      revealSuggestionsAfterSeconds: sanitizeNonNegativeInteger(
        config.watchExperience?.revealSuggestionsAfterSeconds,
        DEFAULT_CONFIG.watchExperience.revealSuggestionsAfterSeconds,
      ),
      autoPlayNextSuggestion: sanitizeBoolean(
        config.watchExperience?.autoPlayNextSuggestion,
        DEFAULT_CONFIG.watchExperience.autoPlayNextSuggestion,
      ),
      autoPlayNextSuggestionSeconds: sanitizePositiveInteger(
        config.watchExperience?.autoPlayNextSuggestionSeconds,
        DEFAULT_CONFIG.watchExperience.autoPlayNextSuggestionSeconds,
      ),
    },
    videoSwitchingControl: {
      enabled:
        slowDownFastSwitchingOverride ??
        sanitizeBoolean(
          config.videoSwitchingControl?.enabled,
          DEFAULT_CONFIG.videoSwitchingControl.enabled,
        ),
      mode:
        config.videoSwitchingControl?.mode === "confirm"
          ? "confirm"
          : DEFAULT_CONFIG.videoSwitchingControl.mode,
      maxSwitchesInWindow: sanitizePositiveInteger(
        config.videoSwitchingControl?.maxSwitchesInWindow,
        DEFAULT_CONFIG.videoSwitchingControl.maxSwitchesInWindow,
      ),
      windowSeconds: sanitizePositiveInteger(
        config.videoSwitchingControl?.windowSeconds,
        DEFAULT_CONFIG.videoSwitchingControl.windowSeconds,
      ),
      cooldownSeconds: sanitizePositiveInteger(
        config.videoSwitchingControl?.cooldownSeconds,
        DEFAULT_CONFIG.videoSwitchingControl.cooldownSeconds,
      ),
      title: sanitizeText(
        config.videoSwitchingControl?.title,
        DEFAULT_CONFIG.videoSwitchingControl.title,
      ),
      message: sanitizeText(
        config.videoSwitchingControl?.message,
        DEFAULT_CONFIG.videoSwitchingControl.message,
      ),
      buttonText: sanitizeText(
        config.videoSwitchingControl?.buttonText,
        DEFAULT_CONFIG.videoSwitchingControl.buttonText,
      ),
    },
    theme: {
      accentColor: sanitizeColor(
        config.theme?.accentColor,
        DEFAULT_CONFIG.theme.accentColor,
      ),
      accentTint: sanitizeColor(
        config.theme?.accentTint,
        DEFAULT_CONFIG.theme.accentTint,
      ),
    },
  };
}

export const getSiteConfig = cache(async (): Promise<SiteConfig> => {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    const parsed = JSON5.parse(raw);
    return normalizeConfig(parsed);
  } catch {
    return DEFAULT_CONFIG;
  }
});
