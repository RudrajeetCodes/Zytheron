
export interface GitHubRepository {
  owner: string;
  repo: string;
  url: string;
}

const GITHUB_HOST = "github.com";

export function parseGitHubRepositoryUrl(
  input: string,
): GitHubRepository {
  const value = input.trim();

  if (!value) {
    throw new Error("GitHub repository URL cannot be empty.");
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid URL. Provide a valid GitHub repository URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Only HTTPS GitHub URLs are supported.");
  }

  if (url.hostname.toLowerCase() !== GITHUB_HOST) {
    throw new Error("URL must use github.com.");
  }

  if (url.port || url.username || url.password) {
    throw new Error("Custom ports and embedded credentials are not allowed.");
  }

  const segments = url.pathname.split("/").filter(Boolean);

  if (segments.length !== 2) {
    throw new Error(
      "Provide a repository URL in the format https://github.com/owner/repo.",
    );
  }

  const [owner, rawRepo] = segments;

  if (!owner || !rawRepo) {
    throw new Error("Repository owner and name are required.");
  }

  const repo = rawRepo.replace(/\.git$/i, "");

  if (
    !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(owner) ||
    !/^[A-Za-z0-9._-]+$/.test(repo) ||
    repo === "." ||
    repo === ".."
  ) {
    throw new Error("Invalid GitHub repository owner or name.");
  }

  return {
    owner,
    repo,
    url: `https://github.com/${owner}/${repo}`,
  };
}
