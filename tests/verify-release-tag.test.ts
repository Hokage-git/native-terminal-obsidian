import { describe, expect, it } from "vitest";
import {
  getReleaseTagMismatchMessage,
  isReleaseTagMatch,
  isVerifyReleaseTagEntrypoint,
} from "../scripts/verify-release-tag.mjs";

describe("verify-release-tag", () => {
  it("accepts a matching manifest version tag", () => {
    expect(isReleaseTagMatch("v0.2.16", "0.2.16")).toBe(true);
    expect(getReleaseTagMismatchMessage("v0.2.16", "0.2.16")).toBeNull();
  });

  it("reports a clear mismatch message for the release workflow", () => {
    expect(isReleaseTagMatch("v0.2.15", "0.2.16")).toBe(false);
    expect(getReleaseTagMismatchMessage("v0.2.15", "0.2.16")).toBe(
      "Tag v0.2.15 does not match manifest version v0.2.16",
    );
  });

  it("detects direct script execution on Windows-style paths", () => {
    expect(
      isVerifyReleaseTagEntrypoint(
        "file:///C:/repo/scripts/verify-release-tag.mjs",
        "C:\\repo\\scripts\\verify-release-tag.mjs",
      ),
    ).toBe(true);
  });
});
