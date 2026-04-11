import { StickyTopNav } from "@/components/StickyTopNav";
import { WatchPlayer } from "@/components/WatchPlayer";
import { getSiteConfig } from "@/lib/config";
import { filterSearchResults, extractVideoId } from "@/lib/filters";
import { getFeaturedVideos, getVideoPreview } from "@/lib/youtube";

type WatchPageProps = {
  params: Promise<{
    videoId: string;
  }>;
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

export default async function WatchPage({
  params,
  searchParams,
}: WatchPageProps) {
  const [{ videoId: rawVideoId }, resolvedSearchParams, config] = await Promise.all([
    params,
    searchParams,
    getSiteConfig(),
  ]);
  const videoId = extractVideoId(rawVideoId);
  const query = readQueryValue(resolvedSearchParams.q).trim();
  const guidedSearch = readQueryValue(resolvedSearchParams.guided).trim() === "1";
  const cameFromCategory =
    guidedSearch &&
    query.length > 0 &&
    config.categories.some(
      (category) => category.searchFor.trim().toLowerCase() === query.toLowerCase(),
    );
  const backHref = query
    ? `/search?q=${encodeURIComponent(query)}${guidedSearch ? "&guided=1" : ""}`
    : "/";

  if (!videoId) {
    return (
      <main className="shell shell--compact">
        <StickyTopNav backHref={backHref} showBack={cameFromCategory} />

        <section className="empty-card">
          <h1>Video not found</h1>
          <p>The video link is not valid.</p>
        </section>
      </main>
    );
  }

  const preview = await getVideoPreview(videoId);
  const suggestionSources =
    config.watchSuggestions.length > 0
      ? config.watchSuggestions
      : [...config.featuredVideos, ...config.allowedVideos];
  const suggestedVideos = (
    await getFeaturedVideos(Array.from(new Set(suggestionSources)))
  )
    .filter((item) => item.videoId !== videoId)
    .slice(0, 6);
  const canShowVideo = preview
    ? filterSearchResults([preview], config).length > 0 ||
      config.featuredVideos.some((item) => extractVideoId(item) === videoId)
    : config.allowedVideos.some((item) => extractVideoId(item) === videoId);

  if (!canShowVideo) {
    return (
      <main className="shell shell--compact">
        <StickyTopNav backHref={backHref} showBack={cameFromCategory} />

        <section className="empty-card">
          <h1>This video is blocked</h1>
          <p>
            The current rules in <code>safe-youtube.config.jsonc</code> do not
            allow this video.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="shell shell--compact">
      <StickyTopNav backHref={backHref} showBack={cameFromCategory} />

      <WatchPlayer
        categories={config.categories}
        control={config.videoSwitchingControl}
        key={videoId}
        suggestions={suggestedVideos}
        title={preview?.title ?? "YouTube video"}
        videoId={videoId}
        watchExperience={config.watchExperience}
      />
    </main>
  );
}
