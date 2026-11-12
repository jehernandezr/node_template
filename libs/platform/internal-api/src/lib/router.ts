import {
  allowedErrorCodes,
  getOperationMetadata,
  INVALID_INPUT_CODE,
} from './contract.js';
import type {
  ContractConstructor,
  ContractInput,
  ContractOutput,
  OperationContract,
} from './contract.js';
import { InternalApiError, InternalApiErrorCode } from './errors.js';
import { hashInput } from './input-hash.js';
import type { ContractRegistry } from './registry.js';
import { ClaimState } from './store.js';
import type { ProcessedOperationStore } from './store.js';
import { ResultKind } from './result.js';
import type { OperationResult } from './result.js';
import type { CallMeta } from './transport.js';

export interface InternalRouterOptions {
  readonly processed: ProcessedOperationStore;
  /** Lease on an in-progress call. Must outlast the longest handler run. Defaults to 30 000 ms. */
  readonly leaseMs?: number;
}

const DEFAULT_LEASE_MS = 30_000;

type StoredHandler = (
  input: unknown,
  ctx: CallMeta,
) => Promise<OperationResult<unknown>>;

interface Route {
  readonly contract: OperationContract<unknown, unknown>;
  readonly handler: StoredHandler;
  readonly allowedCodes: ReadonlySet<string>;
}

function protocolViolation(
  reason: string,
  code?: string,
): OperationResult<unknown> {
  return {
    kind: ResultKind.ProtocolViolation,
    reason,
    ...(code !== undefined && { code }),
  };
}

/**
 * Server side of the internal API. Validates input, enforces idempotency by key and input hash,
 * checks deadlines and results against the contract, and dispatches to handlers.
 */
export class InternalRouter {
  private readonly processed: ProcessedOperationStore;
  private readonly leaseMs: number;
  private readonly routes = new Map<string, Route>();

  constructor(options: InternalRouterOptions) {
    this.processed = options.processed;
    this.leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS;
  }

  /** Binds a handler to a contract. Throws if the contract is undecorated or already bound. */
  register<C extends ContractConstructor>(
    ContractClass: C,
    handler: (
      input: ContractInput<C>,
      ctx: CallMeta,
    ) => Promise<OperationResult<ContractOutput<C>>>,
  ): void {
    const metadata = getOperationMetadata(ContractClass);
    if (!metadata) {
      throw new TypeError(
        `${ContractClass.name} is not decorated with @Operation`,
      );
    }
    if (this.routes.has(metadata.id)) {
      throw new InternalApiError(
        InternalApiErrorCode.DuplicateOperation,
        `A handler for "${metadata.id}" is already registered`,
      );
    }
    this.routes.set(metadata.id, {
      contract: new ContractClass(),
      handler: handler as StoredHandler,
      allowedCodes: allowedErrorCodes(metadata),
    });
  }

  /** Throws `MissingHandler` listing every operation of the registry without a handler. */
  assertComplete(registry: ContractRegistry): void {
    const missing = registry
      .operations()
      .map((operation) => operation.id)
      .filter((id) => !this.routes.has(id));
    if (missing.length > 0) {
      throw new InternalApiError(
        InternalApiErrorCode.MissingHandler,
        `Missing handlers for: ${missing.join(', ')}`,
      );
    }
  }

  /**
   * Handles one call.
   * - Unknown operation, handler failure, undeclared business code, invalid output or key reuse: ProtocolViolation.
   * - Invalid input: BusinessError INVALID_INPUT (not stored). Expired deadline: TransientFailure.
   * - Concurrent call on a claimed key: TransientFailure `in-progress`.
   * - Success and declared BusinessError are stored and replayed. Other results are not stored.
   */
  async handle(
    operationId: string,
    rawInput: unknown,
    meta: CallMeta,
  ): Promise<OperationResult<unknown>> {
    const route = this.routes.get(operationId);
    if (!route) {
      return protocolViolation('unknown-operation');
    }

    const parsed = route.contract.input.safeParse(rawInput);
    if (!parsed.success) {
      return {
        kind: ResultKind.BusinessError,
        code: INVALID_INPUT_CODE,
        message: `Invalid input for "${operationId}"`,
        details: { issues: parsed.error.issues },
      };
    }

    if (Date.now() > meta.deadline) {
      return { kind: ResultKind.TransientFailure, reason: 'deadline-exceeded' };
    }

    const key = `${meta.tenantId ?? '-'}|${operationId}|${meta.idempotencyKey}`;
    const inputHash = hashInput(parsed.data);
    const claim = await this.processed.claim(key, {
      inputHash,
      leaseMs: this.leaseMs,
      now: Date.now(),
    });

    if (claim.inputHash !== inputHash) {
      if (claim.state === ClaimState.Acquired) {
        await this.processed.release(key);
      }
      return protocolViolation('idempotency-key-reuse');
    }
    if (claim.state === ClaimState.Completed) {
      return claim.result;
    }
    if (claim.state === ClaimState.InProgress) {
      return { kind: ResultKind.TransientFailure, reason: 'in-progress' };
    }
    return this.execute(route, key, parsed.data, meta);
  }

  /** Runs the handler for a claimed key and settles the claim. */
  private async execute(
    route: Route,
    key: string,
    input: unknown,
    meta: CallMeta,
  ): Promise<OperationResult<unknown>> {
    let result: OperationResult<unknown>;
    try {
      result = await route.handler(input, meta);
    } catch {
      await this.processed.release(key);
      return protocolViolation('handler-error');
    }

    if (result.kind === ResultKind.Success) {
      const output = route.contract.output.safeParse(result.value);
      if (!output.success) {
        await this.processed.release(key);
        return protocolViolation('invalid-output');
      }
      const settled: OperationResult<unknown> = {
        kind: ResultKind.Success,
        value: output.data,
      };
      await this.processed.complete(key, settled);
      return settled;
    }

    if (result.kind === ResultKind.BusinessError) {
      if (!route.allowedCodes.has(result.code)) {
        await this.processed.release(key);
        return protocolViolation('undeclared-error', result.code);
      }
      await this.processed.complete(key, result);
      return result;
    }

    await this.processed.release(key);
    return result;
  }
}
