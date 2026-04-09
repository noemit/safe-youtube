import { HomeButton } from "@/components/HomeButton";
import { WatchPlayer } from "@/components/WatchPlayer";
import { getSiteConfig } from "@/lib/config";
import { filterSearchResults, extractVideoId } from "@/lib/filters";
import { getVideoPreview } from "@/lib/youtube";

type WatchPageProps = {
  params: Promise<{
    videoId: string;
  }>;
};

export default async function WatchPage({
  params,
}: WatchPageProps) {
  const [{ videoId: rawVideoId }, config] = await Promise.all([
    params,
    getSiteConfig(),
  ]);
  const videoId = extractVideoId(rawVideoId);

  if (!videoId) {
    return (
      <main className="shell shell--compact">
        <section className="empty-card">
          <h1>Video not found</h1>
          <p>The video link is not valid.</p>
          <HomeButton />
        </section>
      </main>
    );
  }

  const preview = await getVideoPreview(videoId);
  const canShowVideo = preview
    ? filterSearchResults([preview], config).length > 0 ||
      config.featuredVideos.some((item) => extractVideoId(item) === videoId)
    : config.allowedVideos.some((item) => extractVideoId(item) === videoId);

  if (!canShowVideo) {
    return (
      <main className="shell shell--compact">
        <section className="empty-card">
          <h1>This video is blocked</h1>
          <p>
            The current rules in <code>safe-youtube.config.jsonc</code> do not
            allow this video.
          </p>
          <HomeButton />
        </section>
      </main>
    );
  }

  return (
    <main className="shell shell--compact">
      <section className="watch-header">
        <div>
          <span className="eyebrow">Watching</span>
          <h1>{preview?.title ?? "YouTube video"}</h1>
          <p>{preview?.channelTitle ?? "Approved content"}</p>
          {config.videoSwitchingControl.enabled ? (
            <p className="watch-note">
              Rapid-switch guard is on. If a child jumps between too many
              videos too quickly, the next video pauses for a moment.
            </p>
          ) : null}
        </div>

        <HomeButton />
      </section>

      <section className="player-card">
        <WatchPlayer
          control={config.videoSwitchingControl}
          title={preview?.title ?? "YouTube video"}
          videoId={videoId}
        />
      </section>
    </main>
  );
}
