import { cache } from "react";
import fs from "node:fs/promises";
import path from "node:path";
import JSON5 from "json5";
import type { SiteConfig } from "@/lib/types";

const CONFIG_PATH = path.join(process.cwd(), "safe-youtube.config.jsonc");

const DEFAULT_CONFIG: SiteConfig = {
  siteTitle: "Safe YouTube",
  siteDescription:
    "A parent-friendly YouTube wrapper with common-sense controls for kids.",
  welcomeMessage:
    "Set safer search rules, approve good channels, and make video hopping less rewarding.",
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

function sanitizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value !== "boolean") {
    return fallback;
  }

  return value;
}

function sanitizePositiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : fallback;
}

function normalizeConfig(raw: unknown): SiteConfig {
  const source = raw && typeof raw === "object" ? raw : {};
  const config = source as Partial<SiteConfig> & {
    videoSwitchingControl?: Partial<SiteConfig["videoSwitchingControl"]>;
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
    videoSwitchingControl: {
      enabled: sanitizeBoolean(
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
