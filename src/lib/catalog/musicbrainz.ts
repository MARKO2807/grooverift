// The MusicBrainz client (step 5.3b, plan 5.3, D-018, D-093 (2)). Server-only: members never call MusicBrainz from
// the browser, so the rate limit, the User-Agent and the cache are ours to keep.
//
// - One request per second per process (MusicBrainz rate-limits by IP and answers 503 past it). Requests wait in a
//   queue; when the queue is longer than MAX_QUEUE the call fails at once as "busy" instead of piling up.
// - Retry on 503 and network errors with a growing pause (at most RETRIES), never on 4xx.
// - The User-Agent names the app and the project contact (MUSICBRAINZ_CONTACT, A4); without a contact the
//   catalogue counts as unavailable, because MusicBrainz asks every client to identify itself.
// - Searches are cached for an hour, lookups for a day (in memory, bounded).
// - A lookup whose answer carries another id means the artist was merged: the caller records the redirect.
//
// The factory takes `fetch`, the clock and `sleep` so the unit tests can run it without the network.

export type MbArtist = {
  mbid: string;
  name: string;
  sortName: string | null;
  disambiguation: string | null;
  /** ISO 3166-1 alpha-2, or null for "Worldwide" / "Europe" and unknown. */
  country: string | null;
  beginYear: number | null;
  endYear: number | null;
  /** Genre and tag names with their vote counts, highest first (votes ≤ 0 left out). */
  tags: { name: string; count: number }[];
  score?: number;
};

export type LookupResult =
  | { kind: "found"; artist: MbArtist }
  /** The id was merged into another one: `artist.mbid` is the new id. */
  | { kind: "redirected"; from: string; artist: MbArtist }
  | { kind: "gone" };

export class CatalogUnavailable extends Error {
  constructor(
    public readonly why: "no-contact" | "busy" | "http" | "network" | "timeout",
    detail?: string,
  ) {
    super(`MusicBrainz unavailable: ${why}${detail ? ` (${detail})` : ""}`);
    this.name = "CatalogUnavailable";
  }
}

export type ClientOptions = {
  contact: string | undefined;
  version?: string;
  fetch?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  /** Minimum gap between two requests (ms). MusicBrainz allows one per second; 1,100 leaves a margin. */
  gapMs?: number;
  timeoutMs?: number;
  base?: string;
};

