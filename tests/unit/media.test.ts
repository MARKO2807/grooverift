// Step 5.11: the image rules and the re-encoding (plan row 5.11 acceptance: polyglot and oversized files rejected,
// stripped metadata asserted). The images are made here with sharp, so no fixture files are needed.
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import {
  acceptLicence,
  artistSquare,
  checkUpload,
  cleanAlt,
  cropPixels,
  MAX_UPLOAD_BYTES,
  parseCrop,
  plainText,
  safeLicenceUrl,
  sniffImage,
} from "@/lib/media/rules";

vi.mock("server-only", () => ({}));
const { processArtistPhoto, processPostImage, processProfilePhoto, processScreenshot } =
  await import("@/lib/media/process");

const solid = (w: number, h: number) =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 40, b: 60 } } });

/** A JPEG carrying EXIF with a GPS position and a camera model, as a phone photo would. */
async function phoneJpeg(w = 400, h = 300, orientation?: number) {
  return solid(w, h)
    .jpeg()
    .withExif({
      IFD0: {
        Make: "TestPhone",
        Model: "GR-1",
        ...(orientation ? { Orientation: String(orientation) } : {}),
      },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "45/1 48/1 0/1" },
    })
    .toBuffer();
}

describe("format sniffing and upload checks", () => {
  it("knows JPEG, PNG and WebP by their first bytes, nothing else", async () => {
    expect(sniffImage(await solid(4, 4).jpeg().toBuffer())).toBe("jpeg");
    expect(sniffImage(await solid(4, 4).png().toBuffer())).toBe("png");
    expect(sniffImage(await solid(4, 4).webp().toBuffer())).toBe("webp");
    expect(sniffImage(await solid(4, 4).gif().toBuffer())).toBeNull();
    expect(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(sniffImage(Buffer.from("<html><script>alert(1)</script></html>"))).toBeNull();
    expect(sniffImage(Buffer.from("PK\u0003\u0004zip"))).toBeNull();
  });

  it("refuses empty and oversized files before decoding", () => {
    expect(checkUpload(new Uint8Array())).toEqual({ ok: false, problem: "empty" });
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    big.set([0xff, 0xd8, 0xff]);
    expect(checkUpload(big)).toEqual({ ok: false, problem: "tooLarge" });
  });
});

describe("re-encoding", () => {
  it("strips EXIF and GPS and writes WebP", async () => {
    const input = await phoneJpeg();
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const r = await processPostImage(input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const meta = await sharp(r.image.bytes).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    expect(meta.icc).toBeUndefined();
    expect(meta.xmp).toBeUndefined();
    expect(r.image.bytes.includes(Buffer.from("TestPhone"))).toBe(false);
    expect(r.image.bytes.includes(Buffer.from("GPS"))).toBe(false);
  });

  it("drops what a polyglot carries after the image", async () => {
    const png = await solid(64, 64).png().toBuffer();
    const polyglot = Buffer.concat([png, Buffer.from("<html><script>alert(1)</script></html>")]);
    const r = await processPostImage(polyglot);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.image.bytes.includes(Buffer.from("<script"))).toBe(false);
  });

  it("refuses a file whose header lies about its body, GIFs, SVGs and corrupt data", async () => {
    const jpegBody = await solid(16, 16).jpeg().toBuffer();
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const liar = Buffer.concat([pngHeader, jpegBody]);
    expect((await processPostImage(liar)).ok).toBe(false);
    expect(await processPostImage(await solid(8, 8).gif().toBuffer())).toEqual({
      ok: false,
      problem: "format",
    });
    expect(await processPostImage(Buffer.from("<svg/>"))).toEqual({ ok: false, problem: "format" });
    const broken = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5]);
    expect(await processPostImage(broken)).toEqual({ ok: false, problem: "decode" });
  });

  it("refuses decompression bombs (more than 40 megapixels)", async () => {
    const bomb = await solid(10_000, 5_000).png({ compressionLevel: 9 }).toBuffer();
    expect(bomb.length).toBeLessThan(MAX_UPLOAD_BYTES);
    expect(await processPostImage(bomb)).toEqual({ ok: false, problem: "decode" });
  });

  it("caps the long edge at 2048 px and never enlarges", async () => {
    const r = await processPostImage(await solid(3000, 1000).jpeg().toBuffer());
    expect(r.ok && [r.image.width, r.image.height]).toEqual([2048, 683]);
    const small = await processScreenshot(await solid(300, 200).png().toBuffer());
    expect(small.ok && [small.image.width, small.image.height]).toEqual([300, 200]);
  });

  it("keeps only the first frame of an animation", async () => {
    const frame = (background: string) =>
      sharp({ create: { width: 8, height: 8, channels: 4, background } })
        .png()
        .toBuffer();
    const anim = await sharp([await frame("#ff0000"), await frame("#0000ff")], {
      join: { animated: true },
    })
      .webp({ loop: 0 })
      .toBuffer();
    expect((await sharp(anim, { animated: true }).metadata()).pages).toBe(2);
    const r = await processPostImage(anim);
    expect(r.ok).toBe(true);
    if (r.ok) expect((await sharp(r.image.bytes).metadata()).pages ?? 1).toBe(1);
  });

  it("crops the profile photo to the chosen square after applying the EXIF orientation", async () => {
    // 400 × 300 stored with orientation 6 (rotate 90°) is a 300 × 400 portrait for the member.
    const input = await phoneJpeg(400, 300, 6);
    const r = await processProfilePhoto(input, { x: 0, y: 0.25, size: 1 });
    expect(r.ok && [r.image.width, r.image.height]).toEqual([512, 512]);
    if (r.ok) expect((await sharp(r.image.bytes).metadata()).exif).toBeUndefined();
  });

  it("squares artist photos towards the upper third", async () => {
    const r = await processArtistPhoto(await solid(600, 900).jpeg().toBuffer());
    expect(r.ok && [r.image.width, r.image.height]).toEqual([512, 512]);
  });
});

