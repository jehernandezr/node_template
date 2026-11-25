import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';

/** Responds 503 with its own body, like a readiness that is not ready. */
@Controller('unavailable')
export class UnavailableController {
  @Get()
  down(): never {
    throw new HttpException({ status: 'down' }, HttpStatus.SERVICE_UNAVAILABLE);
  }
}
