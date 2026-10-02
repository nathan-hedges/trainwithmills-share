import { Dumbbell, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { youtubeId, youtubeThumb, youtubeWatch } from "@/lib/youtube";

/**
 * Shows an exercise's guide. `src` is now a YouTube URL (stored in the
 * `guideImageUrl` column): we render its thumbnail with a play button that
 * opens YouTube in a new tab. No valid video = a tasteful placeholder.
 */
export function GuideImage({
  src,
  name,
  className,
}: {
  src?: string | null;
  name: string;
  className?: string;
}) {
  const id = youtubeId(src);

  if (id) {
    return (
      <a
        href={youtubeWatch(id)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Watch ${name} on YouTube`}
        className={cn("group relative block h-full w-full overflow-hidden", className)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={youtubeThumb(id)} alt={`${name} guide`} className="h-full w-full object-cover" />
        <span className="absolute inset-0 grid place-items-center bg-ink/15 transition-colors group-hover:bg-ink/30">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-red-600 shadow-soft">
            <Play className="h-4 w-4 translate-x-[1px] fill-current" />
          </span>
        </span>
      </a>
    );
  }

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden",
        className,
      )}
      style={{ backgroundImage: "linear-gradient(140deg, #dde4ff, #eef2ff 60%, #f7efd9)" }}
    >
      <Dumbbell className="h-7 w-7 text-royal-400" />
      <span className="absolute bottom-1.5 left-2 text-[10px] font-semibold uppercase tracking-luxe text-royal-500/70">
        No video
      </span>
    </div>
  );
}
