import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller.js';
import { SessionsInternalOperations } from './sessions.internal-operations.js';

@Module({
  controllers: [SessionsController],
  providers: [SessionsInternalOperations],
})
export class SessionsModule {}
