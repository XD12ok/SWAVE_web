import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import OrderModel from "@/models/Order";
import CounterModel from "@/models/Counter";
import InventoryLogModel from "@/models/InventoryLog";
import InventoryReservationModel from "@/models/InventoryReservation";
import SettingsModel from "@/models/Settings";
import ShippingRuleModel from "@/models/ShippingRule";

export async function POST() {
  try {
    await connectDB();

    const results: Record<string, number> = {};

    const orders = await OrderModel.deleteMany({});
    results.orders = orders.deletedCount;

    const counters = await CounterModel.deleteMany({});
    results.counters = counters.deletedCount;

    const logs = await InventoryLogModel.deleteMany({});
    results.inventoryLogs = logs.deletedCount;

    const reservations = await InventoryReservationModel.deleteMany({});
    results.inventoryReservations = reservations.deletedCount;

    const settings = await SettingsModel.deleteMany({});
    results.settings = settings.deletedCount;

    const shippingRules = await ShippingRuleModel.deleteMany({});
    results.shippingRules = shippingRules.deletedCount;

    return NextResponse.json({
      message: "Database reset completed (charms & categories preserved)",
      deleted: results,
    });
  } catch (error) {
    console.error("Reset error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reset failed" },
      { status: 500 },
    );
  }
}
