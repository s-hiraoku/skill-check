import { describe, it, expect } from "vitest";
import { applySafetyCaps } from "../pipeline";
import { sanitizeFilename } from "../filename";
import type { CheckResult } from "../types";

function securityCheck(status: CheckResult["status"], severity: CheckResult["issues"][0]["severity"]): CheckResult {
  return {
    name: "Security Scan",
    status,
    score: status === "fail" ? 12 : 20,
    maxScore: 20,
    issues: [{ code: "SEC_TEST", message: "test", severity }],
  };
}

describe("applySafetyCaps", () => {
  it("caps critical security findings to grade D and 2 stars", () => {
    const { stars, grade } = applySafetyCaps(5, "A", [securityCheck("fail", "critical")]);
    expect(stars).toBe(2);
    expect(grade).toBe("D");
  });

  it("caps non-critical security fail to grade C and 3 stars", () => {
    const { stars, grade } = applySafetyCaps(5, "A", [securityCheck("fail", "error")]);
    expect(stars).toBe(3);
    expect(grade).toBe("C");
  });

  it("leaves clean scores uncapped", () => {
    const { stars, grade } = applySafetyCaps(5, "A", [securityCheck("pass", "info")]);
    expect(stars).toBe(5);
    expect(grade).toBe("A");
  });
});

describe("sanitizeFilename", () => {
  it("strips CR/LF and unsafe characters", () => {
    expect(sanitizeFilename("evil\r\nname<script>")).toBe("evil-name-script");
  });

  it("falls back when empty after sanitization", () => {
    expect(sanitizeFilename("!!!")).toBe("skill");
  });
});
