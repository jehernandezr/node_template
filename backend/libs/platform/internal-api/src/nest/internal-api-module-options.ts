import type { Type } from '@nestjs/common';
import type { OperationDefinition } from '@contracts/platform';
import type { PurgeableStore } from '@platform/kernel';
import type { FinalOutcome } from '@platform/primitives';
import { IdempotencyStore } from '@platform/kernel';
import type { InternalRequestSigner } from '../signing/internal-request-signer.js';
import type { HandlerUnitOfWork } from './handler-unit-of-work.enum.js';
import type { InternalTransportKind } from './internal-transport-kind.enum.js';

/** How other services are reached over HTTP and how calls are signed and verified. */
export interface InternalApiHttpOptions {
  /** Base URL per service name: the first segment of its operations' id. */
  readonly baseUrls: Readonly<Record<string, string>>;
  /** HMAC secret shared between services. It comes from the validated configuration, never written in the code. */
  readonly secret: string;
  /** Secret of the previous rotation: incoming calls signed with it are still accepted; nothing is signed with it. */
  readonly previousSecret?: string;
  /**
   * Signer of outgoing calls. Without a value, `HmacSigner` with `secret`. A service that chooses
   * `INTERNAL_API_SIGNER=sigv4` passes the `SigV4Signer` from `@platform/adapters-aws` here.
   */
  readonly signer?: InternalRequestSigner;
  /** Validity window of a signature. Defaults to 60 000 ms. */
  readonly signatureWindowMs?: number;
}

/**
 * `InternalApiModule` options that can come from the configuration, so
 * `forRootAsync` builds them with a factory.
 */
export interface InternalApiModuleOptions {
  /** Operations this service publishes: each one must have a handler. */
  readonly operations: readonly OperationDefinition[];
  /** Operations of other services that this one calls. They are added to the client catalog. */
  readonly remoteOperations?: readonly OperationDefinition[];
  /** Required with `InternalTransportKind.Http`, and for the controller to authenticate incoming calls. */
  readonly http?: InternalApiHttpOptions;
  /** Cap on the serialized input and output. Defaults to 256 KiB. */
  readonly maxPayloadBytes?: number;
  /** Margin of the idempotency lease over the call deadline. */
  readonly leaseMarginMs?: number;
  /** Minimum idempotency lease. */
  readonly minLeaseMs?: number;
  /** Cap of the default budget of a call. Defaults to 25 000 ms. */
  readonly maxCallBudgetMs?: number;
  /** How long a stored result is kept before the retention job deletes it. */
  readonly retentionMs?: number;
}

/**
 * Adapters of `InternalApiModule`. They are passed as a type, not as an instance,
 * and are fixed when composing the module: they go the same way in `forRoot` and in `forRootAsync`.
 */
export interface InternalApiModuleExtras {
  /** Required. `Http` to call other processes, `InProcess` for local mode. */
  readonly transport?: InternalTransportKind;
  /**
   * Required. Router idempotency store; in production, the one from
   * `adapters-postgres`, which writes in the same transaction as the handler.
   */
  readonly processedStore?: Type<IdempotencyStore<FinalOutcome<unknown>>>;
  /**
   * Store that the retention job purges. Without it, the job is not registered. It is usually
   * the same class as `processedStore`.
   */
  readonly purgeableStore?: Type<PurgeableStore>;
  /** Defaults to `HandlerUnitOfWork.Shared`. */
  readonly unitOfWork?: HandlerUnitOfWork;
  /** `false` to import the module in each module that uses it. Global by default. */
  readonly isGlobal?: boolean;
}

/**
 * The extras already validated by `InternalApiModule`: `transport` and `processedStore`
 * are no longer optional. It is what the providers receive.
 */
export type ResolvedInternalApiExtras = InternalApiModuleExtras &
  Required<Pick<InternalApiModuleExtras, 'transport' | 'processedStore'>>;
