import { BadRequestException } from "@nestjs/common";
import { z } from "zod";

const cuidSchema = z
  .string()
  .trim()
  .regex(/^c[a-z0-9]{24}$/, "Invalid CUID format");

const safeIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(1000)
  .regex(/^[a-zA-Z0-9:_-]+$/, "Invalid identifier format");

const moneySchema = z
  .number({ message: "Amount must be a number" })
  .finite("Amount must be finite")
  .positive("Amount must be positive")
  .max(1_000_000, "Amount exceeds maximum")
  .refine((value) => Math.round(value * 100) === value * 100, {
    message: "Amount must have at most 2 decimal places"
  });

const optionalLimitSchema = moneySchema.nullable().optional();
const optionalSessionMinutesSchema = z.number().int().min(5).max(1_440).nullable().optional();
const optionalRealityCheckMinutesSchema = z.number().int().min(5).max(240).nullable().optional();

const safeStringSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(/^[\p{L}\p{N}\s@._:-]+$/u, "Invalid characters");

export const validators = {
  cuid: cuidSchema,
  safeId: safeIdSchema,
  money: moneySchema,
  authRegister: z.object({
    email: z.email().max(255).transform((value) => value.trim().toLowerCase()),
    password: z.string().min(8).max(100),
    displayName: z.string().trim().min(2).max(50).regex(/^[\p{L}\p{N}_\s-]+$/u, "Invalid display name")
  }),
  authLogin: z.object({
    email: z.email().max(255).transform((value) => value.trim().toLowerCase()),
    password: z.string().min(1).max(100)
  }),
  authChangePassword: z.object({
    currentPassword: z.string().min(1).max(100),
    newPassword: z.string().min(8).max(100)
  }),
  authForgotPassword: z.object({
    email: z.email().max(255).transform((value) => value.trim().toLowerCase())
  }),
  authResetPassword: z.object({
    token: z.string().trim().min(32).max(200),
    newPassword: z.string().min(8).max(100)
  }),
  authPlatformExchange: z.object({
    platformAssertion: z.string().trim().min(20).max(10000),
    nonce: safeStringSchema.max(200),
    timestamp: z.number().int().positive()
  }),
  authModePatch: z.object({
    mode: z.enum(["INTERNAL_ONLY", "EXTERNAL_ONLY", "HYBRID"]),
    platformIssuer: z.url().optional(),
    platformAudience: z.string().trim().max(200).optional(),
    allowedClockSkewSec: z.number().int().min(0).max(300).optional(),
    fallbackEnabled: z.boolean().optional(),
    nonceTtlSec: z.number().int().min(30).max(3600).optional()
  }),
  walletOperation: z.object({
    amount: moneySchema,
    methodLabel: z.string().trim().max(100).optional()
  }),
  persistRound: z.object({
    profileId: z.string().trim().max(100).optional(),
    result: z.unknown().optional()
  }),
  responsibleGamingSettingsUpdate: z.object({
    depositLimitDaily: optionalLimitSchema,
    depositLimitWeekly: optionalLimitSchema,
    depositLimitMonthly: optionalLimitSchema,
    lossLimitDaily: optionalLimitSchema,
    lossLimitWeekly: optionalLimitSchema,
    lossLimitMonthly: optionalLimitSchema,
    sessionTimeLimitMinutes: optionalSessionMinutesSchema,
    realityCheckIntervalMinutes: optionalRealityCheckMinutesSchema
  }).strict(),
  responsibleGamingCooloff: z.object({
    durationHours: z.number().int().min(1).max(720)
  }),
  responsibleGamingSelfExclusion: z.object({
    durationHours: z.number().int().min(24).max(87_600)
  }),
  profileSelect: z.object({
    profileId: z.string().trim().min(1).max(100)
  }),
  analyticsIngest: z.object({
    entries: z
      .array(
        z.object({
          id: safeIdSchema.max(100),
          timestamp: z.number().int().positive(),
          variant: z.enum(["2.0", "simple", "other"]),
          bet: z.number().finite(),
          win: z.number().finite(),
          net: z.number().finite(),
          mode: z.enum(["base", "bonus"]),
          cascades: z.number().int().min(0).max(200),
          bonusTriggered: z.boolean(),
          multiplier: z.number().finite().min(0),
          winMultiple: z.number().finite().min(0),
          tier: z.enum(["loss", "win", "big_win", "huge_win", "super_win"]),
          balanceAfter: z.number().finite()
        })
      )
      .max(5000)
  }),
  analyticsQuery: z.object({
    limit: z
      .string()
      .trim()
      .regex(/^\d+$/, "limit must be an integer")
      .optional(),
    variant: z.enum(["all", "2.0", "simple", "other"]).optional()
  })
};

export type ValidationSchema<T> = z.ZodType<T>;

export const parseOrBadRequest = <T>(schema: ValidationSchema<T>, input: unknown): T => {
  const result = schema.safeParse(input);
  if (!result.success) {
    const fieldErrors = result.error.issues.reduce<Record<string, string>>((accumulator, issue) => {
      const path = issue.path.join(".") || "form";
      if (!accumulator[path]) {
        accumulator[path] = issue.message;
      }
      return accumulator;
    }, {});
    throw new BadRequestException({
      code: "VALIDATION_FAILED",
      message: "Validation failed",
      fieldErrors
    });
  }

  return result.data;
};