describe("crop arithmetic", () => {
  it("parses the sheet's fractions and refuses anything else", () => {
    expect(parseCrop("0.1,0.2,0.5")).toEqual({ x: 0.1, y: 0.2, size: 0.5 });
    expect(parseCrop("0.1,0.2")).toBeNull();
    expect(parseCrop("-1,0,1")).toBeNull();
    expect(parseCrop("a,b,c")).toBeNull();
    expect(parseCrop(5)).toBeNull();
  });

  it("clamps the square inside the image and centres a missing crop", () => {
    expect(cropPixels(null, 400, 300)).toEqual({ left: 50, top: 0, size: 300 });
    expect(cropPixels({ x: 0.9, y: 0.9, size: 0.5 }, 400, 300)).toEqual({
      left: 250,
      top: 150,
      size: 150,
    });
    expect(cropPixels({ x: 0, y: 0, size: 0 }, 400, 300)).toEqual({ left: 50, top: 0, size: 300 });
  });

  it("puts portrait artist photos towards the upper third and centres landscapes", () => {
    expect(artistSquare(600, 900)).toEqual({ left: 0, top: 100, size: 600 });
    expect(artistSquare(900, 600)).toEqual({ left: 150, top: 0, size: 600 });
  });
});

describe("text alternative", () => {
  it("is optional, one line and at most 300 characters", () => {
    expect(cleanAlt("  ")).toBeNull();
    expect(cleanAlt(undefined)).toBeNull();
    expect(cleanAlt("Koncert\nu Zagrebu\t2026")).toBe("Koncert u Zagrebu 2026");
    expect([...cleanAlt("ž".repeat(400))!].length).toBe(300);
  });
});

describe("Commons licences (D-118 (3))", () => {
  it("accepts public domain, CC0, CC BY and CC BY-SA in every version", () => {
    for (const [raw, short] of [
      ["CC BY-SA 4.0", "CC BY-SA 4.0"],
      ["CC BY-SA 3.0", "CC BY-SA 3.0"],
      ["CC BY 2.0", "CC BY 2.0"],
      ["CC BY-SA 2.5", "CC BY-SA 2.5"],
      ["CC BY-SA 3.0 de", "CC BY-SA 3.0 DE"],
      ["CC0", "CC0"],
      ["Public domain", "Public domain"],
    ] as const)
      expect(acceptLicence(raw)).toEqual({ ok: true, short });
  });

  it("refuses GFDL-only, non-commercial, no-derivatives and unknown licences", () => {
    for (const raw of [
      "GFDL",
      "CC BY-NC 4.0",
      "CC BY-ND 2.0",
      "CC BY-NC-SA 3.0",
      "Fair use",
      "",
      null,
      "Copyrighted",
    ])
      expect(acceptLicence(raw).ok).toBe(false);
  });

  it("shows plain text only and links only to Creative Commons or Commons", () => {
    expect(plainText('<a href="//x">Ana &amp; <b>Ivo</b></a>')).toBe("Ana & Ivo");
    expect(plainText("<script>x</script>")).toBe("x");
    expect(safeLicenceUrl("https://creativecommons.org/licenses/by-sa/4.0")).toBe(
      "https://creativecommons.org/licenses/by-sa/4.0",
    );
    expect(safeLicenceUrl("//creativecommons.org/licenses/by/2.0/")).toBe(
      "https://creativecommons.org/licenses/by/2.0/",
    );
    expect(safeLicenceUrl("https://evil.example/x")).toBeNull();
    expect(safeLicenceUrl("javascript:alert(1)")).toBeNull();
  });
});
