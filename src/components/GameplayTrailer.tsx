import { useEffect, useRef, useState } from "react";
import { ExternalLink, PlayCircle } from "lucide-react";

/** Keep third-party video traffic behind an explicit visitor action. */
export function GameplayTrailer({
  videoId,
  name,
  image,
}: {
  videoId: string;
  name: string;
  image: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (loaded) frame.current?.focus();
  }, [loaded]);
  const id = encodeURIComponent(videoId);

  return (
    <div>
      <div className="relative aspect-video w-full">
        {loaded ? (
          <iframe
            ref={frame}
            tabIndex={0}
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube.com/embed/${id}`}
            title={`${name} gameplay`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            aria-label={`Load ${name} gameplay on YouTube`}
            onClick={() => setLoaded(true)}
            className="group absolute inset-0 grid h-full w-full place-items-center overflow-hidden text-center focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-primary"
          >
            <img
              src={image}
              alt=""
              loading="lazy"
              decoding="async"
              width={1024}
              height={1024}
              className="absolute inset-0 h-full w-full object-cover opacity-60 transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <span
              className="absolute inset-0 bg-gradient-to-t from-background/95 to-background/40"
              aria-hidden="true"
            />
            <span className="relative px-4 py-3">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground sm:h-16 sm:w-16">
                <PlayCircle className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
              </span>
              <span className="mt-3 block font-display text-base font-bold sm:text-lg">
                Load gameplay trailer
              </span>
              <span className="mt-1 block text-xs text-muted-foreground sm:text-sm">
                YouTube loads when you choose to watch.
              </span>
            </span>
          </button>
        )}
      </div>
      <p className="border-t border-border bg-card px-4 py-2 text-sm text-muted-foreground">
        <a
          href={`https://www.youtube.com/watch?v=${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="touch-target inline-flex items-center gap-2 font-semibold text-primary-ink hover:underline"
        >
          Open trailer on YouTube <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </p>
    </div>
  );
}