export const MB_BASE = "https://musicbrainz.org/ws/2";
const MAX_QUEUE = 6;
const RETRIES = 2;
const SEARCH_TTL = 60 * 60 * 1000;
const LOOKUP_TTL = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const MIN_SCORE = 55;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lucene special characters escaped, so a member's query is always plain text to MusicBrainz. */
export const luceneEscape = (s: string) => s.replace(/([+\-!(){}[\]^"~*?:\\/&|])/g, "\\$1");

/** Lower-case, accents folded, inner spaces collapsed: the cache key and the same-name test. */
export const foldName = (s: string) =>
  s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

const year = (date: unknown): number | null => {
  if (typeof date !== "string") return null;
  const m = /^(\d{4})/.exec(date);
  return m ? Number(m[1]) : null;
};

type Raw = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Turns one MusicBrainz artist object into ours; null when it lacks an id or a name. */
export function parseArtist(raw: Raw): MbArtist | null {
  const mbid = str(raw.id);
  const name = str(raw.name);
  if (!mbid || !UUID.test(mbid) || !name) return null;
  const life = (raw["life-span"] ?? {}) as Raw;
  const area = (raw.area ?? {}) as Raw;
  let country = str(raw.country);
  if (!country) {
    const codes = area["iso-3166-1-codes"];
    country = Array.isArray(codes) ? str(codes[0]) : null;
  }
  if (country && (!/^[A-Z]{2}$/.test(country) || country === "XW" || country === "XE"))
    country = null;
  const votes = new Map<string, number>();
  for (const list of [raw.genres, raw.tags]) {
    if (!Array.isArray(list)) continue;
    for (const t of list as Raw[]) {
      const n = str(t.name);
      const c = typeof t.count === "number" ? t.count : 0;
      if (n && c > 0) votes.set(n.toLowerCase(), Math.max(votes.get(n.toLowerCase()) ?? 0, c));
    }
  }
  const tags = [...votes]
    .map(([n, c]) => ({ name: n, count: c }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return {
    mbid: mbid.toLowerCase(),
    name: name.slice(0, 300),
    sortName: str(raw["sort-name"])?.slice(0, 300) ?? null,
    disambiguation: str(raw.disambiguation)?.slice(0, 300) ?? null,
    country,
    beginYear: year(life.begin),
    endYear: year(life.end),
    tags: tags.slice(0, 20),
    score: typeof raw.score === "number" ? raw.score : undefined,
  };
}

class Ttl<V> {
  private map = new Map<string, { v: V; at: number }>();
  constructor(
    private ttl: number,
    private now: () => number,
  ) {}
  get(k: string): V | undefined {
    const e = this.map.get(k);
    if (!e) return undefined;
    if (this.now() - e.at > this.ttl) {
      this.map.delete(k);
      return undefined;
    }
    return e.v;
  }
  set(k: string, v: V) {
    this.map.delete(k);
    this.map.set(k, { v, at: this.now() });
    if (this.map.size > CACHE_MAX) this.map.delete(this.map.keys().next().value!);
  }
}

export type MusicBrainzClient = ReturnType<typeof createMusicBrainzClient>;

export function createMusicBrainzClient(opts: ClientOptions) {
  const doFetch = opts.fetch ?? fetch;
  const now = opts.now ?? Date.now;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const gap = opts.gapMs ?? 1100;
  const timeoutMs = opts.timeoutMs ?? 8000;
  const base = opts.base ?? MB_BASE;
  const contact = opts.contact?.trim();
  const userAgent = contact ? `GrooveRift/${opts.version ?? "0.1"} ( ${contact} )` : null;

  const searches = new Ttl<MbArtist[]>(SEARCH_TTL, now);
  const lookups = new Ttl<LookupResult>(LOOKUP_TTL, now);
  /** Artists seen in recent search answers, so adding one needs no second request. */
  const seen = new Ttl<MbArtist>(SEARCH_TTL, now);

  let nextSlot = 0;
  let waiting = 0;

  /** Waits for this request's turn: slots are handed out one gap apart. */
  async function turn() {
    if (waiting >= MAX_QUEUE) throw new CatalogUnavailable("busy");
    waiting++;
    try {
      const t = now();
      const slot = Math.max(t, nextSlot);
      nextSlot = slot + gap;
      if (slot > t) await sleep(slot - t);
    } finally {
      waiting--;
    }
  }

  async function get(path: string): Promise<{ status: number; body: Raw | null }> {
    if (!userAgent) throw new CatalogUnavailable("no-contact");
    let last: CatalogUnavailable = new CatalogUnavailable("network");
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      if (attempt) await sleep(1000 * 2 ** (attempt - 1));
      await turn();
      let res: Response;
      try {
        res = await doFetch(`${base}${path}`, {
          headers: { "User-Agent": userAgent, Accept: "application/json" },
          signal: AbortSignal.timeout(timeoutMs),
          cache: "no-store",
        });
      } catch (e) {
        const timeout = e instanceof Error && e.name === "TimeoutError";
        last = new CatalogUnavailable(timeout ? "timeout" : "network");
        continue;
      }
      if (res.status === 503 || res.status === 429 || res.status >= 500) {
        last = new CatalogUnavailable("http", String(res.status));
        continue;
      }
      if (res.status === 404 || res.status === 400) return { status: res.status, body: null };
      if (!res.ok) throw new CatalogUnavailable("http", String(res.status));
      try {
        return { status: res.status, body: (await res.json()) as Raw };
      } catch {
        throw new CatalogUnavailable("http", "bad json");
      }
    }
    throw last;
  }

  return {
    /** Whether the client may call MusicBrainz at all (a contact is configured). */
    configured: !!userAgent,

    /**
     * Artist search for the typeahead: up to `limit` artists scoring at least MIN_SCORE. The query is trimmed,
     * capped at 100 characters and escaped; fewer than two characters return nothing without a request.
     */
    async searchArtists(query: string, limit = 8): Promise<MbArtist[]> {
      const q = query.trim().slice(0, 100);
      if (q.length < 2) return [];
      const key = `${foldName(q)}|${limit}`;
      const hit = searches.get(key);
      if (hit) return hit;
      const { body } = await get(
        `/artist?query=${encodeURIComponent(luceneEscape(q))}&fmt=json&limit=${Math.min(limit + 4, 25)}`,
      );
      const list = Array.isArray(body?.artists) ? (body!.artists as Raw[]) : [];
      const found = list
        .map(parseArtist)
        .filter((a): a is MbArtist => !!a && (a.score ?? 100) >= MIN_SCORE)
        .slice(0, limit);
      searches.set(key, found);
      for (const a of found) seen.set(a.mbid, a);
      return found;
    },

    /** An artist from a recent search answer, without a request (adding right after a search). */
    recent(mbid: string): MbArtist | undefined {
      return seen.get(mbid.toLowerCase());
    },

    /** One artist by MusicBrainz id, with its genres. Follows merges (`redirected`) and reports deletions (`gone`). */
    async lookupArtist(mbid: string): Promise<LookupResult> {
      const id = mbid.toLowerCase();
      if (!UUID.test(id)) return { kind: "gone" };
      const hit = lookups.get(id);
      if (hit) return hit;
      const { body } = await get(`/artist/${id}?fmt=json&inc=genres+tags`);
      const parsed = body ? parseArtist(body) : null;
      const result: LookupResult = !parsed
        ? { kind: "gone" }
        : parsed.mbid === id
          ? { kind: "found", artist: parsed }
          : { kind: "redirected", from: id, artist: parsed };
      lookups.set(id, result);
      if (parsed) seen.set(parsed.mbid, parsed);
      return result;
    },

    /** Every MusicBrainz genre (id and name), page by page; for filling `genre.mbid` (scripts only). */
    async allGenres(): Promise<{ mbid: string; name: string }[]> {
      const out: { mbid: string; name: string }[] = [];
      for (let offset = 0; offset < 10_000; offset += 100) {
        const { body } = await get(`/genre/all?fmt=json&limit=100&offset=${offset}`);
        const list = Array.isArray(body?.genres) ? (body!.genres as Raw[]) : [];
        for (const g of list) {
          const id = str(g.id);
          const name = str(g.name);
          if (id && UUID.test(id) && name) out.push({ mbid: id.toLowerCase(), name });
        }
        const total = typeof body?.["genre-count"] === "number" ? body["genre-count"] : 0;
        if (!list.length || offset + 100 >= total) break;
      }
      return out;
    },
  };
}
