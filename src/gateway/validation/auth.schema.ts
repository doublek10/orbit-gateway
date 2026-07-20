import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  company_name: z.string().min(1),
  full_name: z.string().optional(),
  country: z.string().optional(),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  company_id: z.string().uuid().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;
