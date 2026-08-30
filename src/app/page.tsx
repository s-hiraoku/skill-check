"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SkillCheckReport } from "@/lib/types";
import { StarRating } from "@/components/StarRating";
import { CheckCard } from "@/components/CheckCard";
import { SkillInputForm, ReportDetail } from "@/components/SkillInputForm";

export default function Dashboard() {
  const [reports, setReports] = useState<SkillCheckReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SkillCheckReport | null>(null);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [latestReport, setLatestReport] = useState<SkillCheckReport | null>(null);

  const fetchReports = useCallback(async () => {
    const res = await fetch("/api/results");
    if (res.ok) {
      setReports(await res.json());
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  async function handleSubmit(input: { githubUrl?: string; skillMarkdown?: string }) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Check failed");
      setLatestReport(data);
      await fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const matchesSearch =
        !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase()) ||
        r.source.toLowerCase().includes(search.toLowerCase());
      const matchesGrade = gradeFilter === "all" || r.grade === gradeFilter;
      return matchesSearch && matchesGrade;
    });
  }, [reports, search, gradeFilter]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-indigo-400">Skill</span>Check
            </h1>
            <p className="text-sm text-slate-400">Agent Skills Quality Dashboard</p>
          </div>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
            {reports.length} checked
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="mb-4 text-lg font-semibold">Check a Skill</h2>
            <SkillInputForm onSubmit={handleSubmit} loading={loading} />
            {error && (
              <p className="mt-3 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>
            )}
          </section>

          {latestReport && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Latest Result</h2>
              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">{latestReport.name}</h3>
                    <p className="text-sm text-slate-400">{latestReport.description}</p>
                  </div>
                  <span className="text-3xl font-bold text-emerald-400">{latestReport.grade}</span>
                </div>
                <StarRating stars={latestReport.stars} size="lg" />
                <p className="mt-2 text-sm text-slate-400">
                  {latestReport.overallScore}/{latestReport.maxScore} points · {latestReport.summary}
                </p>
                {latestReport.resolvedPath && (
                  <p className="mt-1 text-xs text-slate-500">
                    Resolved: {latestReport.resolvedPath}
                  </p>
                )}
                <div className="mt-4 space-y-3">
                  {latestReport.checks.map((check) => (
                    <CheckCard key={check.name} check={check} />
                  ))}
                </div>
                <a
                  href={`/api/results/${latestReport.id}/report`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-sm text-indigo-400 hover:text-indigo-300"
                >
                  Download HTML Report ↗
                </a>
              </div>
            </section>
          )}
        </div>

        <section className="mt-12">
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <h2 className="text-lg font-semibold">All Results</h2>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search skills..."
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All grades</option>
              {["A", "B", "C", "D", "F"].map((g) => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-500">
              No results yet. Check your first skill above.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-700 bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">Skill</th>
                    <th className="px-4 py-3 font-medium">Grade</th>
                    <th className="px-4 py-3 font-medium">Rating</th>
                    <th className="px-4 py-3 font-medium">Score</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((report) => (
                    <tr
                      key={report.id}
                      onClick={() => setSelected(report)}
                      className="cursor-pointer border-b border-slate-800 hover:bg-slate-800/50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{report.name}</div>
                        <div className="max-w-xs truncate text-xs text-slate-500">{report.description}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-emerald-400">{report.grade}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StarRating stars={report.stars} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {report.overallScore}/{report.maxScore}
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-xs text-slate-500">
                        {report.sourceType === "github" ? report.source : "pasted"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {selected && (
        <ReportDetail report={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
