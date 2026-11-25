import { InternalRequestSignerSelector } from '@platform/adapters-aws';
import type { AppConfig } from '@platform/config';
import { InternalApiSignerKind } from '@platform/internal-api';
import type {
  ServiceInternalHttpContext,
  ServiceInternalHttpSettings,
} from '../service-internal-api.js';
import type { InternalHttpConfig } from './internal-http.config.js';

/**
 * HTTP transport of a service's internal API. The HMAC secret always authenticates incoming
 * calls; outgoing ones are signed with the `INTERNAL_API_SIGNER` signer: HMAC locally and SigV4 with the
 * service role when the destination validates with IAM.
 */
export class SignedInternalHttp {
  private readonly selector = new InternalRequestSignerSelector();

  /** @param callees services this one calls; each one needs its URL in `INTERNAL_API_BASE_URLS`. */
  constructor(private readonly callees: readonly string[] = []) {}

  /**
   * @throws Error if the URL of a service in `callees` is missing, so the service does not start without being able to
   *   call it, or with SigV4 without the AWS adapter: there are no credentials to sign with.
   */
  settings(
    config: AppConfig,
    context: ServiceInternalHttpContext,
  ): ServiceInternalHttpSettings {
    const values = config.root<InternalHttpConfig>();
    const hmacSecret = values.INTERNAL_API_SHARED_SECRET.reveal();
    const baseUrls = values.INTERNAL_API_BASE_URLS;
    const missing = this.callees.filter((callee) => !(callee in baseUrls));
    if (missing.length > 0) {
      throw new Error(
        `INTERNAL_API_BASE_URLS does not have the URL of ${missing.join(', ')}`,
      );
    }
    if (values.INTERNAL_API_SIGNER === InternalApiSignerKind.Hmac) {
      return { baseUrls, secret: hmacSecret };
    }
    if (context.aws === undefined) {
      throw new Error(
        'INTERNAL_API_SIGNER=sigv4 needs the AWS adapter to sign with the service role',
      );
    }
    return {
      baseUrls,
      secret: hmacSecret,
      signer: this.selector.select(values.INTERNAL_API_SIGNER, {
        hmacSecret,
        clock: context.clock,
        credentials: context.aws.credentials,
        sigv4: {
          region: context.aws.region,
          service: values.INTERNAL_API_SIGV4_SERVICE,
        },
      }),
    };
  }
}
