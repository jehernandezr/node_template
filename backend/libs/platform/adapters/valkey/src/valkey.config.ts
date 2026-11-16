import { ConfigSection, envBoolean, envNumber } from '@platform/config';
import { z } from 'zod';
import { ValkeyAuthMode } from './valkey-auth-mode.enum.js';
import { ValkeyKeyspace } from './valkey-keyspace.js';

/**
 * Variables del adaptador de Valkey, con los nombres que inyecta el stack
 * `service` de Terraform. Las combinaciones que un esquema plano no puede
 * validar (URL o host, modo IAM completo) las revisa `ValkeyConnectionResolver`.
 */
export const valkeyConfigSchema = z.object({
  /** Local: URL `redis://` o `rediss://`. Excluyente con `VALKEY_HOST`. */
  VALKEY_URL: z
    .string()
    .trim()
    .regex(/^rediss?:\/\/\S+$/, 'se espera una URL redis:// o rediss://')
    .optional(),
  /** AWS: endpoint de la caché. */
  VALKEY_HOST: z.string().trim().min(1).optional(),
  VALKEY_PORT: envNumber({ min: 1, max: 65_535 }).default(6379),
  VALKEY_TLS: envBoolean().default(false),
  /** Usuario de la ACL; con IAM es también el id de usuario que nombra el token. */
  VALKEY_USER: z.string().trim().min(1).optional(),
  VALKEY_AUTH: z.enum(ValkeyAuthMode).default(ValkeyAuthMode.None),
  /** Con IAM: nombre de la caché (no su endpoint), el host que firma el token. */
  VALKEY_CACHE_NAME: z.string().trim().min(1).optional(),
  /**
   * Primer segmento de cada llave y canal; la ACL solo permite `<prefijo>:*`.
   * Sin valor se usa `SERVICE_NAME`.
   */
  VALKEY_KEY_PREFIX: z
    .string()
    .trim()
    .regex(
      ValkeyKeyspace.PREFIX_PATTERN,
      'se esperan de 1 a 64 caracteres en [A-Za-z0-9_-]',
    )
    .optional(),
});

/** Configuración validada del adaptador de Valkey. */
export type ValkeySettings = z.infer<typeof valkeyConfigSchema>;

/** Sección de configuración que `ValkeyModule` valida al arrancar. */
export const ValkeyConfig = new ConfigSection<ValkeySettings>(
  'valkey',
  valkeyConfigSchema,
);
