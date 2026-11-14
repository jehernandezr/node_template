import { TelemetryShutdownHook } from '../telemetry-shutdown.hook.js';
import { FakeTelemetryHandle } from './utils/fake-telemetry-handle.js';

describe('TelemetryShutdownHook', () => {
  it('shuts the telemetry down when the application shuts down', async () => {
    const telemetry = new FakeTelemetryHandle(true);

    await new TelemetryShutdownHook(telemetry).onApplicationShutdown();

    expect(telemetry.shutdownCalls).toBe(1);
  });
});
