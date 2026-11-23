import { Module } from '@nestjs/common';
import { BillingAccounts } from '../application/billing-accounts.js';
import { AccountsInternalOperations } from './accounts.internal-operations.js';

/** Las operaciones de la cuenta de facturación que llama la saga de alta de tenant. */
@Module({ providers: [BillingAccounts, AccountsInternalOperations] })
export class AccountsModule {}
