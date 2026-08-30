/**
 * v1 persistence: in-memory best-effort cache (max 100 reports per server instance).
 * On Vercel, serverless instances do not share this array — the dashboard also
 * keeps reports in localStorage, and HTML reports are generated via
 * POST /api/report/html (stateless). Database persistence is planned for v2.
 */
import type { SkillCheckReport } from "./types";

const MAX_REPORTS = 100;

const globalStore = globalThis as typeof globalThis & {
  __skillcheckReports?: SkillCheckReport[];
};

function getStore(): SkillCheckReport[] {
  if (!globalStore.__skillcheckReports) {
    globalStore.__skillcheckReports = [];
  }
  return globalStore.__skillcheckReports;
}

export function saveReport(report: SkillCheckReport): void {
  const store = getStore();
  store.unshift(report);
  if (store.length > MAX_REPORTS) {
    store.length = MAX_REPORTS;
  }
}

export function listReports(): SkillCheckReport[] {
  return [...getStore()];
}

export function getReport(id: string): SkillCheckReport | undefined {
  return getStore().find((r) => r.id === id);
}

export function clearReports(): void {
  globalStore.__skillcheckReports = [];
}

export function getStoreLimits() {
  return {
    maxReports: MAX_REPORTS,
    persistence: "in-memory-v1" as const,
    note: "Use localStorage + POST /api/report/html for cross-instance access on Vercel",
  };
}
