import { NextRequest, NextResponse } from "next/server";
import { haversineDistance } from "@/lib/geocoding";

const OFFICE_LAT = -7.003139;
const OFFICE_LNG = 110.428778;
const COST_PER_KM = 2000;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") ?? "");
    const lng = parseFloat(searchParams.get("lng") ?? "");

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
    }

    const distanceKm = haversineDistance(
      { lat: OFFICE_LAT, lng: OFFICE_LNG },
      { lat, lng },
    );

    const roundedDistance = Math.ceil(distanceKm);
    const cost = roundedDistance * COST_PER_KM;

    return NextResponse.json({
      distanceKm: Math.round(distanceKm * 100) / 100,
      roundedDistance,
      costPerKm: COST_PER_KM,
      cost,
    });
  } catch (error) {
    console.error("GET /api/shipping-cost error:", error);
    return NextResponse.json(
      { error: "Failed to calculate shipping cost" },
      { status: 500 },
    );
  }
}
