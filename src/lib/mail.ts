import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";

const smtpConfigured = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD
);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })
  : null;

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const subject = "Reset your Passcit password";
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1A1D23;">
      <h2 style="margin-bottom: 4px;">Reset your password</h2>
      <p>Click the button below to choose a new password. This link expires in 1 hour.</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}"
           style="background:#3AA655;color:white;padding:12px 22px;border-radius:12px;
                  text-decoration:none;font-weight:600;display:inline-block;">
          Reset password
        </a>
      </p>
      <p style="color:#6B7280;font-size:13px;">
        If you didn't request this, you can safely ignore this email —
        your password will not be changed.
      </p>
    </div>
  `;

  if (!transporter) {
    // No SMTP configured. In development this is the normal case, so
    // print the link to keep the reset flow fully testable locally.
    // In production it means SMTP is misconfigured — log that loudly,
    // but never print the reset link itself, since a working reset token
    // in server logs is a real credential leak.
    if (process.env.NODE_ENV === "production") {
      logger.error(
        "mail.sendPasswordResetEmail",
        "SMTP is not configured — password reset email could not be sent. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD."
      );
    } else {
      console.log(
        `\n[DEV MODE — no SMTP configured] Password reset link for ${to}:\n${resetUrl}\n`
      );
    }
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "Passcit <no-reply@passcit.local>",
    to,
    subject,
    html,
  });
}
