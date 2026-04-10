import { CategoryGrid } from "@/components/CategoryGrid";
import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { VideoCard } from "@/components/VideoCard";
import { getSiteConfig } from "@/lib/config";
import { getFeaturedChannels, getFeaturedVideos } from "@/lib/youtube";

export default async function HomePage() {
  const config = await getSiteConfig();
  const [featuredVideos, featuredChannels] = await Promise.all([
    getFeaturedVideos(config.featuredVideos),
    getFeaturedChannels(config.featuredChannels),
  ]);
  const allowSearching = config.simpleSettings.allowSearching;
  const modeLabel =
    config.mode === "allowlist" ? "Allowlist mode" : "Blocklist mode";

  return (
    <main className="shell">
      <section className="hero hero--full-width">
        <div className="hero__copy">
          <h1>{config.siteTitle}</h1>
          <SearchForm disabled={!allowSearching} />
          {!allowSearching ? (
            <p className="helper-text">
              Typing search is off. Kids can still use the topic buttons and
              trusted channels below.
            </p>
          ) : null}
        </div>
      </section>

      {config.categories.length > 0 ? (
        <section className="section">
          <CategoryGrid categories={config.categories} />
        </section>
      ) : null}

      <section className="section section--split">
        <div className="section__heading">
          <h2>Trusted Channels</h2>
          <p>
            Add handles or channel URLs in the config file so kids can jump to
            parent-approved channels with one tap.
          </p>
        </div>

        {featuredChannels.length > 0 ? (
          <div className="channel-grid">
            {featuredChannels.map((channel) => (
              <Link
                key={channel.raw}
                className="channel-card"
                href={`/search?q=${encodeURIComponent(channel.searchQuery)}&guided=1`}
              >
                <div className="channel-card__top">
                  {channel.thumbnailUrl ? (
                    <div className="channel-card__avatar">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt=""
                        className="channel-card__avatar-image"
                        height={68}
                        loading="lazy"
                        src={channel.thumbnailUrl}
                        width={68}
                      />
                    </div>
                  ) : (
                    <div className="channel-card__avatar channel-card__avatar--fallback">
                      {channel.label.trim().charAt(0).toUpperCase() || "C"}
                    </div>
                  )}

                  <div className="channel-card__copy">
                    <span className="channel-card__badge">Channel</span>
                    <strong>{channel.label}</strong>
                    <span>Search videos from this channel</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-card">
            <h3>No featured channels yet</h3>
            <p>
              Edit <code>safe-youtube.config.jsonc</code> and add values to{" "}
              <code>featuredChannels</code>.
            </p>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section__heading">
          <h2>Featured Videos</h2>
          <p>
            These are optional parent-picked videos. Paste full YouTube links
            into <code>featuredVideos</code>.
          </p>
        </div>

        {featuredVideos.length > 0 ? (
          <div className="video-grid">
            {featuredVideos.map((video) => (
              <VideoCard key={video.videoId} data={video} />
            ))}
          </div>
        ) : (
          <div className="empty-card">
            <h3>No featured videos yet</h3>
            <p>
              Add full video links to <code>featuredVideos</code> if you want a
              curated home screen.
            </p>
          </div>
        )}
      </section>

      <footer
        style={{
          marginTop: "2.5rem",
          color: "var(--muted)",
          fontSize: "0.72rem",
          opacity: 0.8,
          textAlign: "center",
        }}
      >
        Mode: {modeLabel}
      </footer>
    </main>
  );
}
