export function ensureParsedBody(req: any) {
  if (req.body === undefined || req.body === null) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

export function parseIdParam(value: any): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = typeof raw === "string" ? Number.parseInt(raw, 10) : Number(raw);
  return Number.isFinite(id) ? id : null;
}

export function methodNotAllowed(res: any, methods: string[]) {
  res.setHeader("Allow", methods.join(", "));
  res.status(405).json({ message: "Method Not Allowed" });
}

export function handleUnknownError(res: any, error: unknown, message: string) {
  console.error(message, error);
  res.status(500).json({ success: false, message });
}
