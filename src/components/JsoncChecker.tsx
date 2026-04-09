"use client";

import { useState } from "react";
import JSON5 from "json5";

interface ParsedJsoncError {
  message: string;
  line?: number;
  column?: number;
  lineText?: string;
  hints: string[];
}

function getErrorHints(message: string): string[] {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("invalid character") &&
    (normalizedMessage.includes("}") || normalizedMessage.includes("]"))
  ) {
    return [
      "Look at the line above the error. A value may be missing after a colon.",
      "Check for an extra comma or an unfinished list item.",
    ];
  }

  if (normalizedMessage.includes("invalid character ','")) {
    return [
      "There may be two commas in a row, or a comma where a value should be.",
      "Check the item just before the line and the item on the line itself.",
    ];
  }

  if (normalizedMessage.includes("invalid end of input")) {
    return [
      "A closing brace `}` or closing bracket `]` may be missing near the end.",
    ];
  }

  if (normalizedMessage.includes("invalid identifier character")) {
    return [
      "A key name may have stray punctuation or a missing quote.",
      "Check the characters around the reported line and column.",
    ];
  }

  return [
    "Check the reported line first.",
    "Look for missing commas, missing quotes, or unfinished braces nearby.",
  ];
}

function parseErrorDetails(input: string, error: unknown): ParsedJsoncError {
  const fallbackMessage =
    error instanceof Error ? error.message : "Unknown JSONC parsing error.";
  const message = fallbackMessage.replace(/^JSON5:\s*/, "");
  const match = message.match(/at (\d+):(\d+)$/);
  const line = match ? Number.parseInt(match[1], 10) : undefined;
  const column = match ? Number.parseInt(match[2], 10) : undefined;
  const cleanedMessage = message.replace(/\s+at \d+:\d+$/, "");
  const lineText =
    line && line > 0 ? input.split("\n")[line - 1]?.replace(/\t/g, "  ") : undefined;

  return {
    message: cleanedMessage,
    line,
    column,
    lineText,
    hints: getErrorHints(cleanedMessage),
  };
}

function isSimpleFlag(value: unknown): boolean {
  if (typeof value === "boolean") {
    return true;
  }

  if (typeof value === "number") {
    return value === 0 || value === 1;
  }

  if (typeof value === "string") {
    return ["0", "1", "false", "true", "no", "yes", "off", "on"].includes(
      value.trim().toLowerCase(),
    );
  }

  return false;
}

