import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller.js';

@Module({ controllers: [DevicesController] })
export class DevicesModule {}
