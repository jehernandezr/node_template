import { OpenAccountOperation } from '@contracts/billing';
import {
  ActivateTenantOperation,
  CreateTenantOperation,
  IdentitySaga,
  TenantKind,
} from '@contracts/identity';
import {
  NotificationType,
  NotifyUserOperation,
  TemplateParameter,
} from '@contracts/notifications';
import { SagaDefinition, type SagaFlow } from '@platform/saga';
import type { UserRef } from '../../../shared/types/user-ref.type.js';

/** Lo que la saga de alta necesita para crear, facturar, activar y dar la bienvenida. */
export interface TenantOnboardingState {
  readonly tenantId: string;
  readonly slug: string;
  readonly name: string;
  readonly region: string;
  readonly owner: UserRef;
  /** Id de la notificación de bienvenida, fijado al arrancar para que un reintento no la duplique. */
  readonly welcomeId: string;
}

/**
 * Alta de un tenant: crea el tenant en aprovisionamiento y abre su cuenta de facturación, los dos con su
 * reversa; después del pivote lo activa y le da la bienvenida a su dueño. Si billing rechaza la cuenta, el
 * tenant se descarta y su slug queda libre.
 */
export class TenantOnboardingSaga extends SagaDefinition<TenantOnboardingState> {
  readonly type = IdentitySaga.TenantOnboarding;

  protected define(flow: SagaFlow<TenantOnboardingState>): void {
    flow
      .step(CreateTenantOperation)
      .input((state) => ({
        tenantId: state.tenantId,
        slug: state.slug,
        name: state.name,
        region: state.region,
        kind: TenantKind.Organization,
        ownerUserId: state.owner.userId,
      }))
      .compensationInput((state) => ({ tenantId: state.tenantId }))
      .step(OpenAccountOperation)
      .input((state) => ({
        tenantId: state.tenantId,
        ownerUserId: state.owner.userId,
      }))
      .compensationInput((state) => ({ tenantId: state.tenantId }))
      .pivot()
      .step(ActivateTenantOperation)
      .input((state) => ({ tenantId: state.tenantId }))
      .step(NotifyUserOperation)
      .input((state) => ({
        notificationId: state.welcomeId,
        user: state.owner,
        tenantId: state.tenantId,
        type: NotificationType.AccountActivity,
        parameters: [{ name: TemplateParameter.TenantName, value: state.name }],
      }));
  }
}
