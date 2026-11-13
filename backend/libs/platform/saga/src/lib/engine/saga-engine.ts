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
  withSpan,
} from '@platform/observability';
import {
  BackoffStrategy,
  CallOutcome,
  CallOutcomeKind,
  createBackoff,
  Deadline,
  DeadlineExceededError,
  stableDigest,
} from '@platform/primitives';
import { SagaError, SagaErrorCode, SimulatedCrash } from '../errors.js';
import { OperationInvoker, toCallOutcome } from '../invoker.js';
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
import type {
  CompiledSaga,
  CompiledStep,
  ForwardEntry,
} from '../definition/saga-flow.js';
import type { SagaDefinition } from '../definition/saga-definition.js';
import {
  SagaDefinitionIssueCode,
  validateSagas,
  type SagaDefinitionIssue,
} from '../definition/saga-validation.js';
import type { SagaStore } from '../store/saga-store.js';
import { assertNever, assertSerializableState, jsonClone } from '../util.js';

const TRANSIENT_CODE: string = SagaErrorCode.TransientFailure;
const PROTOCOL_CODE: string = SagaErrorCode.ProtocolViolation;
const UNCERTAIN_CODE: string = SagaErrorCode.UncertainOutcome;
const DEADLINE_CODE: string = SagaErrorCode.DeadlineExceeded;
const STATE_UPDATE_CODE: string = SagaErrorCode.StateUpdateFailed;
const INPUT_BUILD_CODE: string = SagaErrorCode.InputBuildFailed;

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
   * (1-based). Defaults to exponential backoff from 1 s up to 60 s.
   */
  readonly backoff?: (attempt: number) => number;
  /** Test hook: throws `SimulatedCrash` right after the dispatch of a step is persisted. */
  readonly crashAfterDispatch?: (stepIndex: number) => boolean;
}

/** A run holds one lease token for its whole execution. */
interface Run {
  readonly sagaId: string;
  readonly token: string;
}

const DEFAULT_BACKOFF = createBackoff({
  strategy: BackoffStrategy.None,
  baseMs: 1_000,
  maxMs: 60_000,
});

