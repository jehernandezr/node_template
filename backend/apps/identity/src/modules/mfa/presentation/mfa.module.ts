import { Module } from '@nestjs/common';
import { MfaController } from './mfa.controller.js';

@Module({ controllers: [MfaController] })
export class MfaModule {}
