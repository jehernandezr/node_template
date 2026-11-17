import { Injectable } from '@nestjs/common';
import { AccessTokenInput } from '../domain/access-token-input.js';
import {
  IssueAccessToken,
  IssuedAccessToken,
} from './issue-access-token.use-case.js';
import { TokensFacade } from './tokens.facade.js';

/** `TokensFacade` dentro del proceso: delega en los casos de uso de `tokens`. */
@Injectable()
export class LocalTokensFacade extends TokensFacade {
  constructor(private readonly issueToken: IssueAccessToken) {
    super();
  }

  issue(input: AccessTokenInput): Promise<IssuedAccessToken> {
    return this.issueToken.execute(input);
  }
}
