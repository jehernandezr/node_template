import { Module } from '@nestjs/common';
import { PasskeysController } from './passkeys.controller.js';

@Module({ controllers: [PasskeysController] })
export class PasskeysModule {}
