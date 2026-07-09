let counter = 1;

export function generateInvoiceNumber() {
  const now = new Date();

  const date =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");

  const sequence = String(counter++).padStart(4, "0");

  return `SWV-${date}-${sequence}`;
}
