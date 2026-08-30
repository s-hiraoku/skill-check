import { describe, it, expect } from "vitest";
import { generateHtmlReport } from "../report";
import type { SkillCheckReport } from "../types";

const mockReport: SkillCheckReport = {
  id: "test-id",
  name: "test-skill",
  description: "A test skill",
  source: "pasted-content",
  sourceType: "paste",
  createdAt: "2026-08-30T00:00:00.000Z",
  stars: 4,
  overallScore: 80,
  maxScore: 100,
  grade: "B",
  summary: "All checks passed with 1 warning.",
  checks: [
    {
      name: "Schema Validation",
      status: "pass",
      score: 25,
      maxScore: 25,
      issues: [{ code: "SCHEMA_OK", message: "Valid schema", severity: "info" }],
    },
  ],
};

describe("generateHtmlReport", () => {
  it("generates valid HTML with skill name", () => {
    const html = generateHtmlReport(mockReport);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("test-skill");
    expect(html).toContain("Schema Validation");
    expect(html).toContain("★★★★");
  });

  it("escapes HTML in skill name", () => {
    const report = { ...mockReport, name: "<script>alert(1)</script>" };
    const html = generateHtmlReport(report);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
