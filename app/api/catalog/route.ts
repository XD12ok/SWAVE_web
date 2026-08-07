import { NextResponse } from "next/server";
import { getCharms } from "@/services/charm.service";
import { getCategories } from "@/services/category.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [charms, categories] = await Promise.all([
      getCharms({ active: undefined }),
      getCategories(),
    ]);

    return NextResponse.json({ charms, categories });
  } catch {
    return NextResponse.json({ charms: [], categories: [] });
  }
}
