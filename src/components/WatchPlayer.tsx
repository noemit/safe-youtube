"use client";

import { useEffect, useReducer } from "react";
import type { VideoSwitchingControl } from "@/lib/types";

const STORAGE_KEY = "safe-youtube-video-switching";

interface WatchPlayerProps {
  videoId: string;
  title: string;
  control: VideoSwitchingControl;
}

interface StoredState {
  lastSeenAt: number;
  lastVideoId: string | null;
  switchTimestamps: number[];
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

export function WatchPlayer({ videoId, title, control }: WatchPlayerProps) {
  const [guardState, dispatch] = useReducer(
    guardReducer,
    control.enabled,
    createInitialGuardState,
  );

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
    control.buttonText,
    control.cooldownSeconds,
    control.enabled,
    control.maxSwitchesInWindow,
    control.message,
    control.mode,
    control.title,
    control.windowSeconds,
    videoId,
  ]);

  const isReady = guardState.status === "ready";
  const embedSrc = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1&iv_load_policy=3`;

  return (
    <div className="player-frame player-frame--guarded">
      {isReady ? (
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          src={embedSrc}
          title={title}
        />
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
    </div>
  );
}
