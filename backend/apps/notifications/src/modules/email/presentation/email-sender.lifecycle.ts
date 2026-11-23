import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { EmailSender } from '../domain/email-sender.js';

/** Cierra las conexiones del proveedor de correo al apagar. */
@Injectable()
export class EmailSenderLifecycle implements OnModuleDestroy {
  constructor(private readonly sender: EmailSender) {}

  onModuleDestroy(): void {
    this.sender.close();
  }
}
