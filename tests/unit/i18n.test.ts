import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import hr from "../../messages/hr.json";
import en from "../../messages/en.json";

const leafKeys = (obj: Record<string, unknown>, prefix = ""): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object"
      ? leafKeys(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );

describe("i18n", () => {
  it("defaults to Croatian with English second", () => {
    expect(routing.defaultLocale).toBe("hr");
    expect(routing.locales).toEqual(["hr", "en"]);
  });

  it("has the same keys in both languages", () => {
    expect(leafKeys(en).sort()).toEqual(leafKeys(hr).sort());
  });
});
