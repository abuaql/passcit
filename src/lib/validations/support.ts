import { z } from "zod";

/** Categories shown in the support form's dropdown — mirrors the topics on the support page. */
export const SUPPORT_CATEGORIES = [
  "Account or sign-in",
  "Sign in with Apple",
  "Sign in with Google",
  "Voice practice",
  "Flashcards",
  "Practice questions",
  "Learning progress",
  "App problem",
  "Something else",
] as const;

export const supportMessageSchema = z.object({
  email: z.string().email("Enter a valid email address so we can reply"),
  category: z.enum(SUPPORT_CATEGORIES),
  // Optional on purpose: the details that make a report diagnosable are
  // worth asking for, but never worth blocking someone from reporting a
  // problem at all.
  deviceInfo: z.string().max(200).optional().or(z.literal("")),
  appVersion: z.string().max(50).optional().or(z.literal("")),
  message: z
    .string()
    .min(20, "Please describe the problem in a little more detail")
    .max(5000, "Please keep your message under 5000 characters"),
});

export type SupportMessageInput = z.infer<typeof supportMessageSchema>;
