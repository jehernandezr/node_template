import { Module } from '@nestjs/common';
import {
  __Name__TenantDirectoryOperations,
  __Name__TenantMoveOperations,
  __nameCamel__Contract,
} from '@contracts/__name__';
import { HttpModule } from '@platform/http/nest';
import { RemoteIdentityAuthModule } from '@platform/service/nest';
import {
  TenantDirectoryModule,
  TenantMoveModule,
} from '@platform/tenant-move/nest';
import { __Name__TenantMoveManifest } from './database/__name__-tenant-move.manifest.js';
import { __NAME___ERROR_CATALOGS } from './shared/constants/__name__-error-catalogs.constants.js';
// generated:modules:imports

/** Root module of __name__: its modules over the platform runtime. */
@Module({
  imports: [
    RemoteIdentityAuthModule,
    HttpModule.forRoot({
      contract: __nameCamel__Contract,
      catalogs: __NAME___ERROR_CATALOGS,
    }),
    TenantMoveModule.forFeature({
      operations: __Name__TenantMoveOperations,
      manifest: __Name__TenantMoveManifest,
    }),
    TenantDirectoryModule.forFeature({
      service: __nameCamel__Contract.service,
      manifest: __Name__TenantMoveManifest,
      operations: __Name__TenantDirectoryOperations,
    }),
    // generated:modules
  ],
})
export class AppModule {}
