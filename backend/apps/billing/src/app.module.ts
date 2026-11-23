import { Module } from '@nestjs/common';
import { ValkeyUsageCounterStore } from '@platform/adapters-valkey';
import { ValkeyMeteringModule } from '@platform/adapters-valkey/nest';
import { billingContract } from '@contracts/billing';
import { HttpModule } from '@platform/http/nest';
import { MeteringModule } from '@platform/metering/nest';
import { RemoteIdentityAuthModule } from '@platform/service/nest';
import { BILLING_ERROR_CATALOGS } from './shared/constants/billing-error-catalogs.constants.js';
import { AccountsModule } from './modules/accounts/presentation/accounts.module.js';
import { EntitlementsModule } from './modules/entitlements/presentation/entitlements.module.js';
import { InvoicesModule } from './modules/invoices/presentation/invoices.module.js';
import { PaymentsModule } from './modules/payments/presentation/payments.module.js';
import { PlansModule } from './modules/plans/presentation/plans.module.js';
import { SubscriptionsModule } from './modules/subscriptions/presentation/subscriptions.module.js';
import { UsageModule } from './modules/usage/presentation/usage.module.js';

@Module({
  imports: [
    RemoteIdentityAuthModule,
    HttpModule.forRoot({
      contract: billingContract,
      catalogs: BILLING_ERROR_CATALOGS,
    }),
    ValkeyMeteringModule,
    MeteringModule.forRoot({
      service: billingContract.service,
      counters: ValkeyUsageCounterStore,
    }),
    PlansModule,
    UsageModule,
    SubscriptionsModule,
    PaymentsModule,
    InvoicesModule,
    EntitlementsModule,
    AccountsModule,
  ],
})
export class AppModule {}
