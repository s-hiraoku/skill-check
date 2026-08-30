import { describe, it, expect } from "vitest";
import { parseSkillContent, parseGithubUrl } from "../parser";
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
    });
  });

  it("parses tree URLs with branch", () => {
    expect(parseGithubUrl("https://github.com/owner/repo/tree/main/skills/foo")).toEqual({
      owner: "owner",
      repo: "repo",
      branch: "main",
    });
  });

  it("returns null for invalid URLs", () => {
    expect(parseGithubUrl("https://gitlab.com/owner/repo")).toBeNull();
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

describe("validateExecution", () => {
  it("detects When to Use section", () => {
    const skill = parseSkillContent(VALID_SKILL, "test", "paste");
    const result = validateExecution(skill);
    expect(result.details?.hasWhenToUse).toBe(true);
    expect(result.score).toBeGreaterThan(10);
  });

  it("warns when When to Use is missing", () => {
    const content = VALID_SKILL.replace("## When to Use\n\nUse this skill when testing the SkillCheck validation pipeline.\n\n", "");
    const skill = parseSkillContent(content, "test", "paste");
    const result = validateExecution(skill);
    expect(result.issues.some((i) => i.code === "EXEC_NO_WHEN_TO_USE")).toBe(true);
  });
});
