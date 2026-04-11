"use client";

import type { CSSProperties } from "react";
import { useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryGrid } from "@/components/CategoryGrid";
import { HomeButton } from "@/components/HomeButton";
import { VideoCard } from "@/components/VideoCard";
import type {
  FeaturedVideo,
  SearchCategory,
  VideoSwitchingControl,
  WatchExperience,
} from "@/lib/types";

const STORAGE_KEY = "safe-youtube-video-switching";

let youtubeIframeApiPromise: Promise<YouTubeIframeNamespace> | null = null;

interface WatchPlayerProps {
  videoId: string;
  title: string;
  control: VideoSwitchingControl;
  watchExperience: WatchExperience;
  suggestions: FeaturedVideo[];
  categories: SearchCategory[];
}

interface StoredState {
  lastSeenAt: number;
  lastVideoId: string | null;
  switchTimestamps: number[];
}

interface YouTubePlayerStateEvent {
  data: number;
  target: YouTubePlayerInstance;
}

interface YouTubePlayerReadyEvent {
  target: YouTubePlayerInstance;
}

interface YouTubePlayerInstance {
  destroy(): void;
  getCurrentTime(): number;
  playVideo(): void;
  getVideoUrl(): string;
  stopVideo(): void;
}

interface YouTubeIframeNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      width?: string;
      height?: string;
      videoId: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: (event: YouTubePlayerReadyEvent) => void;
        onStateChange?: (event: YouTubePlayerStateEvent) => void;
      };
    },
  ) => YouTubePlayerInstance;
  PlayerState: {
    ENDED: number;
    PLAYING: number;
  };
}

declare global {
  interface Window {
    YT?: YouTubeIframeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

type GuardState =
  | {
      status: "checking";
      secondsLeft: 0;
      canContinue: false;
    }
  | {
      status: "locked";
      secondsLeft: number;
      canContinue: boolean;
    }
  | {
      status: "ready";
      secondsLeft: 0;
      canContinue: false;
    };

type GuardAction =
  | {
      type: "checking";
    }
  | {
      type: "locked";
      secondsLeft: number;
      canContinue: boolean;
    }
  | {
      type: "ready";
    };

type WatchOverlayMode = "blocked-change" | "ended" | null;

function createInitialGuardState(enabled: boolean): GuardState {
  if (enabled) {
    return {
      status: "checking",
      secondsLeft: 0,
      canContinue: false,
    };
  }

  return {
    status: "ready",
    secondsLeft: 0,
    canContinue: false,
  };
}

function guardReducer(_state: GuardState, action: GuardAction): GuardState {
  switch (action.type) {
    case "checking":
      return {
        status: "checking",
        secondsLeft: 0,
        canContinue: false,
      };
    case "locked":
      return {
        status: "locked",
        secondsLeft: action.secondsLeft,
        canContinue: action.canContinue,
      };
    case "ready":
      return {
        status: "ready",
        secondsLeft: 0,
        canContinue: false,
      };
    default:
      return _state;
  }
}

function readStoredState(): StoredState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {
        lastSeenAt: 0,
        lastVideoId: null,
        switchTimestamps: [],
      };
    }

    const parsed = JSON.parse(raw) as Partial<StoredState>;

    return {
      lastSeenAt:
        typeof parsed.lastSeenAt === "number" && Number.isFinite(parsed.lastSeenAt)
          ? parsed.lastSeenAt
          : 0,
      lastVideoId: typeof parsed.lastVideoId === "string" ? parsed.lastVideoId : null,
      switchTimestamps: Array.isArray(parsed.switchTimestamps)
        ? parsed.switchTimestamps.filter(
            (item): item is number =>
              typeof item === "number" && Number.isFinite(item),
          )
        : [],
    };
  } catch {
    return {
      lastSeenAt: 0,
      lastVideoId: null,
      switchTimestamps: [],
    };
  }
}

function writeStoredState(state: StoredState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore localStorage write failures and let the video continue.
  }
}

function extractVideoIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const queryValue = parsed.searchParams.get("v");

    if (queryValue && /^[a-zA-Z0-9_-]{11}$/.test(queryValue)) {
      return queryValue;
    }

    const pathMatch = parsed.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    return pathMatch?.[1] ?? null;
  } catch {
    return null;
  }
}

