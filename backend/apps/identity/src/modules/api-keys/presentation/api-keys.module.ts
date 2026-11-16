import { Module } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller.js';
import { ApiKeysInternalOperations } from './api-keys.internal-operations.js';

@Module({
  controllers: [ApiKeysController],
  providers: [ApiKeysInternalOperations],
})
export class ApiKeysModule {}
