import { Module } from '@nestjs/common';
import { InvitationsController } from './invitations.controller.js';

@Module({ controllers: [InvitationsController] })
export class InvitationsModule {}
