import { z } from 'zod';
import type {
  FieldError,
  ProblemDetails,
} from '../types/problem-details.type.js';

/** Error de un campo dentro de `ProblemDetails.errors`. */
export const FieldErrorSchema = z
  .object({
    field: z.string().max(512).optional(),
    code: z.string().min(1).max(128),
    message: z.string().max(1024).optional(),
  })
  .describe('Error de un campo.') satisfies z.ZodType<FieldError>;

/** Respuesta de error RFC 9457 con las extensiones `code`, `traceId` y `errors`. */
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
  })
  .describe('Respuesta de error RFC 9457.') satisfies z.ZodType<ProblemDetails>;
