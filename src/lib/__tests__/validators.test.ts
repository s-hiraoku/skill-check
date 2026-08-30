import { describe, it, expect } from "vitest";
import {
  parseSkillContent,
  parseGithubUrl,
  buildSkillPathPriority,
} from "../parser";
import { validateSchema } from "../validators/schema";
import { validateSecurity } from "../validators/security";
import { validateExecution } from "../validators/execution";

const VALID_SKILL = `---
name: test-skill
description: "A test skill for unit testing validation pipeline"
license: MIT
source: community
tags: ["testing"]
---

# Test Skill

## When to Use

Use this skill when testing the SkillCheck validation pipeline.

## Instructions

1. Run the validator
2. Review results
3. Fix any issues

## Examples

See \`examples/sample.md\` for usage examples.
`;

const INVALID_SKILL = `# No frontmatter

Just some content without YAML.
`;

describe("parseGithubUrl", () => {
  it("parses standard GitHub URLs", () => {
    expect(parseGithubUrl("https://github.com/anthropics/skills")).toEqual({
      owner: "anthropics",
      repo: "skills",
      branch: undefined,
      skillPath: undefined,
    });
  });

  it("parses blob URLs with SKILL.md path", () => {
    expect(parseGithubUrl("https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md")).toEqual({
      owner: "anthropics",
      repo: "skills",
      branch: "main",
      skillPath: "skills/skill-creator/SKILL.md",
    });
  });

  it("parses tree URLs with branch only", () => {
    expect(parseGithubUrl("https://github.com/owner/repo/tree/main/skills/foo")).toEqual({
      owner: "owner",
      repo: "repo",
      branch: "main",
      skillPath: undefined,
    });
  });

  it("returns null for invalid URLs", () => {
    expect(parseGithubUrl("https://gitlab.com/owner/repo")).toBeNull();
  });
});

describe("buildSkillPathPriority", () => {
  it("prioritizes explicit path, then root, then skills/*, then fallbacks", () => {
    const paths = buildSkillPathPriority("skills/foo/SKILL.md", [
      "skills/bar/SKILL.md",
      "skills/baz/SKILL.md",
    ]);

    expect(paths[0]).toBe("skills/foo/SKILL.md");
    expect(paths[1]).toBe("SKILL.md");
    expect(paths).toContain("skills/bar/SKILL.md");
    expect(paths).toContain(".cursor/skills/SKILL.md");
  });

  it("puts root SKILL.md first when no explicit path", () => {
    const paths = buildSkillPathPriority(undefined, ["skills/my-skill/SKILL.md"]);
    expect(paths[0]).toBe("SKILL.md");
    expect(paths[1]).toBe("skills/my-skill/SKILL.md");
  });
});

describe("parseSkillContent", () => {
  it("parses valid frontmatter", () => {
    const result = parseSkillContent(VALID_SKILL, "test", "paste");
    expect(result.metadata.name).toBe("test-skill");
    expect(result.metadata.description).toContain("test skill");
    expect(result.frontmatterErrors).toHaveLength(0);
  });

  it("detects missing frontmatter", () => {
    const result = parseSkillContent(INVALID_SKILL, "test", "paste");
    expect(result.frontmatterErrors.length).toBeGreaterThan(0);
  });

  it("stores resolvedPath for GitHub fetches", () => {
    const result = parseSkillContent(VALID_SKILL, "https://github.com/o/r", "github", "skills/foo/SKILL.md");
    expect(result.resolvedPath).toBe("skills/foo/SKILL.md");
  });
});

describe("validateSchema", () => {
  it("passes valid skill", () => {
    const skill = parseSkillContent(VALID_SKILL, "test", "paste");
    const result = validateSchema(skill);
    expect(result.status).not.toBe("fail");
    expect(result.score).toBeGreaterThan(15);
  });

  it("fails skill without name", () => {
    const content = VALID_SKILL.replace("name: test-skill\n", "");
    const skill = parseSkillContent(content, "test", "paste");
    const result = validateSchema(skill);
    expect(result.issues.some((i) => i.code === "SCHEMA_NAME_MISSING")).toBe(true);
  });
});

describe("validateSecurity", () => {
  it("detects eval usage", () => {
    const content = VALID_SKILL + "\n\nRun eval(userInput) for dynamic code.";
    const skill = parseSkillContent(content, "test", "paste");
    const result = validateSecurity(skill);
    expect(result.issues.some((i) => i.code === "SEC_EVAL")).toBe(true);
    expect(result.status).toBe("fail");
  });

  it("passes clean skill", () => {
    const skill = parseSkillContent(VALID_SKILL, "test", "paste");
    const result = validateSecurity(skill);
    expect(result.status).toBe("pass");
  });
});

describe("validateExecution (static analysis v1)", () => {
  it("detects When to Use section", () => {
    const skill = parseSkillContent(VALID_SKILL, "test", "paste");
    const result = validateExecution(skill);
    expect(result.name).toBe("Static Analysis");
    expect(result.details?.mode).toBe("static-v1");
    expect(result.details?.hasWhenToUse).toBe(true);
    expect(result.score).toBeGreaterThan(10);
  });

  it("warns when When to Use is missing", () => {
    const content = VALID_SKILL.replace("## When to Use\n\nUse this skill when testing the SkillCheck validation pipeline.\n\n", "");
    const skill = parseSkillContent(content, "test", "paste");
    const result = validateExecution(skill);
    expect(result.issues.some((i) => i.code === "STATIC_NO_WHEN_TO_USE")).toBe(true);
  });

  it("documents v1 static-only scope", () => {
    const skill = parseSkillContent(VALID_SKILL, "test", "paste");
    const result = validateExecution(skill);
    expect(result.issues.some((i) => i.code === "STATIC_V1_SCOPE")).toBe(true);
  });
});
