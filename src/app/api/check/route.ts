import { NextResponse } from "next/server";
import { runSkillCheck } from "@/lib/pipeline";
import { saveReport } from "@/lib/store";
import type { CheckInput } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckInput;

    if (!body.githubUrl?.trim() && !body.skillMarkdown?.trim()) {
      return NextResponse.json(
        { error: "Provide either githubUrl or skillMarkdown" },
        { status: 400 },
      );
    }

    const report = await runSkillCheck(body);
    saveReport(report);

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Validation failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
