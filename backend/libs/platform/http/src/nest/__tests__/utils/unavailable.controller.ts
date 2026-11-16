import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';

/** Responde 503 con un cuerpo propio, como un readiness que no está listo. */
@Controller('unavailable')
export class UnavailableController {
  @Get()
  down(): never {
    throw new HttpException({ status: 'down' }, HttpStatus.SERVICE_UNAVAILABLE);
  }
}
