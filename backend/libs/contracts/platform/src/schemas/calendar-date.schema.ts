import { z } from 'zod';
import { CalendarDateFormat } from '../constants/calendar-date.constants.js';

/** Calendar date `YYYY-MM-DD`, without time or zone. */
export const CalendarDateSchema = z
  .string()
  .regex(new RegExp(CalendarDateFormat.pattern))
  .describe(
    'Calendar date YYYY-MM-DD, without time or zone.',
  ) satisfies z.ZodType<string>;
