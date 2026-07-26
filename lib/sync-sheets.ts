import { ensureHeaders, upsertRows, appendRows } from "./sheets";

function log(...args: unknown[]) {
  console.log("[Sheets Sync]", ...args);
}

function warn(...args: unknown[]) {
  console.warn("[Sheets Sync]", ...args);
}

let initialized = false;

async function init() {
  if (initialized) return;
  try {
    await ensureHeaders("Orders", [
      "Invoice",
      "Buyer Name",
      "Buyer Email",
      "Buyer Phone",
      "Status",
      "Items",
      "Subtotal",
      "Shipping",
      "Total",
      "Payment Method",
      "Payment Status",
      "Created At",
      "Updated At",
    ]);
    await ensureHeaders("Charms", [
      "ID",
      "Name",
      "Category",
      "Price",
      "Stock",
      "Reserved",
      "Sold",
      "Weight",
      "Limited",
      "Active",
      "Discount %",
      "Discount Start",
      "Discount End",
      "Created At",
    ]);
    await ensureHeaders("Categories", [
      "Name",
      "Slug",
      "Active",
      "Created At",
    ]);
    await ensureHeaders("Inventory Logs", [
      "ID",
      "Charm Name",
      "Before",
      "After",
      "Change",
      "Reason",
      "Reference",
      "Created At",
    ]);
    initialized = true;
  } catch (e) {
    warn("Failed to initialize sheet headers:", e);
  }
}

// ── Orders ────────────────────────────────────────────────

export async function syncOrder(data: Record<string, unknown>) {
  try {
    await init();
    const items = (data.items as Array<Record<string, unknown>>) ?? [];
    const itemsSummary = items
      .reduce(
        (acc: Record<string, number>, i: Record<string, unknown>) => {
          const name = String(i.name ?? "");
          acc[name] = (acc[name] ?? 0) + Number(i.qty ?? 1);
          return acc;
        },
        {} as Record<string, number>,
      );
    const itemsStr = Object.entries(itemsSummary)
      .map(([name, qty]) => `${name}${qty > 1 ? ` ×${qty}` : ""}`)
      .join(", ");

    const payment = (data.payment as Record<string, unknown>) ?? {};

    await upsertRows("Orders", [
      [
        String(data.invoiceNumber ?? ""),
        String((data.buyer as Record<string, unknown>)?.name ?? ""),
        String((data.buyer as Record<string, unknown>)?.email ?? ""),
        String((data.buyer as Record<string, unknown>)?.phone ?? ""),
        String(data.status ?? ""),
        itemsStr,
        Number(data.subtotal ?? 0),
        Number(data.shippingCost ?? 0),
        Number(data.total ?? 0),
        String(payment.method ?? ""),
        String(payment.status ?? ""),
        String(data.createdAt ?? ""),
        String(data.updatedAt ?? ""),
      ],
    ], 0);
    log("Order synced:", data.invoiceNumber);
  } catch (e) {
    warn("Failed to sync order:", e);
  }
}

// ── Charms ────────────────────────────────────────────────

export async function syncCharm(data: Record<string, unknown>) {
  try {
    await init();
    const discount = (data.discount as Record<string, unknown>) ?? {};
    const category =
      typeof data.category === "object" && data.category
        ? String((data.category as Record<string, unknown>).name ?? "")
        : String(data.category ?? "");

    await upsertRows("Charms", [
      [
        String(data._id ?? data.id ?? ""),
        String(data.name ?? ""),
        category,
        Number(data.price ?? 0),
        Number(data.stock ?? 0),
        Number(data.reservedStock ?? 0),
        Number(data.totalSold ?? 0),
        Number(data.weight ?? 0),
        data.limited ? "Yes" : "No",
        data.active !== false ? "Active" : "Inactive",
        discount.enabled ? String(discount.value ?? 0) : "-",
        discount.enabled && discount.startAt ? String(discount.startAt) : "-",
        discount.enabled && discount.endAt ? String(discount.endAt) : "-",
        String(data.createdAt ?? ""),
      ],
    ], 0);
    log("Charm synced:", data.name);
  } catch (e) {
    warn("Failed to sync charm:", e);
  }
}

// ── Categories ────────────────────────────────────────────

export async function syncCategory(data: Record<string, unknown>) {
  try {
    await init();
    await upsertRows("Categories", [
      [
        String(data.name ?? ""),
        String(data.slug ?? ""),
        data.active !== false ? "Active" : "Inactive",
        String(data.createdAt ?? ""),
      ],
    ], 0);
    log("Category synced:", data.name);
  } catch (e) {
    warn("Failed to sync category:", e);
  }
}

// ── Inventory Logs ────────────────────────────────────────

export async function syncInventoryLog(data: Record<string, unknown>) {
  try {
    await init();
    const charm =
      typeof data.charmId === "object" && data.charmId
        ? String((data.charmId as Record<string, unknown>).name ?? "")
        : String(data.charmId ?? "");

    await appendRows("Inventory Logs", [
      [
        String(data._id ?? ""),
        charm,
        Number(data.before ?? 0),
        Number(data.after ?? 0),
        Number(data.change ?? 0),
        String(data.reason ?? ""),
        String(data.reference ?? ""),
        String(data.createdAt ?? ""),
      ],
    ]);
    log("Inventory log synced");
  } catch (e) {
    warn("Failed to sync inventory log:", e);
  }
}
