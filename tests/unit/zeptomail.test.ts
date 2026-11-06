import { afterEach, describe, expect, it, vi } from "vitest";
import { authorization, parseFrom, sendZepto, zeptoRequest } from "@/lib/auth/zeptomail";

const opts = {
  apiUrl: "https://api.zeptomail.example/",
  token: "secret-token",
  from: "GrooveRift <no-reply@grooverift.com>",
};
const mail = { to: "ana@example.test", subject: "Potvrdi adresu", text: "Link: https://x.test/a" };

describe("ZeptoMail transport (A7, D-110)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("parses the sender with and without a display name", () => {
    expect(parseFrom("GrooveRift <no-reply@grooverift.com>")).toEqual({
      name: "GrooveRift",
      address: "no-reply@grooverift.com",
    });
    expect(parseFrom('"Groove Rift" <a@b.hr>')).toEqual({ name: "Groove Rift", address: "a@b.hr" });
    expect(parseFrom("<a@b.hr>")).toEqual({ address: "a@b.hr" });
    expect(parseFrom(" a@b.hr ")).toEqual({ address: "a@b.hr" });
  });

  it("accepts the token with or without its scheme", () => {
    expect(authorization("abc")).toBe("Zoho-enczapikey abc");
    expect(authorization("Zoho-enczapikey abc")).toBe("Zoho-enczapikey abc");
  });

  it("builds one plain-text message to one recipient", () => {
    const { url, init } = zeptoRequest(mail, opts);
    expect(url).toBe("https://api.zeptomail.example/v1.1/email");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Zoho-enczapikey secret-token",
    );
    expect(JSON.parse(init.body as string)).toEqual({
      from: { name: "GrooveRift", address: "no-reply@grooverift.com" },
      to: [{ email_address: { address: "ana@example.test" } }],
      subject: "Potvrdi adresu",
      textbody: "Link: https://x.test/a",
    });
  });

  it("reports only the status and the error code on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { error: { code: "TM_3201", details: [{ target: "ana@example.test" }] } },
          { status: 400 },
        ),
      ),
    );
    const error = await sendZepto(mail, opts).catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("ZeptoMail answered 400 (TM_3201)");
    expect((error as Error).message).not.toContain("ana@");
  });

  it("resolves on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ message: "OK" }, { status: 201 })),
    );
    await expect(sendZepto(mail, opts)).resolves.toBeUndefined();
  });
});
