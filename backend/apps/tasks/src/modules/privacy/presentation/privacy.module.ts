import { Module } from '@nestjs/common';
import { PrivacyInternalOperations } from './privacy.internal-operations.js';
import { TasksModule } from '../../tasks/module.js';

/** User data deletion, changes for projections and, later, tenant moves. */
@Module({ imports: [TasksModule], providers: [PrivacyInternalOperations] })
export class PrivacyModule {}
