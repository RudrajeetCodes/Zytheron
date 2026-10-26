
import { describe, expect, it } from "vitest";
import { shouldIncludeFile } from "../../src/ingestion/file-filter.js";

describe("shouldIncludeFile", () => {
  it("includes normal source files", () => {
    expect(shouldIncludeFile("src/index.ts", 100)).toBe(true);
  });

  it("ignores node_modules", () => {
    expect(
      shouldIncludeFile("node_modules/example/index.js", 100),
    ).toBe(false);
  });

  it("ignores lockfiles", () => {
    expect(shouldIncludeFile("package-lock.json", 100)).toBe(false);
  });

  it("ignores binary extensions", () => {
    expect(shouldIncludeFile("assets/logo.png", 100)).toBe(false);
  });

  it("rejects oversized files", () => {
    expect(shouldIncludeFile("src/large.ts", 500_001)).toBe(false);
  });

  it("rejects empty paths", () => {
    expect(shouldIncludeFile("", 100)).toBe(false);
  });

  it("rejects negative file sizes", () => {
    expect(shouldIncludeFile("src/index.ts", -1)).toBe(false);
  });
});
