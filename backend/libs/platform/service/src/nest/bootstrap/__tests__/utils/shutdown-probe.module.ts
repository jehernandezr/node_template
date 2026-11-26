import { Injectable, Module, type OnModuleDestroy } from '@nestjs/common';

/** Provider that counts how many times the application destroyed it and can hold its shutdown until released. */
@Injectable()
export class ShutdownProbe implements OnModuleDestroy {
  destroyed = 0;
  private held: Promise<void> = Promise.resolve();
  private releaseHold: () => void = () => undefined;

  /** Makes the next shutdown wait until `release` is called, as a resource that does not close in time. */
  hold(): void {
    this.held = new Promise<void>((resolve) => {
      this.releaseHold = resolve;
    });
  }

  /** Lets a held shutdown finish. */
  release(): void {
    this.releaseHold();
  }

  async onModuleDestroy(): Promise<void> {
    this.destroyed += 1;
    await this.held;
  }
}

/** Host module with only the shutdown probe, to close a real application in the tests. */
@Module({ providers: [ShutdownProbe] })
export class ShutdownProbeModule {}
