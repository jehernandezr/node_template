import { Injectable } from '@nestjs/common';
import { __Name__Facade } from './__name__.facade.js';

/** What other modules of the service may ask of __name__, answered in the same process. */
@Injectable()
export class Local__Name__Facade extends __Name__Facade {}
