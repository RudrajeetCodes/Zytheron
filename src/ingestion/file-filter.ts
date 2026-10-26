
const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "vendor",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
  "__pycache__",
  ".venv",
  "venv",
  "target",
]);

const IGNORED_FILENAMES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
  "composer.lock",
  "Cargo.lock",
  "poetry.lock",
  "Pipfile.lock",
  "Gemfile.lock",
]);

const IGNORED_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico",
  ".pdf", ".zip", ".gz", ".tar", ".rar", ".7z",
  ".mp3", ".mp4", ".mov", ".wav",
  ".exe", ".dll", ".so", ".dylib", ".bin", ".class",
  ".woff", ".woff2", ".ttf", ".otf",
  ".lock",
]);

export interface FileFilterOptions {
  maxFileSizeBytes?: number;
}

export function shouldIncludeFile(
  path: string,
  size: number,
  options: FileFilterOptions = {},
): boolean {
  const maxFileSizeBytes = options.maxFileSizeBytes ?? 500_000;

  if (!path || size < 0 || size > maxFileSizeBytes) {
    return false;
  }

  const normalizedPath = path.replace(/\\/g, "/");
  const segments = normalizedPath.split("/");
  const filename = segments.at(-1)?.toLowerCase();

  if (!filename || segments.some((segment) =>
    IGNORED_DIRECTORIES.has(segment.toLowerCase())
  )) {
    return false;
  }

  if (IGNORED_FILENAMES.has(filename)) {
    return false;
  }

  const lastDot = filename.lastIndexOf(".");
  const extension = lastDot >= 0 ? filename.slice(lastDot) : "";

  if (IGNORED_EXTENSIONS.has(extension)) {
    return false;
  }

  return true;
}
