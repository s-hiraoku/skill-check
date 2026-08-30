import matter from "gray-matter";
import type { ParsedSkill, SkillMetadata } from "./types";

const GITHUB_SKILL_PATHS = [
  "SKILL.md",
  "skills/SKILL.md",
  ".cursor/skills/SKILL.md",
];

export function parseGithubUrl(url: string): { owner: string; repo: string; branch?: string } | null {
  try {
    const parsed = new URL(url.trim());
    if (parsed.hostname !== "github.com") return null;

    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    const [owner, repo, ...rest] = parts;
    const cleanRepo = repo.replace(/\.git$/, "");
    let branch: string | undefined;

    if (rest[0] === "tree" || rest[0] === "blob") {
      branch = rest[1];
    }

    return { owner, repo: cleanRepo, branch };
  } catch {
    return null;
  }
}

async function fetchFromGithub(owner: string, repo: string, branch = "main"): Promise<string> {
  const branches = branch ? [branch, "main", "master"] : ["main", "master"];
  const uniqueBranches = [...new Set(branches)];

  for (const ref of uniqueBranches) {
    for (const skillPath of GITHUB_SKILL_PATHS) {
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${skillPath}`;
      const response = await fetch(url, { next: { revalidate: 0 } });
      if (response.ok) {
        return response.text();
      }
    }
  }

  throw new Error(`SKILL.md not found in ${owner}/${repo}. Tried common paths on branches: ${uniqueBranches.join(", ")}`);
}

export async function resolveSkillInput(input: {
  githubUrl?: string;
  skillMarkdown?: string;
}): Promise<ParsedSkill> {
  let content: string;
  let source: string;
  let sourceType: "github" | "paste";

  if (input.githubUrl?.trim()) {
    const parsed = parseGithubUrl(input.githubUrl);
    if (!parsed) {
      throw new Error("Invalid GitHub URL. Expected format: https://github.com/owner/repo");
    }
    content = await fetchFromGithub(parsed.owner, parsed.repo, parsed.branch);
    source = input.githubUrl.trim();
    sourceType = "github";
  } else if (input.skillMarkdown?.trim()) {
    content = input.skillMarkdown.trim();
    source = "pasted-content";
    sourceType = "paste";
  } else {
    throw new Error("Provide either a GitHub URL or SKILL.md content");
  }

  return parseSkillContent(content, source, sourceType);
}

export function parseSkillContent(
  content: string,
  source: string,
  sourceType: "github" | "paste",
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
  };
}
