import { insertContactMessageSchema } from "../shared/types";
import { ensureParsedBody, handleUnknownError, methodNotAllowed } from "./_utils";
import { prisma } from "../lib/prisma";

export default async function handler(req: any, res: any) {
  if (req.method === "POST") {
    try {
      const payload = insertContactMessageSchema.parse(ensureParsedBody(req));
      const booking = await prisma.contactMessage.create({ data: { ...payload, service: payload.service ?? "Booking" } });
      res.status(201).json({ success: true, message: "Booking request submitted", data: booking });
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        res.status(400).json({ success: false, message: "Invalid booking data", errors: error });
        return;
      }
      handleUnknownError(res, error, "Failed to submit booking request");
    }
    return;
  }

  methodNotAllowed(res, ["POST"]);
}
