import { NextResponse } from "next/server";
import { supportMessageSchema } from "@/lib/validations/support";
import { getSupportInboxAddress } from "@/lib/legal/support-contact";
import { sendSupportMessage } from "@/lib/mail";
import { enforceRateLimit, AUTH_RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * Public, unauthenticated contact endpoint behind the support page's
 * form. Deliberately writes nothing to the database — a support request
 * is a message, not a record this app needs to own — and stores nothing
 * beyond what the mail server carries.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "support-message", AUTH_RATE_LIMITS.supportMessage);
  if (limited) return limited;

  try {
    const parsed = supportMessageSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." },
        { status: 400 }
      );
    }

    const inbox = getSupportInboxAddress();
    if (!inbox) {
      // A misconfigured deployment, not a bad request — say so plainly
      // instead of showing a success screen for a message nobody will read.
      logger.error(
        "api.support",
        "A support message could not be delivered: neither SUPPORT_EMAIL nor ADMIN_EMAIL is set."
      );
      return NextResponse.json(
        { error: "The support form is temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    const { email, category, message, deviceInfo, appVersion } = parsed.data;
    const delivered = await sendSupportMessage({
      to: inbox,
      fromEmail: email,
      category,
      message,
      deviceInfo: deviceInfo || undefined,
      appVersion: appVersion || undefined,
    });

    if (!delivered) {
      return NextResponse.json(
        { error: "The support form is temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    return NextResponse.json({ message: "Thanks — your message is on its way to Passcit support." });
  } catch (error) {
    logger.error("api.support", "Support message could not be sent", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
