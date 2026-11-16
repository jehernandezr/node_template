import type { Provider } from '@nestjs/common';
import { SystemClock, type Clock } from '@platform/kernel';
import { TraceContextRestorer } from '@platform/observability';
import { CallOutcomeFactory, RetryAfterParser } from '@platform/primitives';
import { ResilienceRegistry } from '@platform/resilience';
import { HmacInternalCallSigner } from '../auth/hmac-internal-call-signer.js';
import { InternalCallSigner } from '../auth/internal-call-signer.js';
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
import { ServiceBaseUrls } from '../transport/service-base-urls.js';
import { Transport } from '../transport/transport.js';
import type {
  InternalApiHttpOptions,
  InternalApiModuleOptions,
} from './internal-api-module-options.js';
import { InternalApiOptionalDependency } from './internal-api-optional-dependency.js';
import { INTERNAL_API_OPTIONS } from './internal-api.module-definition.js';
import { InternalTransportKind } from './internal-transport-kind.enum.js';

/** Proveedores del lado cliente: el `InternalClient` y el transporte que eligió el servicio. */
export class InternalApiClientProviders {
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
          clock: Clock | undefined,
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
            clock: clock ?? new SystemClock(),
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
          InternalApiOptionalDependency.CLOCK,
          PayloadLimit,
          ContractRegistry,
        ],
      },
    ];
  }

  private static inProcess(): Provider[] {
    return [
      {
        provide: InProcessTransport,
        useFactory: (router: InternalRouter) => new InProcessTransport(router),
        inject: [InternalRouter],
      },
      { provide: Transport, useExisting: InProcessTransport },
    ];
  }

  /** Sin las opciones `http` el transporte no puede firmar ni llegar a nadie: el arranque falla. */
  private static http(): Provider[] {
    return [
      {
        provide: InternalCallSigner,
        useFactory: (
          options: InternalApiModuleOptions,
          clock: Clock | undefined,
        ) =>
          new HmacInternalCallSigner(
            InternalApiClientProviders.httpOptions(options).secret,
            clock ?? new SystemClock(),
          ),
        inject: [INTERNAL_API_OPTIONS, InternalApiOptionalDependency.CLOCK],
      },
      {
        provide: HttpTransport,
        useFactory: (
          options: InternalApiModuleOptions,
          signer: InternalCallSigner,
          clock: Clock | undefined,
        ) =>
          new HttpTransport(
            new ServiceBaseUrls(
              InternalApiClientProviders.httpOptions(options).baseUrls,
            ),
            signer,
            new HttpOutcomeReader(
              new RetryAfterParser(clock ?? new SystemClock()),
            ),
            globalThis.fetch,
          ),
        inject: [
          INTERNAL_API_OPTIONS,
          InternalCallSigner,
          InternalApiOptionalDependency.CLOCK,
        ],
      },
      { provide: Transport, useExisting: HttpTransport },
    ];
  }

  /** @throws InternalApiError `InvalidConfiguration` si faltan las opciones `http`. */
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
