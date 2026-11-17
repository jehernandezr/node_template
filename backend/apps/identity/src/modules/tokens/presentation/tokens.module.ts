import { Global, Module } from '@nestjs/common';
import { GetJwks } from '../application/get-jwks.use-case.js';
import { IssueAccessToken } from '../application/issue-access-token.use-case.js';
import { LocalTokensFacade } from '../application/local-tokens.facade.js';
import { TokensFacade } from '../application/tokens.facade.js';
import { TokensController } from './tokens.controller.js';

/**
 * Claves de firma, JWKS y emisión del access token. `SigningKeyProvider` lo da `IdentityAuthSupportModule`,
 * porque la verificación de tokens también lo usa. Es global solo para exportar su fachada.
 */
@Global()
@Module({
  controllers: [TokensController],
  providers: [
    GetJwks,
    IssueAccessToken,
    { provide: TokensFacade, useClass: LocalTokensFacade },
  ],
  exports: [TokensFacade],
})
export class TokensModule {}
