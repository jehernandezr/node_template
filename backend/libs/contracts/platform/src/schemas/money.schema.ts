import { z } from 'zod';
import { MoneyLimits } from '../constants/money.constants.js';
import type { MoneyAmount } from '../types/money.type.js';

/** ISO 4217 currency code. */
export const CurrencyCodeSchema = z
  .string()
  .regex(new RegExp(MoneyLimits.currencyPattern))
  .describe('ISO 4217 currency code.') satisfies z.ZodType<string>;

/** Amount in minor units, integer and bounded to the safe range. */
export const MoneyAmountSchema = z
  .object({
    amountMinor: z
      .int()
      .min(-MoneyLimits.maxAbsAmountMinor)
      .max(MoneyLimits.maxAbsAmountMinor),
    currency: CurrencyCodeSchema,
  })
  .describe(
    'Amount in minor units of the currency.',
  ) satisfies z.ZodType<MoneyAmount>;
