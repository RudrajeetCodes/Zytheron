
import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubClient } from "../../src/ingestion/github-client.js";

const repositoryResponse = {
  name: "demo",
  full_name: "owner/demo",
  owner: { login: "owner" },
  description: "Demo repository",
  default_branch: "main",
  html_url: "https://github.com/owner/demo",
  clone_url: "https://github.com/owner/demo.git",
  stargazers_count: 42,
  private: false,
};

const commitResponse = {
  sha: "abc123",
};

const treeResponse = {
  truncated: false,
  tree: [
    {
      path: "src/index.ts",
      mode: "100644",
      type: "blob",
      sha: "file123",
      size: 20,
      url: "https://api.github.com/example",
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GitHubClient", () => {
  it("fetches repository metadata and source files", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        Response.json(repositoryResponse),
      )
      .mockResolvedValueOnce(
        Response.json(commitResponse),
      )
      .mockResolvedValueOnce(
        Response.json(treeResponse),
      )
      .mockResolvedValueOnce(
        Response.json({
          encoding: "base64",
          size: 20,
          content: Buffer.from("console.log('hello');").toString("base64"),
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const client = new GitHubClient();
    const result = await client.fetchRepository(
      "https://github.com/owner/demo",
    );

    expect(result.metadata.fullName).toBe("owner/demo");
    expect(result.metadata.commitSha).toBe("abc123");
    expect(result.files).toHaveLength(1);
    expect(result.files[0]?.path).toBe("src/index.ts");
    expect(result.files[0]?.content).toBe("console.log('hello');");
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("rejects repositories that cannot be found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Not Found", { status: 404 }),
      ),
    );

    const client = new GitHubClient();

    await expect(
      client.fetchRepository("https://github.com/owner/missing"),
    ).rejects.toThrow(/not found or inaccessible/i);
  });

  it("reports GitHub rate limits", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Rate limited", { status: 403 }),
      ),
    );

    const client = new GitHubClient();

    await expect(
      client.fetchRepository("https://github.com/owner/demo"),
    ).rejects.toThrow(/rate limit or access restriction/i);
  });

  it("rejects a truncated repository tree", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json(repositoryResponse))
      .mockResolvedValueOnce(Response.json(commitResponse))
      .mockResolvedValueOnce(
        Response.json({ truncated: true, tree: [] }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const client = new GitHubClient();

    await expect(
      client.fetchRepository("https://github.com/owner/demo"),
    ).rejects.toThrow(/tree is too large/i);
  });

  it("rejects non-GitHub URLs before making a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const client = new GitHubClient();

    await expect(
      client.fetchRepository("https://example.com/owner/demo"),
    ).rejects.toThrow(/github\.com/i);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
