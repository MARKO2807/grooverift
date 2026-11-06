// Review 5.2 M6: the client IP must come from the header the edge overwrites, never from a list a client can extend.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let clientIp: (h: Headers) => string;
const before = process.env.IP_HEADERS;

beforeAll(async () => {
  process.env.IP_HEADERS = "true-client-ip";
  vi.resetModules();
  ({ clientIp } = await import("@/lib/http/client-ip"));
});
afterAll(() => {
  if (before === undefined) delete process.env.IP_HEADERS;
  else process.env.IP_HEADERS = before;
  vi.resetModules();
});

const FORGED = "203.0.113.9";
// In tests Better Auth falls back to 127.0.0.1 where production returns null ("unknown"): either way not FORGED.
const NO_ADDRESS = "127.0.0.1";

describe("clientIp (review 5.2 M6)", () => {
  it("reads the single address the edge set", () => {
    expect(clientIp(new Headers({ "true-client-ip": "198.51.100.7" }))).toBe("198.51.100.7");
  });

  it("ignores X-Forwarded-For, which Render lets a client extend", () => {
    const h = new Headers({ "x-forwarded-for": `${FORGED}, 198.51.100.7` });
    expect(clientIp(h)).toBe(NO_ADDRESS);
    h.set("true-client-ip", "198.51.100.7");
    expect(clientIp(h)).toBe("198.51.100.7");
  });

  it("refuses a list or garbage in the trusted header instead of taking the first entry", () => {
    expect(clientIp(new Headers({ "true-client-ip": `${FORGED}, 198.51.100.7` }))).toBe(NO_ADDRESS);
    expect(clientIp(new Headers({ "true-client-ip": "not-an-ip" }))).toBe(NO_ADDRESS);
  });
});
