import type { SkillCheckReport } from "./types";

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
  if (store.length > 100) {
    store.length = 100;
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
