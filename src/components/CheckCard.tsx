"use client";

import type { CheckResult } from "@/lib/types";

interface CheckCardProps {
  check: CheckResult;
}

const statusStyles = {
  pass: "border-emerald-500/30 bg-emerald-500/5",
  warn: "border-amber-500/30 bg-amber-500/5",
  fail: "border-red-500/30 bg-red-500/5",
};

const statusBadge = {
  pass: "bg-emerald-500/20 text-emerald-400",
  warn: "bg-amber-500/20 text-amber-400",
  fail: "bg-red-500/20 text-red-400",
};

const severityColor = {
  critical: "text-red-400",
  error: "text-red-400",
  warning: "text-amber-400",
  info: "text-slate-400",
};

export function CheckCard({ check }: CheckCardProps) {
  return (
    <div className={`rounded-lg border p-4 ${statusStyles[check.status]}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium text-slate-100">{check.name}</h3>
        <div className="flex items-center gap-2">
          <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${statusBadge[check.status]}`}>
            {check.status}
          </span>
          <span className="text-sm text-slate-400">
            {check.score}/{check.maxScore}
          </span>
        </div>
      </div>
      <ul className="space-y-1 text-sm">
        {check.issues.map((issue, i) => (
          <li key={`${issue.code}-${i}`} className={severityColor[issue.severity]}>
            <code className="rounded bg-slate-800 px-1 text-xs">{issue.code}</code>
            {" "}{issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
