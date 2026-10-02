import { prisma } from "./prisma";

/**
 * App-wide coach-controlled toggles, stored as key/value rows in AppSetting.
 */
const MEALS_VISIBLE_KEY = "mealsVisibleToClients";
const SPOTIFY_KEY = "spotifyUrl";

/** Can clients see the meal database? Defaults to HIDDEN until the coach
 *  flips it on (the database starts as a work-in-progress). */
export async function mealsVisibleToClients(): Promise<boolean> {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: MEALS_VISIBLE_KEY } });
    return row?.value === "true";
  } catch {
    return false; // table missing / transient DB issue → default to hidden
  }
}

export async function setMealsVisibleToClients(visible: boolean): Promise<void> {
  const value = visible ? "true" : "false";
  await prisma.appSetting.upsert({
    where: { key: MEALS_VISIBLE_KEY },
    create: { key: MEALS_VISIBLE_KEY, value },
    update: { value },
  });
}

/**
 * Millie's Spotify profile or playlist link, shown as a "music for your session"
 * button on the client's Today page. Empty string = nothing to show.
 */
export async function spotifyUrl(): Promise<string> {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: SPOTIFY_KEY } });
    return row?.value ?? "";
  } catch {
    return "";
  }
}

export async function setSpotifyUrl(url: string): Promise<void> {
  const value = url.trim();
  await prisma.appSetting.upsert({
    where: { key: SPOTIFY_KEY },
    create: { key: SPOTIFY_KEY, value },
    update: { value },
  });
}