const DEFAULT_LEASE_MS = 30_000;
const DEFAULT_MAX_STEP_MS = 25_000;
const DEFAULT_MAX_SUSPEND_ATTEMPTS = 20;
const DEFAULT_MAX_SUSPEND_AGE_MS = 24 * 60 * 60 * 1000;

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
  private readonly maxSuspendAttempts: number;
  private readonly maxSuspendAgeMs: number;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;
  private readonly backoff: (attempt: number) => number;
  private readonly crashAfterDispatch:
    ((stepIndex: number) => boolean) | undefined;
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
    const maxStepDurationMs = options.maxStepDurationMs ?? DEFAULT_MAX_STEP_MS;
    if (this.leaseMs <= maxStepDurationMs) {
      throw new SagaError(
        SagaErrorCode.InvalidConfiguration,
        `leaseMs (${this.leaseMs}) must be greater than maxStepDurationMs (${maxStepDurationMs})`,
      );
    }
    this.maxStepDurationMs = maxStepDurationMs;
    this.maxSuspendAttempts =
      options.maxSuspendAttempts ?? DEFAULT_MAX_SUSPEND_ATTEMPTS;
    this.maxSuspendAgeMs =
      options.maxSuspendAgeMs ?? DEFAULT_MAX_SUSPEND_AGE_MS;
    this.clock = options.clock ?? new SystemClock();
    this.ids = options.ids ?? new UuidV7IdGenerator();
    this.backoff = options.backoff ?? DEFAULT_BACKOFF;
    this.crashAfterDispatch = options.crashAfterDispatch;
    this.compiled = compileAll(options.registry);
    this.contracts = options.contracts ?? options.invoker.contracts;
    const issues = this.validate();
    if (issues.length > 0) {
      throw new SagaError(
        SagaErrorCode.InvalidDefinition,
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
        context,
        inputDigest,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      if (
        key !== null &&
        error instanceof SagaError &&
        error.code === SagaErrorCode.DuplicateSaga
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
        throw new SagaError(SagaErrorCode.NotFound, `Saga ${sagaId} not found`);
      }
      throw new SagaError(
        SagaErrorCode.LeaseNotAcquired,
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
      // A simulated crash models a dead process, which never releases its lease.
      if (!(error instanceof SimulatedCrash)) {
        await this.releaseQuietly(run);
      }
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
        this.compensationStart(
          instance,
          steps,
          uncertain ? index : index - 1,
          DEADLINE_CODE,
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
        this.forwardStep(
          run,
          instance,
          compiled,
          steps,
          step,
          entry,
          traceparent,
        ),
    );
  }

  /** Dispatches a forward step (or re-invokes a dispatched one) and applies its outcome. */
  private async forwardStep(
    run: Run,
    instance: SagaInstance,
    compiled: CompiledSaga<unknown>,
    steps: StepLogEntry[],
    step: CompiledStep<unknown>,
    entry: StepLogEntry | undefined,
    traceparent: string | undefined,
  ): Promise<SagaInstance> {
    const index = step.index;
    let dispatched: StepLogEntry;
    let current: SagaInstance;
    let input: unknown;
    if (entry?.status === StepStatus.Dispatched) {
      // Crash after dispatch: re-invoke with the same key and the logged input.
      dispatched = entry;
      current = instance;
      input = entry.input;
    } else {
      if (entry === undefined) {
        const built = buildSerializable(() =>
          step.input(jsonClone(instance.state)),
        );
        if (built === null) {
          return this.inputFailed(run, instance);
        }
        input = built.value;
      } else {
        // A logged attempt exists: retry with its input, never a rebuilt one.
        input = entry.input;
      }
      dispatched = this.newEntry(
        run.sagaId,
        index,
        StepDirection.Forward,
        step.operationId,
        StepStatus.Dispatched,
        input,
        entry?.traceparent ?? traceparent,
      );
      current = await this.store.dispatchStep({
        instance: this.stamp({
          ...instance,
          status: SagaStatus.Running,
          nextAttemptAt: null,
        }),
        expectedVersion: instance.version,
        leaseToken: run.token,
        step: dispatched,
      });
    }

    this.maybeCrash(index);
    const result = await this.call(
      run,
      current,
      step.operationId,
      input,
      stepIdempotencyKey(run.sagaId, index, StepDirection.Forward),
      traceparent,
    );
    return this.forwardOutcome(
      run,
      current,
      compiled,
      steps,
      dispatched,
      result,
    );
  }

  private async forwardOutcome(
    run: Run,
    instance: SagaInstance,
    compiled: CompiledSaga<unknown>,
    steps: StepLogEntry[],
    dispatched: StepLogEntry,
    result: CallOutcome<unknown>,
  ): Promise<SagaInstance> {
    const index = dispatched.stepIndex;
    const finish = (
      patch: Pick<StepLogEntry, 'status' | 'output' | 'errorCode'>,
    ): StepLogEntry => ({
      ...dispatched,
      ...patch,
      finishedAt: this.clock.now(),
    });

    switch (result.kind) {
      case CallOutcomeKind.Success: {
        let output: unknown;
        try {
          output = jsonClone(result.value);
        } catch {
          return this.uncertainForward(
            run,
            instance,
            compiled,
            steps,
            dispatched,
            PROTOCOL_CODE,
            true,
          );
        }
        return this.advance(
          run,
          instance,
          compiled,
          index,
          finish({ status: StepStatus.Succeeded, output, errorCode: null }),
        );
      }
      case CallOutcomeKind.BusinessError: {
        const entry = finish({
          status: StepStatus.Failed,
          output: undefined,
          errorCode: result.code,
        });
        if (index >= compiled.pivotIndex) {
          return this.commit(
            run,
            {
              ...instance,
              status: SagaStatus.RequiresIntervention,
              nextAttemptAt: null,
              suspendedSince: null,
              lastErrorCode: result.code,
            },
            entry,
          );
        }
        return this.commit(
          run,
          this.compensationStart(
            instance,
            replaceEntry(steps, entry),
            index - 1,
            result.code,
          ),
          entry,
        );
      }
      case CallOutcomeKind.TransientFailure:
        return this.uncertainForward(
          run,
          instance,
          compiled,
          steps,
          dispatched,
          TRANSIENT_CODE,
          false,
        );
      case CallOutcomeKind.Uncertain:
        return this.uncertainForward(
          run,
          instance,
          compiled,
          steps,
          dispatched,
          UNCERTAIN_CODE,
          false,
        );
      case CallOutcomeKind.ProtocolViolation:
        return this.uncertainForward(
          run,
          instance,
          compiled,
          steps,
          dispatched,
          PROTOCOL_CODE,
          true,
        );
      default:
        return assertNever(result);
    }
  }

  /** Handles a step whose outcome is unknown: transient failure, uncertain outcome or protocol violation. */
  private async uncertainForward(
    run: Run,
    instance: SagaInstance,
    compiled: CompiledSaga<unknown>,
    steps: StepLogEntry[],
    dispatched: StepLogEntry,
    code: string,
    protocol: boolean,
  ): Promise<SagaInstance> {
    const index = dispatched.stepIndex;
    const entry: StepLogEntry = {
      ...dispatched,
      status: StepStatus.Uncertain,
      output: undefined,
      errorCode: code,
      finishedAt: this.clock.now(),
    };
    const updated = replaceEntry(steps, entry);
    const beforePivot = index < compiled.pivotIndex;
    let next: SagaInstance;
    if (protocol) {
      next = beforePivot
        ? this.compensationStart(instance, updated, index, PROTOCOL_CODE)
        : {
            ...instance,
            status: SagaStatus.RequiresIntervention,
            nextAttemptAt: null,
            suspendedSince: null,
            lastErrorCode: PROTOCOL_CODE,
          };
    } else if (beforePivot && this.deadlinePassed(instance)) {
      next = this.compensationStart(instance, updated, index, DEADLINE_CODE);
    } else {
      next = this.suspend(instance, code);
    }
    const saved = await this.commit(run, next, entry);
    if (protocol) {
      this.emit(SagaEventKind.ProtocolViolation, saved);
    }
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
    } catch {
      return this.commit(
        run,
        {
          ...instance,
          status: SagaStatus.RequiresIntervention,
          nextAttemptAt: null,
          suspendedSince: null,
          lastErrorCode: STATE_UPDATE_CODE,
        },
        entry,
      );
    }
    const next = index + 1;
    const done = next >= compiled.steps.length;
    return this.commit(
      run,
      {
        ...instance,
        state,
        status: done ? SagaStatus.Completed : SagaStatus.Running,
        currentStep: done ? index : next,
        attempts: 0,
        suspendedSince: null,
        nextAttemptAt: null,
        lastErrorCode: null,
      },
      entry,
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
        SagaErrorCode.InvalidState,
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
        this.compensationStep(
          run,
          instance,
          steps,
          step,
          operationId,
          forward,
          entry,
          traceparent,
        ),
    );
  }

  /** Dispatches a compensation (or re-invokes a dispatched one) and applies its outcome. */
  private async compensationStep(
    run: Run,
    instance: SagaInstance,
    steps: StepLogEntry[],
    step: CompiledStep<unknown>,
    operationId: string,
    forward: StepLogEntry,
    entry: StepLogEntry | undefined,
    traceparent: string | undefined,
  ): Promise<SagaInstance> {
    const index = step.index;
    let dispatched: StepLogEntry;
    let current: SagaInstance;
    let input: unknown;
    if (entry?.status === StepStatus.Dispatched) {
      dispatched = entry;
      current = instance;
      input = entry.input;
    } else {
      if (entry === undefined) {
        const built = buildSerializable(() =>
          step.compensationInput(
            jsonClone(instance.state),
            toForwardEntry(forward),
          ),
        );
        if (built === null) {
          return this.inputFailed(run, instance);
        }
        input = built.value;
      } else {
        // A logged attempt exists: retry with its input, never a rebuilt one.
        input = entry.input;
      }
      dispatched = this.newEntry(
        run.sagaId,
        index,
        StepDirection.Compensate,
        operationId,
        StepStatus.Dispatched,
        input,
        entry?.traceparent ?? traceparent,
      );
      current = await this.store.dispatchStep({
        instance: this.stamp({
          ...instance,
          status: SagaStatus.Compensating,
          nextAttemptAt: null,
        }),
        expectedVersion: instance.version,
        leaseToken: run.token,
        step: dispatched,
      });
    }

    this.maybeCrash(index);
    const result = await this.call(
      run,
      current,
      operationId,
      input,
      stepIdempotencyKey(run.sagaId, index, StepDirection.Compensate),
      traceparent,
    );
    const finish = (
      patch: Pick<StepLogEntry, 'status' | 'output' | 'errorCode'>,
    ): StepLogEntry => ({
      ...dispatched,
      ...patch,
      finishedAt: this.clock.now(),
    });

    switch (result.kind) {
      case CallOutcomeKind.Success: {
        const done = finish({
          status: StepStatus.Succeeded,
          output: undefined,
          errorCode: null,
        });
        return this.commit(
          run,
          this.nextCompensation(current, replaceEntry(steps, done), index - 1),
          done,
        );
      }
      case CallOutcomeKind.BusinessError: {
        const failed = finish({
          status: StepStatus.Failed,
          output: undefined,
          errorCode: result.code,
        });
        return this.commit(
          run,
          {
            ...current,
            status: SagaStatus.CompensationFailed,
            nextAttemptAt: null,
            suspendedSince: null,
            lastErrorCode: result.code,
          },
          failed,
        );
      }
      case CallOutcomeKind.TransientFailure:
      case CallOutcomeKind.Uncertain: {
        const code =
          result.kind === CallOutcomeKind.Uncertain
            ? UNCERTAIN_CODE
            : TRANSIENT_CODE;
        const uncertain = finish({
          status: StepStatus.Uncertain,
          output: undefined,
          errorCode: code,
        });
        return this.commit(run, this.suspend(current, code), uncertain);
      }
      case CallOutcomeKind.ProtocolViolation: {
        const uncertain = finish({
          status: StepStatus.Uncertain,
          output: undefined,
          errorCode: PROTOCOL_CODE,
        });
        const saved = await this.commit(
          run,
          {
            ...current,
            status: SagaStatus.CompensationFailed,
            nextAttemptAt: null,
            suspendedSince: null,
            lastErrorCode: PROTOCOL_CODE,
          },
          uncertain,
        );
        this.emit(SagaEventKind.ProtocolViolation, saved);
        return saved;
      }
      default:
        return assertNever(result);
    }
  }

  /** Starts compensation from `from` (inclusive) downwards. Completes at once if nothing needs undoing. */
  private compensationStart(
    instance: SagaInstance,
    steps: StepLogEntry[],
    from: number,
    code: string,
  ): SagaInstance {
    const next = compensableFrom(this.compile(instance.type), steps, from);
    return {
      ...instance,
      direction: StepDirection.Compensate,
      status: next === null ? SagaStatus.Compensated : SagaStatus.Compensating,
      currentStep: next ?? instance.currentStep,
      attempts: 0,
      suspendedSince: null,
      nextAttemptAt: null,
      lastErrorCode: code,
    };
  }

  private nextCompensation(
    instance: SagaInstance,
    steps: StepLogEntry[],
    from: number,
  ): SagaInstance {
    const next = compensableFrom(this.compile(instance.type), steps, from);
    return {
      ...instance,
      status: next === null ? SagaStatus.Compensated : SagaStatus.Compensating,
      currentStep: next ?? instance.currentStep,
      attempts: 0,
      suspendedSince: null,
      nextAttemptAt: null,
    };
  }

  /** Pauses for a retry, or requires intervention when the suspension caps are exceeded. */
  private suspend(instance: SagaInstance, code: string): SagaInstance {
    const now = this.clock.now();
    const attempts = instance.attempts + 1;
    const since = instance.suspendedSince ?? now;
    const exhausted =
      attempts > this.maxSuspendAttempts ||
      now.getTime() - since.getTime() >= this.maxSuspendAgeMs;
    if (exhausted) {
      return {
        ...instance,
        status: SagaStatus.RequiresIntervention,
        attempts,
        suspendedSince: since,
        nextAttemptAt: null,
        lastErrorCode: code,
      };
    }
    return {
      ...instance,
      status: SagaStatus.Suspended,
      attempts,
      suspendedSince: since,
      nextAttemptAt: new Date(now.getTime() + this.backoff(attempts)),
      lastErrorCode: code,
    };
  }

  private deadlinePassed(instance: SagaInstance): boolean {
    return (
      instance.deadlineAt !== null &&
      this.clock.now().getTime() >= instance.deadlineAt.getTime()
    );
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
    return this.invokeSafely(
      operationId,
      input,
      idempotencyKey,
      deadline,
      context,
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
    const parent = entry?.traceparent ?? instance.context?.traceparent;
    return inTrace(parent, () =>
      withSpan(
        SAGA_STEP_SPAN,
        () => fn(currentTraceparent() ?? parent ?? undefined),
        {
          kind: SpanKind.INTERNAL,
          attributes: {
            [SagaSpanAttribute.SagaType]: instance.type,
            [SagaSpanAttribute.SagaId]: instance.id,
            [SagaSpanAttribute.StepIndex]: index,
            [SagaSpanAttribute.Direction]: direction,
            [SagaSpanAttribute.Operation]: operationId,
          },
        },
      ),
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
        SagaErrorCode.LeaseLost,
        `Lease on saga ${run.sagaId} was lost`,
      );
    }
  }

  /**
   * Calls the operation until `deadline`. When it runs out, the call's signal
   * aborts and the outcome is `uncertain`. A thrown error is classified with
   * `classifyFailure`. The timer is cleared when the call settles. Simulated
   * crashes propagate.
   */
  private async invokeSafely(
    operationId: string,
    input: unknown,
    idempotencyKey: string,
    deadline: Deadline,
    context: SagaCallContext,
  ): Promise<CallOutcome<unknown>> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<CallOutcome<unknown>>((resolve) => {
      timer = setTimeout(() => {
        controller.abort(new DeadlineExceededError(deadline.atMs));
        resolve(
          CallOutcome.uncertain(`timed out after ${this.maxStepDurationMs} ms`),
        );
      }, deadline.remaining());
    });
    try {
      return await Promise.race([
        this.invoker
          .invoke(operationId, input, idempotencyKey, {
            signal: controller.signal,
            deadline,
            context,
          })
          .then(toCallOutcome),
        timedOut,
      ]);
    } catch (error) {
      if (error instanceof SimulatedCrash) {
        throw error;
      }
      return CallOutcome.fromError(error);
    } finally {
      clearTimeout(timer);
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
        SagaErrorCode.IdempotencyKeyConflict,
        `Idempotency key is already used by a "${existing.type}" saga, not "${definitionType}"`,
      );
    }
    if (
      existing.inputDigest !== undefined &&
      existing.inputDigest !== null &&
      existing.inputDigest !== inputDigest
    ) {
      throw new SagaError(
        SagaErrorCode.IdempotencyKeyConflict,
        `Idempotency key is already used by saga ${existing.id} with a different input`,
        { sagaId: existing.id },
      );
    }
    return existing;
  }

  /** Requires intervention when a step input cannot be built or is not serializable. */
  private inputFailed(run: Run, instance: SagaInstance): Promise<SagaInstance> {
    return this.commit(run, {
      ...instance,
      status: SagaStatus.RequiresIntervention,
      nextAttemptAt: null,
      suspendedSince: null,
      lastErrorCode: INPUT_BUILD_CODE,
    });
  }

  private newEntry(
    sagaId: string,
    stepIndex: number,
    direction: StepDirection,
    operationId: string,
    status: StepStatus,
    input: unknown,
    traceparent: string | null | undefined,
  ): StepLogEntry {
    return {
      sagaId,
      stepIndex,
      operationId,
      direction,
      status,
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

  private maybeCrash(stepIndex: number): void {
    if (this.crashAfterDispatch?.(stepIndex)) {
      throw new SimulatedCrash(`after dispatch of step ${stepIndex}`);
    }
  }

  private emit(kind: SagaEventKind, instance: SagaInstance): void {
    const event: SagaEvent = {
      kind,
      sagaId: instance.id,
      type: instance.type,
      lastErrorCode: instance.lastErrorCode,
    };
    for (const listener of [...this.listeners]) {
      try {
        void Promise.resolve(listener(event)).catch(() => undefined);
      } catch {
        // Listener failures never affect the saga.
      }
    }
  }

  private async releaseQuietly(run: Run): Promise<void> {
    try {
      await this.store.releaseLease(run.sagaId, run.token);
    } catch {
      // The original error is more useful to the caller.
    }
  }

  private async load(sagaId: string): Promise<SagaInstance> {
    const instance = await this.store.get(sagaId);
    if (instance === null) {
      throw new SagaError(SagaErrorCode.NotFound, `Saga ${sagaId} not found`);
    }
    return instance;
  }

  private compile(type: string): CompiledSaga<unknown> {
    const compiled = this.compiled.get(type);
    if (compiled === undefined) {
      throw new SagaError(
        SagaErrorCode.UnknownDefinition,
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
        SagaErrorCode.InvalidDefinition,
        `Saga "${compiled.type}" has no step ${index}`,
      );
    }
    return step;
  }
}

/** Keeps only the defined fields of a call context; null when none is set. */
function callContext(
  context: SagaCallContext | undefined,
): SagaCallContext | null {
  if (context === undefined) {
    return null;
  }
  const { tenantId, actorId, traceparent } = context;
  const copy: SagaCallContext = {
    ...(tenantId !== undefined && { tenantId }),
    ...(actorId !== undefined && { actorId }),
    ...(traceparent !== undefined && { traceparent }),
  };
  return Object.keys(copy).length === 0 ? null : copy;
}

/** Builds a value and checks that it is serializable. Returns null when building or checking fails. */
function buildSerializable(build: () => unknown): { value: unknown } | null {
  try {
    const value = build();
    assertSerializableState(value);
    return { value: jsonClone(value) };
  } catch {
    return null;
  }
}

function findEntry(
  steps: readonly StepLogEntry[],
  stepIndex: number,
  direction: StepDirection,
): StepLogEntry | undefined {
  return steps.find(
    (entry) => entry.stepIndex === stepIndex && entry.direction === direction,
  );
}

/** Returns the log with `entry` in place of its predecessor, or appended when it is new. */
function replaceEntry(
  steps: readonly StepLogEntry[],
  entry: StepLogEntry,
): StepLogEntry[] {
  const matches = (step: StepLogEntry): boolean =>
    step.stepIndex === entry.stepIndex && step.direction === entry.direction;
  return steps.some(matches)
    ? steps.map((step) => (matches(step) ? entry : step))
    : [...steps, entry];
}

/**
 * Largest index at or below `from` whose forward effect may need undoing.
 * Steps without compensation (read-only operations) have nothing to undo.
 */
function compensableFrom(
  compiled: CompiledSaga<unknown>,
  steps: readonly StepLogEntry[],
  from: number,
): number | null {
  for (let index = from; index >= 0; index--) {
    if (compiled.steps[index]?.compensationOperationId === null) {
      continue;
    }
    const entry = findEntry(steps, index, StepDirection.Forward);
    if (
      entry?.status === StepStatus.Succeeded ||
      entry?.status === StepStatus.Dispatched ||
      entry?.status === StepStatus.Uncertain
    ) {
      return index;
    }
  }
  return null;
}

function toForwardEntry(entry: StepLogEntry): ForwardEntry {
  return {
    input: entry.input,
    output: entry.output,
    idempotencyKey: entry.idempotencyKey,
    status: entry.status,
  };
}

/** Builds every saga once, checking that each is registered under its own type. */
function compileAll(
  registry: ReadonlyMap<string, SagaDefinition<unknown>>,
): ReadonlyMap<string, CompiledSaga<unknown>> {
  const compiled = new Map<string, CompiledSaga<unknown>>();
  const mismatches: string[] = [];
  for (const [key, definition] of registry) {
    const saga = definition.build();
    if (saga.type !== key) {
      mismatches.push(
        `Saga "${saga.type}" is registered as "${key}"; the key must be its type`,
      );
    }
    compiled.set(key, saga);
  }
  if (mismatches.length > 0) {
    throw new SagaError(
      SagaErrorCode.InvalidDefinition,
      mismatches.join('\n'),
      { code: SagaDefinitionIssueCode.TypeMismatch },
    );
  }
  return compiled;
}

/** Runs `fn` in the trace context of `traceparent`, or in the active one when it is absent or invalid. */
function inTrace<T>(
  traceparent: string | null | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  return otelContext.with(
    contextFromTraceparent(traceparent, otelContext.active()),
    fn,
  );
}
