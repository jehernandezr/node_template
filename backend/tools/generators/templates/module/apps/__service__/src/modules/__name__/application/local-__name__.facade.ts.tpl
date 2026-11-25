import { Injectable } from '@nestjs/common';
import { __Name__Facade } from './__name__.facade.js';

/** In-process `__Name__Facade`: delegates to the use cases of the module. */
@Injectable()
export class Local__Name__Facade extends __Name__Facade {}
