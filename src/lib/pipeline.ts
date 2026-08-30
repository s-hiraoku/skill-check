import { resolveSkillInput } from "./parser";
import { validateSchema } from "./validators/schema";
import { validateDependencies } from "./validators/dependencies";
import { validateSecurity } from "./validators/security";
import { validateExecution } from "./validators/execution";
import { validateQuality } from "./validators/quality";
import type { CheckInput, SkillCheckReport } from "./types";

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

  const report: SkillCheckReport = {
    id: crypto.randomUUID(),
    name,
    description,
    source: skill.source,
    sourceType: skill.sourceType,
    createdAt: new Date().toISOString(),
    stars: computeStars(overallScore, maxScore),
    overallScore,
    maxScore,
    grade: computeGrade(overallScore, maxScore),
    checks,
    summary: buildSummary(checks),
  };

  return report;
}
