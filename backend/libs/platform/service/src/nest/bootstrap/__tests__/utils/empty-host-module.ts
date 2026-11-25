import { Module } from '@nestjs/common';

/** Module without providers to start test applications without the real runtime. */
@Module({})
export class EmptyHostModule {}
