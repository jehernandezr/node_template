import { z } from 'zod';
import type {
  FieldError,
  ProblemDetails,
  ProblemDetailsDetails,
} from '../types/problem-details.type.js';

/** Error of a field within `ProblemDetails.errors`. */
export const FieldErrorSchema = z
  .object({
    field: z.string().max(512).optional(),
    code: z.string().min(1).max(128),
    message: z.string().max(1024).optional(),
  })
  .describe('Error of a field.') satisfies z.ZodType<FieldError>;

/** Public data of an error: only what its code declares in the catalog. */
export const ProblemDetailsDetailsSchema = z
  .object({
    apiBaseUrl: z.string().max(2048).optional(),
    region: z.string().max(64).optional(),
  })
  .describe(
    'Public error data, for example the URL of the tenant region.',
  ) satisfies z.ZodType<ProblemDetailsDetails>;

/** RFC 9457 error response with the `code`, `traceId` and `errors` extensions. */
export const ProblemDetailsSchema = z
  .object({
    type: z.string().min(1),
    title: z.string(),
    status: z.int().min(400).max(599),
    detail: z.string().optional(),
    instance: z.string().optional(),
    code: z.string().min(1).max(128),
    traceId: z.string().optional(),
    errors: z.array(FieldErrorSchema).optional(),
    details: ProblemDetailsDetailsSchema.optional(),
  })
  .describe('RFC 9457 error response.') satisfies z.ZodType<ProblemDetails>;
