import { PlatformErrorCode } from '@contracts/platform';
import { context as otelContext, SpanKind } from '@opentelemetry/api';
import type { ContractRegistry } from '@platform/internal-api';
import {
  SystemClock,
  UuidV7IdGenerator,
  type Clock,
  type IdGenerator,
} from '@platform/kernel';
import {
  contextFromTraceparent,
  currentTraceparent,
  type LoggerPort,
  withSpan,
} from '@platform/observability';
import {
  type CallOutcome,
  CallOutcomeKind,
  Deadline,
  stableDigest,
} from '@platform/primitives';
import type { CompiledSaga, CompiledStep } from '../definition/saga-flow.js';
import type { SagaDefinition } from '../definition/saga-definition.js';
import {
  validateSagas,
  type SagaDefinitionIssue,
} from '../definition/saga-validation.js';
import { SagaError } from '../errors.js';
import type { OperationInvoker } from '../invoker.js';
import {
  SagaCallContext,
  SagaEvent,
  SagaEventKind,
  SagaEventListener,
  SagaInstance,
  SagaStatus,
  StepDirection,
  StepLogEntry,
  StepStatus,
  stepIdempotencyKey,
} from '../model.js';
import type { SagaStore } from '../store/saga-store.js';
import { assertNever, assertSerializableState, jsonClone } from '../util.js';
import {
  assertLeaseOutlivesStep,
  callContext,
  compileAll,
  DEFAULT_LEASE_MS,
  DEFAULT_MAX_STEP_MS,
  DEFAULT_MAX_SUSPEND_AGE_MS,
  DEFAULT_MAX_SUSPEND_ATTEMPTS,
  defaultBackoff,
} from './engine-setup.js';
import { buildSerializable, invokeStep } from './step-call.js';
import {
  advanceTo,
  compensationStart,
  deadlinePassed,
  errorDetail,
  findEntry,
  nextCompensation,
  replaceEntry,
  requireIntervention,
  suspend,
  type SuspendPolicy,
  toForwardEntry,
} from './transitions.js';

const FINISHED: ReadonlySet<SagaStatus> = new Set([
  SagaStatus.Completed,
  SagaStatus.Compensated,
  SagaStatus.CompensationFailed,
  SagaStatus.RequiresIntervention,
]);

const EVENT_BY_STATUS: ReadonlyMap<SagaStatus, SagaEventKind> = new Map([
  [SagaStatus.Completed, SagaEventKind.Completed],
  [SagaStatus.Compensated, SagaEventKind.Compensated],
  [SagaStatus.CompensationFailed, SagaEventKind.CompensationFailed],
  [SagaStatus.RequiresIntervention, SagaEventKind.RequiresIntervention],
  [SagaStatus.Suspended, SagaEventKind.Suspended],
]);

/** Options of `SagaEngine.start`. */
export interface StartOptions {
  /** Id of the instance. Defaults to a new UUIDv7. */
  readonly sagaId?: string;
  /** Time budget from start. Once it has passed, pre-pivot steps are not dispatched and compensate instead. */
  readonly deadlineMs?: number;
  /**
   * When an instance with this key exists, it is returned instead of starting
   * a new one, provided it has the same type and the same initial state
   * (compared by `stableDigest`); otherwise `IdempotencyKeyConflict`.
   */
  readonly idempotencyKey?: string;
  /**
   * Tenant, actor and traceparent sent with every step. Persisted with the
   * instance, so a recovered step sends exactly the same values and the
   * callee builds the same idempotency key. The traceparent defaults to the
   * active span (`currentTraceparent()`), so the saga continues the trace of
   * whoever started it.
   */
  readonly context?: SagaCallContext;
}

/** Attributes of the span of each saga step. */
export enum SagaSpanAttribute {
  SagaType = 'platform.saga.type',
  SagaId = 'platform.saga.id',
  StepIndex = 'platform.saga.step',
  Direction = 'platform.saga.direction',
  Operation = 'platform.saga.operation',
}

/** Name of the span of each saga step. */
export const SAGA_STEP_SPAN = 'saga.step';

