import { describe, expect, it } from "vitest";
import {
  CatalogUnavailable,
  createMusicBrainzClient,
  luceneEscape,
  parseArtist,
} from "@/lib/catalog/musicbrainz";
import { OLD_LOW_MBID, stubFetch } from "@/lib/catalog/stub";

// Step 5.3b, plan 5.3: the client's rate limit, retry and redirects, without the network.

const NIRVANA = "5b11f4ce-a62d-471e-81fc-a69a8278c7da";

/** A fake clock: sleep moves time forward instantly and records every pause. */
function clock() {
  let t = 1_000_000;
  const start = t;
  const pauses: number[] = [];
  /** When each pause ends, relative to the start. */
  const wakes: number[] = [];
  return {
    now: () => t,
    sleep: async (ms: number) => {
      pauses.push(ms);
      wakes.push(t + ms - start);
      t += ms;
    },
    pauses,
    wakes,
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function recorder(answers: (() => Response | Promise<Response>)[]) {
  const calls: { url: string; init?: RequestInit; at: number }[] = [];
  let i = 0;
  return {
    calls,
    fetch(now: () => number): typeof fetch {
      return async (input, init) => {
        calls.push({ url: String(input), init, at: now() });
        const a = answers[Math.min(i++, answers.length - 1)]!;
        return a();
      };
    },
  };
}

describe("MusicBrainz client", () => {
  it("refuses to call without a contact for the User-Agent", async () => {
    const c = createMusicBrainzClient({ contact: undefined, fetch: stubFetch });
    expect(c.configured).toBe(false);
    await expect(c.searchArtists("nirvana")).rejects.toBeInstanceOf(CatalogUnavailable);
  });

  it("sends the app and the contact in the User-Agent", async () => {
    const k = clock();
    const r = recorder([() => json({ artists: [] })]);
    const c = createMusicBrainzClient({
      contact: "catalog@example.test",
      fetch: r.fetch(k.now),
      now: k.now,
      sleep: k.sleep,
    });
    await c.searchArtists("björk");
    const headers = r.calls[0]!.init!.headers as Record<string, string>;
    expect(headers["User-Agent"]).toBe("GrooveRift/0.1 ( catalog@example.test )");
    expect(r.calls[0]!.url).toContain("/artist?query=bj%C3%B6rk");
  });

  it("keeps at least the gap between requests (one per second)", async () => {
    const k = clock();
    const r = recorder([() => json({ artists: [] })]);
    const c = createMusicBrainzClient({
      contact: "x",
      fetch: r.fetch(k.now),
      now: k.now,
      sleep: k.sleep,
    });
    await Promise.all([c.searchArtists("aa"), c.searchArtists("bb"), c.searchArtists("cc")]);
    // Three requests at once: the first goes now, the next wait one and two gaps for their slots.
    expect(r.calls).toHaveLength(3);
    expect(k.wakes).toEqual([1100, 2200]);
  });

  it("fails at once as busy when the queue is full", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    const c = createMusicBrainzClient({
      contact: "x",
      fetch: async () => json({ artists: [] }),
      sleep: () => gate,
    });
    const first = c.searchArtists("q0"); // takes the free slot at once
    const queued = Array.from({ length: 6 }, (_, i) => c.searchArtists(`q${i + 1}`));
    await expect(c.searchArtists("one too many")).rejects.toMatchObject({ why: "busy" });
    release();
    await Promise.all([first, ...queued]);
  });

  it("retries a 503 and then answers", async () => {
    const k = clock();
    const r = recorder([
      () => json({}, 503),
      () => json({ artists: [{ id: NIRVANA, name: "Nirvana", score: 100 }] }),
    ]);
    const c = createMusicBrainzClient({
      contact: "x",
      fetch: r.fetch(k.now),
      now: k.now,
      sleep: k.sleep,
    });
    const found = await c.searchArtists("nirvana");
    expect(found.map((a) => a.name)).toEqual(["Nirvana"]);
    expect(r.calls).toHaveLength(2);
  });

  it("gives up after the retries with CatalogUnavailable", async () => {
    const k = clock();
    const r = recorder([() => json({}, 503)]);
    const c = createMusicBrainzClient({
      contact: "x",
      fetch: r.fetch(k.now),
      now: k.now,
      sleep: k.sleep,
    });
    await expect(c.searchArtists("nirvana")).rejects.toMatchObject({ why: "http" });
    expect(r.calls).toHaveLength(3);
  });

  it("treats a network error like a 503 and never retries a 404", async () => {
    const k = clock();
    let n = 0;
    const c = createMusicBrainzClient({
      contact: "x",
      now: k.now,
      sleep: k.sleep,
      fetch: async () => {
        n++;
        if (n === 1) throw new TypeError("fetch failed");
        return json({ error: "Not Found" }, 404);
      },
    });
    expect(await c.lookupArtist(NIRVANA)).toEqual({ kind: "gone" });
    expect(n).toBe(2);
  });

  it("caches searches and answers adds from the last search without a request", async () => {
    const k = clock();
    const r = recorder([() => json({ artists: [{ id: NIRVANA, name: "Nirvana", score: 100 }] })]);
    const c = createMusicBrainzClient({
      contact: "x",
      fetch: r.fetch(k.now),
      now: k.now,
      sleep: k.sleep,
    });
    await c.searchArtists("Nirvana");
    await c.searchArtists("  nirvana ");
    expect(r.calls).toHaveLength(1);
    expect(c.recent(NIRVANA.toUpperCase())?.name).toBe("Nirvana");
  });

  it("does not search for fewer than two characters", async () => {
    const r = recorder([() => json({ artists: [] })]);
    const c = createMusicBrainzClient({ contact: "x", fetch: r.fetch(Date.now) });
    expect(await c.searchArtists(" a ")).toEqual([]);
    expect(r.calls).toHaveLength(0);
  });

  it("reports a merged id as redirected to the new one", async () => {
    const c = createMusicBrainzClient({ contact: "x", fetch: stubFetch, gapMs: 0 });
    const r = await c.lookupArtist(OLD_LOW_MBID);
    expect(r.kind).toBe("redirected");
    if (r.kind === "redirected") {
      expect(r.from).toBe(OLD_LOW_MBID);
      expect(r.artist.name).toBe("Low");
    }
  });

  it("drops low scores and keeps same-name artists apart", async () => {
    const c = createMusicBrainzClient({ contact: "x", fetch: stubFetch, gapMs: 0 });
    const found = await c.searchArtists("Nirvana");
    expect(found.map((a) => a.country)).toEqual(["US", "GB"]);
  });

  it("answers the stub outage as unavailable", async () => {
    const k = clock();
    const c = createMusicBrainzClient({
      contact: "x",
      fetch: stubFetch,
      now: k.now,
      sleep: k.sleep,
    });
    await expect(c.searchArtists("katalog-kvar")).rejects.toBeInstanceOf(CatalogUnavailable);
  });
});

describe("parseArtist", () => {
  it("reads years, country and the votes, leaving out zero and negative votes", () => {
    const a = parseArtist({
      id: NIRVANA.toUpperCase(),
      name: " Nirvana ",
      "sort-name": "Nirvana",
      "life-span": { begin: "1987", end: "1994-04-05" },
      area: { "iso-3166-1-codes": ["US"] },
      tags: [
        { name: "Grunge", count: 68 },
        { name: "band", count: 0 },
        { name: "cowpunk", count: -1 },
      ],
      genres: [{ name: "alternative rock", count: 30 }],
    });
    expect(a).toMatchObject({
      mbid: NIRVANA,
      name: "Nirvana",
      country: "US",
      beginYear: 1987,
      endYear: 1994,
      tags: [
        { name: "grunge", count: 68 },
        { name: "alternative rock", count: 30 },
      ],
    });
  });

  it("refuses an artist without a valid id or a name, and drops Worldwide", () => {
    expect(parseArtist({ id: "nope", name: "X" })).toBeNull();
    expect(parseArtist({ id: NIRVANA, name: "" })).toBeNull();
    expect(parseArtist({ id: NIRVANA, name: "X", country: "XW" })?.country).toBeNull();
  });
});

describe("luceneEscape", () => {
  it("escapes every Lucene operator so a query stays plain text", () => {
    expect(luceneEscape('AC/DC && "x" OR y:z')).toBe('AC\\/DC \\&\\& \\"x\\" OR y\\:z');
  });
});
