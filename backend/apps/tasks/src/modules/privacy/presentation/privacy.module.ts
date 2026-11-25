import { Module } from '@nestjs/common';
import { PrivacyInternalOperations } from './privacy.internal-operations.js';

/** User data deletion, changes for projections and, later, tenant moves. */
@Module({ providers: [PrivacyInternalOperations] })
export class PrivacyModule {}