/** Constructor options of `SagaEngine`. */
export interface SagaEngineOptions {
  readonly store: SagaStore;
  readonly invoker: OperationInvoker;
  /**
   * Sagas this engine runs, by type. They are compiled and validated when the
   * engine is built: an invalid definition fails at startup, not with the
   * first saga of its type.
   */
  readonly registry: ReadonlyMap<string, SagaDefinition<unknown>>;
  /**
   * Operations the steps call. Defaults to the catalogue of the invoker
   * (`InternalClientInvoker` exposes the one of its client). With it, startup
   * checks that every operation and compensation is registered, that each
   * compensation is the `compensatedBy` of the contract and that compensations
   * are idempotent.
   */
  readonly contracts?: ContractRegistry;
  /** Identity of this worker. Lease tokens are derived from it. */
  readonly owner: string;
  /** Lease duration in milliseconds. Defaults to 30 000. Must exceed `maxStepDurationMs`. */
  readonly leaseMs?: number;
  /** Longest expected call to an operation. Defaults to 25 000. */
  readonly maxStepDurationMs?: number;
  /** Failed attempts allowed in suspension before requiring intervention. Defaults to 20. */
  readonly maxSuspendAttempts?: number;
  /** Time in suspension before requiring intervention. Defaults to 24 hours. */
  readonly maxSuspendAgeMs?: number;
  readonly clock?: Clock;
  /** Source of saga ids and lease tokens. Defaults to UUIDv7. */
  readonly ids?: IdGenerator;
  /**
   * Delay in milliseconds before retrying after the given failed attempt
   * (1-based). Defaults to exponential backoff from 1 s up to 60 s with equal
   * jitter.
   */
  readonly backoff?: (attempt: number) => number;
  /** Random source in `[0, 1)` of the default backoff. Defaults to `Math.random`. */
  readonly random?: () => number;
  /**
   * Receives the errors the engine turns into a saga status (a step builder or
   * `onSuccess` rule that throws) and the ones it cannot report otherwise (a
   * listener or a lease release that fails).
   */
  readonly logger?: LoggerPort;
}

/** A run holds one lease token for its whole execution. */
interface Run {
  readonly sagaId: string;
  readonly token: string;
}

/** Step attempt being dispatched: which step, in which direction and against which operation. */
interface StepTarget {
  readonly step: CompiledStep<unknown>;
  readonly direction: StepDirection;
  readonly operationId: string;
  /** Log entry of a previous attempt in this direction, if any. */
  readonly entry: StepLogEntry | undefined;
  readonly traceparent: string | undefined;
  /** Builds the input of a first attempt. Retries reuse the logged one. */
  readonly buildInput: (state: unknown) => unknown;
}

/** A dispatched attempt and what the call returned. */
interface Attempt {
  /** Instance as written with the dispatch. */
  readonly instance: SagaInstance;
  readonly dispatched: StepLogEntry;
  readonly outcome: CallOutcome<unknown>;
}

/** A forward attempt that did not end cleanly. */
interface ForwardFailure {
  readonly instance: SagaInstance;
  readonly dispatched: StepLogEntry;
  readonly detail: string;
}

/**
 * Runs sagas step by step. Each attempt persists its intent before calling the
 * operation and its outcome together with the next state. Every write is fenced
 * by the lease token and the instance version.
 *
 * Step outcomes follow one rule (the `CallOutcome` of `@platform/primitives`):
 * - `success`: apply the output and advance.
 * - `business-error`: compensate before the pivot; after it, require intervention.
 * - `transient-failure` and `uncertain`: suspend and retry with the same key
 *   and input until the suspension budget runs out, then require
 *   intervention. Before the pivot, a passed saga deadline compensates instead.
 * - `protocol-violation`: before the pivot, compensate including the step;
 *   after it, require intervention. During compensation, `CompensationFailed`.
 * A thrown invoker error is classified with `classifyFailure`.
 */
export class SagaEngine {
  private readonly store: SagaStore;
  private readonly invoker: OperationInvoker;
  private readonly compiled: ReadonlyMap<string, CompiledSaga<unknown>>;
  private readonly contracts: ContractRegistry | undefined;
  private readonly owner: string;
  private readonly leaseMs: number;
  private readonly maxStepDurationMs: number;
  private readonly suspendPolicy: SuspendPolicy;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;
  private readonly logger: LoggerPort | undefined;
  private readonly listeners = new Set<SagaEventListener>();

