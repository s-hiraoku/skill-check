import type { SkillCheckReport } from "./types";

/**
 * v1 persistence: in-memory only (max 100 reports per server instance).
 * Data resets on cold start / redeploy. Database persistence is planned for v2.
 */
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
  return { maxReports: MAX_REPORTS, persistence: "in-memory-v1" as const };
}
