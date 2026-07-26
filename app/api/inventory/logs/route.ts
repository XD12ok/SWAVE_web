import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import InventoryLogModel from "@/models/InventoryLog";
import { sanitizeNoSQL } from "@/lib/sanitize";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const charmId = searchParams.get("charmId");
    const limit = parseInt(searchParams.get("limit") ?? "100");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const filter: Record<string, unknown> = {};
    if (charmId && typeof charmId === "string") filter.charmId = sanitizeNoSQL(charmId);

    filter.reference = { $not: { $regex: "^(reserve:|release:)" } };

    const logs = await InventoryLogModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate("charmId", "name slug")
      .lean();

    const total = await InventoryLogModel.countDocuments(filter);

    return NextResponse.json({ logs, total });
  } catch (error) {
    console.error("GET /api/inventory/logs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory logs" },
      { status: 500 },
    );
  }
}
