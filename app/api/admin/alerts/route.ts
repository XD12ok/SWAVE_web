import { NextResponse } from "next/server";
import { getAdminAlerts } from "@/services/order.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const alerts = await getAdminAlerts();
    return NextResponse.json(alerts);
  } catch (error) {
    console.error("GET /api/admin/alerts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 },
    );
  }
}
