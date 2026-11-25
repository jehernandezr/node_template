import { Module } from '@nestjs/common';
import { PrivacyInternalOperations } from './privacy.internal-operations.js';

/** Operations over all of a user's data. */
@Module({ providers: [PrivacyInternalOperations] })
export class PrivacyModule {}
