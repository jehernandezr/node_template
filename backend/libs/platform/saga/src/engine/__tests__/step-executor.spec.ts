import { CallOutcome } from '@platform/primitives';
import { SagaErrorCode } from '../../errors/saga-error-code.enum.js';
import { FakeParticipant } from '../../__tests__/utils/fake-participant.js';
import { SagaEngineKit } from '../../__tests__/utils/saga-engine-kit.js';
import {
  BigIntInputSaga,
  CyclicInputSaga,
  DateStateSaga,
  PivotSaga,
  ProgressSaga,
  ThreeStepSaga,
  ThrowingInputSaga,
  ThrowingSaga,
  VolatileSaga,
} from '../../__tests__/utils/sample-sagas.js';
import { SagaEventKind } from '../../model/saga-event-kind.enum.js';
import { SagaStatus } from '../../model/saga-status.enum.js';
import { StepStatus } from '../../model/step-status.enum.js';
import { StepDirection } from '../../model/step-direction.enum.js';
import type { SagaSettingsInput } from '../saga-settings-input.js';
import type { SagaDefinition } from '../../definition/saga-definition.js';
import { SagaSettings } from '../saga-settings.js';
import { FixedRandomSource } from '@platform/kernel/test-utils';
import { FailureKind, PlatformError } from '@platform/kernel';

/** Error de red que el clasificador toma como transitorio. */
class NetworkError extends PlatformError {
  override readonly code = 'NET.RESET';

  constructor() {
    super('connection reset', { failureKind: FailureKind.Transient });
  }
}

function setup(
  settings: Partial<SagaSettingsInput> = {},
  definitions: SagaDefinition<unknown>[] = [
    new ThreeStepSaga(),
    new PivotSaga(),
  ],
) {
  const participant = new FakeParticipant();
  const kit = new SagaEngineKit({
    invoker: participant,
    definitions,
    settings,
  });
  const events: SagaEventKind[] = [];
  kit.events.subscribe((event) => {
    events.push(event.kind);
  });
  return { kit, participant, events, store: kit.store };
}

