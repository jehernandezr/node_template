import { Module } from '@nestjs/common';
import { UserShard } from '../../../shared/utils/user-shard.js';
import { PrivacyInternalOperations } from './privacy.internal-operations.js';

/** Operations over all of a user's data. */
@Module({ providers: [UserShard, PrivacyInternalOperations] })
export class PrivacyModule {}
