import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Renders a real photo via next/image when `src` is provided, otherwise an
 * elegant gradient stand-in. Sized by the caller via `className` (which sets
 * the aspect ratio). The soft gradient backing only shows through transparent
 * (cut-out) images, so it sits nicely behind studio portraits.
 */
export function ImagePanel({
  className,
  label,
  monogram = "M",
  src,
  alt = "",
  priority,
  objectPosition,
}: {
  className?: string;
  label?: string;
  monogram?: string;
  src?: string;
  alt?: string;
  priority?: boolean;
  objectPosition?: string;
}) {
  if (src) {
    return (
      <div
        className={cn(
          "relative isolate overflow-hidden rounded-3xl bg-gradient-to-b from-royal-50 to-white shadow-elevated ring-1 ring-black/5",
          className,
        )}
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
          style={objectPosition ? { objectPosition } : undefined}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative isolate flex items-center justify-center overflow-hidden rounded-3xl shadow-elevated ring-1 ring-white/10",
        className,
      )}
      style={{
        backgroundImage:
          "radial-gradient(120% 120% at 20% 0%, #4a5cf7 0%, #212f8a 45%, #141942 100%)",
      }}
    >
      <div
        aria-hidden
        className="absolute -left-12 top-8 h-44 w-44 rounded-full bg-royal-300/30 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -right-8 bottom-0 h-52 w-52 rounded-full bg-gold-400/20 blur-3xl"
      />
      <svg
        aria-hidden
        viewBox="0 0 400 400"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full text-white opacity-[0.07]"
      >
        <circle cx="200" cy="200" r="80" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="200" cy="200" r="140" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="200" cy="200" r="200" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
      <span className="relative select-none font-display text-[8rem] leading-none text-white/10">
        {monogram}
      </span>
      {label && (
        <span className="absolute bottom-4 left-4 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-luxe text-white/70 ring-1 ring-white/15 backdrop-blur">
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * A person's face, or their initials when they haven't added a photo.
 *
 * Pass `userId` + `hasAvatar` to show the uploaded picture; the image is served
 * from a private bucket via /api/avatars/[userId], and if that 404s the
 * initials underneath simply show through.
 */
export function Avatar({
  initials,
  className,
  userId,
  hasAvatar,
  version = 0,
}: {
  initials: string;
  className?: string;
  userId?: string | null;
  hasAvatar?: boolean;
  /** Bump to bust the browser cache after she changes her picture. */
  version?: number;
}) {
  return (
    <span
      className={cn(
        "relative inline-grid select-none place-items-center overflow-hidden rounded-full font-display text-sm font-medium text-white",
        className,
      )}
      style={{ backgroundImage: "linear-gradient(140deg, #4a5cf7, #1f2c6e)" }}
    >
      {initials}
      {userId && hasAvatar && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/avatars/${userId}${version ? `?v=${version}` : ""}`}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            // No picture (or it's gone) - fall back to the initials behind it.
            e.currentTarget.style.display = "none";
          }}
        />
      )}
    </span>
  );
}
