// Arranque del SDK de OpenTelemetry. Se importa solo en el punto de entrada de
// cada servicio, porque carga exportadores e instrumentaciones.
export * from './lib/telemetry.js';