  /**
   * Compiles and validates every saga of `registry` (see `validate`). Throws
   * `InvalidConfiguration` for a lease that does not outlive a step, and
   * `InvalidDefinition` or `MissingCompensation` for an invalid saga.
   */
  constructor(options: SagaEngineOptions) {
    this.store = options.store;
    this.invoker = options.invoker;
    this.owner = options.owner;
    this.leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS;
    this.maxStepDurationMs = options.maxStepDurationMs ?? DEFAULT_MAX_STEP_MS;
    assertLeaseOutlivesStep(this.leaseMs, this.maxStepDurationMs);
    this.suspendPolicy = {
      maxSuspendAttempts:
        options.maxSuspendAttempts ?? DEFAULT_MAX_SUSPEND_ATTEMPTS,
      maxSuspendAgeMs: options.maxSuspendAgeMs ?? DEFAULT_MAX_SUSPEND_AGE_MS,
      backoff: options.backoff ?? defaultBackoff(options.random),
    };
    this.clock = options.clock ?? new SystemClock();
    this.ids = options.ids ?? new UuidV7IdGenerator();
    this.logger = options.logger;
    this.compiled = compileAll(options.registry);
    this.contracts = options.contracts ?? options.invoker.contracts;
    const issues = this.validate();
    if (issues.length > 0) {
      throw new SagaError(
        PlatformErrorCode.SagaInvalidDefinition,
        `Invalid sagas:\n${issues.map((issue) => `  ${issue.message}`).join('\n')}`,
        { issues },
      );
    }
  }

  /**
   * Checks the compiled sagas against the contracts (given or taken from the
   * invoker): operations and compensations registered, compensations equal to
   * the `compensatedBy` of each contract, steps after the pivot and
   * compensations idempotent, and call budgets within `maxStepDurationMs`.
   * The constructor throws when this returns issues.
   */
  validate(contracts = this.contracts): SagaDefinitionIssue[] {
    return validateSagas([...this.compiled.values()], {
      ...(contracts !== undefined && { contracts }),
      maxStepDurationMs: this.maxStepDurationMs,
    });
  }

