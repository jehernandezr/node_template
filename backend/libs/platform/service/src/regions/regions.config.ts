import { ConfigSection } from '@platform/config';
import type { Region } from '@platform/sharding';
import { z } from 'zod';

const regionSchema = z.object({
  code: z.string().trim().min(1).max(32),
  apiBaseUrl: z.url({ protocol: /^https?$/ }),
  issuer: z.url({ protocol: /^https?$/ }),
});

/** `[{"code": "...", "apiBaseUrl": "...", "issuer": "..."}]` como JSON en una variable. */
const regionsSchema = z
  .string()
  .default('[]')
  .transform((raw, ctx) => {
    try {
      return z.array(regionSchema).parse(JSON.parse(raw));
    } catch {
      ctx.addIssue({
        code: 'custom',
        message:
          'expected a JSON array of regions with code, apiBaseUrl and issuer',
      });
      return z.NEVER;
    }
  });

export const regionsConfigSchema = z
  .object({
    /** Las regiones del despliegue. Vacío: una sola región y ningún rechazo por región. */
    REGIONS: regionsSchema,
    /** Región que sirve este proceso; los tenants de otra responden `PLATFORM.SHARDING.WRONG_REGION`. */
    SERVICE_REGION: z.string().trim().min(1).max(32).optional(),
    /**
     * El emisor que este proceso acepta en los tokens (lo lee `@platform/auth`). Con regiones debe ser el `issuer` de
     * `SERVICE_REGION`: así un token emitido en otra región no verifica aquí.
     */
    AUTH_ISSUER: z.string().trim().min(1).optional(),
  })
  .superRefine((settings, ctx) => {
    const codes = settings.REGIONS.map((region) => region.code);
    if (new Set(codes).size !== codes.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['REGIONS'],
        message: 'each region code appears once',
      });
    }
    if (
      settings.SERVICE_REGION !== undefined &&
      codes.length > 0 &&
      !codes.includes(settings.SERVICE_REGION)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['SERVICE_REGION'],
        message: 'SERVICE_REGION must be one of the codes in REGIONS',
      });
    }
    const served = settings.REGIONS.find(
      (region) => region.code === settings.SERVICE_REGION,
    );
    if (
      served !== undefined &&
      settings.AUTH_ISSUER !== undefined &&
      settings.AUTH_ISSUER !== served.issuer
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_ISSUER'],
        message: 'AUTH_ISSUER must be the issuer of SERVICE_REGION in REGIONS',
      });
    }
  });

export type RegionsSettings = z.output<typeof regionsConfigSchema>;

export const RegionsConfig = new ConfigSection<RegionsSettings>(
  'regions',
  regionsConfigSchema,
);

/** Las regiones del despliegue, de `REGIONS` y `SERVICE_REGION`. */
export class ServiceRegions {
  constructor(private readonly settings: RegionsSettings) {}

  /** La región de este proceso, o `undefined` si el despliegue no declara una. */
  current(): string | undefined {
    return this.settings.SERVICE_REGION;
  }

  /** El emisor de los tokens de una región, o `undefined` si no está en `REGIONS`. */
  issuerOf(code: string): string | undefined {
    return this.settings.REGIONS.find((region) => region.code === code)?.issuer;
  }

  all(): readonly Region[] {
    return this.settings.REGIONS;
  }

  /** La URL de la API de una región, o `undefined` si no está en `REGIONS`. */
  apiBaseUrlOf(code: string): string | undefined {
    return this.settings.REGIONS.find((region) => region.code === code)
      ?.apiBaseUrl;
  }
}
