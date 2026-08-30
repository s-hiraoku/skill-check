import matter from "gray-matter";
import type { ParsedSkill, SkillMetadata } from "./types";

export interface ParsedGithubUrl {
  owner: string;
  repo: string;
  branch?: string;
  skillPath?: string;
}

const FALLBACK_SKILL_PATHS = [
  ".cursor/skills/SKILL.md",
  ".agents/skills/SKILL.md",
];

/** Build ordered SKILL.md paths: explicit URL path → repo root → skills/* → fallbacks */
export function buildSkillPathPriority(
  explicitPath?: string,
  discoveredPaths: string[] = [],
): string[] {
  const ordered: string[] = [];

  if (explicitPath?.endsWith("SKILL.md")) {
    ordered.push(explicitPath);
  }

  ordered.push("SKILL.md");

  for (const path of discoveredPaths) {
    if (path !== "SKILL.md" && path.endsWith("SKILL.md")) {
      ordered.push(path);
    }
  }

  for (const path of FALLBACK_SKILL_PATHS) {
    ordered.push(path);
  }

  return [...new Set(ordered)];
}

export function parseGithubUrl(url: string): ParsedGithubUrl | null {
  try {
    const parsed = new URL(url.trim());
    if (parsed.hostname !== "github.com") return null;

    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    const [owner, repo, ...rest] = parts;
    const cleanRepo = repo.replace(/\.git$/, "");
    let branch: string | undefined;
    let skillPath: string | undefined;

    if (rest[0] === "tree" || rest[0] === "blob") {
      branch = rest[1];
      const pathParts = rest.slice(2);
      if (pathParts.length > 0) {
        const joined = pathParts.join("/");
        if (joined.endsWith("SKILL.md")) {
          skillPath = joined;
        }
      }
    }

    return { owner, repo: cleanRepo, branch, skillPath };
  } catch {
    return null;
  }
}

interface GithubContentEntry {
  name: string;
  path: string;
  type: "file" | "dir";
}

async function listGithubDirectory(
  owner: string,
  repo: string,
  path: string,
  ref: string,
): Promise<GithubContentEntry[] | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "SkillCheck/1.0",
    },
    next: { revalidate: 0 },
  });

  if (response.status === 404) return null;
  if (!response.ok) return null;

  const data: unknown = await response.json();
  if (!Array.isArray(data)) return null;

  return data as GithubContentEntry[];
}

/** Discover SKILL.md files under skills/ (up to 2 levels deep). */
export async function discoverSkillPaths(
  owner: string,
  repo: string,
  ref: string,
): Promise<string[]> {
  const found: string[] = [];
  const skillsDir = await listGithubDirectory(owner, repo, "skills", ref);
  if (!skillsDir) return found;

  for (const entry of skillsDir) {
    if (entry.type === "file" && entry.name === "SKILL.md") {
      found.push(entry.path);
      continue;
    }

    if (entry.type !== "dir") continue;

    found.push(`${entry.path}/SKILL.md`);

    const nested = await listGithubDirectory(owner, repo, entry.path, ref);
    if (!nested) continue;

    for (const sub of nested) {
      if (sub.type === "dir") {
        found.push(`${sub.path}/SKILL.md`);
      }
    }
  }

  return [...new Set(found)].sort();
}

async function fetchRawFile(
  owner: string,
  repo: string,
  ref: string,
  path: string,
): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
  const response = await fetch(url, { next: { revalidate: 0 } });
  if (!response.ok) return null;
  return response.text();
}

export async function fetchFromGithub(
  owner: string,
  repo: string,
  branch?: string,
  explicitPath?: string,
): Promise<{ content: string; resolvedPath: string; branch: string }> {
  const branches = branch ? [branch, "main", "master"] : ["main", "master"];
  const uniqueBranches = [...new Set(branches)];
  const triedPaths: string[] = [];

  for (const ref of uniqueBranches) {
    const discovered = await discoverSkillPaths(owner, repo, ref);
    const paths = buildSkillPathPriority(explicitPath, discovered);

    for (const skillPath of paths) {
      triedPaths.push(`${ref}:${skillPath}`);
      const content = await fetchRawFile(owner, repo, ref, skillPath);
      if (content !== null) {
        return { content, resolvedPath: skillPath, branch: ref };
      }
    }
  }

  throw new Error(
    `SKILL.md not found in ${owner}/${repo}. ` +
    `Resolution order: repo-root SKILL.md → skills/*/SKILL.md → fallbacks. ` +
    `Tried: ${triedPaths.slice(0, 8).join(", ")}${triedPaths.length > 8 ? "..." : ""}`,
  );
}

export async function resolveSkillInput(input: {
  githubUrl?: string;
  skillMarkdown?: string;
}): Promise<ParsedSkill> {
  let content: string;
  let source: string;
  let sourceType: "github" | "paste";
  let resolvedPath: string | undefined;

  if (input.githubUrl?.trim()) {
    const parsed = parseGithubUrl(input.githubUrl);
    if (!parsed) {
      throw new Error("Invalid GitHub URL. Expected format: https://github.com/owner/repo");
    }
    const fetched = await fetchFromGithub(parsed.owner, parsed.repo, parsed.branch, parsed.skillPath);
    content = fetched.content;
    resolvedPath = fetched.resolvedPath;
    source = input.githubUrl.trim();
    sourceType = "github";
  } else if (input.skillMarkdown?.trim()) {
    content = input.skillMarkdown.trim();
    source = "pasted-content";
    sourceType = "paste";
  } else {
    throw new Error("Provide either a GitHub URL or SKILL.md content");
  }

  return parseSkillContent(content, source, sourceType, resolvedPath);
}

export function parseSkillContent(
  content: string,
  source: string,
  sourceType: "github" | "paste",
  resolvedPath?: string,
): ParsedSkill {
  const sanitized = content.replace(/^\uFEFF/, "");
  const parsed = matter(sanitized);
  const metadata = (parsed.data ?? {}) as SkillMetadata;
  const frontmatterErrors: string[] = [];

  if (!sanitized.startsWith("---")) {
    frontmatterErrors.push("Missing YAML frontmatter opening delimiter (---)");
  }

  if (typeof parsed.data !== "object" || parsed.data === null || Array.isArray(parsed.data)) {
    frontmatterErrors.push("Frontmatter must be a YAML mapping/object");
  }

  return {
    source,
    sourceType,
    content: sanitized,
    metadata,
    body: parsed.content,
    frontmatterErrors,
    resolvedPath,
  };
}
