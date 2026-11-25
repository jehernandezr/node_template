import { Global, Module } from '@nestjs/common';
import { GetJwks } from '../application/get-jwks.use-case.js';
import { IssueAccessToken } from '../application/issue-access-token.use-case.js';
import { LocalTokensFacade } from '../application/local-tokens.facade.js';
import { TokensFacade } from '../application/tokens.facade.js';
import { TokensController } from './tokens.controller.js';

/**
 * Signing keys, JWKS and access token issuance. `SigningKeyProvider` is provided by `IdentityAuthSupportModule`,
 * because token verification also uses it. It is global only to export its facade.
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
