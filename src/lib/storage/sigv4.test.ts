import { describe, expect, it } from "vitest";
import { amzDate, sha256Hex, signV4 } from "./sigv4";

describe("signV4", () => {
  it("matches the AWS S3 reference example (GET Object with a Range header)", () => {
    // From the AWS S3 API reference, "Signature Calculations for the Authorization Header", example GET Object.
    const headers = signV4({
      method: "GET",
      url: new URL("https://examplebucket.s3.amazonaws.com/test.txt"),
      headers: { range: "bytes=0-9" },
      payloadHash: sha256Hex(""),
      accessKeyId: "AKIAIOSFODNN7EXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      region: "us-east-1",
      date: new Date("2013-05-24T00:00:00Z"),
    });
    expect(headers.authorization).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, " +
        "SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, " +
        "Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
    );
    expect(headers["x-amz-date"]).toBe("20130524T000000Z");
  });

  it("formats the request date without separators or milliseconds", () => {
    expect(amzDate(new Date("2026-11-06T17:05:09.123Z"))).toBe("20261106T170509Z");
  });
});
