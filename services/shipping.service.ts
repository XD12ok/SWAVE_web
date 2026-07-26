import { connectDB } from "@/lib/mongodb";
import ShippingRuleModel from "@/models/ShippingRule";

export async function calculateShippingCost(distanceKm: number) {
  await connectDB();

  const rule = await ShippingRuleModel.findOne({
    active: true,
    minKm: { $lte: distanceKm },
    maxKm: { $gte: distanceKm },
  }).lean();

  return rule?.price ?? 0;
}

export async function getShippingRules() {
  await connectDB();
  return ShippingRuleModel.find({ active: true }).sort({ minKm: 1 }).lean();
}

export async function createShippingRule(data: {
  name: string;
  minKm: number;
  maxKm: number;
  price: number;
}) {
  await connectDB();
  return ShippingRuleModel.create(data);
}
