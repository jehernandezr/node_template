import { z } from 'zod';
import { MoneyLimits } from '../constants/money.constants.js';
import type { MoneyAmount } from '../types/money.type.js';

/** Código de moneda ISO 4217. */
export const CurrencyCodeSchema = z
  .string()
  .regex(new RegExp(MoneyLimits.currencyPattern))
  .describe('Código de moneda ISO 4217.') satisfies z.ZodType<string>;

/** Monto en unidades menores, entero y acotado al rango seguro. */
export const MoneyAmountSchema = z
  .object({
    amountMinor: z
      .int()
      .min(-MoneyLimits.maxAbsAmountMinor)
      .max(MoneyLimits.maxAbsAmountMinor),
    currency: CurrencyCodeSchema,
  })
  .describe(
    'Monto en unidades menores de la moneda.',
  ) satisfies z.ZodType<MoneyAmount>;