  /**
   * Subscribes to engine events. Returns a function that unsubscribes.
   * Events are emitted in-process, after the transition is committed and only
   * when this run changed the saga status. They are best-effort: a process that
   * dies after committing, or a listener added later, misses them. Durable
   * delivery requires an outbox, with event rows written in the same commit.
   */
  onEvent(listener: SagaEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Creates an instance and runs it until it pauses or finishes. The lease is
   * already held by this run. With an existing `idempotencyKey`, returns that instance.
   */
  async start(
    definitionType: string,
    initialState: unknown,
    options: StartOptions = {},
  ): Promise<SagaInstance> {
    this.compile(definitionType);
    assertSerializableState(initialState);
    const context = callContext({
      ...options.context,
      traceparent: options.context?.traceparent ?? currentTraceparent(),
    });
    assertSerializableState(context);
    const inputDigest = stableDigest(initialState ?? null);
    const key = options.idempotencyKey ?? null;
    if (key !== null) {
      const existing = await this.store.findByIdempotencyKey(key);
      if (existing !== null) {
        return this.reuse(existing, definitionType, inputDigest);
      }
    }
    const now = this.clock.now();
    const sagaId = options.sagaId ?? this.ids.next().toString();
    const run: Run = { sagaId, token: this.newToken() };
    try {
      await this.store.create({
        id: sagaId,
        type: definitionType,
        idempotencyKey: key,
        status: SagaStatus.Running,
        state: jsonClone(initialState),
        currentStep: 0,
        direction: StepDirection.Forward,
        version: 0,
        leaseToken: run.token,
        leaseUntil: this.leaseUntil(now),
        nextAttemptAt: null,
        attempts: 0,
        suspendedSince: null,
        deadlineAt:
          options.deadlineMs === undefined
            ? null
            : new Date(now.getTime() + options.deadlineMs),
        lastErrorCode: null,
        lastErrorDetail: null,
        context,
        inputDigest,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      if (
        key !== null &&
        error instanceof SagaError &&
        error.code === PlatformErrorCode.SagaDuplicateSaga
      ) {
        const existing = await this.store.findByIdempotencyKey(key);
        if (existing !== null) {
          return this.reuse(existing, definitionType, inputDigest);
        }
      }
      throw error;
    }
    return this.execute(run);
  }

  /**
   * Continues a saga from its log. Throws `LeaseNotAcquired` when another run
   * holds the lease, and `LeaseLost` if the lease is lost while running.
   */
  async resume(sagaId: string): Promise<SagaInstance> {
    const now = this.clock.now();
    const run: Run = { sagaId, token: this.newToken() };
    const acquired = await this.store.tryAcquireLease(
      sagaId,
      run.token,
      this.leaseUntil(now),
      now,
    );
    if (!acquired) {
      if ((await this.store.get(sagaId)) === null) {
        throw new SagaError(
          PlatformErrorCode.SagaNotFound,
          `Saga ${sagaId} not found`,
        );
      }
      throw new SagaError(
        PlatformErrorCode.SagaLeaseNotAcquired,
        `Saga ${sagaId} is leased by another run`,
      );
    }
    return this.execute(run);
  }

  private async execute(run: Run): Promise<SagaInstance> {
    const before = await this.load(run.sagaId);
    try {
      await this.drive(run);
    } catch (error) {
      await this.releaseQuietly(run);
      throw error;
    }
    await this.store.releaseLease(run.sagaId, run.token);
    const final = await this.load(run.sagaId);
    // Only a status change made by this run is announced; a no-op resume is silent.
    const kind = EVENT_BY_STATUS.get(final.status);
    if (kind !== undefined && final.status !== before.status) {
      this.emit(kind, final);
    }
    return final;
  }

  private async drive(run: Run): Promise<void> {
    let instance = await this.load(run.sagaId);
    const compiled = this.compile(instance.type);
    let firstAttempt = true;
    // A Suspended instance is retried by the first attempt only. Later attempts
    // stop at the next pause so the caller decides when to come back.
    while (
      !FINISHED.has(instance.status) &&
      (instance.status !== SagaStatus.Suspended || firstAttempt)
    ) {
      instance = await this.attempt(run, instance, compiled);
      firstAttempt = false;
    }
  }

  private async attempt(
    run: Run,
    instance: SagaInstance,
    compiled: CompiledSaga<unknown>,
  ): Promise<SagaInstance> {
    const steps = await this.store.steps(instance.id);
    return instance.direction === StepDirection.Forward
      ? this.forwardAttempt(run, instance, compiled, steps)
      : this.compensationAttempt(run, instance, compiled, steps);
  }

  private async forwardAttempt(
    run: Run,
    instance: SagaInstance,
    compiled: CompiledSaga<unknown>,
    steps: StepLogEntry[],
  ): Promise<SagaInstance> {
    const index = instance.currentStep;
    const step = this.stepAt(compiled, index);
    const entry = findEntry(steps, index, StepDirection.Forward);

    if (index < compiled.pivotIndex && this.deadlinePassed(instance)) {
      // Nothing is dispatched past the deadline. An uncertain step still needs undoing.
      const uncertain =
        entry?.status === StepStatus.Dispatched ||
        entry?.status === StepStatus.Uncertain;
      return this.commit(
        run,
        compensationStart(
          compiled,
          instance,
          steps,
          uncertain ? index : index - 1,
          PlatformErrorCode.SagaDeadlineExceeded,
          null,
        ),
      );
    }

    return this.inStepSpan(
      instance,
      entry,
      index,
      StepDirection.Forward,
      step.operationId,
      (traceparent) =>
        this.dispatchAttempt(
          run,
          instance,
          {
            step,
            direction: StepDirection.Forward,
            operationId: step.operationId,
            entry,
            traceparent,
            buildInput: (state) => step.input(state),
          },
          (attempt) => this.forwardOutcome(run, compiled, steps, attempt),
        ),
    );
  }

  private async compensationAttempt(
    run: Run,
    instance: SagaInstance,
    compiled: CompiledSaga<unknown>,
    steps: StepLogEntry[],
  ): Promise<SagaInstance> {
    const index = instance.currentStep;
    const step = this.stepAt(compiled, index);
    const forward = findEntry(steps, index, StepDirection.Forward);
    const entry = findEntry(steps, index, StepDirection.Compensate);
    const operationId = step.compensationOperationId;
    if (operationId === null || forward === undefined) {
      throw new SagaError(
        PlatformErrorCode.SagaInvalidState,
        `Step ${index} of saga ${run.sagaId} cannot be compensated`,
      );
    }
    return this.inStepSpan(
      instance,
      entry,
      index,
      StepDirection.Compensate,
      operationId,
      (traceparent) =>
        this.dispatchAttempt(
          run,
          instance,
          {
            step,
            direction: StepDirection.Compensate,
            operationId,
            entry,
            traceparent,
            buildInput: (state) =>
              step.compensationInput(state, toForwardEntry(forward)),
          },
          (attempt) => this.compensationOutcome(run, compiled, steps, attempt),
        ),
    );
  }

  /**
   * Dispatches one attempt of a step in either direction and hands the outcome
   * to `settle`. A dispatched entry (the process died after the dispatch) is
   * re-invoked as is; any other logged attempt is retried with its logged
   * input, never a rebuilt one, under the same idempotency key.
   */
  private async dispatchAttempt(
    run: Run,
    instance: SagaInstance,
    target: StepTarget,
    settle: (attempt: Attempt) => Promise<SagaInstance>,
  ): Promise<SagaInstance> {
    const { step, direction, operationId, entry, traceparent } = target;
    let dispatched: StepLogEntry;
    let current: SagaInstance;
    if (entry?.status === StepStatus.Dispatched) {
      dispatched = entry;
      current = instance;
    } else {
      let input: unknown;
      if (entry === undefined) {
        const built = buildSerializable(() =>
          target.buildInput(jsonClone(instance.state)),
        );
        if (!built.ok) {
          this.logger?.error('saga step input could not be built', {
            ...this.logFields(instance, step.index, direction),
            error: built.error,
          });
          return this.commit(
            run,
            requireIntervention(
              instance,
              PlatformErrorCode.SagaInputBuildFailed,
              built.detail,
            ),
          );
        }
        input = built.value;
      } else {
        input = entry.input;
      }
      dispatched = this.newEntry(
        run.sagaId,
        step.index,
        direction,
        operationId,
        input,
        entry?.traceparent ?? traceparent,
      );
      current = await this.store.dispatchStep({
        instance: this.stamp({
          ...instance,
          status:
            direction === StepDirection.Forward
              ? SagaStatus.Running
              : SagaStatus.Compensating,
          nextAttemptAt: null,
        }),
        expectedVersion: instance.version,
        leaseToken: run.token,
        step: dispatched,
      });
    }

    const outcome = await this.call(
      run,
      current,
      operationId,
      dispatched.input,
      dispatched.idempotencyKey,
      traceparent,
    );
    return settle({ instance: current, dispatched, outcome });
  }

  private async forwardOutcome(
    run: Run,
    compiled: CompiledSaga<unknown>,
    steps: StepLogEntry[],
    { instance, dispatched, outcome }: Attempt,
  ): Promise<SagaInstance> {
    const index = dispatched.stepIndex;
    switch (outcome.kind) {
      case CallOutcomeKind.Success: {
        let output: unknown;
        try {
          output = jsonClone(outcome.value);
        } catch (error) {
          // The callee answered with a value the log cannot hold: its contract is broken.
          return this.protocolForward(run, compiled, steps, {
            instance,
            dispatched,
            detail: errorDetail(error),
          });
        }
        return this.advance(
          run,
          instance,
          compiled,
          index,
          this.finish(dispatched, StepStatus.Succeeded, null, output),
        );
      }
      case CallOutcomeKind.BusinessError: {
        const entry = this.finish(dispatched, StepStatus.Failed, outcome.code);
        const next =
          index >= compiled.pivotIndex
            ? requireIntervention(instance, outcome.code, null)
            : compensationStart(
                compiled,
                instance,
                replaceEntry(steps, entry),
                index - 1,
                outcome.code,
                null,
              );
        return this.commit(run, next, entry);
      }
      case CallOutcomeKind.TransientFailure:
        return this.retryForward(
          run,
          compiled,
          steps,
          { instance, dispatched, detail: outcome.reason },
          PlatformErrorCode.SagaTransientFailure,
        );
      case CallOutcomeKind.Uncertain:
        return this.retryForward(
          run,
          compiled,
          steps,
          { instance, dispatched, detail: outcome.reason },
          PlatformErrorCode.SagaUncertainOutcome,
        );
      case CallOutcomeKind.ProtocolViolation:
        return this.protocolForward(run, compiled, steps, {
          instance,
          dispatched,
          detail: outcome.reason,
        });
      default:
        return assertNever(outcome);
    }
  }

  /**
   * A forward step that may or may not have applied and can be retried:
   * suspend and retry with the same key, unless the saga deadline has passed
   * before the pivot, in which case the step is undone too.
   */
  private async retryForward(
    run: Run,
    compiled: CompiledSaga<unknown>,
    steps: StepLogEntry[],
    { instance, dispatched, detail }: ForwardFailure,
    code: PlatformErrorCode,
  ): Promise<SagaInstance> {
    const index = dispatched.stepIndex;
    const entry = this.finish(dispatched, StepStatus.Uncertain, code);
    const next =
      index < compiled.pivotIndex && this.deadlinePassed(instance)
        ? compensationStart(
            compiled,
            instance,
            replaceEntry(steps, entry),
            index,
            PlatformErrorCode.SagaDeadlineExceeded,
            detail,
          )
        : suspend(instance, code, detail, this.clock.now(), this.suspendPolicy);
    return this.commit(run, next, entry);
  }

  /**
   * A forward step whose callee broke the protocol: it may have applied, and
   * retrying cannot fix it. Before the pivot the saga is undone including the
   * step; after it, a person decides. Either way an alert is emitted.
   */
  private async protocolForward(
    run: Run,
    compiled: CompiledSaga<unknown>,
    steps: StepLogEntry[],
    { instance, dispatched, detail }: ForwardFailure,
  ): Promise<SagaInstance> {
    const index = dispatched.stepIndex;
    const code = PlatformErrorCode.SagaProtocolViolation;
    const entry = this.finish(dispatched, StepStatus.Uncertain, code);
    const next =
      index < compiled.pivotIndex
        ? compensationStart(
            compiled,
            instance,
            replaceEntry(steps, entry),
            index,
            code,
            detail,
          )
        : requireIntervention(instance, code, detail);
    const saved = await this.commit(run, next, entry);
    this.emit(SagaEventKind.ProtocolViolation, saved);
    return saved;
  }

  /** Applies a successful step to the state and advances. Logs the outcome in the same write. */
  private async advance(
    run: Run,
    instance: SagaInstance,
    compiled: CompiledSaga<unknown>,
    index: number,
    entry: StepLogEntry,
  ): Promise<SagaInstance> {
    let state: unknown;
    try {
      const draft = jsonClone(instance.state);
      this.stepAt(compiled, index).onSuccess(draft, entry.output);
      assertSerializableState(draft);
      state = jsonClone(draft);
    } catch (error) {
      this.logger?.error('saga onSuccess rule failed', {
        ...this.logFields(instance, index, StepDirection.Forward),
        error,
      });
      return this.commit(
        run,
        requireIntervention(
          instance,
          PlatformErrorCode.SagaStateUpdateFailed,
          errorDetail(error),
        ),
        entry,
      );
    }
    return this.commit(run, advanceTo(compiled, instance, index, state), entry);
  }

  private async compensationOutcome(
    run: Run,
    compiled: CompiledSaga<unknown>,
    steps: StepLogEntry[],
    { instance, dispatched, outcome }: Attempt,
  ): Promise<SagaInstance> {
    const index = dispatched.stepIndex;
    switch (outcome.kind) {
      case CallOutcomeKind.Success: {
        const done = this.finish(dispatched, StepStatus.Succeeded, null);
        return this.commit(
          run,
          nextCompensation(
            compiled,
            instance,
            replaceEntry(steps, done),
            index - 1,
          ),
          done,
        );
      }
      case CallOutcomeKind.BusinessError:
        return this.commit(
          run,
          compensationFailed(instance, outcome.code, null),
          this.finish(dispatched, StepStatus.Failed, outcome.code),
        );
      case CallOutcomeKind.TransientFailure:
      case CallOutcomeKind.Uncertain: {
        const code =
          outcome.kind === CallOutcomeKind.Uncertain
            ? PlatformErrorCode.SagaUncertainOutcome
            : PlatformErrorCode.SagaTransientFailure;
        return this.commit(
          run,
          suspend(
            instance,
            code,
            outcome.reason,
            this.clock.now(),
            this.suspendPolicy,
          ),
          this.finish(dispatched, StepStatus.Uncertain, code),
        );
      }
      case CallOutcomeKind.ProtocolViolation: {
        const code = PlatformErrorCode.SagaProtocolViolation;
        const saved = await this.commit(
          run,
          compensationFailed(instance, code, outcome.reason),
          this.finish(dispatched, StepStatus.Uncertain, code),
        );
        this.emit(SagaEventKind.ProtocolViolation, saved);
        return saved;
      }
      default:
        return assertNever(outcome);
    }
  }

  /** The dispatched entry with its outcome. */
  private finish(
    dispatched: StepLogEntry,
    status: StepStatus,
    errorCode: string | null,
    output?: unknown,
  ): StepLogEntry {
    return {
      ...dispatched,
      status,
      output,
      errorCode,
      finishedAt: this.clock.now(),
    };
  }

  private deadlinePassed(instance: SagaInstance): boolean {
    return deadlinePassed(instance, this.clock.now());
  }

  /** Fenced write of an instance transition, optionally with its step entry. */
  private async commit(
    run: Run,
    instance: SagaInstance,
    step?: StepLogEntry,
  ): Promise<SagaInstance> {
    return this.store.commitStep({
      instance: this.stamp(instance),
      expectedVersion: instance.version,
      leaseToken: run.token,
      step,
    });
  }

  /**
   * Calls a step within one `Deadline`: the lease is renewed to outlive it,
   * the invoker receives it (the client cuts its attempts to it and the
   * server derives its idempotency lease from it) and the engine stops
   * waiting when it runs out.
   */
  private async call(
    run: Run,
    instance: SagaInstance,
    operationId: string,
    input: unknown,
    idempotencyKey: string,
    traceparent: string | undefined,
  ): Promise<CallOutcome<unknown>> {
    const deadline = Deadline.after(this.maxStepDurationMs, this.clock);
    await this.renew(run, deadline);
    const context: SagaCallContext = {
      ...instance.context,
      ...(traceparent !== undefined && { traceparent }),
    };
    return invokeStep(
      this.invoker,
      { operationId, input, idempotencyKey, deadline, context },
      this.maxStepDurationMs,
    );
  }

  /**
   * Runs one attempt of a step in its own span. The parent is the trace the
   * step was first dispatched in (saved in its log entry), or else the trace
   * of the saga (its persisted traceparent): a step retried by another node,
   * after a crash, stays in the same trace. `fn` receives the traceparent the
   * call carries: the one of the step span, or the parent when no SDK records
   * spans.
   */
  private inStepSpan<T>(
    instance: SagaInstance,
    entry: StepLogEntry | undefined,
    index: number,
    direction: StepDirection,
    operationId: string,
    fn: (traceparent: string | undefined) => Promise<T>,
  ): Promise<T> {
    const parent =
      entry?.traceparent ?? instance.context?.traceparent ?? undefined;
    return inTrace(parent, () =>
      withSpan(SAGA_STEP_SPAN, () => fn(currentTraceparent() ?? parent), {
        kind: SpanKind.INTERNAL,
        attributes: {
          [SagaSpanAttribute.SagaType]: instance.type,
          [SagaSpanAttribute.SagaId]: instance.id,
          [SagaSpanAttribute.StepIndex]: index,
          [SagaSpanAttribute.Direction]: direction,
          [SagaSpanAttribute.Operation]: operationId,
        },
      }),
    );
  }

  /** Extends the lease past the step deadline. If it was lost, stops without writing. */
  private async renew(run: Run, deadline: Deadline): Promise<void> {
    const renewed = await this.store.renewLease(
      run.sagaId,
      run.token,
      new Date(deadline.atMs + this.leaseMs - this.maxStepDurationMs),
    );
    if (!renewed) {
      throw new SagaError(
        PlatformErrorCode.SagaLeaseLost,
        `Lease on saga ${run.sagaId} was lost`,
      );
    }
  }

  /**
   * Returns an instance found by idempotency key, provided it belongs to the
   * same saga type and was started with the same initial state.
   */
  private reuse(
    existing: SagaInstance,
    definitionType: string,
    inputDigest: string,
  ): SagaInstance {
    if (existing.type !== definitionType) {
      throw new SagaError(
        PlatformErrorCode.SagaIdempotencyKeyConflict,
        `Idempotency key is already used by a "${existing.type}" saga, not "${definitionType}"`,
      );
    }
    if (existing.inputDigest !== inputDigest) {
      throw new SagaError(
        PlatformErrorCode.SagaIdempotencyKeyConflict,
        `Idempotency key is already used by saga ${existing.id} with a different input`,
        { sagaId: existing.id },
      );
    }
    return existing;
  }

  private newEntry(
    sagaId: string,
    stepIndex: number,
    direction: StepDirection,
    operationId: string,
    input: unknown,
    traceparent: string | null | undefined,
  ): StepLogEntry {
    return {
      sagaId,
      stepIndex,
      operationId,
      direction,
      status: StepStatus.Dispatched,
      idempotencyKey: stepIdempotencyKey(sagaId, stepIndex, direction),
      input,
      output: undefined,
      errorCode: null,
      traceparent: traceparent ?? null,
      startedAt: this.clock.now(),
      finishedAt: null,
    };
  }

  private stamp(instance: SagaInstance): SagaInstance {
    return { ...instance, updatedAt: this.clock.now() };
  }

  private leaseUntil(now: Date): Date {
    return new Date(now.getTime() + this.leaseMs);
  }

  private newToken(): string {
    return `${this.owner}:${this.ids.next().toString()}`;
  }

  private logFields(
    instance: SagaInstance,
    stepIndex: number,
    direction: StepDirection,
  ): Record<string, unknown> {
    return {
      sagaId: instance.id,
      sagaType: instance.type,
      stepIndex,
      direction,
    };
  }

  private emit(kind: SagaEventKind, instance: SagaInstance): void {
    const event: SagaEvent = {
      kind,
      sagaId: instance.id,
      type: instance.type,
      lastErrorCode: instance.lastErrorCode,
    };
    // Listener failures never affect the saga; they are only logged.
    const report = (error: unknown): void => {
      this.logger?.warn('saga event listener failed', {
        sagaId: instance.id,
        kind,
        error,
      });
    };
    for (const listener of [...this.listeners]) {
      try {
        void Promise.resolve(listener(event)).catch(report);
      } catch (error) {
        report(error);
      }
    }
  }

  /** Releases the lease after a failed run; the original error is what the caller needs. */
  private async releaseQuietly(run: Run): Promise<void> {
    try {
      await this.store.releaseLease(run.sagaId, run.token);
    } catch (error) {
      this.logger?.warn('saga lease release failed', {
        sagaId: run.sagaId,
        error,
      });
    }
  }

  private async load(sagaId: string): Promise<SagaInstance> {
    const instance = await this.store.get(sagaId);
    if (instance === null) {
      throw new SagaError(
        PlatformErrorCode.SagaNotFound,
        `Saga ${sagaId} not found`,
      );
    }
    return instance;
  }

  private compile(type: string): CompiledSaga<unknown> {
    const compiled = this.compiled.get(type);
    if (compiled === undefined) {
      throw new SagaError(
        PlatformErrorCode.SagaUnknownDefinition,
        `No saga registered as "${type}"`,
      );
    }
    return compiled;
  }

  private stepAt(
    compiled: CompiledSaga<unknown>,
    index: number,
  ): CompiledStep<unknown> {
    const step = compiled.steps[index];
    if (step === undefined) {
      throw new SagaError(
        PlatformErrorCode.SagaInvalidDefinition,
        `Saga "${compiled.type}" has no step ${index}`,
      );
    }
    return step;
  }
}

/** A compensation that cannot complete: a person has to undo the rest. */
function compensationFailed(
  instance: SagaInstance,
  code: string,
  detail: string | null,
): SagaInstance {
  return {
    ...requireIntervention(instance, code, detail),
    status: SagaStatus.CompensationFailed,
  };
}

/** Runs `fn` in the trace context of `traceparent`, or in the active one when it is absent or invalid. */
function inTrace<T>(
  traceparent: string | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  return otelContext.with(
    contextFromTraceparent(traceparent, otelContext.active()),
    fn,
  );
}