function centerElementInViewport(element: HTMLElement) {
  const stickyNav = document.querySelector<HTMLElement>(".sticky-nav");
  const stickyNavBottom = stickyNav?.getBoundingClientRect().bottom ?? 0;
  const viewportHeight = window.innerHeight;
  const topInset = Math.max(stickyNavBottom, 0) + 16;
  const availableHeight = Math.max(viewportHeight - topInset - 16, 0);
  const rect = element.getBoundingClientRect();
  const centeredOffset = topInset + Math.max((availableHeight - rect.height) / 2, 0);
  const maxScrollTop = Math.max(
    document.documentElement.scrollHeight - viewportHeight,
    0,
  );
  const targetTop = Math.max(
    0,
    Math.min(window.scrollY + rect.top - centeredOffset, maxScrollTop),
  );

  window.scrollTo({
    top: targetTop,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
}

function ensureIframeAllowsAutoplay(host: HTMLDivElement | null) {
  const iframe = host?.querySelector("iframe");

  if (!iframe) {
    return;
  }

  const existingAllow = iframe.getAttribute("allow") ?? "";

  if (existingAllow.toLowerCase().includes("autoplay")) {
    return;
  }

  iframe.setAttribute(
    "allow",
    existingAllow ? `${existingAllow}; autoplay` : "autoplay",
  );
}

function loadYouTubeIframeApi(): Promise<YouTubeIframeNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("The YouTube API can only load in the browser."));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (youtubeIframeApiPromise) {
    return youtubeIframeApiPromise;
  }

  youtubeIframeApiPromise = new Promise((resolve, reject) => {
    const previousHandler = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousHandler?.();

      if (window.YT?.Player) {
        resolve(window.YT);
        return;
      }

      reject(new Error("The YouTube player API loaded without a Player object."));
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-safe-youtube-iframe-api="true"]',
    );

    if (existingScript) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.dataset.safeYoutubeIframeApi = "true";
    script.onerror = () => {
      reject(new Error("The YouTube player API failed to load."));
    };

    document.head.appendChild(script);
  });

  return youtubeIframeApiPromise;
}

