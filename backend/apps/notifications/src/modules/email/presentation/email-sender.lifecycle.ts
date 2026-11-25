import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { EmailSender } from '../domain/email-sender.js';

/** Closes the email provider connections on shutdown. */
@Injectable()
export class EmailSenderLifecycle implements OnModuleDestroy {
  constructor(private readonly sender: EmailSender) {}

  onModuleDestroy(): void {
    this.sender.close();
  }
}
