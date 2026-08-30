import type { CheckIssue, CheckResult, ParsedSkill } from "../types";

export function validateQuality(skill: ParsedSkill): CheckResult {
  const issues: CheckIssue[] = [];
  let score = 0;
  const maxScore = 15;
  const { metadata, body } = skill;

  if (metadata.source) {
    score += 2;
    issues.push({ code: "QUAL_SOURCE", message: "Has source attribution", severity: "info" });
  } else {
    issues.push({ code: "QUAL_NO_SOURCE", message: "Missing 'source' attribution in frontmatter", severity: "warning" });
    score += 1;
  }

  if (metadata.license) {
    score += 2;
    issues.push({ code: "QUAL_LICENSE", message: "License specified", severity: "info" });
  } else {
    score += 1;
  }

  const tags = metadata.tags;
  const hasTags = Array.isArray(tags) ? tags.length > 0 : typeof tags === "string" && tags.trim().length > 0;
  if (hasTags) {
    score += 2;
    issues.push({ code: "QUAL_TAGS", message: "Has categorization tags", severity: "info" });
  } else {
    score += 1;
  }

  const wordCount = body.split(/\s+/).filter(Boolean).length;
  if (wordCount >= 300) {
    score += 4;
    issues.push({ code: "QUAL_DEPTH", message: `Comprehensive content (${wordCount} words)`, severity: "info" });
  } else if (wordCount >= 100) {
    score += 3;
    issues.push({ code: "QUAL_MODERATE", message: `Moderate content depth (${wordCount} words)`, severity: "info" });
  } else {
    score += 1;
    issues.push({ code: "QUAL_SHALLOW", message: `Shallow content (${wordCount} words) — expand instructions`, severity: "warning" });
  }

  const hasReferences = /references?\//i.test(body) || /##\s+Reference/i.test(body);
  if (hasReferences) {
    score += 3;
    issues.push({ code: "QUAL_REFERENCES", message: "Includes reference documentation", severity: "info" });
  } else {
    score += 2;
  }

  const headingCount = (body.match(/^#{1,3}\s+/gm) ?? []).length;
  if (headingCount >= 3) {
    score += 2;
  } else {
    issues.push({ code: "QUAL_HEADINGS", message: "Add more section headings for navigability", severity: "info" });
    score += 1;
  }

  const hasErrors = issues.some((i) => i.severity === "error" || i.severity === "critical");
  return {
    name: "Quality Score",
    status: hasErrors ? "fail" : issues.some((i) => i.severity === "warning") ? "warn" : "pass",
    score: Math.min(score, maxScore),
    maxScore,
    issues,
    details: { wordCount, headingCount, hasTags, hasReferences },
  };
}
