import { NextRequest, NextResponse } from "next/server";
import { getCategories, createCategory } from "@/services/category.service";
import { toSlug } from "@/lib/slug";
import { sanitizeBody } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json(categories.length > 0 ? categories : []);
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

    const category = await createCategory({
      name: body.name,
      slug: toSlug(body.name),
      description: body.description ?? "",
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create category" },
      { status: 400 },
    );
  }
}
