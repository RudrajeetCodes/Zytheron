
import { describe, expect, it } from "vitest";
import { parseGitHubRepositoryUrl } from "../../src/ingestion/github-url.js";

describe("parseGitHubRepositoryUrl", () => {
  it("parses a valid repository URL", () => {
    expect(
      parseGitHubRepositoryUrl("https://github.com/facebook/react"),
    ).toEqual({
      owner: "facebook",
      repo: "react",
      url: "https://github.com/facebook/react",
    });
  });

  it("trims whitespace", () => {
    expect(
      parseGitHubRepositoryUrl("  https://github.com/vercel/next.js  ").repo,
    ).toBe("next.js");
  });

  it("supports URLs ending in .git", () => {
    expect(
      parseGitHubRepositoryUrl("https://github.com/facebook/react.git").repo,
    ).toBe("react");
  });

  it("rejects non-HTTPS URLs", () => {
    expect(() =>
      parseGitHubRepositoryUrl("http://github.com/facebook/react"),
    ).toThrow(/HTTPS/);
  });

  it("rejects other hosts", () => {
    expect(() =>
      parseGitHubRepositoryUrl("https://example.com/facebook/react"),
    ).toThrow(/github\.com/);
  });

  it("rejects repository subpages", () => {
    expect(() =>
      parseGitHubRepositoryUrl("https://github.com/facebook/react/tree/main"),
    ).toThrow(/repository URL/);
  });

  it("rejects empty input", () => {
    expect(() => parseGitHubRepositoryUrl("  ")).toThrow(/cannot be empty/);
  });

  it("rejects embedded credentials", () => {
    expect(() =>
      parseGitHubRepositoryUrl(
        "https://user:password@github.com/facebook/react",
      ),
    ).toThrow(/credentials/);
  });
});
