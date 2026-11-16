import { Module } from '@nestjs/common';
import { PasswordsController } from './passwords.controller.js';

@Module({ controllers: [PasswordsController] })
export class PasswordsModule {}
