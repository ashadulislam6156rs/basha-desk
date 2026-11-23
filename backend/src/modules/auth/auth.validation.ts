import { z } from "zod";
import { AppError } from "../../common/app-error.js";

const passwordSchema = z.string().min(1).max(200);

export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(254),
  password: passwordSchema,
});

export const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    locale: z.enum(["bn", "en"]).optional(),
    theme: z.enum(["light", "dark", "system"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field is required.",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export function assertBcryptPasswordLength(password: string) {
  if (Buffer.byteLength(password, "utf8") > 72) {
    throw new AppError(
      422,
      "ERR_PASSWORD_TOO_LONG",
      "Validation Error",
      "Password must be at most 72 UTF-8 bytes.",
    );
  }
}
