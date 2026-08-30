import type { SkillCheckReport } from "./types";

const STORAGE_KEY = "skillcheck-reports-v1";
const MAX_REPORTS = 100;

/**
 * Browser-side persistence so the dashboard survives Vercel multi-instance
 * in-memory store misses. Server memory remains a best-effort cache.
 */
export function loadClientReports(): SkillCheckReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SkillCheckReport[];
  } catch {
    return [];
  }
}

export function saveClientReport(report: SkillCheckReport): SkillCheckReport[] {
  const existing = loadClientReports().filter((r) => r.id !== report.id);
  const next = [report, ...existing].slice(0, MAX_REPORTS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota / private mode — keep returning in-memory merge for this session
  }
  return next;
}

export function mergeReports(
  server: SkillCheckReport[],
  client: SkillCheckReport[],
): SkillCheckReport[] {
  const byId = new Map<string, SkillCheckReport>();
  for (const r of [...client, ...server]) {
    if (!byId.has(r.id)) byId.set(r.id, r);
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/** Open HTML report via stateless POST (works when GET-by-id hits another instance). */
export async function openHtmlReport(report: SkillCheckReport): Promise<void> {
  const res = await fetch("/api/report/html", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  });
  if (!res.ok) {
    throw new Error("Failed to generate HTML report");
  }
  const html = await res.text();
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  // Revoke after the new tab has a chance to load
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
