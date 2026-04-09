import { cache } from "react";
import fs from "node:fs/promises";
import path from "node:path";
import JSON5 from "json5";
import type { SiteConfig } from "@/lib/types";

const CONFIG_PATH = path.join(process.cwd(), "safe-youtube.config.jsonc");

const DEFAULT_CONFIG: SiteConfig = {
  siteTitle: "Safe YouTube",
  siteDescription:
    "A calmer YouTube wrapper for families, schools, and therapy sessions.",
  welcomeMessage:
    "Search YouTube with your own rules, or tap one of the quick topics below.",
  mode: "blocklist",
  quickSearches: [
    "animal facts for kids",
    "space documentary for kids",
    "drawing tutorial for beginners",
    "lego building ideas",
  ],
  featuredVideos: [],
  featuredChannels: [],
  blockedWords: ["horror", "gore", "violence", "prank"],
  blockedChannels: [],
  blockedVideos: [],
  allowedSearchTerms: [],
  allowedChannels: [],
  allowedVideos: [],
  theme: {
    accentColor: "#d76546",
    accentTint: "#f3d2c7",
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

function sanitizeColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : fallback;
}

function normalizeConfig(raw: unknown): SiteConfig {
  const source = raw && typeof raw === "object" ? raw : {};
  const config = source as Partial<SiteConfig> & {
    theme?: Partial<SiteConfig["theme"]>;
  };

  const mode = config.mode === "allowlist" ? "allowlist" : "blocklist";

  return {
    siteTitle: sanitizeText(config.siteTitle, DEFAULT_CONFIG.siteTitle),
    siteDescription: sanitizeText(
      config.siteDescription,
      DEFAULT_CONFIG.siteDescription,
    ),
    welcomeMessage: sanitizeText(
      config.welcomeMessage,
      DEFAULT_CONFIG.welcomeMessage,
    ),
    mode,
    quickSearches: sanitizeTextArray(config.quickSearches),
    featuredVideos: sanitizeTextArray(config.featuredVideos),
    featuredChannels: sanitizeTextArray(config.featuredChannels),
    blockedWords: sanitizeTextArray(config.blockedWords),
    blockedChannels: sanitizeTextArray(config.blockedChannels),
    blockedVideos: sanitizeTextArray(config.blockedVideos),
    allowedSearchTerms: sanitizeTextArray(config.allowedSearchTerms),
    allowedChannels: sanitizeTextArray(config.allowedChannels),
    allowedVideos: sanitizeTextArray(config.allowedVideos),
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

