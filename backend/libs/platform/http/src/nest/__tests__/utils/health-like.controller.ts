import { Controller, Get } from '@nestjs/common';

/** Controller without `@Endpoint`: the HTTP entry lets it through without a contract. */
@Controller('health-like')
export class HealthLikeController {
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }
}
