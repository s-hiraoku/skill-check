import type { CheckIssue, CheckResult, ParsedSkill } from "../types";

const DEPENDENCY_PATTERNS = [
  { pattern: /npm (install|i|run)\b/gi, type: "npm" },
  { pattern: /npx\b/gi, type: "npx" },
  { pattern: /pip install\b/gi, type: "pip" },
  { pattern: /python3?\s+/gi, type: "python" },
  { pattern: /node\s+/gi, type: "node" },
  { pattern: /brew install\b/gi, type: "brew" },
  { pattern: /apt(-get)? install\b/gi, type: "apt" },
  { pattern: /docker (run|build|compose)\b/gi, type: "docker" },
  { pattern: /curl\b.*\|\s*(ba)?sh/gi, type: "curl-pipe-sh" },
];

const SCRIPT_REF_PATTERN = /(?:scripts?\/|\.\/)[\w./-]+\.(?:py|js|mjs|ts|sh|bash)/gi;

export function validateDependencies(skill: ParsedSkill): CheckResult {
  const issues: CheckIssue[] = [];
  let score = 0;
  const maxScore = 20;
  const content = skill.content;
  const deps = new Set<string>();
  const scriptRefs = new Set<string>();

  for (const { pattern, type } of DEPENDENCY_PATTERNS) {
    if (pattern.test(content)) {
      deps.add(type);
    }
  }

  const scriptMatches = content.match(SCRIPT_REF_PATTERN) ?? [];
  for (const ref of scriptMatches) {
    scriptRefs.add(ref);
  }

  if (deps.has("curl-pipe-sh")) {
    issues.push({
      code: "DEP_CURL_PIPE",
      message: "References curl | bash pattern — verify source trustworthiness",
      severity: "warning",
    });
    score += 2;
  } else {
    score += 4;
  }

  if (deps.size === 0) {
    issues.push({ code: "DEP_NONE", message: "No external tool dependencies detected (self-contained skill)", severity: "info" });
    score += 8;
  } else {
    score += Math.min(deps.size * 2, 8);
    issues.push({
      code: "DEP_DETECTED",
      message: `Detected dependencies: ${[...deps].join(", ")}`,
      severity: "info",
    });
  }

  if (scriptRefs.size > 0) {
    score += 4;
    issues.push({
      code: "DEP_SCRIPTS",
      message: `Referenced helper scripts: ${[...scriptRefs].slice(0, 5).join(", ")}${scriptRefs.size > 5 ? "..." : ""}`,
      severity: "info",
    });
  } else {
    issues.push({ code: "DEP_NO_SCRIPTS", message: "No helper scripts referenced in content", severity: "info" });
    score += 4;
  }

  const hasCompatibility = Boolean(skill.metadata.compatibility);
  if (hasCompatibility) {
    score += 4;
  } else if (deps.size > 0) {
    issues.push({
      code: "DEP_NO_COMPAT",
      message: "Skill uses external tools but lacks 'compatibility' frontmatter",
      severity: "warning",
    });
    score += 2;
  } else {
    score += 4;
  }

  const hasErrors = issues.some((i) => i.severity === "error" || i.severity === "critical");
  return {
    name: "Dependency Check",
    status: hasErrors ? "fail" : issues.some((i) => i.severity === "warning") ? "warn" : "pass",
    score: Math.min(score, maxScore),
    maxScore,
    issues,
    details: { dependencies: [...deps], scripts: [...scriptRefs] },
  };
}
