import type { CheckIssue, CheckResult, ParsedSkill } from "../types";

const SECURITY_PATTERNS: Array<{ pattern: RegExp; code: string; message: string; severity: CheckIssue["severity"] }> = [
  { pattern: /\beval\s*\(/gi, code: "SEC_EVAL", message: "Contains eval() — potential code injection risk", severity: "critical" },
  { pattern: /\bexec\s*\(/gi, code: "SEC_EXEC", message: "Contains exec() — review for shell injection", severity: "error" },
  { pattern: /rm\s+-rf\s+\/(?:\s|$)/gi, code: "SEC_RM_RF", message: "Contains destructive rm -rf / command", severity: "critical" },
  { pattern: /(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}['"]/gi, code: "SEC_HARDCODED", message: "Possible hardcoded secret detected", severity: "critical" },
  { pattern: /curl\b[^\n]*\|\s*(ba)?sh/gi, code: "SEC_CURL_PIPE", message: "curl | bash pattern — high trust requirement", severity: "warning" },
  { pattern: /sudo\s+/gi, code: "SEC_SUDO", message: "References sudo — requires elevated privileges", severity: "warning" },
  { pattern: /chmod\s+[0-7]{3,4}/gi, code: "SEC_CHMOD", message: "References chmod — verify permission changes", severity: "info" },
  { pattern: />\s*\/etc\//gi, code: "SEC_ETC_WRITE", message: "Potential write to /etc/ path", severity: "error" },
];

const OFFENSIVE_DISCLAIMER = /AUTHORIZED USE ONLY/i;

export function validateSecurity(skill: ParsedSkill): CheckResult {
  const issues: CheckIssue[] = [];
  let score = 20;
  const maxScore = 20;
  const content = skill.content;
  const risk = typeof skill.metadata.risk === "string" ? skill.metadata.risk.toLowerCase() : undefined;

  for (const { pattern, code, message, severity } of SECURITY_PATTERNS) {
    if (pattern.test(content)) {
      issues.push({ code, message, severity });
      if (severity === "critical") score -= 8;
      else if (severity === "error") score -= 5;
      else if (severity === "warning") score -= 2;
    }
  }

  if (risk === "offensive" && !OFFENSIVE_DISCLAIMER.test(content)) {
    issues.push({
      code: "SEC_OFFENSIVE_DISCLAIMER",
      message: "Offensive-risk skill missing 'AUTHORIZED USE ONLY' disclaimer",
      severity: "critical",
    });
    score -= 10;
  }

  if (risk && !["none", "safe", "critical", "offensive"].includes(risk)) {
    issues.push({
      code: "SEC_INVALID_RISK",
      message: `Invalid risk level '${risk}'. Expected: none, safe, critical, offensive`,
      severity: "warning",
    });
    score -= 2;
  }

  if (issues.length === 0) {
    issues.push({ code: "SEC_CLEAN", message: "No security red flags detected", severity: "info" });
  }

  score = Math.max(0, Math.min(score, maxScore));
  const hasCritical = issues.some((i) => i.severity === "critical");
  const hasError = issues.some((i) => i.severity === "error");

  return {
    name: "Security Scan",
    status: hasCritical || hasError ? "fail" : issues.some((i) => i.severity === "warning") ? "warn" : "pass",
    score,
    maxScore,
    issues,
    details: { riskLevel: risk ?? "unknown" },
  };
}
