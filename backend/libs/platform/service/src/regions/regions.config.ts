import { ConfigSection } from '@platform/config';
import type { Region } from '@platform/sharding';
import { z } from 'zod';

const regionSchema = z.object({
  code: z.string().trim().min(1).max(32),
  apiBaseUrl: z.url({ protocol: /^https?$/ }),
  issuer: z.url({ protocol: /^https?$/ }),
});

/** `[{"code": "...", "apiBaseUrl": "...", "issuer": "..."}]` as JSON in a variable. */
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
    /** The regions of the deployment. Empty: a single region and no rejection by region. */
    REGIONS: regionsSchema,
    /** Region this process serves; tenants of another one get `PLATFORM.SHARDING.WRONG_REGION`. */
    SERVICE_REGION: z.string().trim().min(1).max(32).optional(),
    /**
     * The issuer this process accepts in tokens (read by `@platform/auth`). With regions it must be the `issuer` of
     * `SERVICE_REGION`: that way a token issued in another region does not verify here.
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

/** The regions of the deployment, from `REGIONS` and `SERVICE_REGION`. */
export class ServiceRegions {
  constructor(private readonly settings: RegionsSettings) {}

  /**
   * The region of this process, or `undefined` if the deployment does not declare one.
   * @returns The region code, or `undefined`.
   */
  current(): string | undefined {
    return this.settings.SERVICE_REGION;
  }

  /**
   * The token issuer of a region, or `undefined` if it is not in `REGIONS`.
   * @param code Region code.
   * @returns The issuer, or `undefined`.
   */
  issuerOf(code: string): string | undefined {
    return this.settings.REGIONS.find((region) => region.code === code)?.issuer;
  }

  /**
   * Lists every declared region.
   * @returns The regions.
   */
  all(): readonly Region[] {
    return this.settings.REGIONS;
  }

  /**
   * The API URL of a region, or `undefined` if it is not in `REGIONS`.
   * @param code Region code.
   * @returns The URL, or `undefined`.
   */
  apiBaseUrlOf(code: string): string | undefined {
    return this.settings.REGIONS.find((region) => region.code === code)
      ?.apiBaseUrl;
  }
}
