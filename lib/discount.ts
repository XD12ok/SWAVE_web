export interface Discount {
  enabled: boolean;
  value: number;
  startAt?: string | Date;
  endAt?: string | Date;
}

export function isDiscountActive(discount?: Discount): boolean {
  if (!discount?.enabled) return false;
  const now = Date.now();
  if (discount.startAt && new Date(discount.startAt).getTime() > now) return false;
  if (discount.endAt && new Date(discount.endAt).getTime() < now) return false;
  return true;
}

export function getDiscountedPrice(price: number, discount?: Discount): number {
  if (!isDiscountActive(discount) || !discount || !discount.value || discount.value <= 0) {
    return price;
  }
  return Math.round(price - (price * discount.value) / 100);
}
