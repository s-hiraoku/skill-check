"use client";

import { useState } from "react";
import type { SkillCheckReport } from "@/lib/types";

interface SkillInputFormProps {
  onSubmit: (input: { githubUrl?: string; skillMarkdown?: string }) => Promise<void>;
  loading: boolean;
}

export function SkillInputForm({ onSubmit, loading }: SkillInputFormProps) {
  const [mode, setMode] = useState<"github" | "paste">("github");
  const [githubUrl, setGithubUrl] = useState("");
  const [skillMarkdown, setSkillMarkdown] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(
      mode === "github"
        ? { githubUrl }
        : { skillMarkdown },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("github")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            mode === "github" ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          GitHub URL
        </button>
        <button
          type="button"
          onClick={() => setMode("paste")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            mode === "paste" ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          Paste SKILL.md
        </button>
      </div>

      {mode === "github" ? (
        <input
          type="url"
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          required
        />
      ) : (
        <textarea
          value={skillMarkdown}
          onChange={(e) => setSkillMarkdown(e.target.value)}
          placeholder={"---\nname: my-skill\ndescription: \"What this skill does\"\n---\n\n# My Skill\n\n## When to Use\n..."}
          rows={10}
          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 font-mono text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          required
        />
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Running checks..." : "Run SkillCheck"}
      </button>
    </form>
  );
}

interface ReportDetailProps {
  report: SkillCheckReport;
  onClose: () => void;
  onOpenReport?: (report: SkillCheckReport) => void | Promise<void>;
}

export function ReportDetail({ report, onClose, onOpenReport }: ReportDetailProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-16">
      <div className="w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100">{report.name}</h2>
            <p className="text-sm text-slate-400">{report.description}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">✕</button>
        </div>

        <div className="mb-4 flex items-center gap-4 rounded-lg bg-slate-800 p-4">
          <span className="text-4xl font-bold text-emerald-400">{report.grade}</span>
          <div>
            <p className="text-lg text-amber-400">{"★".repeat(report.stars)}{"☆".repeat(5 - report.stars)}</p>
            <p className="text-sm text-slate-400">{report.overallScore}/{report.maxScore} points</p>
          </div>
        </div>

        <p className="mb-4 text-sm text-slate-300">{report.summary}</p>

        <div className="space-y-3">
          {report.checks.map((check) => (
            <div key={check.name} className="rounded-lg border border-slate-700 p-3">
              <div className="mb-2 flex justify-between">
                <span className="font-medium">{check.name}</span>
                <span className="text-sm text-slate-400">{check.score}/{check.maxScore}</span>
              </div>
              <ul className="space-y-1 text-xs text-slate-400">
                {check.issues.map((issue, i) => (
                  <li key={i}>• {issue.message}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onOpenReport?.(report)}
          className="mt-4 block w-full text-center text-sm text-indigo-400 hover:text-indigo-300"
        >
          Open HTML Report ↗
        </button>
      </div>
    </div>
  );
}