describe('StepExecutor', () => {
  describe('fallas transitorias y plazos', () => {
    it('suspende ante un fallo transitorio, deja el paso incierto y completa al reintentar', async () => {
      const { kit, participant, store } = setup();
      participant.script(
        'b.create.v1',
        CallOutcome.transientFailure('timeout'),
      );

      const suspended = await kit.sagas.start(
        ThreeStepSaga,
        {},
        { sagaId: 's1' },
      );
      expect(suspended.status).toBe(SagaStatus.Suspended);
      expect(
        (await store.steps('s1')).find((e) => e.stepIndex === 1)?.status,
      ).toBe(StepStatus.Uncertain);

      kit.clock.advance(1_000);
      const resumed = await kit.engineFor('node-b').resume('s1');

      expect(resumed.status).toBe(SagaStatus.Completed);
      expect(resumed.lastErrorDetail).toBeNull();
      expect(
        participant.calls
          .filter((c) => c.operationId === 'b.create.v1')
          .map((c) => c.idempotencyKey),
      ).toEqual(['s1:1:forward', 's1:1:forward']);
    });

    it('usa la fórmula de backoff con jitter parejo al reintentar', async () => {
      const { kit, participant, store } = setup();
      participant.script(
        'b.create.v1',
        CallOutcome.transientFailure('timeout'),
      );

      await kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' });

      const instance = await store.get('s1');
      expect(kit.settings.suspendPolicy().backoff(1)).toBe(750);
      expect(instance?.nextAttemptAt?.getTime()).toBe(
        kit.clock.now().getTime() + 750,
      );
    });

    it('trata un error transitorio lanzado por el invocador como suspensión', async () => {
      const { kit, participant } = setup();
      participant.script('b.create.v1', new NetworkError());

      const result = await kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' });

      expect(result.status).toBe(SagaStatus.Suspended);
      expect(result.lastErrorCode).toBe(SagaErrorCode.TransientFailure);
    });

    it('compensa un paso incierto, incluido él mismo, cuando el plazo ya pasó', async () => {
      const { kit, participant } = setup();
      participant.script(
        'b.create.v1',
        CallOutcome.transientFailure('timeout'),
      );

      await kit.sagas.start(
        ThreeStepSaga,
        {},
        {
          sagaId: 's1',
          deadlineMs: 500,
        },
      );
      kit.clock.advance(1_000);
      const result = await kit.engineFor('node-b').resume('s1');

      expect(result.status).toBe(SagaStatus.Compensated);
      expect(result.lastErrorCode).toBe(SagaErrorCode.DeadlineExceeded);
      expect(participant.removes()).toEqual(['b.remove.v1', 'a.remove.v1']);
    });

    it('no despacha ningún paso antes del pivote si el plazo ya pasó al arrancar', async () => {
      const { kit, participant } = setup();

      const result = await kit.sagas.start(
        ThreeStepSaga,
        {},
        {
          sagaId: 's1',
          deadlineMs: 0,
        },
      );

      expect(result.status).toBe(SagaStatus.Compensated);
      expect(result.lastErrorCode).toBe(SagaErrorCode.DeadlineExceeded);
      expect(participant.calls).toEqual([]);
    });

    it('exige intervención al superar el número de intentos de suspensión', async () => {
      const { kit, participant } = setup({ maxSuspendAttempts: 2 });
      participant.script(
        'b.create.v1',
        ...[1, 2, 3].map(() => CallOutcome.transientFailure('timeout')),
      );
      await kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' });

      kit.clock.advance(2_000);
      await kit.engineFor('node-b').resume('s1');
      kit.clock.advance(10_000);
      const exhausted = await kit.engineFor('node-b').resume('s1');

      expect(exhausted.status).toBe(SagaStatus.RequiresIntervention);
      expect(exhausted.nextAttemptAt).toBeNull();
    });

    it('exige intervención cuando la suspensión supera la antigüedad máxima', async () => {
      const { kit, participant } = setup({ maxSuspendAgeMs: 500 });
      participant.script(
        'b.create.v1',
        CallOutcome.transientFailure('timeout'),
        CallOutcome.transientFailure('timeout'),
      );
      await kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' });

      kit.clock.advance(1_000);
      const result = await kit.engineFor('node-b').resume('s1');

      expect(result.status).toBe(SagaStatus.RequiresIntervention);
    });
  });

  describe('pasos que avanzan por rondas', () => {
    it('repite una ronda pendiente sin gastar las suspensiones y completa cuando termina', async () => {
      const { kit, participant } = setup({ maxSuspendAttempts: 2 }, [
        new ProgressSaga(),
      ]);
      participant.script(
        'b.create.v1',
        ...Array.from({ length: 5 }, () =>
          CallOutcome.transientFailure(ProgressSaga.ROUND_PENDING),
        ),
      );
      let result = await kit.sagas.start(ProgressSaga, {}, { sagaId: 's1' });

      for (let round = 0; round < 5; round += 1) {
        expect(result.status).toBe(SagaStatus.Suspended);
        expect(result.attempts).toBe(0);
        kit.clock.advance(2_000);
        result = await kit.engineFor('node-b').resume('s1');
      }

      expect(result.status).toBe(SagaStatus.Completed);
    });

    it('compensa antes del pivote una ronda que no termina dentro del plazo de la saga', async () => {
      const { kit, participant } = setup({}, [new ProgressSaga()]);
      participant.script(
        'b.create.v1',
        ...Array.from({ length: 5 }, () =>
          CallOutcome.transientFailure(ProgressSaga.ROUND_PENDING),
        ),
      );
      await kit.sagas.start(
        ProgressSaga,
        {},
        { sagaId: 's1', deadlineMs: 3_000 },
      );

      kit.clock.advance(2_000);
      await kit.engineFor('node-b').resume('s1');
      kit.clock.advance(2_000);
      const result = await kit.engineFor('node-b').resume('s1');

      expect(result.status).toBe(SagaStatus.Compensated);
      expect(result.lastErrorCode).toBe(SagaErrorCode.DeadlineExceeded);
      expect(participant.removes()).toEqual(['b.remove.v1', 'a.remove.v1']);
    });

    it('sigue contando como suspensión un fallo transitorio de otro motivo en ese paso', async () => {
      const { kit, participant } = setup({}, [new ProgressSaga()]);
      participant.script(
        'b.create.v1',
        CallOutcome.transientFailure('timeout'),
      );

      const result = await kit.sagas.start(ProgressSaga, {}, { sagaId: 's1' });

      expect(result.status).toBe(SagaStatus.Suspended);
      expect(result.attempts).toBe(1);
    });
  });

  describe('pivote y violaciones de protocolo', () => {
    it('nunca compensa un fallo transitorio después del pivote, aunque el plazo haya pasado', async () => {
      const { kit, participant } = setup();
      participant.script(
        'post.send.v1',
        CallOutcome.transientFailure('timeout'),
        CallOutcome.transientFailure('timeout'),
      );
      await kit.sagas.start(PivotSaga, {}, { sagaId: 's1', deadlineMs: 100 });

      kit.clock.advance(1_000);
      const result = await kit.engineFor('node-b').resume('s1');

      expect(result.status).toBe(SagaStatus.Suspended);
      expect(result.direction).toBe(StepDirection.Forward);
      expect(participant.removes()).toEqual([]);
    });

    it('exige intervención ante un error de negocio después del pivote y no compensa', async () => {
      const { kit, participant } = setup();
      participant.script('post.send.v1', CallOutcome.businessError('NOPE'));

      const result = await kit.sagas.start(PivotSaga, {}, { sagaId: 's1' });

      expect(result.status).toBe(SagaStatus.RequiresIntervention);
      expect(result.lastErrorCode).toBe('NOPE');
      expect(participant.removes()).toEqual([]);
    });

    it('compensa una violación de protocolo antes del pivote, incluido el paso, y emite la alerta', async () => {
      const { kit, participant, events } = setup();
      participant.script(
        'b.create.v1',
        CallOutcome.protocolViolation('bad shape'),
      );

      const result = await kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' });

      expect(result.status).toBe(SagaStatus.Compensated);
      expect(result.lastErrorCode).toBe(SagaErrorCode.ProtocolViolation);
      expect(result.lastErrorDetail).toBe('bad shape');
      expect(participant.removes()).toEqual(['b.remove.v1', 'a.remove.v1']);
      expect(events).toContain(SagaEventKind.ProtocolViolation);
    });

    it('exige intervención ante una violación de protocolo después del pivote', async () => {
      const { kit, participant, events } = setup();
      participant.script('post.send.v1', CallOutcome.protocolViolation('bad'));

      const result = await kit.sagas.start(PivotSaga, {}, { sagaId: 's1' });

      expect(result.status).toBe(SagaStatus.RequiresIntervention);
      expect(result.lastErrorCode).toBe(SagaErrorCode.ProtocolViolation);
      expect(events).toContain(SagaEventKind.ProtocolViolation);
    });

    it('trata una salida que no es JSON como violación de protocolo', async () => {
      const { kit, participant } = setup();
      participant.script(
        'a.create.v1',
        CallOutcome.success({ id: 'x', at: 'now', big: BigInt(1) }),
      );

      const result = await kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' });

      expect(result.status).toBe(SagaStatus.Compensated);
      expect(result.lastErrorCode).toBe(SagaErrorCode.ProtocolViolation);
      expect(typeof result.lastErrorDetail).toBe('string');
      expect(participant.removes()).toEqual(['a.remove.v1']);
    });
  });

  describe('estado, eventos y entradas', () => {
    it('exige intervención si onSuccess lanza, y deja el paso como exitoso', async () => {
      const { kit, store } = setup({}, [new ThrowingSaga()]);

      const result = await kit.sagas.start(ThrowingSaga, {}, { sagaId: 's1' });

      expect(result.status).toBe(SagaStatus.RequiresIntervention);
      expect(result.lastErrorCode).toBe(SagaErrorCode.StateUpdateFailed);
      expect(result.lastErrorDetail).toBe('Error: state rule failed');
      expect(
        (await store.steps('s1')).find((e) => e.stepIndex === 0)?.status,
      ).toBe(StepStatus.Succeeded);
    });

    it('deja de mostrar el error de intentos previos cuando el paso tiene éxito', async () => {
      const { kit, participant } = setup();
      participant.script(
        'b.create.v1',
        CallOutcome.transientFailure('timeout'),
      );
      await kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' });

      kit.clock.advance(1_000);
      const result = await kit.engineFor('node-b').resume('s1');

      expect(result.lastErrorCode).toBeNull();
      expect(result.lastErrorDetail).toBeNull();
    });

    it('exige intervención si onSuccess deja un valor que no es JSON', async () => {
      const { kit, events } = setup({}, [new DateStateSaga()]);

      const result = await kit.sagas.start(DateStateSaga, {}, { sagaId: 's1' });

      expect(result.status).toBe(SagaStatus.RequiresIntervention);
      expect(result.lastErrorCode).toBe(SagaErrorCode.StateUpdateFailed);
      expect(events).toEqual([SagaEventKind.RequiresIntervention]);
    });

    it('exige intervención si la entrada de un paso no es JSON, sin llamar al participante', async () => {
      const { kit, participant } = setup({}, [new BigIntInputSaga()]);

      const result = await kit.sagas.start(
        BigIntInputSaga,
        {},
        { sagaId: 's1' },
      );

      expect(result.status).toBe(SagaStatus.RequiresIntervention);
      expect(result.lastErrorCode).toBe(SagaErrorCode.InputBuildFailed);
      expect(participant.calls).toEqual([]);
    });

    it('exige intervención si la entrada lanza al construirse, con el nombre y el mensaje del error', async () => {
      const { kit } = setup({}, [new ThrowingInputSaga()]);

      const result = await kit.sagas.start(
        ThrowingInputSaga,
        {},
        { sagaId: 's1' },
      );

      expect(result.lastErrorCode).toBe(SagaErrorCode.InputBuildFailed);
      expect(result.lastErrorDetail).toBe('Error: cannot build');
    });

    it('exige intervención si la entrada tiene un ciclo', async () => {
      const { kit } = setup({}, [new CyclicInputSaga()]);

      const result = await kit.sagas.start(
        CyclicInputSaga,
        {},
        { sagaId: 's1' },
      );

      expect(result.lastErrorCode).toBe(SagaErrorCode.InputBuildFailed);
    });

    it('reintenta con la entrada guardada y no reconstruye la entrada', async () => {
      const saga = new VolatileSaga();
      const { kit, participant } = setup({}, [saga]);
      participant.script(
        'b.create.v1',
        CallOutcome.transientFailure('timeout'),
      );
      await kit.sagas.start(VolatileSaga, {}, { sagaId: 's1' });

      kit.clock.advance(1_000);
      await kit.engineFor('node-b').resume('s1');

      const bCalls = participant.calls.filter(
        (c) => c.operationId === 'b.create.v1',
      );
      expect(bCalls).toHaveLength(2);
      expect(bCalls[1]?.input).toEqual(bCalls[0]?.input);
      expect(saga.counts.inputs).toBe(1);
    });
  });

  describe('construcción de la configuración', () => {
    it('usa la espera del backoff desde el generador aleatorio inyectado', () => {
      const settings = new SagaSettings(
        { owner: 'node-a' },
        new FixedRandomSource([0.5]),
      );

      expect(settings.suspendPolicy().backoff(2)).toBe(1500);
    });
  });
});
