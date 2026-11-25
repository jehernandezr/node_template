import { ConfigSection } from '@platform/config';
import { z } from 'zod';
import type { FlagRule } from './flag-rule.js';
import { FlagStoreKind } from './flag-store-kind.enum.js';

const MAX_PERCENT = 100;

const IdentifierListSchema = z.array(z.string().trim().min(1)).optional();

export const FlagRuleSchema = z.strictObject({
  flag: z.string().trim().min(1),
  enabled: z.boolean(),
  rolloutPercent: z.int().min(0).max(MAX_PERCENT).default(0),
  users: IdentifierListSchema,
  tenants: IdentifierListSchema,
  plans: IdentifierListSchema,
  groups: IdentifierListSchema,
}) satisfies z.ZodType<FlagRule, unknown>;

const FlagRulesSchema = z
  .string()
  .transform((raw, ctx) => {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      ctx.addIssue({ code: 'custom', message: 'FEATURE_FLAGS no es JSON' });
      return z.NEVER;
    }
  })
  .pipe(z.array(FlagRuleSchema))
  .refine(
    (rules) => new Set(rules.map((rule) => rule.flag)).size === rules.length,
    { message: 'FEATURE_FLAGS repite un flag' },
  );

/** `FEATURE_FLAGS` is a JSON list of rules; without it no flag is on. */
export const flagsConfigSchema = z.object({
  FLAGS_STORE: z.enum(FlagStoreKind).default(FlagStoreKind.Config),
  FEATURE_FLAGS: FlagRulesSchema.default([]),
});

export type FlagsSettings = z.output<typeof flagsConfigSchema>;

export const FlagsConfig = new ConfigSection<FlagsSettings>(
  'flags',
  flagsConfigSchema,
);
