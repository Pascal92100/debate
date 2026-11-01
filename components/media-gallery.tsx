import type { MediaAttachment } from "@/lib/media";

export function MediaGallery({ media, compact = false }: { media?: MediaAttachment[]; compact?: boolean }) {
  if (!media?.length) return null;
  return <div className={`media-gallery${compact ? " media-gallery-compact" : ""}`}>
    {media.map((item) => item.contentType.startsWith("video/")
      ? <video key={item.pathname} src={item.url} controls preload="metadata" />
      : <img key={item.pathname} src={item.url} alt={item.name} loading="lazy" />)}
  </div>;
}