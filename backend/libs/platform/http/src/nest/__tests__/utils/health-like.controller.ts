import { Controller, Get } from '@nestjs/common';

/** Controller sin `@Endpoint`: la entrada HTTP lo deja pasar sin contrato. */
@Controller('health-like')
export class HealthLikeController {
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }
}
