import { NextResponse } from "next/server";
import { getReport } from "@/lib/store";
import { generateHtmlReport } from "@/lib/report";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const report = getReport(id);

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const html = generateHtmlReport(report);
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="skillcheck-${report.name}.html"`,
    },
  });
}