export function WatchPlayer({
  videoId,
  title,
  control,
  watchExperience,
  suggestions,
  categories,
}: WatchPlayerProps) {
  const router = useRouter();
  const playerCardRef = useRef<HTMLElement | null>(null);
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const blockedVideoChangeRef = useRef(false);
  const initiallyVisibleSuggestions =
    watchExperience.revealSuggestionsAfterSeconds <= 0;
  const revealHandledRef = useRef(initiallyVisibleSuggestions);
  const navigationTriggeredRef = useRef(false);
  const [guardState, dispatch] = useReducer(
    guardReducer,
    control.enabled,
    createInitialGuardState,
  );
  const [overlayMode, setOverlayMode] = useState<WatchOverlayMode>(null);
  const [suggestionsVisible, setSuggestionsVisible] = useState(
    initiallyVisibleSuggestions,
  );
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(
    null,
  );
  const [autoPlayCancelled, setAutoPlayCancelled] = useState(false);
  const [playerLoadError, setPlayerLoadError] = useState("");

  const nextSuggestion = suggestions[0] ?? null;
  const shouldShowChoices =
    suggestionsVisible || overlayMode !== null || playerLoadError !== "";
  const hasActiveCountdown =
    overlayMode === "ended" && nextSuggestion && countdownRemaining !== null;
  const countdownProgress =
    watchExperience.autoPlayNextSuggestionSeconds > 0 &&
    countdownRemaining !== null
      ? ((watchExperience.autoPlayNextSuggestionSeconds - countdownRemaining) /
          watchExperience.autoPlayNextSuggestionSeconds) *
        100
      : 0;
  const countdownStyle = {
    "--countdown-progress": `${Math.max(0, Math.min(100, countdownProgress))}%`,
  } as CSSProperties;

  useEffect(() => {
    const playerCard = playerCardRef.current;

    if (!playerCard) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      centerElementInViewport(playerCard);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [videoId]);

  useEffect(() => {
    if (!control.enabled) {
      dispatch({ type: "ready" });
      return;
    }

    dispatch({ type: "checking" });

    const now = Date.now();
    const windowMs = control.windowSeconds * 1000;
    const storedState = readStoredState();
    const isRecentSession = now - storedState.lastSeenAt <= windowMs;
    const previousVideoId = isRecentSession ? storedState.lastVideoId : null;
    const prunedSwitches = storedState.switchTimestamps.filter(
      (timestamp) => now - timestamp <= windowMs,
    );

    const nextSwitches =
      previousVideoId && previousVideoId !== videoId
        ? [...prunedSwitches, now]
        : prunedSwitches;

    writeStoredState({
      lastSeenAt: now,
      lastVideoId: videoId,
      switchTimestamps: nextSwitches,
    });

    if (nextSwitches.length <= control.maxSwitchesInWindow) {
      dispatch({ type: "ready" });
      return;
    }

    const endsAt = now + control.cooldownSeconds * 1000;

    dispatch({
      type: "locked",
      secondsLeft: control.cooldownSeconds,
      canContinue: false,
    });

    const intervalId = window.setInterval(() => {
      const secondsLeft = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));

      if (secondsLeft === 0) {
        window.clearInterval(intervalId);

        if (control.mode === "cooldown") {
          dispatch({ type: "ready" });
          return;
        }

        dispatch({
          type: "locked",
          secondsLeft: 0,
          canContinue: true,
        });
        return;
      }

      dispatch({
        type: "locked",
        secondsLeft,
        canContinue: false,
      });
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    control.cooldownSeconds,
    control.enabled,
    control.maxSwitchesInWindow,
    control.mode,
    control.windowSeconds,
    videoId,
  ]);

  useEffect(() => {
    if (guardState.status !== "ready") {
      return;
    }

    let cancelled = false;
    let monitorId: number | undefined;

    void loadYouTubeIframeApi()
      .then((youtubeApi) => {
        if (cancelled || !playerHostRef.current) {
          return;
        }

        playerRef.current?.destroy();
        playerHostRef.current.innerHTML = "";

        const player = new youtubeApi.Player(playerHostRef.current, {
          width: "100%",
          height: "100%",
          videoId,
          playerVars: {
            autoplay: 1,
            enablejsapi: 1,
            iv_load_policy: 3,
            origin: window.location.origin,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: (event) => {
              ensureIframeAllowsAutoplay(playerHostRef.current);

              try {
                event.target.playVideo();
              } catch {
                // Ignore autoplay failures caused by browser media policies.
              }
            },
            onStateChange: (event) => {
              const currentVideoId = extractVideoIdFromUrl(
                event.target.getVideoUrl(),
              );

              if (
                watchExperience.blockUnexpectedVideoChanges &&
                currentVideoId &&
                currentVideoId !== videoId &&
                !blockedVideoChangeRef.current
              ) {
                blockedVideoChangeRef.current = true;
                event.target.stopVideo();
                setCountdownRemaining(null);
                setAutoPlayCancelled(true);
                setOverlayMode("blocked-change");
                return;
              }

              if (event.data === youtubeApi.PlayerState.PLAYING) {
                setCountdownRemaining(null);
                setAutoPlayCancelled(false);
                setOverlayMode(null);
              }

              if (event.data === youtubeApi.PlayerState.ENDED) {
                setOverlayMode("ended");

                if (
                  watchExperience.autoPlayNextSuggestion &&
                  nextSuggestion &&
                  watchExperience.autoPlayNextSuggestionSeconds > 0
                ) {
                  setAutoPlayCancelled(false);
                  setCountdownRemaining(
                    watchExperience.autoPlayNextSuggestionSeconds,
                  );
                }
              }
            },
          },
        });

        playerRef.current = player;

        monitorId = window.setInterval(() => {
          const activePlayer = playerRef.current;

          if (!activePlayer) {
            return;
          }

          const currentVideoId = extractVideoIdFromUrl(activePlayer.getVideoUrl());

          if (
            watchExperience.blockUnexpectedVideoChanges &&
            currentVideoId &&
            currentVideoId !== videoId &&
            !blockedVideoChangeRef.current
          ) {
            blockedVideoChangeRef.current = true;
            activePlayer.stopVideo();
            setCountdownRemaining(null);
            setAutoPlayCancelled(true);
            setOverlayMode("blocked-change");
            return;
          }

          if (
            !revealHandledRef.current &&
            activePlayer.getCurrentTime() >=
              watchExperience.revealSuggestionsAfterSeconds
          ) {
            revealHandledRef.current = true;
            setSuggestionsVisible(true);
          }
        }, 500);
      })
      .catch(() => {
        if (!cancelled) {
          setPlayerLoadError(
            "The YouTube player could not load right now. Try refreshing the page.",
          );
          setSuggestionsVisible(true);
        }
      });

    return () => {
      cancelled = true;

      if (monitorId) {
        window.clearInterval(monitorId);
      }

      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [
    guardState.status,
    nextSuggestion,
    videoId,
    watchExperience.autoPlayNextSuggestion,
    watchExperience.autoPlayNextSuggestionSeconds,
    watchExperience.blockUnexpectedVideoChanges,
    watchExperience.revealSuggestionsAfterSeconds,
  ]);

  useEffect(() => {
    if (
      overlayMode !== "ended" ||
      !nextSuggestion ||
      !watchExperience.autoPlayNextSuggestion ||
      autoPlayCancelled ||
      countdownRemaining === null
    ) {
      return;
    }

    if (countdownRemaining === 0) {
      if (!navigationTriggeredRef.current) {
        navigationTriggeredRef.current = true;
        router.push(`/watch/${nextSuggestion.videoId}`);
      }

      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCountdownRemaining((current) => {
        if (current === null) {
          return current;
        }

        return Math.max(0, current - 1);
      });
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    autoPlayCancelled,
    countdownRemaining,
    nextSuggestion,
    overlayMode,
    router,
    watchExperience.autoPlayNextSuggestion,
  ]);

  function playNextSuggestionNow() {
    if (!nextSuggestion || navigationTriggeredRef.current) {
      return;
    }

    navigationTriggeredRef.current = true;
    router.push(`/watch/${nextSuggestion.videoId}`);
  }

  return (
    <>
      <section className="player-card" ref={playerCardRef}>
        <div className="player-frame player-frame--managed">
          {guardState.status === "ready" ? (
            <div className="player-host" ref={playerHostRef} title={title} />
          ) : (
            <div className="switch-guard" role="status" aria-live="polite">
              <span className="switch-guard__badge">Parent setting active</span>
              <h2>{control.title}</h2>
              <p>{control.message}</p>
              {guardState.status === "locked" ? (
                <p className="switch-guard__timer">
                  {guardState.secondsLeft > 0
                    ? `${guardState.secondsLeft}s remaining`
                    : "Ready when you are"}
                </p>
              ) : null}
              {guardState.status === "locked" && guardState.canContinue ? (
                <button
                  className="switch-guard__button"
                  onClick={() => dispatch({ type: "ready" })}
                  type="button"
                >
                  {control.buttonText}
                </button>
              ) : null}
            </div>
          )}

          {overlayMode ? (
            <div className="player-overlay">
              <span className="switch-guard__badge">Safe YouTube</span>
              <h2>
                {overlayMode === "ended"
                  ? "Pick another topic"
                  : "That video is not allowed here"}
              </h2>
              <p>
                {overlayMode === "ended"
                  ? "This video finished. Choose a safe next step instead of using YouTube's own end screen."
                  : "Safe YouTube stopped the player because it switched to a different video."}
              </p>

              {overlayMode === "ended" && nextSuggestion ? (
                <div className="player-overlay__countdown">
                  {hasActiveCountdown ? (
                    <div className="countdown-pie" style={countdownStyle}>
                      <span>{countdownRemaining ?? 0}</span>
                    </div>
                  ) : (
                    <div className="countdown-pie countdown-pie--idle">
                      <span>GO</span>
                    </div>
                  )}

                  <div className="player-overlay__next">
                    <strong>Next up</strong>
                    <span>{nextSuggestion.title}</span>
                    <div className="player-overlay__buttons">
                      {hasActiveCountdown ? (
                        <button
                          className="checker-secondary-button"
                          onClick={() => {
                            setAutoPlayCancelled(true);
                            setCountdownRemaining(null);
                          }}
                          type="button"
                        >
                          Stop countdown
                        </button>
                      ) : null}
                      <button
                        className="switch-guard__button"
                        onClick={playNextSuggestionNow}
                        type="button"
                      >
                        Play now
                      </button>
                      <HomeButton />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="player-overlay__buttons">
                  <HomeButton />
                </div>
              )}
            </div>
          ) : null}

          {playerLoadError ? (
            <div className="player-overlay">
              <span className="switch-guard__badge">Player issue</span>
              <h2>Try again in a moment</h2>
              <p>{playerLoadError}</p>
              <div className="player-overlay__buttons">
                <HomeButton />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {shouldShowChoices ? (
        <section className="watch-followups">
          {suggestions.length > 0 ? (
            <div className="section">
              <div className="section__heading">
                <h2>Good Next Videos</h2>
                <p>These are parent-approved choices.</p>
              </div>

              <div className="video-grid">
                {suggestions.map((video) => (
                  <VideoCard key={video.videoId} data={video} />
                ))}
              </div>
            </div>
          ) : null}

          {categories.length > 0 ? (
            <div className="section">
              <div className="section__heading">
                <h2>Pick Another Topic</h2>
                <p>Tap a topic to go back to safer search.</p>
              </div>

              <CategoryGrid categories={categories} />
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
