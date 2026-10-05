import { NextResponse } from "next/server";
import { resetDemoDatabase } from "@/lib/db/reset-demo";

export async function GET(request: Request) {
  if (process.env.DEMO_MODE !== "true") {
    return NextResponse.json({ error: "Demo mode is not enabled" }, { status: 403 });
  }

  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await resetDemoDatabase();
    return NextResponse.json({ success: true, message: "Database reset completed" });
  } catch (error) {
    console.error("Failed to reset demo database:", error);
    return NextResponse.json({ error: "Failed to reset database" }, { status: 500 });
  }
}
