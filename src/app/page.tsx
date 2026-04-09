import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { VideoCard } from "@/components/VideoCard";
import { getSiteConfig } from "@/lib/config";
import { getFeaturedVideos, getChannelReferences } from "@/lib/youtube";

export default async function HomePage() {
  const config = await getSiteConfig();
  const [featuredVideos, featuredChannels] = await Promise.all([
    getFeaturedVideos(config.featuredVideos),
    Promise.resolve(getChannelReferences(config.featuredChannels)),
  ]);

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero__copy">
          <span className="eyebrow">
            {config.mode === "allowlist" ? "Allowlist mode" : "Blocklist mode"}
          </span>
          <h1>{config.siteTitle}</h1>
          <p>{config.welcomeMessage}</p>
          <SearchForm />
        </div>

        <div className="hero__panel card">
          <h2>How this app behaves</h2>
          <p>
            {config.mode === "allowlist"
              ? "Only approved searches, approved channels, or approved videos are shown."
              : "Searches still use YouTube, but results that match your blocked rules are hidden."}
          </p>

          <div className="stat-grid">
            <div>
              <strong>{config.blockedWords.length}</strong>
              <span>blocked words</span>
            </div>
            <div>
              <strong>{config.allowedChannels.length}</strong>
              <span>approved channels</span>
            </div>
            <div>
              <strong>{config.allowedVideos.length}</strong>
              <span>approved videos</span>
            </div>
          </div>
        </div>
      </section>

      {config.quickSearches.length > 0 ? (
        <section className="section">
          <div className="section__heading">
            <h2>Quick Topics</h2>
            <p>Tap one to search without typing.</p>
          </div>

          <div className="pill-row">
            {config.quickSearches.map((term) => (
              <Link
                key={term}
                className="pill"
                href={`/search?q=${encodeURIComponent(term)}`}
              >
                {term}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section section--split">
        <div className="section__heading">
          <h2>Approved Channels</h2>
          <p>
            Add handles or channel URLs in the config file to make this section
            useful for caregivers and teachers.
          </p>
        </div>

        {featuredChannels.length > 0 ? (
          <div className="channel-grid">
            {featuredChannels.map((channel) => (
              <Link
                key={channel.raw}
                className="channel-card"
                href={`/search?q=${encodeURIComponent(channel.searchQuery)}`}
              >
                <span className="channel-card__badge">Channel</span>
                <strong>{channel.label}</strong>
                <span>Search videos from this channel</span>
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
            These are optional hand-picked videos. Paste full YouTube links into{" "}
            <code>featuredVideos</code>.
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
    </main>
  );
}