function readSimpleFlag(value: unknown): boolean | undefined {
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

function getConfigWarnings(parsed: unknown): string[] {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return [
      "The top level should be one object wrapped in `{` and `}`.",
    ];
  }

  const config = parsed as {
    simpleSettings?: unknown;
    mode?: unknown;
    categories?: unknown;
    featuredVideos?: unknown;
    featuredChannels?: unknown;
    watchSuggestions?: unknown;
    blockedWords?: unknown;
    allowedChannels?: unknown;
    allowedVideos?: unknown;
    watchExperience?: unknown;
    videoSwitchingControl?: unknown;
  };
  const warnings: string[] = [];

  if (
    config.simpleSettings !== undefined &&
    (!config.simpleSettings ||
      typeof config.simpleSettings !== "object" ||
      Array.isArray(config.simpleSettings))
  ) {
    warnings.push("`simpleSettings` should be one object wrapped in `{` and `}`.");
  }

  if (
    config.simpleSettings &&
    typeof config.simpleSettings === "object" &&
    !Array.isArray(config.simpleSettings)
  ) {
    const simpleSettings = config.simpleSettings as {
      allowSearching?: unknown;
      allowOnlyApprovedChannels?: unknown;
      allowOnlyApprovedVideos?: unknown;
      slowDownFastSwitching?: unknown;
    };

    for (const key of [
      "allowSearching",
      "allowOnlyApprovedChannels",
      "allowOnlyApprovedVideos",
      "slowDownFastSwitching",
    ] as const) {
      const value = simpleSettings[key];

      if (value !== undefined && !isSimpleFlag(value)) {
        warnings.push(
          `\`simpleSettings.${key}\` should be \`1\` or \`0\` (or \`true\` / \`false\`).`,
        );
      }
    }

    if (
      readSimpleFlag(simpleSettings.allowOnlyApprovedChannels) === true &&
      (!Array.isArray(config.allowedChannels) || config.allowedChannels.length === 0)
    ) {
      warnings.push(
        "Approved channels only is turned on, but `allowedChannels` is empty.",
      );
    }

    if (
      readSimpleFlag(simpleSettings.allowOnlyApprovedVideos) === true &&
      (!Array.isArray(config.allowedVideos) || config.allowedVideos.length === 0)
    ) {
      warnings.push(
        "Approved videos only is turned on, but `allowedVideos` is empty.",
      );
    }
  }

  if (config.mode && config.mode !== "blocklist" && config.mode !== "allowlist") {
    warnings.push('`mode` should usually be `"blocklist"` or `"allowlist"`.');
  }

  if (config.categories && !Array.isArray(config.categories)) {
    warnings.push(
      "`categories` should be a list of `{ label, searchFor }` items.",
    );
  }

  if (Array.isArray(config.categories)) {
    const hasBrokenCategory = config.categories.some((item) => {
      if (!item || typeof item !== "object") {
        return true;
      }

      const category = item as {
        label?: unknown;
        searchFor?: unknown;
        query?: unknown;
      };

      return (
        typeof category.label !== "string" ||
        (typeof category.searchFor !== "string" &&
          typeof category.query !== "string")
      );
    });

    if (hasBrokenCategory) {
      warnings.push(
        "Each `categories` item should look like `{ \"label\": \"Animals\", \"searchFor\": \"animal facts for kids\" }`.",
      );
    }
  }

  for (const listKey of [
    "featuredVideos",
    "featuredChannels",
    "watchSuggestions",
    "blockedWords",
    "allowedChannels",
    "allowedVideos",
  ] as const) {
    const value = config[listKey];

    if (value !== undefined && !Array.isArray(value)) {
      warnings.push(`\`${listKey}\` should be a list in square brackets.`);
    }
  }

  if (
    config.watchExperience !== undefined &&
    (!config.watchExperience ||
      typeof config.watchExperience !== "object" ||
      Array.isArray(config.watchExperience))
  ) {
    warnings.push("`watchExperience` should be one object wrapped in `{` and `}`.");
  }

  if (
    config.videoSwitchingControl !== undefined &&
    (!config.videoSwitchingControl ||
      typeof config.videoSwitchingControl !== "object" ||
      Array.isArray(config.videoSwitchingControl))
  ) {
    warnings.push("`videoSwitchingControl` should be one object wrapped in `{` and `}`.");
  }

  return warnings;
}

const EXAMPLE_TEXT = `{
  // Paste your Safe YouTube config here.
  "siteTitle": "Maya's Safe YouTube",
  "simpleSettings": {
    "allowSearching": 1,
    "allowOnlyApprovedChannels": 0,
    "allowOnlyApprovedVideos": 0,
    "slowDownFastSwitching": 1
  },
  "categories": [
    { "label": "🐘 Animals", "searchFor": "animals for kids" },
    { "label": "🎨 Drawing", "searchFor": "drawing for kids" }
  ],
  "watchSuggestions": [
    "https://www.youtube.com/watch?v=VIDEO_ID_1"
  ],
  "mode": "blocklist",
  "blockedWords": ["horror", "violence", "prank"],
  "watchExperience": {
    "blockUnexpectedVideoChanges": true,
    "revealSuggestionsAfterSeconds": 5,
    "autoPlayNextSuggestion": true,
    "autoPlayNextSuggestionSeconds": 10
  }
}`;

