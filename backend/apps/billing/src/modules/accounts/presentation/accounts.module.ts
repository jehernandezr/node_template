import { Module } from '@nestjs/common';
import { BillingAccounts } from '../application/billing-accounts.js';
import { AccountsInternalOperations } from './accounts.internal-operations.js';

/** The billing account operations called by the tenant signup saga. */
@Module({ providers: [BillingAccounts, AccountsInternalOperations] })
export class AccountsModule {}
