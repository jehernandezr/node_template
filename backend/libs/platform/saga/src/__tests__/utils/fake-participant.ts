import { CallOutcome } from '@platform/primitives';
import { OperationInvoker } from '../../invoker/operation-invoker.js';
import type { InvokeOptions } from '../../invoker/invoke-options.js';
import type { SagaCallContext } from '../../model/saga-call-context.js';

/** Una llamada recibida por el participante falso. */
export interface RecordedCall {
  readonly operationId: string;
  readonly idempotencyKey: string;
  readonly input: unknown;
  readonly context: SagaCallContext | undefined;
}

/** Con qué se arma el participante. Todo es opcional. */
export interface FakeParticipantOptions {
  /** Fecha fija de las salidas, para que las pruebas comparen valores exactos. */
  readonly createdAt?: Date;
}

/**
 * Participante falso. Las operaciones de creación crean un recurso y las de
 * borrado lo quitan. Un éxito se guarda por llave de idempotencia, así una
 * llamada repetida devuelve el resultado guardado sin un segundo efecto. Los
 * resultados de creación llevan una fecha para ejercitar la normalización de salidas.
 */
export class FakeParticipant extends OperationInvoker {
  readonly calls: RecordedCall[] = [];
  /** Cuántas veces se aplicó el efecto de cada operación de creación. */
  readonly effects = new Map<string, number>();
  private readonly live = new Set<string>();
  private readonly results = new Map<string, CallOutcome<unknown>>();
  private readonly scripted = new Map<
    string,
    (CallOutcome<unknown> | Error)[]
  >();
  private readonly createdAt: Date;
  private sequence = 0;

  constructor(options: FakeParticipantOptions = {}) {
    super();
    this.createdAt = options.createdAt ?? new Date(0);
  }

  /** Encola resultados para las siguientes llamadas de `operationId`. Un `Error` se lanza. */
  script(
    operationId: string,
    ...outcomes: (CallOutcome<unknown> | Error)[]
  ): void {
    this.scripted.set(operationId, [
      ...(this.scripted.get(operationId) ?? []),
      ...outcomes,
    ]);
  }

  get liveResources(): number {
    return this.live.size;
  }

  operations(): string[] {
    return this.calls.map((call) => call.operationId);
  }

  removes(): string[] {
    return this.operations().filter((operationId) =>
      operationId.includes('.remove.'),
    );
  }

  /** Llaves de idempotencia con las que se llamó a `operationId`, en orden de llegada. */
  keysOf(operationId: string): string[] {
    return this.calls
      .filter((call) => call.operationId === operationId)
      .map((call) => call.idempotencyKey);
  }

  /** Llamadas recibidas con esta llave de idempotencia. */
  callsWithKey(key: string): RecordedCall[] {
    return this.calls.filter((call) => call.idempotencyKey === key);
  }

  override async invoke(
    operationId: string,
    input: unknown,
    idempotencyKey: string,
    options?: InvokeOptions,
  ): Promise<CallOutcome<unknown>> {
    this.calls.push({
      operationId,
      idempotencyKey,
      input,
      context: options?.context,
    });
    const replay = this.results.get(idempotencyKey);
    if (replay !== undefined) {
      return replay;
    }
    const scripted = this.scripted.get(operationId)?.shift();
    if (scripted instanceof Error) {
      throw scripted;
    }
    if (scripted !== undefined) {
      return scripted;
    }
    const [name, verb] = operationId.split('.');
    if (verb === 'remove') {
      this.live.delete((input as { id?: string }).id ?? '');
      const result = FakeParticipant.ok();
      this.results.set(idempotencyKey, result);
      return result;
    }
    this.sequence += 1;
    const id = `${name}-${this.sequence}`;
    this.live.add(id);
    this.effects.set(operationId, (this.effects.get(operationId) ?? 0) + 1);
    const result = FakeParticipant.ok({ id, at: this.createdAt });
    this.results.set(idempotencyKey, result);
    return result;
  }

  private static ok(output: unknown = {}): CallOutcome<unknown> {
    return CallOutcome.success(output);
  }
}
