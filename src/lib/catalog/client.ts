import { env } from "@/lib/env";
import { createMusicBrainzClient, type MusicBrainzClient } from "./musicbrainz";
import { stubFetch } from "./stub";

// One MusicBrainz client per process, so the one-request-per-second queue and the caches are shared by every
// request this process serves. Tests swap it with `setCatalogClient`.

const g = globalThis as unknown as { __grMb?: MusicBrainzClient };

export function catalogClient(): MusicBrainzClient {
  if (g.__grMb) return g.__grMb;
  const e = env();
  g.__grMb =
    e.CATALOG_STUB === "1"
      ? createMusicBrainzClient({ contact: "stub", fetch: stubFetch, gapMs: 0 })
      : createMusicBrainzClient({ contact: e.MUSICBRAINZ_CONTACT });
  return g.__grMb;
}

export function setCatalogClient(client: MusicBrainzClient | undefined) {
  g.__grMb = client;
}
