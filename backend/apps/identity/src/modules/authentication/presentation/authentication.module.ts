import { Module } from '@nestjs/common';
import { AuthenticationController } from './authentication.controller.js';

@Module({ controllers: [AuthenticationController] })
export class AuthenticationModule {}
