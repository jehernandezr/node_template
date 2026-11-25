import { Injectable } from '@nestjs/common';
import { AccessTokenInput } from '../domain/access-token-input.js';
import {
  IssueAccessToken,
  IssuedAccessToken,
} from './issue-access-token.use-case.js';
import { TokensFacade } from './tokens.facade.js';

/** In-process `TokensFacade`: delegates to the `tokens` use cases. */
@Injectable()
export class LocalTokensFacade extends TokensFacade {
  constructor(private readonly issueToken: IssueAccessToken) {
    super();
  }

  issue(input: AccessTokenInput): Promise<IssuedAccessToken> {
    return this.issueToken.execute(input);
  }
}
