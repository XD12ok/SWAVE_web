import { resend } from "@/lib/resend";

interface InvoiceData {
  invoiceNumber: string;
  buyerName: string;
  buyerEmail: string;
  items: Array<{ name: string; price: number; qty: number; subtotal: number }>;
  subtotal: number;
  shippingCost: number;
  total: number;
  shippingMethod: string;
}

function buildInvoiceHtml(data: InvoiceData): string {
  const itemsRows = data.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #2a2a2a;color:#e0e0e0">${item.name} × ${item.qty}</td>
          <td style="padding:8px 0;border-bottom:1px solid #2a2a2a;color:#e0e0e0;text-align:right">Rp${item.subtotal.toLocaleString("id-ID")}</td>
        </tr>`,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0b0b0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0b;padding:40px 16px">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#151515;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden">
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #2a2a2a">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:1px">SWAVE</h1>
              <p style="margin:8px 0 0;font-size:13px;color:#888">Invoice #${data.invoiceNumber}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px">
              <p style="margin:0 0 4px;font-size:13px;color:#888">Customer</p>
              <p style="margin:0 0 20px;font-size:15px;color:#e0e0e0">${data.buyerName}</p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <thead>
                  <tr>
                    <th style="text-align:left;padding:0 0 8px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px">Item</th>
                    <th style="text-align:right;padding:0 0 8px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                </tbody>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px">
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#888">Subtotal</td>
                  <td style="padding:4px 0;font-size:13px;color:#e0e0e0;text-align:right">Rp${data.subtotal.toLocaleString("id-ID")}</td>
                </tr>
                ${data.shippingMethod === "DELIVERY" ? `<tr>
                  <td style="padding:4px 0;font-size:13px;color:#888">Shipping</td>
                  <td style="padding:4px 0;font-size:13px;color:#e0e0e0;text-align:right">Rp${data.shippingCost.toLocaleString("id-ID")}</td>
                </tr>` : ""}
                <tr>
                  <td style="padding:8px 0 0;font-size:15px;font-weight:700;color:#fff;border-top:1px solid #2a2a2a">Total</td>
                  <td style="padding:8px 0 0;font-size:15px;font-weight:700;color:#fff;text-align:right;border-top:1px solid #2a2a2a">Rp${data.total.toLocaleString("id-ID")}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;text-align:center">
              <p style="margin:0;font-size:11px;color:#555">Please screenshot this invoice for your records.</p>
              <p style="margin:8px 0 0;font-size:11px;color:#555">SWAVE — ${new Date().getFullYear()}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendInvoiceEmail(data: InvoiceData) {
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

  try {
    await resend.emails.send({
      from,
      to: data.buyerEmail,
      subject: `Invoice #${data.invoiceNumber} — SWAVE`,
      html: buildInvoiceHtml(data),
    });
    console.log("[Email] Invoice sent to", data.buyerEmail);
  } catch (err) {
    console.warn("[Email] Failed to send invoice:", err);
  }
}
