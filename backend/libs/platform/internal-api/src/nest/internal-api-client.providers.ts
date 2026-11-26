import type { Provider } from '@nestjs/common';
import { Clock } from '@platform/kernel';
import { TraceContextRestorer } from '@platform/observability';
import { CallOutcomeFactory, RetryAfterParser } from '@platform/primitives';
import { ResilienceRegistry } from '@platform/resilience';
import { HmacSigner } from '../signing/hmac-signer.js';
import { InternalRequestSigner } from '../signing/internal-request-signer.js';
import { CallErrorTranslator } from '../client/call-error-translator.js';
import { ClientOutcomeChecker } from '../client/client-outcome-checker.js';
import { InternalClient } from '../client/internal-client.js';
import { OperationPolicyResolver } from '../client/operation-policy-resolver.js';
import { ContractRegistry } from '../contract/contract-registry.js';
import { OperationResolver } from '../contract/operation-resolver.js';
import { PayloadLimit } from '../contract/payload-limit.js';
import { InternalApiError } from '../errors/internal-api-error.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import { InternalRouter } from '../server/internal-router.js';
import { HttpOutcomeReader } from '../transport/http-outcome-reader.js';
import { HttpTransport } from '../transport/http-transport.js';
import { InProcessTransport } from '../transport/in-process-transport.js';
import { LocalFirstTransport } from '../transport/local-first-transport.js';
import { ServiceBaseUrls } from '../transport/service-base-urls.js';
import { Transport } from '../transport/transport.js';
import type {
  InternalApiHttpOptions,
  InternalApiModuleOptions,
} from './internal-api-module-options.js';
import { INTERNAL_API_OPTIONS } from './internal-api.module-definition.js';
import { InternalTransportKind } from './internal-transport-kind.enum.js';

/** Client-side providers: the `InternalClient` and the transport the service chose. */
export class InternalApiClientProviders {
  /**
   * Provides the `InternalClient` over the chosen transport, with the resilience policy of each operation.
   * @param transport In-process or HTTP.
   * @returns The providers.
   */
  static build(transport: InternalTransportKind): Provider[] {
    return [
      ...InternalApiClientProviders.client(),
      ...(transport === InternalTransportKind.Http
        ? InternalApiClientProviders.http()
        : InternalApiClientProviders.inProcess()),
    ];
  }

  private static client(): Provider[] {
    return [
      {
        provide: OperationPolicyResolver,
        useFactory: (resilience: ResilienceRegistry) =>
          new OperationPolicyResolver(resilience),
        inject: [ResilienceRegistry],
      },
      {
        provide: CallErrorTranslator,
        useFactory: (outcomes: CallOutcomeFactory) =>
          new CallErrorTranslator(outcomes),
        inject: [CallOutcomeFactory],
      },
      {
        provide: ClientOutcomeChecker,
        useFactory: (payload: PayloadLimit) =>
          new ClientOutcomeChecker(payload),
        inject: [PayloadLimit],
      },
      {
        provide: InternalClient,
        useFactory: (
          transport: Transport,
          resilience: ResilienceRegistry,
          resolver: OperationResolver,
          policies: OperationPolicyResolver,
          translator: CallErrorTranslator,
          checker: ClientOutcomeChecker,
          restorer: TraceContextRestorer,
          clock: Clock,
          payload: PayloadLimit,
          registry: ContractRegistry,
        ) =>
          new InternalClient({
            transport,
            resilience,
            resolver,
            policies,
            translator,
            checker,
            restorer,
            clock: clock,
            payload,
            registry,
          }),
        inject: [
          Transport,
          ResilienceRegistry,
          OperationResolver,
          OperationPolicyResolver,
          CallErrorTranslator,
          ClientOutcomeChecker,
          TraceContextRestorer,
          Clock,
          PayloadLimit,
          ContractRegistry,
        ],
      },
    ];
  }

  private static inProcess(): Provider[] {
    return [
      InternalApiClientProviders.local(),
      { provide: Transport, useExisting: InProcessTransport },
    ];
  }

  private static local(): Provider {
    return {
      provide: InProcessTransport,
      useFactory: (router: InternalRouter) => new InProcessTransport(router),
      inject: [InternalRouter],
    };
  }

  /**
   * Own operations go through the process router and the rest over HTTP. Without the `http` options the
   * transport cannot sign or reach anyone: startup fails.
   */
  private static http(): Provider[] {
    return [
      {
        provide: InternalRequestSigner,
        useFactory: (options: InternalApiModuleOptions, clock: Clock) =>
          InternalApiClientProviders.httpOptions(options).signer ??
          new HmacSigner(
            InternalApiClientProviders.httpOptions(options).secret,
            clock,
          ),
        inject: [INTERNAL_API_OPTIONS, Clock],
      },
      {
        provide: HttpTransport,
        useFactory: (
          options: InternalApiModuleOptions,
          signer: InternalRequestSigner,
          clock: Clock,
        ) =>
          new HttpTransport(
            new ServiceBaseUrls(
              InternalApiClientProviders.httpOptions(options).baseUrls,
            ),
            signer,
            new HttpOutcomeReader(new RetryAfterParser(clock)),
            globalThis.fetch,
          ),
        inject: [INTERNAL_API_OPTIONS, InternalRequestSigner, Clock],
      },
      InternalApiClientProviders.local(),
      {
        provide: Transport,
        useFactory: (
          options: InternalApiModuleOptions,
          local: InProcessTransport,
          remote: HttpTransport,
        ) =>
          new LocalFirstTransport(
            new Set(options.operations.map((operation) => operation.id)),
            local,
            remote,
          ),
        inject: [INTERNAL_API_OPTIONS, InProcessTransport, HttpTransport],
      },
    ];
  }

  /** @throws InternalApiError `InvalidConfiguration` if the `http` options are missing. */
  private static httpOptions(
    options: InternalApiModuleOptions,
  ): InternalApiHttpOptions {
    if (options.http === undefined) {
      throw new InternalApiError(
        InternalApiErrorCode.InvalidConfiguration,
        'The http options are required for the HTTP transport',
      );
    }
    return options.http;
  }
}
