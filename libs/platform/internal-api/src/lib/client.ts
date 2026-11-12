import {
  allowedErrorCodes,
  effectiveAttempts,
  effectiveRetry,
  effectiveTimeout,
  getOperationMetadata,
} from './contract.js';
import type {
  ContractConstructor,
  ContractInput,
  ContractOutput,
  RetryPolicy,
} from './contract.js';
import { InternalApiError, InternalApiErrorCode } from './errors.js';
import type { ContractRegistry } from './registry.js';
import { ResultKind } from './result.js';
import type { OperationResult } from './result.js';
import type { CallMeta, Transport } from './transport.js';

export interface InternalClientOptions {
  readonly transport: Transport;
  readonly registry: ContractRegistry;
  /** Waits between attempts. Defaults to `setTimeout`. */
  readonly sleep?: (ms: number) => Promise<void>;
  /** Returns a value in [0, 1). Defaults to `Math.random`. */
  readonly random?: () => number;
}

/** Per-call values. `idempotencyKey` is required. */
export interface CallOptions {
  readonly idempotencyKey: string;
  readonly traceparent?: string;
  readonly tenantId?: string;
  readonly actorId?: string;
}

type AttemptMeta = Omit<CallMeta, 'deadline' | 'signal'>;

/**
 * Typed client for internal operations. Owns retries, backoff and timeouts.
 * Validates input and output on this side, but transmits the original input.
 */
export class InternalClient {
  private readonly transport: Transport;
  private readonly registry: ContractRegistry;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly random: () => number;

  constructor(options: InternalClientOptions) {
    this.transport = options.transport;
    this.registry = options.registry;
    this.sleep =
      options.sleep ??
      ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.random = options.random ?? Math.random;
  }

  /**
   * Calls an operation. Throws `InternalApiError` for input or output contract violations.
   * Everything else resolves to an `OperationResult`.
   */
  async call<C extends ContractConstructor>(
    ContractClass: C,
    input: ContractInput<C>,
    options: CallOptions,
  ): Promise<OperationResult<ContractOutput<C>>> {
    const metadata = getOperationMetadata(ContractClass);
    if (!metadata) {
      throw new TypeError(
        `${ContractClass.name} is not decorated with @Operation`,
      );
    }
    const registered = this.registry.get(metadata.id);
    if (!registered) {
      throw new InternalApiError(
        InternalApiErrorCode.UnknownOperation,
        `Operation "${metadata.id}" is not registered`,
      );
    }
    if (options.idempotencyKey.trim() === '') {
      throw new InternalApiError(
        InternalApiErrorCode.InvalidInput,
        `Operation "${metadata.id}" requires an idempotencyKey`,
      );
    }

    const parsedInput = registered.contract.input.safeParse(input);
    if (!parsedInput.success) {
      throw new InternalApiError(
        InternalApiErrorCode.InvalidInput,
        `Invalid input for "${metadata.id}": ${parsedInput.error.message}`,
      );
    }

    const meta: AttemptMeta = {
      idempotencyKey: options.idempotencyKey,
      timeoutMs: effectiveTimeout(metadata),
      ...(options.traceparent !== undefined && {
        traceparent: options.traceparent,
      }),
      ...(options.tenantId !== undefined && { tenantId: options.tenantId }),
      ...(options.actorId !== undefined && { actorId: options.actorId }),
    };

    const retry: RetryPolicy = effectiveRetry(metadata);
    const maxAttempts = effectiveAttempts(metadata);
    let result = await this.attempt(metadata.id, input, meta);
    for (
      let attempt = 1;
      attempt < maxAttempts && result.kind === ResultKind.TransientFailure;
      attempt++
    ) {
      await this.sleep(this.backoff(attempt, retry));
      result = await this.attempt(metadata.id, input, meta);
    }

    if (result.kind === ResultKind.BusinessError) {
      if (allowedErrorCodes(metadata).has(result.code)) {
        return result;
      }
      return {
        kind: ResultKind.ProtocolViolation,
        reason: 'undeclared-error',
        code: result.code,
      };
    }

    if (result.kind === ResultKind.Success) {
      const parsedOutput = registered.contract.output.safeParse(result.value);
      if (!parsedOutput.success) {
        throw new InternalApiError(
          InternalApiErrorCode.InvalidOutput,
          `Invalid output from "${metadata.id}": ${parsedOutput.error.message}`,
        );
      }
      return {
        kind: ResultKind.Success,
        value: parsedOutput.data as ContractOutput<C>,
      };
    }

    return result;
  }

  /**
   * One attempt, bounded by the per-attempt timeout. On timeout the signal handed to the
   * transport is aborted and the attempt resolves as TransientFailure `timeout`.
   */
  private async attempt(
    operationId: string,
    input: unknown,
    meta: AttemptMeta,
  ): Promise<OperationResult<unknown>> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<OperationResult<unknown>>((resolve) => {
      timer = setTimeout(() => {
        controller.abort();
        resolve({ kind: ResultKind.TransientFailure, reason: 'timeout' });
      }, meta.timeoutMs);
    });
    const attemptMeta: CallMeta = {
      ...meta,
      deadline: Date.now() + meta.timeoutMs,
      signal: controller.signal,
    };
    try {
      return await Promise.race([
        this.invokeTransport(operationId, input, attemptMeta),
        timeout,
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  private async invokeTransport(
    operationId: string,
    input: unknown,
    meta: CallMeta,
  ): Promise<OperationResult<unknown>> {
    try {
      return await this.transport.invoke(operationId, input, meta);
    } catch (cause) {
      return {
        kind: ResultKind.TransientFailure,
        reason: 'transport-error',
        cause,
      };
    }
  }

  /** Exponential backoff capped at `maxMs`, with equal jitter (between half and the full cap). */
  private backoff(attempt: number, retry: RetryPolicy): number {
    const cap = Math.min(retry.maxMs, retry.baseMs * 2 ** (attempt - 1));
    return cap / 2 + this.random() * (cap / 2);
  }
}
