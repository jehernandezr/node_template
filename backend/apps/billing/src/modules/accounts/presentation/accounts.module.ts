import { Module } from '@nestjs/common';
import { BillingAccounts } from '../application/billing-accounts.js';
import { AccountsInternalOperations } from './accounts.internal-operations.js';
import { InvoicesModule } from '../../invoices/module.js';
import { SubscriptionsModule } from '../../subscriptions/module.js';

/** The billing account operations called by the tenant signup saga. */
@Module({
  imports: [InvoicesModule, SubscriptionsModule],
  providers: [BillingAccounts, AccountsInternalOperations],
})
export class AccountsModule {}
