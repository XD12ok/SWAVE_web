import { NextRequest, NextResponse } from "next/server";
import { createCashierOrder } from "@/services/order.service";
import { sanitizeBody } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  try {
    const body = sanitizeBody(await req.json());

    const rawItems = Array.isArray(body.items) ? body.items : [];
    const items = rawItems.map((i: { charmId?: string; qty?: number }) => ({
      charmId: String(i?.charmId ?? ""),
      qty: Math.max(1, Math.floor(Number(i?.qty) || 1)),
    }));

    const order = await createCashierOrder(items, body.paymentMethod, {
      cashierName: String(body.cashierName ?? ""),
      buyerName: String(body.buyerName ?? ""),
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("POST /api/kasir error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memproses transaksi" },
      { status: 400 },
    );
  }
}
