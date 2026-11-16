import { Module } from '@nestjs/common';
import { AccessController } from './access.controller.js';
import { AccessInternalOperations } from './access.internal-operations.js';

@Module({
  controllers: [AccessController],
  providers: [AccessInternalOperations],
})
export class AccessModule {}
