import { CategoryGrid } from "@/components/CategoryGrid";
import { SearchForm } from "@/components/SearchForm";
import { StickyTopNav } from "@/components/StickyTopNav";
import { VideoCard } from "@/components/VideoCard";
import { getSiteConfig } from "@/lib/config";
import { filterSearchResults, isQueryAllowed } from "@/lib/filters";
import type { SearchSummary } from "@/lib/types";
import { searchYouTube } from "@/lib/youtube";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    guided?: string | string[];
  }>;
};

function readQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = readQueryValue(resolvedSearchParams.q).trim();
  const guidedSearch = readQueryValue(resolvedSearchParams.guided).trim() === "1";
  const config = await getSiteConfig();
  const allowSearching = config.simpleSettings.allowSearching;

  let results = [] as Awaited<ReturnType<typeof searchYouTube>>;
  let summary: SearchSummary = {
    hiddenCount: 0,
    visibleCount: 0,
    wasQueryBlocked: false,
  };
  let errorMessage = "";

  if (query) {
    if (!allowSearching && !guidedSearch) {
      summary = {
        hiddenCount: 0,
        visibleCount: 0,
        wasQueryBlocked: true,
        queryBlockReason:
          "Typing search is turned off. Use a topic button or a trusted channel instead.",
      };
    } else {
      const queryGate = isQueryAllowed(query, config);

      if (!queryGate.allowed) {
        summary = {
          hiddenCount: 0,
          visibleCount: 0,
          wasQueryBlocked: true,
          queryBlockReason: queryGate.reason,
        };
      } else {
        try {
          const rawResults = await searchYouTube(query);
          results = filterSearchResults(rawResults, config);
          summary = {
            hiddenCount: rawResults.length - results.length,
            visibleCount: results.length,
            wasQueryBlocked: false,
          };
        } catch {
          errorMessage =
            "YouTube search could not be loaded right now. Try again in a moment.";
        }
      }
    }
  }

  return (
    <main className="shell shell--compact">
      <StickyTopNav backHref="/" />

      <section className="page-banner card">
        <div>
          <span className="eyebrow">Search</span>
          <h1>Parent-Filtered YouTube Search</h1>
          {allowSearching ? (
            <p>
              Kids can search the usual way. This app applies the family rules
              from your config file before showing any results.
            </p>
          ) : (
            <p>
              Typing search is off. Use topic buttons and trusted channels that
              a parent has already set up.
            </p>
          )}
        </div>
        <div className="page-banner__actions">
          <SearchForm defaultValue={query} disabled={!allowSearching} />
        </div>
      </section>

      {!query ? (
        <section className="empty-card">
          <h2>Start with a topic</h2>
          <p>
            {allowSearching
              ? "Use the search box above, or try one of these suggestions."
              : "Pick a topic button or trusted channel that a parent already set up."}
          </p>
          <CategoryGrid categories={config.categories} />
        </section>
      ) : null}

      {summary.wasQueryBlocked ? (
        <section className="empty-card">
          <h2>That search is blocked</h2>
          <p>{summary.queryBlockReason}</p>
        </section>
      ) : null}

      {errorMessage ? (
        <section className="empty-card">
          <h2>Search temporarily unavailable</h2>
          <p>{errorMessage}</p>
        </section>
      ) : null}

      {query && !summary.wasQueryBlocked && !errorMessage ? (
        <section className="section">
          <div className="section__heading section__heading--inline">
            <div>
              <h2>Results for {query}</h2>
              <p>
                {summary.visibleCount} shown
                {summary.hiddenCount > 0
                  ? `, ${summary.hiddenCount} hidden by your rules`
                  : ""}
              </p>
            </div>
          </div>

          {results.length > 0 ? (
            <div className="video-grid">
              {results.map((result) => (
                <VideoCard
                  key={result.videoId}
                  data={result}
                  guided={guidedSearch}
                  query={query}
                />
              ))}
            </div>
          ) : (
            <div className="empty-card">
              <h3>No videos passed your rules</h3>
              <p>
                Try a different search, approve more channels, or change your
                filter mode in <code>safe-youtube.config.jsonc</code>.
              </p>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
