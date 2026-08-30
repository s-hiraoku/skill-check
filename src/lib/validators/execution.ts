import type { CheckIssue, CheckResult, ParsedSkill } from "../types";

const WHEN_TO_USE_PATTERNS = [
  /^##\s+When\s+to\s+Use/im,
  /^##\s+Use\s+this\s+skill\s+when/im,
  /^##\s+When\s+to\s+Use\s+This\s+Skill/im,
  /^##\s+When\s+NOT\s+to\s+Use/im,
];

const ACTIONABLE_PATTERNS = [
  /^##\s+/m,
  /^-\s+/m,
  /^\d+\.\s+/m,
  /```/m,
];

/**
 * v1: Static analysis only — checks structure and references.
 * Script sandbox execution is planned for v2.
 */
export function validateExecution(skill: ParsedSkill): CheckResult {
  const issues: CheckIssue[] = [];
  let score = 0;
  const maxScore = 20;
  const body = skill.body;

  issues.push({
    code: "STATIC_V1_SCOPE",
    message: "v1 uses static analysis only; script sandbox execution is planned for v2",
    severity: "info",
  });

  const hasWhenToUse = WHEN_TO_USE_PATTERNS.some((p) => p.test(body));
  if (hasWhenToUse) {
    score += 6;
    issues.push({ code: "STATIC_WHEN_TO_USE", message: "Has 'When to Use' trigger section", severity: "info" });
  } else {
    issues.push({
      code: "STATIC_NO_WHEN_TO_USE",
      message: "Missing '## When to Use' section — agents may not trigger reliably",
      severity: "warning",
    });
    score += 2;
  }

  const actionableCount = ACTIONABLE_PATTERNS.reduce((count, p) => count + (p.test(body) ? 1 : 0), 0);
  if (actionableCount >= 3) {
    score += 6;
    issues.push({ code: "STATIC_ACTIONABLE", message: "Content has structured, actionable sections", severity: "info" });
  } else {
    issues.push({
      code: "STATIC_UNSTRUCTURED",
      message: "Limited structure detected; add headings, lists, or code blocks",
      severity: "warning",
    });
    score += 3;
  }

  const hasExamples = /examples?\//i.test(body) || /##\s+Example/i.test(body);
  if (hasExamples) {
    score += 4;
    issues.push({ code: "STATIC_EXAMPLES", message: "Includes examples section or references", severity: "info" });
  } else {
    issues.push({ code: "STATIC_NO_EXAMPLES", message: "No examples found — consider adding usage examples", severity: "info" });
    score += 2;
  }

  const hasScripts = /scripts?\//i.test(body) || /```(?:bash|sh|python|javascript|typescript)/i.test(body);
  if (hasScripts) {
    score += 4;
    issues.push({
      code: "STATIC_SCRIPT_REFS",
      message: "References scripts or code blocks (existence not verified in v1)",
      severity: "info",
    });
  } else {
    score += 2;
  }

  const hasErrors = issues.some((i) => i.severity === "error" || i.severity === "critical");
  return {
    name: "Static Analysis",
    status: hasErrors ? "fail" : issues.some((i) => i.severity === "warning") ? "warn" : "pass",
    score: Math.min(score, maxScore),
    maxScore,
    issues,
    details: { mode: "static-v1", hasWhenToUse, actionableCount, hasExamples, hasScripts },
  };
}
