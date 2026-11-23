import type { Entitlements } from '../domain/entitlements.js';
import type {
  ClosedSubscriptionPeriod,
  CurrentSubscription,
} from './current-subscription.js';

/** Lo que `subscriptions` ofrece a los otros módulos. */
export abstract class SubscriptionsFacade {
  /** Abre la suscripción en prueba; si ya existe, la devuelve sin cambios. */
  abstract open(tenantId: string): Promise<CurrentSubscription>;
  /** Borra la suscripción. Devuelve `false` si no había. */
  abstract remove(tenantId: string): Promise<boolean>;
  /** @throws BillingError `BILLING.SUBSCRIPTION.NOT_FOUND` si el tenant no tiene suscripción. */
  abstract current(tenantId: string): Promise<CurrentSubscription>;
  /** @throws BillingError `BILLING.SUBSCRIPTION.NOT_FOUND` si el tenant no tiene suscripción. */
  abstract entitlements(tenantId: string): Promise<Entitlements>;
  /** Cierra el periodo vencido. `undefined` si no tocaba o si era la prueba, que no se factura. */
  abstract closePeriod(
    tenantId: string,
    today: string,
  ): Promise<ClosedSubscriptionPeriod | undefined>;
  abstract dueForClosing(today: string): Promise<readonly string[]>;
  /** Un cobro falló: la suscripción activa pasa a morosa. */
  abstract markPastDue(tenantId: string): Promise<void>;
  /** Un pago llegó: la suscripción morosa o suspendida vuelve a activa. */
  abstract settle(tenantId: string): Promise<void>;
}
