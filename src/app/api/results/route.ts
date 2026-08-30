import { NextResponse } from "next/server";
import { listReports } from "@/lib/store";

export async function GET() {
  return NextResponse.json(listReports());
}
