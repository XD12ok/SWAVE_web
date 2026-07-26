import { NextResponse } from "next/server";
import { expireReservations } from "@/services/inventory.service";

export async function POST() {
  try {
    const released = await expireReservations();
    return NextResponse.json({ released });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { error: "Failed to cleanup reservations" },
      { status: 500 },
    );
  }
}
