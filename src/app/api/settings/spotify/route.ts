import { auth } from "@/auth";
import { spotifyUrl, setSpotifyUrl } from "@/lib/settings";

/** Only real Spotify links - this URL is rendered as a link for clients. */
function validSpotify(url: string): boolean {
  if (!url) return true; // empty clears it
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      (u.hostname === "open.spotify.com" || u.hostname.endsWith(".spotify.com") || u.hostname === "spotify.link")
    );
  } catch {
    return false;
  }
}

// GET /api/settings/spotify - the coach's Spotify link (any signed-in user).
export async function GET() {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  return Response.json({ url: await spotifyUrl() });
}

// PUT /api/settings/spotify - coach sets or clears it.
export async function PUT(req: Request) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }

  const { url } = await req.json().catch(() => ({ url: "" }));
  const clean = typeof url === "string" ? url.trim() : "";
  if (!validSpotify(clean)) {
    return new Response("That doesn't look like a Spotify link (it should start https://open.spotify.com/).", {
      status: 400,
    });
  }

  await setSpotifyUrl(clean);
  return Response.json({ url: clean });
}
