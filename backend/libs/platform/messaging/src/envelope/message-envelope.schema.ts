import { z } from 'zod';
import { EnvelopeLimits } from './envelope-limits.js';

const TRACEPARENT_PATTERN =
  /^[0-9a-f]{2}-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/;

/**
 * Esquema zod del sobre CloudEvents. Cada atributo de texto tiene su largo
 * máximo. Los atributos desconocidos (extensiones) pasan; el tamaño total lo
 * comprueba `EnvelopeValidator` antes de correr este esquema. `data` no se
 * inspecciona aquí: cada contrato valida el suyo.
 */
export const messageEnvelopeSchema = z.looseObject({
  specversion: z.literal('1.0'),
  id: z.string().min(1).max(EnvelopeLimits.MAX_ID_LENGTH),
  type: z.string().min(1).max(EnvelopeLimits.MAX_TYPE_LENGTH),
  source: z.string().min(1).max(EnvelopeLimits.MAX_SOURCE_LENGTH),
  subject: z.string().max(EnvelopeLimits.MAX_SUBJECT_LENGTH).optional(),
  time: z.iso.datetime({ offset: true }).max(EnvelopeLimits.MAX_TIME_LENGTH),
  datacontenttype: z.literal('application/json'),
  traceparent: z
    .string()
    .max(EnvelopeLimits.MAX_TRACEPARENT_LENGTH)
    .regex(TRACEPARENT_PATTERN, 'traceparent must be a W3C trace context')
    .optional(),
  tenantid: z
    .string()
    .min(1)
    .max(EnvelopeLimits.MAX_TENANT_ID_LENGTH)
    .optional(),
  actorid: z.string().min(1).max(EnvelopeLimits.MAX_ACTOR_ID_LENGTH).optional(),
  data: z.unknown(),
});
