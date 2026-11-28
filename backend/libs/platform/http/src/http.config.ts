import {
  ConfigSection,
  envDuration,
  envList,
  envNumber,
} from '@platform/config';
import { z } from 'zod';

const WEB_ORIGIN_PROTOCOLS: readonly string[] = ['http:', 'https:'];

/**
 * HTTP entry variables. `SESSION_IDLE_TTL` is the same variable read by the service that
 * issues sessions: the cookie lasts as long as the idle window.
 */
export const httpConfigSchema = z.object({
  /**
   * Allowed origins for CORS and for the `Origin` policy, comma-separated. Each one is an `http` or `https` origin
   * with no path, query or trailing slash, as browsers send it in `Origin`, such as `https://app.example.com`.
   */
  WEB_ORIGINS: envList()
    .pipe(
      z.array(
        z
          .string()
          .refine(
            (origin) =>
              URL.canParse(origin) &&
              WEB_ORIGIN_PROTOCOLS.includes(new URL(origin).protocol) &&
              new URL(origin).origin === origin,
            'expected an origin such as https://app.example.com',
          ),
      ),
    )
    .default([]),
  /** Trusted proxy hops used to compute the client IP. */
  TRUST_PROXY_HOPS: envNumber({ min: 0, max: 10 }).default(0),
  /** Session cookie lifetime. */
  SESSION_IDLE_TTL: envDuration().default(86_400_000),
  /** Base of the Problem Details `type` URL. */
  PROBLEM_TYPE_BASE_URL: z.url().default('https://docs.node-template.dev'),
});

export type HttpSettings = z.infer<typeof httpConfigSchema>;

/** Configuration section that `HttpModule` validates at startup. */
export const HttpConfig = new ConfigSection<HttpSettings>(
  'http',
  httpConfigSchema,
);
