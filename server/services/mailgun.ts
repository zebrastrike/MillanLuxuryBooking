type MailgunConfig = {
  apiKey: string;
  domain: string;
  baseUrl: string;
  from: string;
  notifyEmail: string;
};

type BookingNotification = {
  bookingId: number;
  squareBookingId: string;
  status: string;
  serviceName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  startAt: string;
  notes: string | null;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const resolveMailgunConfig = (): MailgunConfig | null => {
  const apiKey = process.env.MAILGUN_API_KEY?.trim();
  const domain = process.env.MAILGUN_DOMAIN?.trim();
  const from = process.env.MAILGUN_FROM?.trim();
  const notifyEmail =
    process.env.MAILGUN_NOTIFY_EMAIL?.trim() || "Millianluxurycleaning@gmail.com";
  const baseUrl = (process.env.MAILGUN_BASE_URL?.trim() || "https://api.mailgun.net").replace(/\/+$/, "");

  if (!apiKey || !domain || !from) {
    return null;
  }

  return {
    apiKey,
    domain,
    from,
    notifyEmail,
    baseUrl,
  };
};

const buildTextBody = (payload: BookingNotification) => {
  return [
    "New booking received.",
    "",
    `Service: ${payload.serviceName}`,
    `Customer: ${payload.customerName}`,
    `Email: ${payload.customerEmail}`,
    `Phone: ${payload.customerPhone || "Not provided"}`,
    `Start: ${payload.startAt}`,
    `Notes: ${payload.notes || "None"}`,
    `Status: ${payload.status}`,
    `Booking ID: ${payload.bookingId}`,
    `Square Booking ID: ${payload.squareBookingId}`,
  ].join("\n");
};

const buildHtmlBody = (payload: BookingNotification) => {
  const rows = [
    ["Service", payload.serviceName],
    ["Customer", payload.customerName],
    ["Email", payload.customerEmail],
    ["Phone", payload.customerPhone || "Not provided"],
    ["Start", payload.startAt],
    ["Notes", payload.notes || "None"],
    ["Status", payload.status],
    ["Booking ID", String(payload.bookingId)],
    ["Square Booking ID", payload.squareBookingId],
  ];

  const rowsHtml = rows
    .map(([label, value]) => {
      const safeLabel = escapeHtml(label);
      const safeValue = escapeHtml(value);
      return `<tr><td style="padding:6px 12px;font-weight:600;">${safeLabel}</td><td style="padding:6px 12px;">${safeValue}</td></tr>`;
    })
    .join("");

  return `
    <div style="font-family:Arial, sans-serif; color:#111827;">
      <h2 style="margin:0 0 12px;">New booking received</h2>
      <table style="border-collapse:collapse; width:100%; max-width:560px;">
        ${rowsHtml}
      </table>
    </div>
  `;
};

export async function sendBookingNotification(payload: BookingNotification) {
  const config = resolveMailgunConfig();
  if (!config) {
    return { ok: false, skipped: true };
  }

  const subject = `New booking - ${payload.customerName} (${payload.serviceName})`;
  const form = new URLSearchParams();
  form.set("from", config.from);
  form.set("to", config.notifyEmail);
  form.set("subject", subject);
  form.set("text", buildTextBody(payload));
  form.set("html", buildHtmlBody(payload));

  const response = await fetch(`${config.baseUrl}/v3/${config.domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${config.apiKey}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    return {
      ok: false,
      error: `${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`,
    };
  }

  return { ok: true };
}
