import { Module } from '@nestjs/common';
import { UserShard } from '../../../shared/utils/user-shard.js';
import { PrivacyInternalOperations } from './privacy.internal-operations.js';

/** Operaciones sobre todos los datos de un usuario. */
@Module({ providers: [UserShard, PrivacyInternalOperations] })
export class PrivacyModule {}
