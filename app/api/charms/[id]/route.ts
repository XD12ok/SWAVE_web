import { NextRequest, NextResponse } from "next/server";
import { getCharmById, updateCharm, deleteCharm } from "@/services/charm.service";
import { connectDB } from "@/lib/mongodb";
import CharmModel from "@/models/Charm";
import InventoryLogModel from "@/models/InventoryLog";
import { InventoryReason } from "@/types/enums";
import { syncInventoryLog } from "@/lib/sync-sheets";
import { sanitizeBody } from "@/lib/sanitize";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const charm = await getCharmById(id);

    if (!charm) {
      return NextResponse.json({ error: "Charm not found" }, { status: 404 });
    }

    return NextResponse.json(charm);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch charm" },
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

    await connectDB();
    const before = await CharmModel.findById(id).select("stock totalSold reservedStock").lean();

    const charm = await updateCharm(id, body);

    if (!charm) {
      return NextResponse.json({ error: "Charm not found" }, { status: 404 });
    }

    if (before && "stock" in body && body.stock !== before.stock) {
      const log = await InventoryLogModel.create({
        charmId: id,
        before: before.stock,
        after: body.stock,
        change: body.stock - before.stock,
        reason: InventoryReason.MANUAL,
        reference: "admin:stock-edit",
      });
      void syncInventoryLog(JSON.parse(JSON.stringify(log)));
    }

    if (before && "totalSold" in body && body.totalSold !== before.totalSold) {
      const log = await InventoryLogModel.create({
        charmId: id,
        before: before.totalSold ?? 0,
        after: body.totalSold,
        change: (body.totalSold ?? 0) - (before.totalSold ?? 0),
        reason: InventoryReason.MANUAL,
        reference: "admin:sold-edit",
      });
      void syncInventoryLog(JSON.parse(JSON.stringify(log)));
    }

    if (before && "reservedStock" in body && body.reservedStock !== before.reservedStock) {
      const log = await InventoryLogModel.create({
        charmId: id,
        before: before.reservedStock ?? 0,
        after: body.reservedStock,
        change: (body.reservedStock ?? 0) - (before.reservedStock ?? 0),
        reason: InventoryReason.MANUAL,
        reference: "admin:reserved-edit",
      });
      void syncInventoryLog(JSON.parse(JSON.stringify(log)));
    }

    return NextResponse.json(charm);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update charm" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const charm = await deleteCharm(id);

    if (!charm) {
      return NextResponse.json({ error: "Charm not found" }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete charm" },
      { status: 500 },
    );
  }
}
