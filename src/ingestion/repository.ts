
export interface RepositoryMetadata {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  htmlUrl: string;
  cloneUrl: string;
  stars: number;
  isPrivate: boolean;
  commitSha: string;
}

export interface RepositoryFile {
  path: string;
  content: string;
  size: number;
  sha: string;
}

export interface RepositorySnapshot {
  metadata: RepositoryMetadata;
  files: RepositoryFile[];
}
