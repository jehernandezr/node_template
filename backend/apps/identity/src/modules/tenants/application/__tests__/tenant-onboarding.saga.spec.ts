import { BillingErrorCode, BillingOperation } from '@contracts/billing';
import {
  IdentityErrorCode,
  IdentityOperation,
  TenantKind,
} from '@contracts/identity';
import {
  NotificationsErrorCode,
  NotificationsOperation,
  NotificationType,
  TemplateParameter,
} from '@contracts/notifications';
import { CallOutcome } from '@platform/primitives';
import { AmbientSagaScopes, SagaRecoveryJob, SagaStatus } from '@platform/saga';
import {
  CrashingSagaStore,
  ProcessDied,
  SagaEngineKit,
} from '@platform/saga/test-utils';
import { RecordingParticipants } from '../../../../__tests__/utils/index.js';
import {
  TenantOnboardingSaga,
  type TenantOnboardingState,
} from '../tenant-onboarding.saga.js';

const LEASE_EXPIRED_MS = 30_001;
const SAGA_ID = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f01';
const STATE: TenantOnboardingState = {
  tenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a05',
  slug: 'acme',
  name: 'Acme',
  region: 'eu',
  owner: {
    userId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01',
    homeTenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01',
  },
  welcomeId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d01',
};

const kitOf = (
  participants: RecordingParticipants,
  store = new CrashingSagaStore(),
) =>
  new SagaEngineKit({
    invoker: participants,
    definitions: [new TenantOnboardingSaga()],
    store,
  });

