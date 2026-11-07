// Wikidata and Wikimedia Commons for artist photos (step 5.11, D-118). Server-only, called by the worker's photo
// job, never by a member's request: Wikidata P18 names the image file, Commons' imageinfo gives a thumbnail URL and
// the licence metadata (LicenseShortName, Artist, LicenseUrl), and the thumbnail is downloaded once and copied to
// our own storage (never hotlinked, D-017). Wikimedia asks every client for a User-Agent with a contact, the same
// project contact MusicBrainz gets (A4). The factory takes `fetch` so tests and the e2e stub run without the network.

export type CommonsFile = {
  /** "File:…" as Commons names it. */
  file: string;
  thumbUrl: string;
  filePageUrl: string;
  licenceShort: string | null;
  licenceUrl: string | null;
  /** HTML from Commons; the caller turns these into plain text. */
  artistHtml: string | null;
  attributionHtml: string | null;
  creditHtml: string | null;
  objectName: string | null;
  attributionRequired: boolean;
  restrictions: string | null;
  usageTerms: string | null;
  /** The revision of the file the metadata belongs to (evidence). */
  timestamp: string | null;
  sha1: string | null;
};

export class CommonsUnavailable extends Error {
  constructor(detail: string) {
    super(`Wikimedia unavailable: ${detail}`);
    this.name = "CommonsUnavailable";
  }
}

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const THUMB_WIDTH = 800;
const MAX_DOWNLOAD = 15 * 1024 * 1024;
const QID = /^Q\d{1,12}$/;

type Raw = Record<string, unknown>;

export function createCommonsClient(opts: {
  contact: string | undefined;
  fetch?: typeof fetch;
  timeoutMs?: number;
}) {
  const doFetch = opts.fetch ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const contact = opts.contact?.trim();
  const userAgent = contact ? `GrooveRift/0.1 ( ${contact} )` : null;

  async function getJson(url: URL): Promise<Raw> {
    if (!userAgent) throw new CommonsUnavailable("no contact");
    let res: Response;
    try {
      res = await doFetch(url, {
        headers: { "User-Agent": userAgent, Accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
    } catch {
      throw new CommonsUnavailable("network");
    }
    if (!res.ok) throw new CommonsUnavailable(`http ${res.status}`);
    try {
      return (await res.json()) as Raw;
    } catch {
      throw new CommonsUnavailable("bad json");
    }
  }

  return {
    configured: !!userAgent,

    /** The P18 ("image") file of a Wikidata item: the preferred statement first, never a deprecated one. */
    async imageFile(qid: string): Promise<string | null> {
      if (!QID.test(qid)) return null;
      const url = new URL(WIKIDATA_API);
      url.search = new URLSearchParams({
        action: "wbgetclaims",
        entity: qid,
        property: "P18",
        format: "json",
      }).toString();
      const body = await getJson(url);
      const claims = ((body.claims as Raw | undefined)?.P18 as Raw[] | undefined) ?? [];
      const usable = claims.filter((c) => c.rank !== "deprecated");
      usable.sort((a, b) => (a.rank === "preferred" ? -1 : 0) - (b.rank === "preferred" ? -1 : 0));
      for (const c of usable) {
        const v = ((c.mainsnak as Raw | undefined)?.datavalue as Raw | undefined)?.value;
        if (typeof v === "string" && v.trim()) return v.trim();
      }
      return null;
    },

    /** Thumbnail URL, file page and licence metadata of a Commons file. */
    async fileInfo(fileName: string): Promise<CommonsFile | null> {
      const title = fileName.startsWith("File:") ? fileName : `File:${fileName}`;
      const url = new URL(COMMONS_API);
      url.search = new URLSearchParams({
        action: "query",
        titles: title,
        prop: "imageinfo",
        iiprop: "url|extmetadata|mime|timestamp|sha1",
        iiurlwidth: String(THUMB_WIDTH),
        iiextmetadatafilter:
          "LicenseShortName|LicenseUrl|Artist|Attribution|AttributionRequired|Credit|ObjectName|Restrictions|UsageTerms",
        format: "json",
        formatversion: "2",
      }).toString();
      const body = await getJson(url);
      const page = (((body.query as Raw | undefined)?.pages as Raw[] | undefined) ?? [])[0];
      const info = ((page?.imageinfo as Raw[] | undefined) ?? [])[0];
      if (!info) return null;
      const meta = (info.extmetadata as Record<string, { value?: unknown }> | undefined) ?? {};
      const val = (k: string) =>
        typeof meta[k]?.value === "string" ? (meta[k].value as string) : null;
      const thumbUrl = typeof info.thumburl === "string" ? info.thumburl : null;
      const filePageUrl = typeof info.descriptionurl === "string" ? info.descriptionurl : null;
      if (!thumbUrl || !filePageUrl) return null;
      return {
        file: typeof page?.title === "string" ? page.title : title,
        thumbUrl,
        filePageUrl,
        licenceShort: val("LicenseShortName"),
        licenceUrl: val("LicenseUrl"),
        artistHtml: val("Artist"),
        attributionHtml: val("Attribution"),
        creditHtml: val("Credit"),
        objectName: val("ObjectName"),
        attributionRequired: val("AttributionRequired") === "true",
        restrictions: val("Restrictions"),
        usageTerms: val("UsageTerms"),
        timestamp: typeof info.timestamp === "string" ? info.timestamp : null,
        sha1: typeof info.sha1 === "string" ? info.sha1 : null,
      };
    },

    /** The thumbnail bytes, only from Wikimedia's upload host, at most 15 MB. */
    async download(thumbUrl: string): Promise<Buffer> {
      const u = new URL(thumbUrl);
      if (u.protocol !== "https:" || u.hostname !== "upload.wikimedia.org")
        throw new CommonsUnavailable("unexpected host");
      if (!userAgent) throw new CommonsUnavailable("no contact");
      let res: Response;
      try {
        res = await doFetch(u, {
          headers: { "User-Agent": userAgent },
          signal: AbortSignal.timeout(timeoutMs * 2),
          redirect: "error",
          cache: "no-store",
        });
      } catch {
        throw new CommonsUnavailable("network");
      }
      if (!res.ok) throw new CommonsUnavailable(`http ${res.status}`);
      const length = Number(res.headers.get("content-length") ?? 0);
      if (length > MAX_DOWNLOAD) throw new CommonsUnavailable("too large");
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length > MAX_DOWNLOAD) throw new CommonsUnavailable("too large");
      return bytes;
    },
  };
}

export type CommonsClient = ReturnType<typeof createCommonsClient>;
