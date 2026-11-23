import { OperationInvoker } from '@platform/saga';
import { CallOutcome } from '@platform/primitives';

/**
 * Los servicios que llama una saga, de mentira: cada operación responde éxito salvo que la prueba le guarde
 * otro resultado, y una llamada repetida con la misma llave devuelve la respuesta guardada sin un segundo
 * efecto, como lo hace un participante real con su registro de idempotencia.
 */
export class RecordingParticipants extends OperationInvoker {
  private readonly calls: {
    operationId: string;
    key: string;
    input: unknown;
  }[] = [];
  private readonly answered = new Map<string, CallOutcome<unknown>>();
  private readonly scripted = new Map<string, CallOutcome<unknown>[]>();
  private readonly effects = new Map<string, number>();

  /** La próxima llamada a `operationId` responde `outcome`. */
  answer(operationId: string, outcome: CallOutcome<unknown>): void {
    this.scripted.set(operationId, [
      ...(this.scripted.get(operationId) ?? []),
      outcome,
    ]);
  }

  /** Las operaciones llamadas, en orden, contando los reintentos. */
  operations(): string[] {
    return this.calls.map((call) => call.operationId);
  }

  inputOf(operationId: string): unknown {
    return this.calls.find((call) => call.operationId === operationId)?.input;
  }

  keysOf(operationId: string): string[] {
    return this.calls
      .filter((call) => call.operationId === operationId)
      .map((call) => call.key);
  }

  /** Cuántas veces una operación aplicó su efecto, sin contar las respuestas repetidas por llave. */
  effectsOf(operationId: string): number {
    return this.effects.get(operationId) ?? 0;
  }

  override async invoke(
    operationId: string,
    input: unknown,
    idempotencyKey: string,
  ): Promise<CallOutcome<unknown>> {
    this.calls.push({ operationId, key: idempotencyKey, input });
    const replay = this.answered.get(idempotencyKey);
    if (replay !== undefined) {
      return replay;
    }
    const outcome =
      this.scripted.get(operationId)?.shift() ?? CallOutcome.success({});
    this.effects.set(operationId, this.effectsOf(operationId) + 1);
    this.answered.set(idempotencyKey, outcome);
    return outcome;
  }
}
