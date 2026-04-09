import Image from "next/image";
import Link from "next/link";
import type { FeaturedVideo, SearchResult } from "@/lib/types";

type VideoCardData = SearchResult | FeaturedVideo;

interface VideoCardProps {
  data: VideoCardData;
  query?: string;
}

function isSearchResult(data: VideoCardData): data is SearchResult {
  return "description" in data;
}

export function VideoCard({ data, query }: VideoCardProps) {
  const watchHref = query
    ? `/watch/${data.videoId}?q=${encodeURIComponent(query)}`
    : `/watch/${data.videoId}`;

  return (
    <article className="video-card">
      <Link className="video-card__thumb" href={watchHref}>
        <Image
          alt=""
          className="video-card__image"
          height={360}
          loading="lazy"
          sizes="(min-width: 820px) 50vw, 100vw"
          src={data.thumbnailUrl}
          width={640}
        />
      </Link>

      <div className="video-card__body">
        <div className="video-card__meta">
          {isSearchResult(data) && data.lengthText ? (
            <span>{data.lengthText}</span>
          ) : null}
          {isSearchResult(data) && data.publishedText ? (
            <span>{data.publishedText}</span>
          ) : null}
        </div>

        <Link className="video-card__title" href={watchHref}>
          {data.title}
        </Link>

        {data.channelTitle ? (
          <p className="video-card__channel">{data.channelTitle}</p>
        ) : null}

        {isSearchResult(data) && data.description ? (
          <p className="video-card__description">{data.description}</p>
        ) : null}
      </div>
    </article>
  );
}
