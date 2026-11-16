import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersInternalOperations } from './users.internal-operations.js';

@Module({
  controllers: [UsersController],
  providers: [UsersInternalOperations],
})
export class UsersModule {}
