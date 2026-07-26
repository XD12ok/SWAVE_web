import { NextRequest, NextResponse } from "next/server";
import { getOrderById, updateOrderPayment } from "@/services/order.service";
import { sanitizeBody } from "@/lib/sanitize";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const order = await getOrderById(id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("GET /api/orders/[id]/payment error:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = sanitizeBody(await req.json());

    const order = await updateOrderPayment(id, {
      method: body.method,
      proofImage: body.proofImage,
      status: body.status,
      paidAt: body.paidAt ? new Date(body.paidAt) : undefined,
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("PATCH /api/orders/[id]/payment error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update payment" },
      { status: 400 },
    );
  }
}
