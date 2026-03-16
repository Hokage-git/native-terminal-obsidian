import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function isReleaseTagMatch(actualTag, manifestVersion) {
  return actualTag === `v${manifestVersion}`;
}

export function getReleaseTagMismatchMessage(actualTag, manifestVersion) {
  if (isReleaseTagMatch(actualTag, manifestVersion)) {
    return null;
  }

  return `Tag ${actualTag} does not match manifest version v${manifestVersion}`;
}

export function verifyReleaseTag(options = {}) {
  const manifestPath = options.manifestPath ?? "manifest.json";
  const actualTag = options.actualTag ?? process.env.GITHUB_REF_NAME ?? "";
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const mismatchMessage = getReleaseTagMismatchMessage(actualTag, String(manifest.version));

  if (mismatchMessage) {
    console.error(mismatchMessage);
    process.exitCode = 1;
  }
}

export function isVerifyReleaseTagEntrypoint(importMetaUrl, argvPath) {
  if (!argvPath) {
    return false;
  }

  return path.resolve(fileURLToPath(importMetaUrl)) === path.resolve(argvPath);
}

if (isVerifyReleaseTagEntrypoint(import.meta.url, process.argv[1])) {
  verifyReleaseTag();
}
