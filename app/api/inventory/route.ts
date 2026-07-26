import { NextResponse } from "next/server";
import { getAllCharmStock } from "@/services/inventory.service";

export async function GET() {
  try {
    const stock = await getAllCharmStock();
    return NextResponse.json(stock);
  } catch (error) {
    console.error("GET /api/inventory error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 },
    );
  }
}
