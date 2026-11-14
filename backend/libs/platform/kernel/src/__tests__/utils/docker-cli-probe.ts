import { spawnSync } from 'node:child_process';
import { ContainerProbe } from './container-probe.js';

/**
 * Consulta el demonio con `docker info`. Es síncrono porque Jest decide en
 * tiempo de recolección qué suites registra, antes de correr ninguna prueba.
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
