import { z } from 'zod';
import type {
  FieldError,
  ProblemDetails,
  ProblemDetailsDetails,
} from '../types/problem-details.type.js';

/** Error de un campo dentro de `ProblemDetails.errors`. */
export const FieldErrorSchema = z
  .object({
    field: z.string().max(512).optional(),
    code: z.string().min(1).max(128),
    message: z.string().max(1024).optional(),
  })
  .describe('Error de un campo.') satisfies z.ZodType<FieldError>;

/** Datos públicos de un error: solo los que su código declara en el catálogo. */
export const ProblemDetailsDetailsSchema = z
  .object({
    apiBaseUrl: z.string().max(2048).optional(),
    region: z.string().max(64).optional(),
  })
  .describe(
    'Datos públicos del error, por ejemplo la URL de la región del tenant.',
  ) satisfies z.ZodType<ProblemDetailsDetails>;

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
    details: ProblemDetailsDetailsSchema.optional(),
  })
  .describe('Respuesta de error RFC 9457.') satisfies z.ZodType<ProblemDetails>;
