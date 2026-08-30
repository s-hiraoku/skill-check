import { NextResponse } from "next/server";
import { generateHtmlReport } from "@/lib/report";
import { sanitizeFilename } from "@/lib/filename";
import type { SkillCheckReport } from "@/lib/types";

/**
 * Stateless HTML report generation — works across Vercel serverless instances
 * when the client already has the full report JSON from POST /api/check.
 */
export async function POST(request: Request) {
  try {
    const report = (await request.json()) as SkillCheckReport;

    if (!report?.id || !report?.name || !Array.isArray(report.checks)) {
      return NextResponse.json({ error: "Invalid report payload" }, { status: 400 });
    }

    const html = generateHtmlReport(report);
    const safeName = sanitizeFilename(String(report.name));
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="skillcheck-${safeName}.html"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate report" }, { status: 400 });
  }
}
