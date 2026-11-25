import { spawnSync } from 'node:child_process';
import { ContainerProbe } from './container-probe.js';

/**
 * Queries the daemon with `docker info`. It is synchronous because Jest decides at
 * collection time which suites it registers, before running any test.
 */
export class DockerCliProbe extends ContainerProbe {
  isRunning(): boolean {
    return (
      spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], {
        timeout: 10_000,
        stdio: 'ignore',
      }).status === 0
    );
  }
}
