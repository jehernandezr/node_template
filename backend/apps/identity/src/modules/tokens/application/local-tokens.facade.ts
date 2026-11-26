import { Injectable } from '@nestjs/common';
import { AccessTokenInput } from '../domain/access-token-input.js';
import {
  IssueAccessToken,
  IssuedAccessToken,
} from './issue-access-token.use-case.js';
import { TokensFacade } from './tokens.facade.js';

/** Signs the access tokens that sessions and API keys hand out, through `IssueAccessToken`. */
@Injectable()
export class LocalTokensFacade extends TokensFacade {
  constructor(private readonly issueToken: IssueAccessToken) {
    super();
  }

  override issue(input: AccessTokenInput): Promise<IssuedAccessToken> {
    return this.issueToken.execute(input);
  }
}
