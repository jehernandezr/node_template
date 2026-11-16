import { z } from 'zod';
import { CalendarDateFormat } from '../constants/calendar-date.constants.js';

/** Fecha de calendario `AAAA-MM-DD`, sin hora ni zona. */
export const CalendarDateSchema = z
  .string()
  .regex(new RegExp(CalendarDateFormat.pattern))
  .describe(
    'Fecha de calendario AAAA-MM-DD, sin hora ni zona.',
  ) satisfies z.ZodType<string>;
