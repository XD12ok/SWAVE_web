import { NextRequest, NextResponse } from "next/server";
import { checkAvailability } from "@/services/inventory.service";
import { sanitizeBody } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  try {
    const body = sanitizeBody(await req.json());
    const items: Array<{ charmId: string; qty: number }> = body.items;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Items required" }, { status: 400 });
    }

    const result = await checkAvailability(items);
    const allAvailable = result.every((r) => r.enough);

    return NextResponse.json({
      available: allAvailable,
      items: result,
    });
  } catch (error) {
    console.error("POST /api/check-stock error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stock check failed" },
      { status: 400 },
    );
  }
}
