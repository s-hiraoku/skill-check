export type CheckStatus = "pass" | "warn" | "fail";

export type CheckSeverity = "info" | "warning" | "error" | "critical";

export interface CheckIssue {
  code: string;
  message: string;
  severity: CheckSeverity;
  line?: number;
}

export interface CheckResult {
  name: string;
  status: CheckStatus;
  score: number;
  maxScore: number;
  issues: CheckIssue[];
  details?: Record<string, unknown>;
}

export interface SkillMetadata {
  name?: string;
  description?: string;
  license?: string;
  "allowed-tools"?: string | string[];
  metadata?: Record<string, unknown>;
  compatibility?: string;
  risk?: string;
  source?: string;
  tags?: string | string[];
  environments?: string | string[];
  [key: string]: unknown;
}

export interface ParsedSkill {
  source: string;
  sourceType: "github" | "paste";
  content: string;
  metadata: SkillMetadata;
  body: string;
  frontmatterErrors: string[];
  /** GitHub fetch only: path where SKILL.md was found */
  resolvedPath?: string;
}

export interface SkillCheckReport {
  id: string;
  name: string;
  description: string;
  source: string;
  sourceType: "github" | "paste";
  createdAt: string;
  stars: number;
  overallScore: number;
  maxScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  checks: CheckResult[];
  summary: string;
  /** GitHub fetch only: e.g. skills/my-skill/SKILL.md */
  resolvedPath?: string;
}

export interface CheckInput {
  githubUrl?: string;
  skillMarkdown?: string;
}
