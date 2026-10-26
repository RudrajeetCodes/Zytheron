
import { parseGitHubRepositoryUrl } from "./github-url.js";
import { shouldIncludeFile } from "./file-filter.js";
import type {
  RepositoryFile,
  RepositoryMetadata,
  RepositorySnapshot,
} from "./repository.js";

const API_BASE = "https://api.github.com";
const USER_AGENT = "Zytheron-Code-Intelligence";
const MAX_FILES = 2_000;
const MAX_TOTAL_BYTES = 20_000_000;

interface GitHubRepositoryResponse {
  name: string;
  full_name: string;
  owner: { login: string };
  description: string | null;
  default_branch: string;
  html_url: string;
  clone_url: string;
  stargazers_count: number;
  private: boolean;
}

interface GitHubCommitResponse {
  sha: string;
}

interface GitHubTreeEntry {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
  url: string;
}

interface GitHubTreeResponse {
  tree: GitHubTreeEntry[];
  truncated: boolean;
}

interface GitHubContentResponse {
  content: string;
  encoding: string;
  size: number;
}

export class GitHubClient {
  constructor(private readonly token?: string) {}

  private async request<T>(url: string): Promise<T> {
    const parsed = new URL(url);

    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== "api.github.com"
    ) {
      throw new Error("GitHub API requests must target api.github.com over HTTPS.");
    }

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": USER_AGENT,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(parsed, {
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          "Repository not found or inaccessible. Check the URL and permissions.",
        );
      }

      if (response.status === 403 || response.status === 429) {
        throw new Error(
          "GitHub API rate limit or access restriction reached. Try again later.",
        );
      }

      throw new Error(`GitHub API request failed with status ${response.status}.`);
    }

    return await response.json() as T;
  }

  async fetchRepository(input: string): Promise<RepositorySnapshot> {
    const { owner, repo } = parseGitHubRepositoryUrl(input);
    const encodedOwner = encodeURIComponent(owner);
    const encodedRepo = encodeURIComponent(repo);

    const baseUrl =
      `${API_BASE}/repos/${encodedOwner}/${encodedRepo}`;

    const repository = await this.request<GitHubRepositoryResponse>(
      baseUrl,
    );

    const commit = await this.request<GitHubCommitResponse>(
      `${baseUrl}/commits/${encodeURIComponent(repository.default_branch)}`,
    );

    const tree = await this.request<GitHubTreeResponse>(
      `${baseUrl}/git/trees/${commit.sha}?recursive=1`,
    );

    if (tree.truncated) {
      throw new Error(
        "Repository tree is too large for this initial indexer. A paginated strategy is needed.",
      );
    }

    const entries = tree.tree.filter((entry) =>
      entry.type === "blob" &&
      entry.mode !== "120000" &&
      shouldIncludeFile(entry.path, entry.size ?? 0)
    );

    if (entries.length > MAX_FILES) {
      throw new Error(
        `Repository has more than ${MAX_FILES} eligible files. Repository indexing limit exceeded.`,
      );
    }

    const metadata: RepositoryMetadata = {
      owner: repository.owner.login,
      name: repository.name,
      fullName: repository.full_name,
      description: repository.description,
      defaultBranch: repository.default_branch,
      htmlUrl: repository.html_url,
      cloneUrl: repository.clone_url,
      stars: repository.stargazers_count,
      isPrivate: repository.private,
      commitSha: commit.sha,
    };

    const files: RepositoryFile[] = [];
    let totalBytes = 0;

    for (const entry of entries) {
      const size = entry.size ?? 0;

      if (totalBytes + size > MAX_TOTAL_BYTES) {
        break;
      }

      const contentResponse =
        await this.request<GitHubContentResponse>(
          `${API_BASE}/repos/${encodedOwner}/${encodedRepo}/contents/${entry.path
            .split("/")
            .map(encodeURIComponent)
            .join("/")}?ref=${commit.sha}`,
        );

      if (contentResponse.encoding !== "base64") {
        continue;
      }

      const content = Buffer.from(
        contentResponse.content.replace(/\s/g, ""),
        "base64",
      ).toString("utf8");

      if (content.includes("\u0000")) {
        continue;
      }

      files.push({
        path: entry.path,
        content,
        size: Buffer.byteLength(content, "utf8"),
        sha: entry.sha,
      });

      totalBytes += Buffer.byteLength(content, "utf8");
    }

    return { metadata, files };
  }
}
