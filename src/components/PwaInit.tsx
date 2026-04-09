"use client";

import { useEffect } from "react";

export function PwaInit() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Ignore registration failures. The app still works without offline caching.
    });
  }, []);

  return null;
}

