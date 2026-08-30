import { resolveSkillInput } from "./parser";
import { validateSchema } from "./validators/schema";
import { validateDependencies } from "./validators/dependencies";
import { validateSecurity } from "./validators/security";
import { validateExecution } from "./validators/execution";
import { validateQuality } from "./validators/quality";
import type { CheckInput, CheckResult, SkillCheckReport } from "./types";

const GRADE_RANK: Record<SkillCheckReport["grade"], number> = {
  A: 4,
  B: 3,
  C: 2,
  D: 1,
  F: 0,
};

function computeStars(score: number, maxScore: number): number {
  const ratio = score / maxScore;
  if (ratio >= 0.9) return 5;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.6) return 3;
  if (ratio >= 0.4) return 2;
  return 1;
}

function computeGrade(score: number, maxScore: number): SkillCheckReport["grade"] {
  const ratio = score / maxScore;
  if (ratio >= 0.9) return "A";
  if (ratio >= 0.75) return "B";
  if (ratio >= 0.6) return "C";
  if (ratio >= 0.4) return "D";
  return "F";
}

/**
 * Safety signal override: failed / critical security findings must not show as A/★★★★★.
 * - Any critical issue → max grade D, max 2 stars
 * - Security Scan fail → max grade C, max 3 stars
 */
export function applySafetyCaps(
  stars: number,
  grade: SkillCheckReport["grade"],
  checks: CheckResult[],
): { stars: number; grade: SkillCheckReport["grade"] } {
  let cappedStars = stars;
  let cappedGrade = grade;

  const hasCritical = checks.some((c) => c.issues.some((i) => i.severity === "critical"));
  const securityFailed = checks.some((c) => c.name === "Security Scan" && c.status === "fail");

  if (hasCritical) {
    cappedStars = Math.min(cappedStars, 2);
    if (GRADE_RANK[cappedGrade] > GRADE_RANK.D) {
      cappedGrade = "D";
    }
  } else if (securityFailed) {
    cappedStars = Math.min(cappedStars, 3);
    if (GRADE_RANK[cappedGrade] > GRADE_RANK.C) {
      cappedGrade = "C";
    }
  }

  return { stars: cappedStars, grade: cappedGrade };
}

function buildSummary(checks: SkillCheckReport["checks"]): string {
  const failed = checks.filter((c) => c.status === "fail").length;
  const warned = checks.filter((c) => c.status === "warn").length;
  const passed = checks.filter((c) => c.status === "pass").length;

  if (failed > 0) {
    return `${failed} check(s) failed, ${warned} warning(s). Review critical issues before publishing.`;
  }
  if (warned > 0) {
    return `${passed} checks passed with ${warned} warning(s). Skill is usable but could be improved.`;
  }
  return `All ${passed} checks passed. Skill meets quality standards.`;
}

export async function runSkillCheck(input: CheckInput): Promise<SkillCheckReport> {
  const skill = await resolveSkillInput(input);
  const checks = [
    validateSchema(skill),
    validateDependencies(skill),
    validateSecurity(skill),
    validateExecution(skill),
    validateQuality(skill),
  ];

  const overallScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.maxScore, 0);
  const name = typeof skill.metadata.name === "string" ? skill.metadata.name : "unknown-skill";
  const description = typeof skill.metadata.description === "string" ? skill.metadata.description : "";

  const { stars, grade } = applySafetyCaps(
    computeStars(overallScore, maxScore),
    computeGrade(overallScore, maxScore),
    checks,
  );

  const report: SkillCheckReport = {
    id: crypto.randomUUID(),
    name,
    description,
    source: skill.source,
    sourceType: skill.sourceType,
    createdAt: new Date().toISOString(),
    stars,
    overallScore,
    maxScore,
    grade,
    checks,
    summary: buildSummary(checks),
    resolvedPath: skill.resolvedPath,
  };

  return report;
}
