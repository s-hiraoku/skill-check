import type { CheckIssue, CheckResult, ParsedSkill } from "../types";

const ALLOWED_PROPERTIES = new Set([
  "name",
  "description",
  "license",
  "allowed-tools",
  "metadata",
  "compatibility",
  "risk",
  "source",
  "tags",
  "environments",
]);

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateSchema(skill: ParsedSkill): CheckResult {
  const issues: CheckIssue[] = [];
  let score = 0;
  const maxScore = 25;
  const { metadata, frontmatterErrors } = skill;

  for (const error of frontmatterErrors) {
    issues.push({ code: "SCHEMA_FRONTMATTER", message: error, severity: "error" });
  }

  if (frontmatterErrors.length === 0) {
    score += 5;
  }

  if (!metadata.name) {
    issues.push({ code: "SCHEMA_NAME_MISSING", message: "Missing required 'name' in frontmatter", severity: "error" });
  } else if (typeof metadata.name !== "string") {
    issues.push({ code: "SCHEMA_NAME_TYPE", message: "Name must be a string", severity: "error" });
  } else {
    const name = metadata.name.trim();
    if (!KEBAB_CASE.test(name)) {
      issues.push({
        code: "SCHEMA_NAME_FORMAT",
        message: `Name '${name}' should be kebab-case (lowercase letters, digits, hyphens)`,
        severity: "error",
      });
    } else if (name.length > 64) {
      issues.push({ code: "SCHEMA_NAME_LENGTH", message: `Name exceeds 64 characters (${name.length})`, severity: "error" });
    } else {
      score += 5;
    }
  }

  if (!metadata.description) {
    issues.push({ code: "SCHEMA_DESC_MISSING", message: "Missing required 'description' in frontmatter", severity: "error" });
  } else if (typeof metadata.description !== "string") {
    issues.push({ code: "SCHEMA_DESC_TYPE", message: "Description must be a string", severity: "error" });
  } else {
    const description = metadata.description.trim();
    if (description.includes("<") || description.includes(">")) {
      issues.push({ code: "SCHEMA_DESC_ANGLE", message: "Description cannot contain angle brackets", severity: "error" });
    } else if (description.length > 1024) {
      issues.push({ code: "SCHEMA_DESC_LENGTH", message: `Description exceeds 1024 characters (${description.length})`, severity: "error" });
    } else if (description.length < 20) {
      issues.push({ code: "SCHEMA_DESC_SHORT", message: "Description is very short; aim for a clear trigger phrase", severity: "warning" });
      score += 3;
    } else {
      score += 5;
    }
  }

  if (metadata.compatibility && typeof metadata.compatibility === "string" && metadata.compatibility.length > 500) {
    issues.push({ code: "SCHEMA_COMPAT_LENGTH", message: "Compatibility field exceeds 500 characters", severity: "error" });
  } else if (metadata.compatibility) {
    score += 2;
  }

  const unexpected = Object.keys(metadata).filter((key) => !ALLOWED_PROPERTIES.has(key));
  if (unexpected.length > 0) {
    issues.push({
      code: "SCHEMA_UNEXPECTED_KEYS",
      message: `Unexpected frontmatter keys: ${unexpected.join(", ")}`,
      severity: "warning",
    });
    score += 3;
  } else {
    score += 5;
  }

  if (skill.body.trim().length < 100) {
    issues.push({ code: "SCHEMA_BODY_SHORT", message: "Skill body is very short; add actionable instructions", severity: "warning" });
  } else {
    score += 5;
  }

  const hasErrors = issues.some((i) => i.severity === "error" || i.severity === "critical");
  return {
    name: "Schema Validation",
    status: hasErrors ? "fail" : issues.some((i) => i.severity === "warning") ? "warn" : "pass",
    score: Math.min(score, maxScore),
    maxScore,
    issues,
    details: { metadata },
  };
}
