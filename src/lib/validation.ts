import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().email(),
  password: z.string().min(6, "Password must be at least 6 characters").max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const createAuditSchema = z.object({
  targetUrl: z
    .string()
    .trim()
    .url("Enter a valid URL (including https://)")
    .refine((u) => /^https?:\/\//.test(u), "URL must start with http:// or https://"),
  mode: z.enum(["quick", "standard", "deep"]).default("standard"),
  agentsCount: z.coerce.number().int().min(1).max(10).default(5),
  durationMinutes: z.coerce.number().int().min(1).max(60).default(15),
  instructions: z.string().max(2000).optional(),
  whitelistNotes: z.string().max(1000).optional(),
  login: z.string().max(200).optional(),
  password: z.string().max(200).optional(),
  apiKey: z.string().max(400).optional(),
  authorized: z.literal(true, {
    errorMap: () => ({ message: "You must confirm you are authorized to test this site." }),
  }),
});

export type CreateAuditInput = z.infer<typeof createAuditSchema>;
