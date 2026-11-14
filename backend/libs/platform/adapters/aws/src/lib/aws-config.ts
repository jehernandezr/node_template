import { defineConfig } from '@platform/config';
import { z } from 'zod';

/** Cuenta que usa LocalStack por defecto. */
export const LOCALSTACK_ACCOUNT_ID = '000000000000';

/**
 * Variables del adaptador de AWS. La configuración base es agnóstica a la nube;
 * un servicio que usa este adaptador la extiende con
 * `baseConfigSchema.extend(awsConfigSchema.shape)`.
 *
 * Las credenciales no van aquí: el SDK las toma de la cadena por defecto (rol
 * de la Lambda o de la tarea de Fargate; en local, las variables de LocalStack).
 */
export const awsConfigSchema = z.object({
  /** Región de AWS, por ejemplo `us-east-1`. */
  AWS_REGION: z
    .string()
    .trim()
    .regex(/^[a-z]{2}(-[a-z]+)+-\d+$/, 'región de AWS inválida'),
  /**
   * Endpoint de todos los servicios, solo para LocalStack (`http://localhost:4566`).
   * En AWS se deja vacío. Es la misma variable que lee el SDK.
   */
  AWS_ENDPOINT_URL: z.url().optional(),
  /**
   * Cuenta dueña de los tópicos; arma el ARN sin llamar a STS. En LocalStack es
   * {@link LOCALSTACK_ACCOUNT_ID}. Sin valor por defecto, para que un despliegue
   * no publique en una cuenta equivocada.
   */
  AWS_ACCOUNT_ID: z.string().regex(/^\d{12}$/, 'la cuenta tiene 12 dígitos'),
  /**
   * Prefijo de los nombres físicos de tópicos y colas: el `name_prefix` del
   * módulo `messaging` de Terraform (`<prefijo>-<nombre lógico>[.fifo]`).
   */
  MESSAGING_NAME_PREFIX: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'minúsculas, dígitos y guiones'),
});

/** Configuración validada del adaptador de AWS. */
export type AwsConfig = z.infer<typeof awsConfigSchema>;

/** Carga y valida la configuración del adaptador. Llamar una vez al arrancar. */
export const awsConfig = defineConfig(awsConfigSchema);
