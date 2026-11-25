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
import type { TenantDirectoryEntry } from '@contracts/platform';
import { SagaDefinition, type SagaFlow } from '@platform/saga';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { TenantDirectoryFollowers } from './tenant-directory-followers.js';

/** Lo que la saga de alta necesita para crear, facturar, activar y dar la bienvenida. */
export interface TenantOnboardingState {
  readonly tenantId: string;
  readonly slug: string;
  readonly name: string;
  readonly region: string;
  readonly owner: UserRef;
  /** Id de la notificación de bienvenida, fijado al arrancar para que un reintento no la duplique. */
  readonly welcomeId: string;
  /** La ubicación que identity eligió, que los demás servicios anotan en sus directorios. */
  readonly directory: TenantDirectoryEntry;
}

/**
 * Alta de un tenant: crea el tenant en aprovisionamiento, lo anota en el directorio de shards de cada servicio con la
 * ubicación que eligió identity y abre su cuenta de facturación, todo con su reversa; después del pivote lo activa y
 * le da la bienvenida a su dueño. Si billing rechaza la cuenta, los servicios retiran la fila del tenant, el tenant se
 * descarta y su slug queda libre.
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
      .compensationInput((state) => ({ tenantId: state.tenantId }));
    for (const follower of TenantDirectoryFollowers.ALL) {
      flow
        .step(follower.tenantDirectoryPlace)
        .input((state) => state.directory)
        .compensationInput((state) => ({ tenantId: state.tenantId }));
    }
    flow
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
