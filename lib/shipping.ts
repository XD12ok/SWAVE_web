import { ShippingMethod } from "@/types/enums";

export function formatShippingMethod(method: ShippingMethod): string {
  return method === ShippingMethod.DELIVERY ? "Delivery" : "Pickup";
}

export function estimateDeliveryDate(
  daysFromNow: number = 3,
): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
}