export function JsoncChecker() {
  const [input, setInput] = useState("");
  const [error, setError] = useState<ParsedJsoncError | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [cleanedOutput, setCleanedOutput] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [copyStatus, setCopyStatus] = useState("Copy Clean Version");
  const lineCount = input.split("\n").length;

  function runCheck() {
    setCopyStatus("Copy Clean Version");

    try {
      const parsed = JSON5.parse(input);
      const nextWarnings = getConfigWarnings(parsed);

      setError(null);
      setWarnings(nextWarnings);
      setCleanedOutput(`${JSON.stringify(parsed, null, 2)}\n`);
      setIsValid(true);
    } catch (nextError) {
      setError(parseErrorDetails(input, nextError));
      setWarnings([]);
      setCleanedOutput("");
      setIsValid(false);
    }
  }

  async function copyCleanVersion() {
    if (!cleanedOutput) {
      return;
    }

    try {
      await navigator.clipboard.writeText(cleanedOutput);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy Failed");
    }
  }

  function loadExample() {
    setInput(EXAMPLE_TEXT);
    setError(null);
    setWarnings([]);
    setCleanedOutput("");
    setIsValid(false);
    setCopyStatus("Copy Clean Version");
  }

  function clearAll() {
    setInput("");
    setError(null);
    setWarnings([]);
    setCleanedOutput("");
    setIsValid(false);
    setCopyStatus("Copy Clean Version");
  }

  return (
    <section className="checker-layout">
      <div className="checker-panel card">
        <div className="checker-panel__header">
          <div>
            <h2>Paste Config</h2>
            <p>
              Paste the full contents of <code>safe-youtube.config.jsonc</code>.
            </p>
          </div>

          <div className="checker-controls">
            <button className="pill" onClick={runCheck} type="button">
              Check Config
            </button>
            <button
              className="checker-secondary-button"
              onClick={loadExample}
              type="button"
            >
              Use Example
            </button>
            <button
              className="checker-secondary-button"
              onClick={clearAll}
              type="button"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="checker-textarea-wrap">
          <textarea
            className="checker-textarea"
            onChange={(event) => setInput(event.target.value)}
            placeholder={EXAMPLE_TEXT}
            spellCheck={false}
            value={input}
          />
          <span className="checker-line-count">{lineCount} lines</span>
        </div>
      </div>

      <div className="checker-panel card">
        <div className="checker-panel__header">
          <div>
            <h2>Result</h2>
            <p>
              This checks JSONC syntax and a few common Safe YouTube fields.
            </p>
          </div>
        </div>

        {!input.trim() ? (
          <div className="checker-status checker-status--neutral">
            <strong>Paste your config to begin.</strong>
            <p>
              If the syntax is valid, you will get a cleaned copy you can paste
              back into GitHub.
            </p>
          </div>
        ) : null}

        {isValid ? (
          <div className="checker-status checker-status--success">
            <strong>Looks valid.</strong>
            <p>Your JSONC syntax parsed successfully.</p>
          </div>
        ) : null}

        {error ? (
          <div className="checker-status checker-status--error">
            <strong>There is a syntax problem.</strong>
            <p>{error.message}</p>
            {error.line && error.column ? (
              <p>
                Line {error.line}, column {error.column}
              </p>
            ) : null}
            {error.lineText ? (
              <pre className="checker-code">{`${error.line}: ${error.lineText}`}</pre>
            ) : null}
            <ul className="checker-list">
              {error.hints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {warnings.length > 0 ? (
          <div className="checker-status checker-status--warning">
            <strong>Syntax is valid, but a few things look off.</strong>
            <ul className="checker-list">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {cleanedOutput ? (
          <div className="checker-clean-output">
            <div className="checker-panel__header">
              <div>
                <h2>Clean Version</h2>
                <p>
                  Comments are removed here, but this is still valid for the
                  app.
                </p>
              </div>
              <button
                className="checker-secondary-button"
                onClick={copyCleanVersion}
                type="button"
              >
                {copyStatus}
              </button>
            </div>

            <textarea
              className="checker-textarea checker-textarea--output"
              readOnly
              value={cleanedOutput}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
