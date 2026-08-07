import { NextRequest, NextResponse } from "next/server";
import { getCharms, createCharm } from "@/services/charm.service";
import { toSlug } from "@/lib/slug";
import { sanitizeBody } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const charms = await getCharms({ active: undefined });
    return NextResponse.json(charms);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = sanitizeBody(await req.json());

    if (!body.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const charm = await createCharm({
      name: body.name,
      slug: toSlug(body.name),
      category: body.category,
      price: body.price ?? 0,
      stock: body.stock ?? 0,
      weight: body.weight ?? 0,
      description: body.description ?? "",
      image: body.image ?? { publicId: "", secureUrl: "" },
      discount: body.discount ?? { enabled: false, type: "PERCENTAGE", value: 0 },
      limited: body.limited ?? false,
      active: body.active ?? true,
    });

    return NextResponse.json(charm, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create charm" },
      { status: 400 },
    );
  }
}
