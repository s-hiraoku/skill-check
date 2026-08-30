import { NextResponse } from "next/server";
import { getReport } from "@/lib/store";
import { generateHtmlReport } from "@/lib/report";
import { sanitizeFilename } from "@/lib/filename";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const report = getReport(id);

  if (!report) {
    return NextResponse.json(
      {
        error: "Report not found",
        hint: "On Vercel, reports are instance-local. Re-run the check or open the HTML report from the dashboard (uses a stateless POST).",
      },
      { status: 404 },
    );
  }

  const html = generateHtmlReport(report);
  const safeName = sanitizeFilename(report.name);
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="skillcheck-${safeName}.html"`,
    },
  });
}