describe('TenantOnboardingSaga', () => {
  it('creates the tenant, opens its billing account, activates it and welcomes its owner', async () => {
    const participants = new RecordingParticipants();

    const saga = await kitOf(participants).sagas.start(
      TenantOnboardingSaga,
      STATE,
      { sagaId: SAGA_ID },
    );

    expect(saga.status).toBe(SagaStatus.Completed);
    expect(participants.operations()).toEqual([
      IdentityOperation.CreateTenant,
      BillingOperation.OpenAccount,
      IdentityOperation.ActivateTenant,
      NotificationsOperation.NotifyUser,
    ]);
    expect(participants.inputOf(IdentityOperation.CreateTenant)).toEqual({
      tenantId: STATE.tenantId,
      slug: 'acme',
      name: 'Acme',
      region: 'eu',
      kind: TenantKind.Organization,
      ownerUserId: STATE.owner.userId,
    });
    expect(participants.inputOf(NotificationsOperation.NotifyUser)).toEqual({
      notificationId: STATE.welcomeId,
      user: STATE.owner,
      tenantId: STATE.tenantId,
      type: NotificationType.AccountActivity,
      parameters: [{ name: TemplateParameter.TenantName, value: 'Acme' }],
    });
  });

  it('discards the tenant when billing refuses to open its account', async () => {
    const participants = new RecordingParticipants();
    participants.answer(
      BillingOperation.OpenAccount,
      CallOutcome.businessError(BillingErrorCode.PlanNotAvailable),
    );

    const saga = await kitOf(participants).sagas.start(
      TenantOnboardingSaga,
      STATE,
      { sagaId: SAGA_ID },
    );

    expect(saga.status).toBe(SagaStatus.Compensated);
    expect(participants.operations()).toEqual([
      IdentityOperation.CreateTenant,
      BillingOperation.OpenAccount,
      IdentityOperation.DiscardTenant,
    ]);
    expect(participants.inputOf(IdentityOperation.DiscardTenant)).toEqual({
      tenantId: STATE.tenantId,
    });
  });

  it('ends compensated without opening an account when another tenant took the slug first', async () => {
    const participants = new RecordingParticipants();
    participants.answer(
      IdentityOperation.CreateTenant,
      CallOutcome.businessError(IdentityErrorCode.TenantSlugTaken),
    );

    const saga = await kitOf(participants).sagas.start(
      TenantOnboardingSaga,
      STATE,
      { sagaId: SAGA_ID },
    );

    expect(saga.status).toBe(SagaStatus.Compensated);
    expect(participants.operations()).toEqual([IdentityOperation.CreateTenant]);
  });

  it('asks for intervention instead of undoing an active tenant when the welcome fails for good', async () => {
    const participants = new RecordingParticipants();
    participants.answer(
      NotificationsOperation.NotifyUser,
      CallOutcome.businessError(NotificationsErrorCode.EmailTemplateUnknown),
    );

    const saga = await kitOf(participants).sagas.start(
      TenantOnboardingSaga,
      STATE,
      { sagaId: SAGA_ID },
    );

    expect(saga.status).toBe(SagaStatus.RequiresIntervention);
    expect(participants.operations()).not.toContain(
      IdentityOperation.DiscardTenant,
    );
    expect(participants.operations()).not.toContain(
      BillingOperation.CloseAccount,
    );
  });

  describe('when the process dies in the middle', () => {
    it('resumes after the dispatch of the billing account with the same key and opens it once', async () => {
      const participants = new RecordingParticipants();
      const store = new CrashingSagaStore();
      const kit = kitOf(participants, store);
      store.crashBeforeOutcome(1);

      await expect(
        kit.sagas.start(TenantOnboardingSaga, STATE, { sagaId: SAGA_ID }),
      ).rejects.toBeInstanceOf(ProcessDied);
      kit.clock.advance(LEASE_EXPIRED_MS);
      await new SagaRecoveryJob({
        engine: kit.engineFor('node-b'),
        store: kit.store,
        scopes: new AmbientSagaScopes(),
        settings: kit.settings,
        clock: kit.clock,
      }).run();

      expect((await kit.store.get(SAGA_ID))?.status).toBe(SagaStatus.Completed);
      expect(
        new Set(participants.keysOf(BillingOperation.OpenAccount)).size,
      ).toBe(1);
      expect(participants.effectsOf(BillingOperation.OpenAccount)).toBe(1);
      expect(participants.effectsOf(IdentityOperation.ActivateTenant)).toBe(1);
    });

    it('frees the slug it reserved when the process dies right after creating the tenant and billing then refuses', async () => {
      const participants = new RecordingParticipants();
      participants.answer(
        BillingOperation.OpenAccount,
        CallOutcome.businessError(BillingErrorCode.PlanNotAvailable),
      );
      const store = new CrashingSagaStore();
      const kit = kitOf(participants, store);
      store.crashBeforeOutcome(0);

      await expect(
        kit.sagas.start(TenantOnboardingSaga, STATE, { sagaId: SAGA_ID }),
      ).rejects.toBeInstanceOf(ProcessDied);
      kit.clock.advance(LEASE_EXPIRED_MS);
      await new SagaRecoveryJob({
        engine: kit.engineFor('node-b'),
        store: kit.store,
        scopes: new AmbientSagaScopes(),
        settings: kit.settings,
        clock: kit.clock,
      }).run();

      expect((await kit.store.get(SAGA_ID))?.status).toBe(
        SagaStatus.Compensated,
      );
      expect(participants.effectsOf(IdentityOperation.CreateTenant)).toBe(1);
      expect(participants.inputOf(IdentityOperation.DiscardTenant)).toEqual({
        tenantId: STATE.tenantId,
      });
    });

    it('still discards the tenant when billing refuses after a crash before the pivot', async () => {
      const participants = new RecordingParticipants();
      participants.answer(
        BillingOperation.OpenAccount,
        CallOutcome.businessError(BillingErrorCode.PlanNotAvailable),
      );
      const store = new CrashingSagaStore();
      const kit = kitOf(participants, store);
      store.crashAfterDispatch(1);

      await expect(
        kit.sagas.start(TenantOnboardingSaga, STATE, { sagaId: SAGA_ID }),
      ).rejects.toBeInstanceOf(ProcessDied);
      kit.clock.advance(LEASE_EXPIRED_MS);
      await new SagaRecoveryJob({
        engine: kit.engineFor('node-b'),
        store: kit.store,
        scopes: new AmbientSagaScopes(),
        settings: kit.settings,
        clock: kit.clock,
      }).run();

      expect((await kit.store.get(SAGA_ID))?.status).toBe(
        SagaStatus.Compensated,
      );
      expect(participants.effectsOf(IdentityOperation.DiscardTenant)).toBe(1);
      expect(participants.operations()).not.toContain(
        IdentityOperation.ActivateTenant,
      );
    });
  });
});
